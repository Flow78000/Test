"""
FLO.W - Multi-asset pricing engine

Closed-form + Monte Carlo pricers for the FLO.W Pricing Lab.
Pure stdlib implementation (no numpy / scipy) so the backend
stays self-contained and fast enough for interactive UI requests.

Coverage:
  - Vanilla options : Black-Scholes (stocks) and Black-76 (futures)
    with full greek set (delta, gamma, vega, theta, rho).
  - Implied volatility solver (Newton-Raphson with bisection fallback).
  - Digital (cash-or-nothing) options.
  - Barrier options (knock-in / knock-out, up / down) pricing via
    closed form (Reiner-Rubinstein) for continuous monitoring.
  - Interest rate swap PV, par rate, PV01.
  - FX forward & NDF via covered interest rate parity.
  - Autocallable / reverse convertible via Monte Carlo (single asset).
"""
from __future__ import annotations

import math
import random
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Normal distribution helpers
# ---------------------------------------------------------------------------
def _norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def _norm_cdf(x: float) -> float:
    # Abramowitz & Stegun 26.2.17
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


# ---------------------------------------------------------------------------
# Black-Scholes (spot-based) and Black-76 (futures-based)
# ---------------------------------------------------------------------------
def black_scholes(
    spot: float,
    strike: float,
    t: float,
    r: float,
    q: float,
    sigma: float,
    option_type: str = "call",
) -> Dict[str, float]:
    """Generalized Black-Scholes with continuous dividend yield q."""
    if t <= 0 or sigma <= 0 or spot <= 0 or strike <= 0:
        intrinsic = max(0.0, (spot - strike) if option_type == "call" else (strike - spot))
        return {
            "price": intrinsic,
            "delta": 0.0, "gamma": 0.0, "vega": 0.0, "theta": 0.0, "rho": 0.0,
            "d1": 0.0, "d2": 0.0,
        }
    d1 = (math.log(spot / strike) + (r - q + 0.5 * sigma * sigma) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)
    df_r = math.exp(-r * t)
    df_q = math.exp(-q * t)

    if option_type == "call":
        price = spot * df_q * _norm_cdf(d1) - strike * df_r * _norm_cdf(d2)
        delta = df_q * _norm_cdf(d1)
        theta = (
            -spot * df_q * _norm_pdf(d1) * sigma / (2 * math.sqrt(t))
            - r * strike * df_r * _norm_cdf(d2)
            + q * spot * df_q * _norm_cdf(d1)
        )
        rho = strike * t * df_r * _norm_cdf(d2)
    else:
        price = strike * df_r * _norm_cdf(-d2) - spot * df_q * _norm_cdf(-d1)
        delta = -df_q * _norm_cdf(-d1)
        theta = (
            -spot * df_q * _norm_pdf(d1) * sigma / (2 * math.sqrt(t))
            + r * strike * df_r * _norm_cdf(-d2)
            - q * spot * df_q * _norm_cdf(-d1)
        )
        rho = -strike * t * df_r * _norm_cdf(-d2)

    gamma = df_q * _norm_pdf(d1) / (spot * sigma * math.sqrt(t))
    vega = spot * df_q * _norm_pdf(d1) * math.sqrt(t)  # per 1.00 change in sigma
    return {
        "price": price,
        "delta": delta,
        "gamma": gamma,
        "vega": vega / 100.0,       # per 1 vol point
        "theta": theta / 365.0,     # per day
        "rho": rho / 100.0,         # per 1% rate move
        "d1": d1,
        "d2": d2,
    }


def black_76(
    forward: float,
    strike: float,
    t: float,
    r: float,
    sigma: float,
    option_type: str = "call",
) -> Dict[str, float]:
    """Futures option pricer. Equivalent to BS with q = r."""
    return black_scholes(forward, strike, t, r, r, sigma, option_type)


