import json
import os
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from xml.sax.saxutils import escape

USERNAME = "DIVYANK-BHARDWAJ"
TOKEN = os.environ.get("GH_TOKEN", "")
API = "https://api.github.com"


def request(path, params=None):
    url = API + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "DIVYANK-BHARDWAJ-profile-stats", "X-GitHub-Api-Version": "2022-11-28"})
    if TOKEN:
        req.add_header("Authorization", f"Bearer {TOKEN}")
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def esc(value):
    return escape(str(value))

user = request(f"/users/{USERNAME}")
repos = []
page = 1
while True:
    batch = request(f"/users/{USERNAME}/repos", {"per_page": 100, "page": page, "type": "owner", "sort": "updated"})
    repos.extend(batch)
    if len(batch) < 100:
        break
    page += 1

owned_repos = [r for r in repos if not r.get("fork", False)]
public_repos = len(owned_repos)
stars = sum(r.get("stargazers_count", 0) for r in owned_repos)
forks = sum(r.get("forks_count", 0) for r in owned_repos)
language_counter = Counter(r.get("language") for r in owned_repos if r.get("language"))
top_languages = language_counter.most_common(5)
year = datetime.now(timezone.utc).year

try:
    commits = request("/search/commits", {"q": f"author:{USERNAME} committer-date:{year}-01-01..{year}-12-31", "per_page": 1}).get("total_count", 0)
except Exception:
    commits = 0
try:
    prs = request("/search/issues", {"q": f"author:{USERNAME} type:pr created:{year}-01-01..{year}-12-31", "per_page": 1}).get("total_count", 0)
except Exception:
    prs = 0
try:
    issues = request("/search/issues", {"q": f"author:{USERNAME} type:issue created:{year}-01-01..{year}-12-31", "per_page": 1}).get("total_count", 0)
except Exception:
    issues = 0

W, H = 920, 390
BG, PANEL, PANEL2, BORDER = "#070b12", "#0d131d", "#111927", "#273244"
TEXT, MUTED = "#f7faff", "#8b98aa"
BLUE, CYAN, PURPLE, PINK, GREEN = "#58a6ff", "#2dd4bf", "#a78bfa", "#f472b6", "#3fb950"

svg = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0b1220"/><stop offset="55%" stop-color="#080d16"/><stop offset="100%" stop-color="#100b1c"/></linearGradient>
<linearGradient id="line" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="{BLUE}"/><stop offset="50%" stop-color="{CYAN}"/><stop offset="100%" stop-color="{PURPLE}"/></linearGradient>
<filter id="soft"><feGaussianBlur stdDeviation="22"/></filter>
<filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000" flood-opacity=".45"/></filter>
<style>.font{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif}} .label{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif;fill:{MUTED};font-size:12px;letter-spacing:.7px}} .value{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif;fill:{TEXT};font-size:25px;font-weight:750}}</style>
</defs>
<rect width="100%" height="100%" rx="18" fill="url(#bg)"/>
<circle cx="770" cy="70" r="150" fill="{BLUE}" opacity=".08" filter="url(#soft)"/><circle cx="150" cy="355" r="120" fill="{PURPLE}" opacity=".07" filter="url(#soft)"/>
<rect x="1" y="1" width="{W-2}" height="{H-2}" rx="17" fill="none" stroke="{BORDER}"/><rect x="18" y="18" width="884" height="3" rx="2" fill="url(#line)"/>
<text x="34" y="57" class="font" fill="{TEXT}" font-size="22" font-weight="800">DIVYANK BHARDWAJ</text>
<text x="34" y="80" class="font" fill="{MUTED}" font-size="12">GITHUB PERFORMANCE  /  @{USERNAME}</text>
<rect x="780" y="42" width="106" height="28" rx="14" fill="#132238" stroke="#294466"/><circle cx="797" cy="56" r="5" fill="{GREEN}"/><text x="809" y="60" class="font" fill="{TEXT}" font-size="11" font-weight="700">ACTIVE</text>
''']

metrics = [
    (34, 108, "REPOSITORIES", public_repos, BLUE), (256, 108, "STARS EARNED", stars, CYAN),
    (478, 108, "FOLLOWERS", user.get("followers", 0), PURPLE), (700, 108, "FOLLOWING", user.get("following", 0), PINK),
    (34, 194, f"COMMITS / {year}", commits, BLUE), (256, 194, f"PULL REQUESTS / {year}", prs, CYAN),
    (478, 194, f"ISSUES / {year}", issues, PURPLE), (700, 194, "FORKS", forks, PINK),
]
for x, y, label, value, accent in metrics:
    svg.append(f'''<g filter="url(#shadow)"><rect x="{x}" y="{y}" width="186" height="68" rx="12" fill="{PANEL}" stroke="{BORDER}"/><rect x="{x}" y="{y}" width="3" height="68" rx="2" fill="{accent}"/><text x="{x+16}" y="{y+25}" class="label">{esc(label)}</text><text x="{x+16}" y="{y+52}" class="value">{esc(value)}</text></g>''')

svg.append(f'<rect x="34" y="282" width="852" height="72" rx="13" fill="{PANEL2}" stroke="{BORDER}"/><text x="52" y="307" class="label">PRIMARY LANGUAGES</text>')
colors = [BLUE, CYAN, PURPLE, PINK, GREEN]
if top_languages:
    total = sum(c for _, c in top_languages); bar_x = 52; bar_y = 319; bar_w = 500
    for i, (_, count) in enumerate(top_languages):
        seg_w = max(18, bar_w * count / total)
        svg.append(f'<rect x="{bar_x:.1f}" y="{bar_y}" width="{seg_w:.1f}" height="7" fill="{colors[i % len(colors)]}"/>'); bar_x += seg_w
    text_x = 585
    for i, (language, _) in enumerate(top_languages):
        svg.append(f'<circle cx="{text_x}" cy="320" r="4" fill="{colors[i % len(colors)]}"/><text x="{text_x+10}" y="324" class="font" fill="{TEXT}" font-size="11">{esc(language)}</text>')
        text_x += 60 + min(70, len(language) * 3)
else:
    svg.append(f'<text x="52" y="334" class="font" fill="{MUTED}" font-size="12">No language data available yet</text>')
svg.append(f'<line x1="34" y1="369" x2="886" y2="369" stroke="{BORDER}"/><text x="34" y="382" class="font" fill="{MUTED}" font-size="9">PUBLIC GITHUB DATA  •  AUTO-UPDATED EVERY 12 HOURS</text><text x="886" y="382" text-anchor="end" class="font" fill="{MUTED}" font-size="9">BUILD  /  PROFILE-STATS</text></svg>')

with open("github-stats.svg", "w", encoding="utf-8") as f:
    f.write("\n".join(svg))
