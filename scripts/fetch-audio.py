"""Fetch the two public CC0 recordings used by the studio (no account needed)."""
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets' / 'audio'
DEST.mkdir(parents=True, exist_ok=True)

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'AfterHoursPortfolio/1.0'})
    return urllib.request.urlopen(req, timeout=30).read()

sources = [
    ('cat-purr.wav', 'https://opengameart.org/content/cat-purr-meow',
     r'https://opengameart.org/sites/default/files/cat_purrsleepy_loop[^\s<>"\']*\.wav', 'Kerzoven'),
    ('indoor-rain.mp3', 'https://freesound.org/people/Sayuri_Odin/sounds/216134/',
     r'https://cdn\.freesound\.org/previews/216/216134_[0-9]+-hq\.mp3', 'Sayuri_Odin'),
]
manifest = []
for filename, page, pattern, author in sources:
    html = get(page).decode('utf-8')
    match = re.search(pattern, html)
    if not match:
        raise RuntimeError(f'Public audio link not found on {page}')
    url = match.group(0)
    data = get(url)
    (DEST / filename).write_bytes(data)
    manifest.append(dict(file=filename, author=author, page=page, download=url,
                         license='CC0-1.0', sha256=hashlib.sha256(data).hexdigest(), bytes=len(data)))
    print(f'{filename}: {len(data)} bytes')
(DEST / 'sources.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