def implied_vol(
    price: float,
    spot: float,
    strike: float,
    t: float,
    r: float,
    q: float,
    option_type: str = "call",
    tol: float = 1e-6,
    max_iter: int = 100,
) -> Optional[float]:
    """Solve implied volatility. Newton-Raphson with bisection fallback."""
    if price <= 0 or spot <= 0 or strike <= 0 or t <= 0:
        return None
    # Bracket search
    low, high = 1e-5, 5.0
    for _ in range(100):
        p = black_scholes(spot, strike, t, r, q, high, option_type)["price"]
        if p > price:
            break
        high *= 1.5
    # Newton-Raphson
    sigma = 0.3
    for _ in range(max_iter):
        bs = black_scholes(spot, strike, t, r, q, sigma, option_type)
        diff = bs["price"] - price
        if abs(diff) < tol:
            return sigma
        v = bs["vega"] * 100.0  # undo per-vol-point scaling
        if v < 1e-8:
            break
        sigma -= diff / v
        if sigma < 1e-6 or sigma > 5.0:
            break
    # Bisection fallback
    lo, hi = low, high
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        p = black_scholes(spot, strike, t, r, q, mid, option_type)["price"]
        if abs(p - price) < tol:
            return mid
        if p > price:
            hi = mid
        else:
            lo = mid
    return 0.5 * (lo + hi)


# ---------------------------------------------------------------------------
# Digital & barrier options (closed form, continuous monitoring)
# ---------------------------------------------------------------------------
def digital_option(
    spot: float, strike: float, t: float, r: float, q: float,
    sigma: float, option_type: str = "call", cash: float = 1.0,
) -> Dict[str, float]:
    """Cash-or-nothing binary option."""
    if t <= 0 or sigma <= 0:
        pay = cash if (option_type == "call" and spot > strike) or (option_type == "put" and spot < strike) else 0.0
        return {"price": pay, "delta": 0.0, "vega": 0.0}
    d2 = (math.log(spot / strike) + (r - q - 0.5 * sigma * sigma) * t) / (sigma * math.sqrt(t))
    df = math.exp(-r * t)
    if option_type == "call":
        price = cash * df * _norm_cdf(d2)
        delta = cash * df * _norm_pdf(d2) / (spot * sigma * math.sqrt(t))
    else:
        price = cash * df * _norm_cdf(-d2)
        delta = -cash * df * _norm_pdf(d2) / (spot * sigma * math.sqrt(t))
    vega = -cash * df * _norm_pdf(d2) * d2 / sigma / 100.0
    return {"price": price, "delta": delta, "vega": vega}


