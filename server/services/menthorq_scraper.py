"""
FLO.W - MenthorQ Authenticated Scraper v2

Utilise le VRAI endpoint AJAX admin-ajax.php decouvert dans commandCardModule.js :

    POST https://menthorq.com/wp-admin/admin-ajax.php
    data: {
        action: 'get_command',
        security: <nonce>,
        command_slug: 'cta_table' | 'key_levels' | 'netgex' | ...,
        date: 'YYYY-MM-DD',
        is_intraday: false | true,
        ticker: 'SPX'   # optionnel
    }

Le nonce est extrait depuis /account/ -> var QDataParams = { nonce: "..." }

Credentials via server/.env :
    MENTHORQ_EMAIL=...
    MENTHORQ_PASSWORD=...
"""
import os
import json
import time
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

import requests
from bs4 import BeautifulSoup

# Charge .env si present
_ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(_ENV_PATH):
    try:
        with open(_ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k and k not in os.environ:
                    os.environ[k] = v
    except Exception:
        pass

MENTHORQ_EMAIL = os.environ.get("MENTHORQ_EMAIL", "")
MENTHORQ_PASSWORD = os.environ.get("MENTHORQ_PASSWORD", "")

BASE_URL = "https://menthorq.com"
LOGIN_URL = f"{BASE_URL}/wp-login.php"
ACCOUNT_URL = f"{BASE_URL}/account/"
AJAX_URL = f"{BASE_URL}/wp-admin/admin-ajax.php"

CACHE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "menthorq_cache.json",
)
IMAGE_CACHE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "menthorq_images",
)
os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)

REFRESH_INTERVAL_SECONDS = 24 * 60 * 60  # 24h
IMAGE_TTL_SECONDS = 24 * 60 * 60  # 24h
DATE_FALLBACK_MAX_DAYS = 7  # Nombre max de jours de recul si MenthorQ n'a pas la date


def last_business_day(ref: Optional[datetime] = None) -> str:
    """Retourne le dernier jour ouvre au format YYYY-MM-DD.
    Si ref est un weekend, retombe sur le vendredi.
    Avant 9h ET on considere que les donnees du jour ne sont pas encore
    publiees et on retombe sur le jour precedent."""
    d = ref or datetime.now()
    # Recule d'un jour si on est avant 10h UTC (~ avant publication EOD)
    if d.hour < 10:
        d = d - timedelta(days=1)
    # Recule jusqu'au dernier jour ouvre
    while d.weekday() >= 5:  # 5=Sat, 6=Sun
        d = d - timedelta(days=1)
    return d.strftime("%Y-%m-%d")


def _previous_business_day(date_str: str) -> Optional[str]:
    """Retourne le jour ouvre precedent (str YYYY-MM-DD)."""
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return None
    d = d - timedelta(days=1)
    while d.weekday() >= 5:
        d = d - timedelta(days=1)
    return d.strftime("%Y-%m-%d")


_DATE_NOT_AVAILABLE_PATTERNS = (
    "not available",
    "no data",
    "pas de donnee",
    "no available",
)


def _is_date_unavailable_error(err: Any) -> bool:
    if not err:
        return False
    if not isinstance(err, str):
        err = str(err)
    lo = err.lower()
    return any(p in lo for p in _DATE_NOT_AVAILABLE_PATTERNS)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# Slugs connus groupes par categorie (extraits de QDataParams)
COMMAND_CATEGORIES = {
    "cta": [
        "cta_table", "cta_index", "cta_currency", "cta_commodity",
        "cta_spx", "cta_nasdaq",
    ],
    "eod": [
        "qscore_option", "qscore_momentum", "qscore_volatility",
        "qscore_seasonality", "liq_snapshot", "key_levels", "netgex",
        "netgex_multiexpiry", "levels_tv", "matrix", "voloi", "voloi_0dte",
        "mainchart", "swing_5d", "swing_20d", "swing_levels", "bl_levels",
        "skew", "term", "net_dex", "ivoi", "skew_0dte", "skew_3m",
        "oi", "vol_smile", "vol_surface_3d", "vol_surface_2d", "vrp",
    ],
    "intraday": [
        "netgex_0dte", "netgex_intraday", "vol_0dte_intraday",
        "liquidity_summary", "levels_tv_intraday", "gex_diff_vs_eod",
        "gex_diff_vs_last",
    ],
}


