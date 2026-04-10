"""Inspection rapide de la reponse MenthorQ pour identifier l'endpoint data reel."""
import sys, io, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='ascii', errors='replace')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.menthorq_scraper import MenthorQSession

sess = MenthorQSession()
sess.login()
print("LOGIN OK")

r = sess.session.get(
    'https://menthorq.com/account/',
    params={'action': 'data', 'type': 'dashboard', 'commands': 'cta', 'date': '2026-04-10'},
    headers={'Referer': 'https://menthorq.com/account/'},
    timeout=30,
)
html = r.text
print(f"HTML size: {len(html)} bytes")

# Save for inspection
outpath = os.path.join(os.path.dirname(__file__), 'menthorq_response.html')
with open(outpath, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"Saved to {outpath}")

print("\n=== ADMIN-AJAX references ===")
for m in list(re.finditer(r'admin-ajax\.php[^"\'\\s>]*', html))[:10]:
    print(" ", m.group(0)[:200])

print("\n=== action= values in data ===")
actions = sorted(set(re.findall(r"""action['"]?\s*[:=]\s*['"]([a-zA-Z_0-9]+)""", html)))
for a in actions:
    print(" ", a)

print("\n=== nonce values ===")
nonces = re.findall(r"""nonce['"]?\s*[:=]\s*['"]([a-f0-9]{10,})""", html)
for n in set(nonces):
    print(" ", n[:40])

print("\n=== data-* attributes on divs ===")
pattern = r'<(?:div|section|main)[^>]+data-(?:action|command|endpoint|url|dashboard|cta|mqcommand|mqdata)[^>]*>'
for m in list(re.finditer(pattern, html))[:10]:
    print(" ", m.group(0)[:250])

print("\n=== Script tags with JSON/data ===")
for m in list(re.finditer(r'<script[^>]*>([^<]*(?:dashboard|cta|QData|mqData|mqCommand)[^<]*)</script>', html, re.IGNORECASE))[:5]:
    snippet = m.group(1)[:400]
    print(" ", snippet)

print("\n=== window.* assignments ===")
assigns = re.findall(r'window\.([a-zA-Z_][a-zA-Z0-9_]*)\s*=', html)
for a in sorted(set(assigns))[:20]:
    print(" ", a)

print("\n=== var XXXParams assignments ===")
varparams = re.findall(r'var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=', html)
for v in sorted(set(varparams))[:30]:
    print(" ", v)

print("\n=== Any JSON blob > 200 chars in <script> ===")
for m in list(re.finditer(r'({[^{}]*(?:"[^"]+"\s*:\s*[^,}]+,?){5,}[^{}]*})', html))[:3]:
    print(" ", m.group(1)[:500])

print("\n=== mq_ / menthorq / mqapi references ===")
for pat in ['mq_', 'mqapi', 'menthorq_', 'mqdata', 'QData']:
    count = html.count(pat)
    print(f"  {pat}: {count} occurrences")
    if count > 0 and count < 10:
        for m in list(re.finditer(re.escape(pat) + r'[^"\'\\s]*', html))[:3]:
            print(f"    {m.group(0)[:100]}")