def barrier_option(
    spot: float,
    strike: float,
    barrier: float,
    t: float,
    r: float,
    q: float,
    sigma: float,
    option_type: str = "call",
    barrier_type: str = "up-and-out",
    rebate: float = 0.0,
) -> Dict[str, float]:
    """Reiner-Rubinstein closed form for continuous single-barrier options.
    barrier_type in {up-and-out, up-and-in, down-and-out, down-and-in}."""
    if t <= 0 or sigma <= 0:
        return {"price": 0.0}
    phi = 1 if option_type == "call" else -1
    eta = 1 if "down" in barrier_type else -1
    mu = (r - q - 0.5 * sigma * sigma) / (sigma * sigma)
    lam = math.sqrt(mu * mu + 2 * r / (sigma * sigma))
    sqrtT = sigma * math.sqrt(t)

    x1 = math.log(spot / strike) / sqrtT + (1 + mu) * sqrtT
    x2 = math.log(spot / barrier) / sqrtT + (1 + mu) * sqrtT
    y1 = math.log(barrier * barrier / (spot * strike)) / sqrtT + (1 + mu) * sqrtT
    y2 = math.log(barrier / spot) / sqrtT + (1 + mu) * sqrtT
    z = math.log(barrier / spot) / sqrtT + lam * sqrtT

    A = phi * spot * math.exp(-q * t) * _norm_cdf(phi * x1) - phi * strike * math.exp(-r * t) * _norm_cdf(phi * x1 - phi * sqrtT)
    B = phi * spot * math.exp(-q * t) * _norm_cdf(phi * x2) - phi * strike * math.exp(-r * t) * _norm_cdf(phi * x2 - phi * sqrtT)
    C = phi * spot * math.exp(-q * t) * (barrier / spot) ** (2 * (mu + 1)) * _norm_cdf(eta * y1) - phi * strike * math.exp(-r * t) * (barrier / spot) ** (2 * mu) * _norm_cdf(eta * y1 - eta * sqrtT)
    D = phi * spot * math.exp(-q * t) * (barrier / spot) ** (2 * (mu + 1)) * _norm_cdf(eta * y2) - phi * strike * math.exp(-r * t) * (barrier / spot) ** (2 * mu) * _norm_cdf(eta * y2 - eta * sqrtT)
    E = rebate * math.exp(-r * t) * (_norm_cdf(eta * x2 - eta * sqrtT) - (barrier / spot) ** (2 * mu) * _norm_cdf(eta * y2 - eta * sqrtT))
    F = rebate * ((barrier / spot) ** (mu + lam) * _norm_cdf(eta * z) + (barrier / spot) ** (mu - lam) * _norm_cdf(eta * z - 2 * eta * lam * sqrtT))

    K = strike
    price = 0.0
    if barrier_type == "down-and-in":
        if option_type == "call":
            price = (C + E) if K > barrier else (A - B + D + E)
        else:
            price = (B - C + D + E) if K > barrier else (A + E)
    elif barrier_type == "up-and-in":
        if option_type == "call":
            price = (A + E) if K > barrier else (B - C + D + E)
        else:
            price = (A - B + D + E) if K > barrier else (C + E)
    elif barrier_type == "down-and-out":
        if option_type == "call":
            price = (A - C + F) if K > barrier else (B - D + F)
        else:
            price = (A - B + C - D + F) if K > barrier else F
    elif barrier_type == "up-and-out":
        if option_type == "call":
            price = F if K > barrier else (A - B + C - D + F)
        else:
            price = (B - D + F) if K > barrier else (A - C + F)
    return {"price": max(0.0, price)}


# ---------------------------------------------------------------------------
# Interest rate swap (vanilla fixed vs. floating, flat curve)
# ---------------------------------------------------------------------------
def swap_pv(
    notional: float,
    fixed_rate: float,
    float_rate: float,
    tenor_years: float,
    freq: int = 2,
    disc_rate: Optional[float] = None,
    pay_fixed: bool = True,
) -> Dict[str, float]:
    """Vanilla swap valuation on a flat discount curve.
    - notional : swap notional (e.g. 10_000_000)
    - fixed_rate, float_rate, disc_rate : decimals (0.04 = 4%)
    - tenor_years : maturity in years
    - freq : coupons per year (2 = semi-annual)
    - pay_fixed : True if pay fixed / receive float
    Returns PV, annuity (DV01-relevant), par rate, PV01 per 1bp.
    """
    if disc_rate is None:
        disc_rate = float_rate
    n_periods = int(round(tenor_years * freq))
    dt = 1.0 / freq
    annuity = 0.0
    cashflows = []
    for i in range(1, n_periods + 1):
        t_i = i * dt
        df = math.exp(-disc_rate * t_i)
        annuity += dt * df
        fixed_cf = notional * fixed_rate * dt
        float_cf = notional * float_rate * dt
        cashflows.append({
            "period": i,
            "t": round(t_i, 4),
            "df": round(df, 6),
            "fixed": round(fixed_cf, 2),
            "float": round(float_cf, 2),
            "pv_fixed": round(fixed_cf * df, 2),
            "pv_float": round(float_cf * df, 2),
        })
    pv_fixed = notional * fixed_rate * annuity
    pv_float = notional * float_rate * annuity
    if pay_fixed:
        pv = pv_float - pv_fixed
    else:
        pv = pv_fixed - pv_float

    par_rate = float_rate  # flat curve approximation
    pv01 = notional * 0.0001 * annuity
    return {
        "pv": round(pv, 2),
        "pv_fixed_leg": round(pv_fixed, 2),
        "pv_float_leg": round(pv_float, 2),
        "annuity": round(annuity, 6),
        "par_rate": round(par_rate, 6),
        "pv01": round(pv01, 2),
        "cashflows": cashflows,
    }