class MenthorQSession:
    """Session authentifiee persistante avec nonce dynamique."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        })
        self.logged_in = False
        self.nonce: Optional[str] = None
        self.nonce_fetched_at: float = 0

    # ---------- Login ----------
    def login(self) -> bool:
        if not MENTHORQ_EMAIL or not MENTHORQ_PASSWORD:
            raise RuntimeError(
                "Credentials MenthorQ manquants. Definir MENTHORQ_EMAIL et "
                "MENTHORQ_PASSWORD dans server/.env"
            )

        r = self.session.get(LOGIN_URL, timeout=20)
        if r.status_code != 200:
            raise RuntimeError(f"GET login page failed: HTTP {r.status_code}")

        self.session.cookies.set(
            "wordpress_test_cookie",
            "WP+Cookie+check",
            domain="menthorq.com",
        )

        payload = {
            "log": MENTHORQ_EMAIL,
            "pwd": MENTHORQ_PASSWORD,
            "wp-submit": "Log In",
            "redirect_to": f"{BASE_URL}/account/",
            "testcookie": "1",
        }
        r = self.session.post(
            LOGIN_URL,
            data=payload,
            allow_redirects=True,
            timeout=20,
            headers={
                "Referer": LOGIN_URL,
                "Origin": BASE_URL,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )

        logged_cookie = any(
            c.name.startswith("wordpress_logged_in_") for c in self.session.cookies
        )
        if not logged_cookie:
            soup = BeautifulSoup(r.text, "lxml")
            err = soup.select_one("#login_error") or soup.select_one(".mepr_error")
            msg = err.get_text(strip=True) if err else "Credentials invalides"
            raise RuntimeError(f"Login MenthorQ echoue: {msg}")

        self.logged_in = True
        return True

    # ---------- Nonce extraction ----------
    def fetch_nonce(self, force: bool = False) -> str:
        """Recupere le nonce depuis la page /account/ (QDataParams.nonce).
        Nonces WordPress expirent en ~12-24h, on le recharge si > 1h."""
        if not self.logged_in:
            self.login()

        age = time.time() - self.nonce_fetched_at
        if self.nonce and not force and age < 3600:
            return self.nonce

        # La page /account/ simple peut ne pas contenir QDataParams.
        # Il faut viser l'URL dashboard qui le genere.
        r = self.session.get(
            ACCOUNT_URL,
            params={"action": "data", "type": "dashboard", "commands": "cta"},
            timeout=20,
        )
        if r.status_code != 200:
            raise RuntimeError(f"GET /account/?action=data failed: HTTP {r.status_code}")

        m = re.search(r'var QDataParams\s*=\s*(\{.*?\});', r.text, re.DOTALL)
        if not m:
            # Fallback: essai sans params
            r2 = self.session.get(ACCOUNT_URL, timeout=20)
            m = re.search(r'var QDataParams\s*=\s*(\{.*?\});', r2.text, re.DOTALL)
        if not m:
            raise RuntimeError(
                f"QDataParams introuvable. Response size: {len(r.text)}, "
                f"contains 'unauthorized': {'unauthorized' in r.text.lower()}"
            )

        try:
            qdp = json.loads(m.group(1))
        except json.JSONDecodeError as e:
            raise RuntimeError(f"QDataParams parse error: {e}")

        nonce = qdp.get("nonce")
        if not nonce:
            raise RuntimeError("Nonce absent de QDataParams")

        self.nonce = nonce
        self.nonce_fetched_at = time.time()
        return nonce

    # ---------- Command fetch ----------
    def get_command(
        self,
        command_slug: str,
        date: Optional[str] = None,
        ticker: Optional[str] = None,
        is_intraday: bool = False,
    ) -> dict:
        """Appelle admin-ajax.php?action=get_command pour un slug donne."""
        nonce = self.fetch_nonce()
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")

        data = {
            "action": "get_command",
            "security": nonce,
            "command_slug": command_slug,
            "date": date,
            "is_intraday": "true" if is_intraday else "false",
        }
        if ticker:
            data["ticker"] = ticker

        r = self.session.post(
            AJAX_URL,
            data=data,
            timeout=30,
            headers={
                "Referer": f"{BASE_URL}/account/?action=data&type=dashboard",
                "Origin": BASE_URL,
                "X-Requested-With": "XMLHttpRequest",
                "Accept": "application/json, text/javascript, */*; q=0.01",
            },
        )

        if r.status_code == 403 or r.status_code == 401:
            # Nonce expire, on retente une fois
            self.fetch_nonce(force=True)
            data["security"] = self.nonce
            r = self.session.post(AJAX_URL, data=data, timeout=30, headers={
                "Referer": f"{BASE_URL}/account/?action=data&type=dashboard",
                "X-Requested-With": "XMLHttpRequest",
                "Accept": "application/json",
            })

        if r.status_code != 200:
            return {
                "success": False,
                "slug": command_slug,
                "error": f"HTTP {r.status_code}",
                "body": r.text[:500],
            }

        try:
            payload = r.json()
        except ValueError:
            return {
                "success": False,
                "slug": command_slug,
                "error": "Invalid JSON",
                "body": r.text[:500],
            }

        return {
            "success": True,
            "slug": command_slug,
            "date": date,
            "ticker": ticker,
            "is_intraday": is_intraday,
            "payload": payload,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    # ---------- Batch fetch ----------
    def get_commands_batch(
        self,
        slugs: List[str],
        date: Optional[str] = None,
        ticker: Optional[str] = None,
        is_intraday: bool = False,
    ) -> Dict[str, Any]:
        """Appelle get_command pour plusieurs slugs. Retourne un dict slug -> result."""
        results = {}
        for slug in slugs:
            try:
                res = self.get_command(
                    command_slug=slug,
                    date=date,
                    ticker=ticker,
                    is_intraday=is_intraday,
                )
                results[slug] = res
            except Exception as e:
                results[slug] = {"success": False, "slug": slug, "error": str(e)}
            # Petit delai pour ne pas se faire rate-limit
            time.sleep(0.25)
        return results


# ========================================================================
# Cache management
# ========================================================================
def _load_cache() -> dict:
    if not os.path.exists(CACHE_PATH):
        return {}
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_cache(cache: dict) -> None:
    try:
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[MenthorQ] Cache save error: {e}")


def _cache_key(slug: str, date: str, ticker: Optional[str], is_intraday: bool) -> str:
    return f"{date}__{slug}__{ticker or 'noticker'}__{'intra' if is_intraday else 'eod'}"


def _is_fresh(entry: dict) -> tuple[bool, float]:
    """Retourne (frais?, age_secondes)."""
    fetched_at = entry.get("fetched_at", "")
    if not fetched_at:
        return False, 0
    try:
        dt = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - dt).total_seconds()
        return age < REFRESH_INTERVAL_SECONDS, age
    except Exception:
        return False, 0


# Session globale reutilisee entre appels
_session_singleton: Optional[MenthorQSession] = None


def _get_session() -> MenthorQSession:
    global _session_singleton
    if _session_singleton is None:
        _session_singleton = MenthorQSession()
    return _session_singleton


def _raw_payload_has_error(result: dict) -> tuple[bool, str]:
    """Regarde le payload brut pour detecter un echec applicatif MenthorQ
    (success HTTP mais data.status=error ou data.error_type).
    Retourne (is_error, error_message)."""
    if not result.get("success"):
        return True, result.get("error", "")
    payload = result.get("payload") or {}
    data = payload.get("data") or {}
    if isinstance(data, dict):
        if data.get("status") == "error" or data.get("error_type"):
            return True, data.get("message", "MenthorQ error")
    return False, ""


def _fetch_command_with_date_fallback(
    command_slug: str,
    date: str,
    ticker: Optional[str],
    is_intraday: bool,
) -> dict:
    """Appelle le scraper puis, si MenthorQ renvoie 'date not available',
    retombe automatiquement sur le jour ouvre precedent (jusqu'a DATE_FALLBACK_MAX_DAYS fois).
    Retourne le premier resultat valide."""
    sess = _get_session()
    tried = []
    current_date = date
    last_error = None
    last_result = None

    for attempt in range(DATE_FALLBACK_MAX_DAYS + 1):
        tried.append(current_date)
        try:
            result = sess.get_command(
                command_slug=command_slug,
                date=current_date,
                ticker=ticker,
                is_intraday=is_intraday,
            )
        except Exception as e:
            last_error = str(e)
            # Erreur reseau / auth: inutile de retry autre date
            raise

        last_result = result
        is_err, err_msg = _raw_payload_has_error(result)
        if not is_err:
            result["date_tried"] = tried
            result["date_fallback"] = attempt > 0
            return result

        # Si c'est une erreur "date not available", on tente la veille
        if _is_date_unavailable_error(err_msg):
            last_error = err_msg
            prev = _previous_business_day(current_date)
            if not prev or prev == current_date:
                break
            current_date = prev
            continue

        # Autre erreur MenthorQ: on abandonne
        break

    if last_result is not None:
        last_result["date_tried"] = tried
        last_result["date_fallback_exhausted"] = True
        return last_result

    return {
        "success": False,
        "slug": command_slug,
        "error": last_error or "Unknown",
        "date": date,
        "date_tried": tried,
    }


def get_command(
    command_slug: str,
    date: Optional[str] = None,
    ticker: Optional[str] = None,
    is_intraday: bool = False,
    force: bool = False,
) -> dict:
    """Point d'entree cache pour un slug unique.
    Si aucune date n'est fournie, utilise le dernier jour ouvre.
    Si MenthorQ repond 'date not available', retombe sur le jour precedent."""
    if not date:
        date = last_business_day()

    cache = _load_cache()
    key = _cache_key(command_slug, date, ticker, is_intraday)
    cached = cache.get(key)

    if cached and not force:
        fresh, age = _is_fresh(cached)
        if fresh:
            return {**cached, "from_cache": True, "age_seconds": round(age)}

    try:
        result = _fetch_command_with_date_fallback(
            command_slug=command_slug,
            date=date,
            ticker=ticker,
            is_intraday=is_intraday,
        )
        result["from_cache"] = False
        # Cache sous la date REELLEMENT retournee par MenthorQ
        effective_date = (result.get("payload") or {}).get("data", {}).get("resource", {}).get("date") or result.get("date", date)
        eff_key = _cache_key(command_slug, effective_date, ticker, is_intraday)
        cache[eff_key] = result
        # Et aussi sous la date demandee pour que les prochaines
        # requetes du meme jour ne refassent pas le roundtrip
        if eff_key != key:
            cache[key] = result
        if len(cache) > 400:
            sorted_keys = sorted(cache.keys())
            for k in sorted_keys[:-400]:
                del cache[k]
        _save_cache(cache)
        return result
    except Exception as e:
        if cached:
            return {**cached, "from_cache": True, "stale": True, "error": str(e)}
        return {
            "success": False,
            "slug": command_slug,
            "error": str(e),
            "date": date,
        }


def get_dashboard(
    category: str = "cta",
    date: Optional[str] = None,
    ticker: Optional[str] = None,
    force: bool = False,
) -> dict:
    """Fetch tous les slugs d'une categorie (cta, eod, intraday)."""
    if category not in COMMAND_CATEGORIES:
        return {
            "success": False,
            "error": f"Categorie inconnue: {category}",
            "valid_categories": list(COMMAND_CATEGORIES.keys()),
        }

    if not date:
        date = last_business_day()

    slugs = COMMAND_CATEGORIES[category]
    results = {}
    effective_dates = set()
    for slug in slugs:
        res = get_command(
            command_slug=slug,
            date=date,
            ticker=ticker,
            is_intraday=(category == "intraday"),
            force=force,
        )
        results[slug] = res
        # Si MenthorQ a renvoye la donnee pour une date differente, on la note
        try:
            actual = (res.get("payload") or {}).get("data", {}).get("resource", {}).get("date")
            if actual:
                effective_dates.add(actual)
        except Exception:
            pass
        time.sleep(0.15)

    # Compte un slug comme "succeeded" si le payload brut ET applicatif sont OK
    success_count = 0
    for r in results.values():
        if not r.get("success"):
            continue
        is_err, _ = _raw_payload_has_error(r)
        if not is_err:
            success_count += 1

    # Date effectivement utilisee par MenthorQ pour cette cohorte
    effective_date = date
    if effective_dates:
        # Prend la date la plus recente disponible
        effective_date = max(effective_dates)

    return {
        "success": success_count > 0,
        "category": category,
        "date": effective_date,
        "date_requested": date,
        "ticker": ticker,
        "slugs_requested": len(slugs),
        "slugs_succeeded": success_count,
        "commands": results,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def get_cache_status() -> dict:
    cache = _load_cache()
    entries = []
    for key, val in cache.items():
        fresh, age = _is_fresh(val)
        entries.append({
            "key": key,
            "slug": val.get("slug"),
            "date": val.get("date"),
            "ticker": val.get("ticker"),
            "success": val.get("success", False),
            "fresh": fresh,
            "age_seconds": round(age),
        })
    entries.sort(key=lambda e: e.get("age_seconds", 0))
    return {
        "cache_path": CACHE_PATH,
        "count": len(entries),
        "entries": entries[:50],
        "credentials_set": bool(MENTHORQ_EMAIL and MENTHORQ_PASSWORD),
        "categories": list(COMMAND_CATEGORIES.keys()),
        "available_slugs": COMMAND_CATEGORIES,
    }


def clear_cache() -> dict:
    if os.path.exists(CACHE_PATH):
        os.remove(CACHE_PATH)
    # Supprime aussi les images telechargees
    try:
        for f in os.listdir(IMAGE_CACHE_DIR):
            try:
                os.remove(os.path.join(IMAGE_CACHE_DIR, f))
            except OSError:
                pass
    except OSError:
        pass
    global _session_singleton
    _session_singleton = None
    return {"cleared": True}


# ========================================================================
# Text data parsers
# ========================================================================
def parse_text_levels(text_data: str) -> dict:
    """Parse '$SPX: Label1, 123.4, Label2, 567.8, ...' en dict {label: value}.
    Gere aussi les labels avec espaces et symboles."""
    if not text_data or not isinstance(text_data, str):
        return {}
    # Retire le prefixe "$TICKER:"
    content = re.sub(r"^\$?\w+:\s*", "", text_data).strip()
    parts = [p.strip() for p in content.split(",")]
    levels = {}
    i = 0
    while i < len(parts) - 1:
        label = parts[i]
        val_str = parts[i + 1]
        try:
            val = float(val_str.replace(" ", ""))
            levels[label] = val
            i += 2
        except ValueError:
            # Label multi-mot: agrege avec le suivant
            if i + 2 < len(parts):
                try:
                    val = float(parts[i + 2].replace(" ", ""))
                    levels[f"{label} {val_str}"] = val
                    i += 3
                    continue
                except ValueError:
                    pass
            i += 1
    return levels


def normalize_command_response(res: dict) -> dict:
    """Normalise la reponse brute en format consommable par le frontend.

    Input: {'success': True, 'payload': {'success': True, 'data': {...}}, ...}
    Output: {'success', 'slug', 'ticker', 'date', 'type', 'image_url',
             'levels', 'stats', 'text', ...}
    """
    out = {
        "success": bool(res.get("success")),
        "slug": res.get("slug"),
        "date": res.get("date"),
        "ticker": res.get("ticker"),
        "fetched_at": res.get("fetched_at"),
        "from_cache": res.get("from_cache", False),
        "age_seconds": res.get("age_seconds"),
    }

    if not out["success"]:
        out["error"] = res.get("error", "Unknown error")
        return out

    payload = res.get("payload") or {}
    if not isinstance(payload, dict):
        out["error"] = "Invalid payload type"
        out["success"] = False
        return out

    data = payload.get("data") or {}
    if not isinstance(data, dict):
        out["error"] = "Invalid data type"
        out["success"] = False
        return out

    # Erreur applicative MenthorQ
    if data.get("status") == "error" or data.get("error_type"):
        out["success"] = False
        out["error"] = data.get("message", "MenthorQ error")
        return out

    resource = data.get("resource") or {}
    if not isinstance(resource, dict):
        out["type"] = "empty"
        return out

    out["date"] = resource.get("date") or data.get("date") or out["date"]
    if resource.get("ticker"):
        out["ticker"] = resource["ticker"]

    # Image presente ?
    image_url = resource.get("image_url") or ""
    if image_url:
        out["image_url"] = image_url
        out["type"] = "image"

    # Text data = niveaux structures ?
    text = resource.get("text_data") or ""
    if text:
        out["text"] = text
        levels = parse_text_levels(text)
        if levels:
            out["levels"] = levels
            out.setdefault("type", "levels")

    # JSON data (liq_snapshot, etc.)
    d = resource.get("data")
    if isinstance(d, dict) and d:
        out["stats"] = d
        out.setdefault("type", "stats")
    elif isinstance(d, list) and d:
        out["list"] = d
        out.setdefault("type", "list")

    # Table data
    t = resource.get("table_data")
    if isinstance(t, list) and t:
        out["table"] = t
        out.setdefault("type", "table")

    out.setdefault("type", "empty")
    return out


# ========================================================================
# Image proxy / local cache
# ========================================================================
def _image_filename(slug: str, date: str, ticker: Optional[str]) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", f"{slug}_{date}_{ticker or 'none'}")
    return f"{safe}.png"


def get_cached_image_path(slug: str, date: str, ticker: Optional[str]) -> Optional[str]:
    """Retourne le chemin local d'une image si elle existe et est fraiche."""
    fn = _image_filename(slug, date, ticker)
    path = os.path.join(IMAGE_CACHE_DIR, fn)
    if not os.path.exists(path):
        return None
    age = time.time() - os.path.getmtime(path)
    if age > IMAGE_TTL_SECONDS:
        return None
    return path


def download_and_cache_image(url: str, slug: str, date: str, ticker: Optional[str]) -> Optional[str]:
    """Download une image S3 presigned et la cache localement. Retourne le chemin."""
    if not url:
        return None
    fn = _image_filename(slug, date, ticker)
    path = os.path.join(IMAGE_CACHE_DIR, fn)
    try:
        r = requests.get(url, timeout=30, stream=True)
        if r.status_code != 200:
            return None
        with open(path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        return path
    except Exception as e:
        print(f"[MenthorQ] Image download error: {e}")
        return None


def ensure_image(slug: str, date: str, ticker: Optional[str]) -> Optional[str]:
    """Retourne le chemin local d'une image, en la rapatriant si necessaire.
    Refetch la command si l'URL S3 a expire."""
    cached = get_cached_image_path(slug, date, ticker)
    if cached:
        return cached

    # Refetch la command pour avoir une URL S3 fraiche
    res = get_command(slug, date=date, ticker=ticker, force=True)
    normalized = normalize_command_response(res)
    url = normalized.get("image_url")
    if not url:
        return None
    return download_and_cache_image(url, slug, date, ticker)
