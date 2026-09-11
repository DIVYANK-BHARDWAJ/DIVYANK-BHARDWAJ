import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from xml.sax.saxutils import escape

USERNAME = "DIVYANK-BHARDWAJ"
TOKEN = os.environ.get("GH_TOKEN", "")
API = "https://api.github.com"


def request(path, params=None):
    url = API + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "DIVYANK-BHARDWAJ-profile-stats"})
    if TOKEN:
        req.add_header("Authorization", f"Bearer {TOKEN}")
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


user = request(f"/users/{USERNAME}")

repos = []
page = 1
while True:
    batch = request(f"/users/{USERNAME}/repos", {"per_page": 100, "page": page, "type": "owner", "sort": "updated"})
    repos.extend(batch)
    if len(batch) < 100:
        break
    page += 1

public_repos = len(repos)
stars = sum(repo.get("stargazers_count", 0) for repo in repos if not repo.get("fork", False))
forks = sum(repo.get("forks_count", 0) for repo in repos if not repo.get("fork", False))

# Public contribution totals for the current calendar year.
year = datetime.now(timezone.utc).year
query = f"author:{USERNAME} committer-date:{year}-01-01..{year}-12-31"
try:
    commit_search = request("/search/commits", {"q": query, "per_page": 1})
    commits = commit_search.get("total_count", 0)
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

stats = [
    ("Repositories", public_repos),
    ("Stars Earned", stars),
    ("Followers", user.get("followers", 0)),
    ("Following", user.get("following", 0)),
    (f"Commits ({year})", commits),
    (f"PRs ({year})", prs),
    (f"Issues ({year})", issues),
    ("Forks", forks),
]

width = 820
height = 270
bg = "#0d1117"
card = "#161b22"
border = "#30363d"
text = "#f0f6fc"
muted = "#8b949e"
accent = "#58a6ff"

svg = [
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
    f'<rect width="100%" height="100%" rx="14" fill="{bg}"/>',
    f'<rect x="1" y="1" width="{width-2}" height="{height-2}" rx="13" fill="none" stroke="{border}"/>',
    f'<text x="32" y="43" fill="{text}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif" font-size="22" font-weight="700">GitHub Statistics</text>',
    f'<text x="32" y="68" fill="{muted}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif" font-size="13">@{USERNAME} · Updated automatically</text>',
]

positions = [(32, 92), (234, 92), (436, 92), (638, 92), (32, 178), (234, 178), (436, 178), (638, 178)]
for (label, value), (x, y) in zip(stats, positions):
    svg.append(f'<rect x="{x}" y="{y}" width="170" height="68" rx="10" fill="{card}" stroke="{border}"/>')
    svg.append(f'<text x="{x+14}" y="{y+28}" fill="{accent}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif" font-size="22" font-weight="700">{escape(str(value))}</text>')
    svg.append(f'<text x="{x+14}" y="{y+49}" fill="{muted}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif" font-size="11">{escape(label)}</text>')

svg.append(f'<text x="{width-32}" y="{height-15}" text-anchor="end" fill="{muted}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif" font-size="10">Public GitHub activity</text>')
svg.append('</svg>')

with open("github-stats.svg", "w", encoding="utf-8") as file:
    file.write("\n".join(svg))