# ---------------------------------------------------------------------------
# FX forward / NDF
# ---------------------------------------------------------------------------
def fx_forward(
    spot: float,
    rate_base: float,
    rate_quote: float,
    tenor_days: int,
    notional: float = 1_000_000.0,
) -> Dict[str, float]:
    t = tenor_days / 365.0
    fwd = spot * math.exp((rate_quote - rate_base) * t)
    swap_points = (fwd - spot) * 10000.0  # pips
    return {
        "spot": spot,
        "forward": round(fwd, 6),
        "swap_points": round(swap_points, 2),
        "t_years": round(t, 4),
        "notional_base": notional,
        "notional_quote": round(notional * fwd, 2),
    }


# ---------------------------------------------------------------------------
# Monte Carlo : autocallable / reverse convertible
# ---------------------------------------------------------------------------
def autocall_mc(
    spot: float,
    coupon: float,
    barrier_protection: float,
    autocall_trigger: float,
    observations: int,
    notional: float,
    r: float,
    q: float,
    sigma: float,
    tenor_years: float,
    n_paths: int = 20000,
    seed: int = 42,
) -> Dict[str, Any]:
    """Single-asset autocallable : on each observation date, if S >= trigger x spot,
    product redeems at notional + accumulated coupon and pays all past coupons.
    At maturity, if not called :
      - if S >= barrier_protection x spot : return full notional + final coupon
      - else : return notional x (S/spot) (principal loss)

    barrier_protection, autocall_trigger are given as multiples of spot (eg 0.7, 1.0).
    coupon is the per-period coupon rate (eg 0.02 for 2% per observation).
    """
    rng = random.Random(seed)
    dt = tenor_years / observations
    discount_times = [(i + 1) * dt for i in range(observations)]
    payoffs = []
    call_dates: List[int] = []
    protected = 0
    losses = 0

    for _ in range(n_paths):
        s = spot
        called = False
        acc_coupon = 0.0
        for i in range(observations):
            z = rng.gauss(0.0, 1.0)
            s *= math.exp((r - q - 0.5 * sigma * sigma) * dt + sigma * math.sqrt(dt) * z)
            acc_coupon += coupon  # memory effect
            if s >= autocall_trigger * spot:
                called = True
                t_i = discount_times[i]
                payoff = (notional + notional * acc_coupon) * math.exp(-r * t_i)
                payoffs.append(payoff)
                call_dates.append(i + 1)
                break
        if not called:
            t_end = tenor_years
            if s >= barrier_protection * spot:
                payoff = (notional + notional * acc_coupon) * math.exp(-r * t_end)
                protected += 1
            else:
                payoff = notional * (s / spot) * math.exp(-r * t_end)
                losses += 1
            payoffs.append(payoff)

    mean_price = sum(payoffs) / len(payoffs)
    var = sum((p - mean_price) ** 2 for p in payoffs) / len(payoffs)
    stderr = math.sqrt(var / len(payoffs))
    avg_call_date = sum(call_dates) / len(call_dates) if call_dates else None

    return {
        "price": round(mean_price, 2),
        "price_pct": round(mean_price / notional * 100, 3),
        "stderr": round(stderr, 2),
        "call_prob": round(len(call_dates) / n_paths, 4),
        "protection_prob": round(protected / n_paths, 4),
        "loss_prob": round(losses / n_paths, 4),
        "avg_call_obs": round(avg_call_date, 2) if avg_call_date is not None else None,
        "n_paths": n_paths,
        "observations": observations,
    }
