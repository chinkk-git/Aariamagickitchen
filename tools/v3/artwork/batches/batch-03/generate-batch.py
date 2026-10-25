#!/usr/bin/env python3
"""Create an isolated, unapproved cue/accessibility remediation batch from verified source atlases."""
from __future__ import annotations
import hashlib, json, re, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT.parents[1] / 'source-archive' / 'v31-step-atlas-drafts-recipes-11-65.zip'
SOURCE_MANIFEST = ROOT / 'source-manifest.json'
EXPECTED_ARCHIVE_SHA256 = '30dcd8d741e9e990302342eb78fcb5bfb0154f6f26b6ff72b94cee85552fc8ab'
BATCH_IDS = (32, 33, 34, 35, 36, 37, 38, 41, 42, 43)
NS = {'svg': 'http://www.w3.org/2000/svg'}

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def xml_safe_text(value: str) -> str:
    return (value.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                 .replace('"', '&quot;').replace("'", '&apos;'))

def main() -> None:
    source_index=json.loads(SOURCE_MANIFEST.read_text(encoding='utf-8'))
    archive_sha=source_index['sourceArchiveSha256']
    if archive_sha != EXPECTED_ARCHIVE_SHA256:
        raise SystemExit(f'Unexpected source archive SHA-256: {archive_sha}')
    if ARCHIVE.exists():
        if sha(ARCHIVE.read_bytes()) != archive_sha:
            raise SystemExit('Recovered source ZIP no longer matches its recorded SHA-256')
        with zipfile.ZipFile(ARCHIVE) as z:
            if z.testzip() is not None:
                raise SystemExit('Recovered source ZIP has a corrupt member')
    OUT = ROOT / 'atlases'
    OUT.mkdir(parents=True, exist_ok=True)
    index = {'schema':'w01-artwork-remediation-batch-v1',
             'status':'draft-only; excluded from production runtime; independent review required',
             'batch':'03', 'recipeIds':list(BATCH_IDS), 'sourceArchive':source_index['sourceArchive'],
             'sourceArchiveSha256':archive_sha, 'panelsPerAtlas':6,
             'changes':['Adds localized, visible adult-only wording to panels the source manifest marks adultOnlyCue.',
                        'Adds per-panel SVG title and description tied to the unchanged source step text.',
                        'Original illustration paths and project cartoon character assets remain unchanged.'],
             'androidDebugReview':{'route':'/artwork-review/index.html','sourceSet':'src/debug/assets only',
                                   'purpose':'Offline reviewer preview only; not the production cooking route.'},
             'approval':{'A08':'PENDING independent review','A09':'PENDING independent review',
                         'artworkRights':'UNRESOLVED; source authorship/rights not established by checksums',
                         'runtime':'NOT INTEGRATED'},
             'recipes':[]}
    records={r['id']:r for r in source_index['recipes']}
    for rid in BATCH_IDS:
            rec = records[rid]
            src_name = rec['sourcePath']
            source_file=ROOT/'source'/rec['sourceFile']
            src = source_file.read_bytes()
            if sha(src) != rec['sourceSha256']:
                raise SystemExit(f'Source manifest checksum mismatch for recipe {rid}')
            text = src.decode('utf-8')
            # Recipe 30 uses an earlier source convention where panel groups were
            # named in aria-label only. Add stable IDs in the generated copy so
            # downstream panel labels can be attached without changing artwork paths.
            if not re.search(r'<g\s+id="panel-1"', text):
                text = re.sub(r'<g\s+aria-label="Panel ([1-6]);',
                              lambda m: f'<g id="panel-{m.group(1)}" aria-label="Panel {m.group(1)};',
                              text)
            title = f"Recipe {rid}: {rec['title']} — draft illustrated steps"
            root_title = f'<title id="w01-b03-title-{rid}">{xml_safe_text(title)}</title><desc id="w01-b03-desc-{rid}">Draft artwork for independent content, accessibility, A08, A09 and rights review. Source text remains unchanged.</desc>'
            text = re.sub(r'<svg\b([^>]*)>', lambda m: '<svg'+re.sub(r'\s(?:aria-label|aria-labelledby|role)="[^"]*"', '', m.group(1))+f' role="img" aria-labelledby="w01-b03-title-{rid} w01-b03-desc-{rid}" data-review-status="draft-only-not-approved">'+root_title, text, count=1)
            panel_records=[]
            for panel in rec['panels']:
                n = panel['panel']
                pid = f'w01-b03-r{rid}-p{n}'
                source_step = xml_safe_text(panel['sourceStepText'])
                adult = bool(panel.get('adultOnlyCue'))
                accessible = (f"Recipe {rid}, {rec['title']}, panel {n}. Source step: {panel['sourceStepText']}"
                              + (' Adult only. Só adulto.' if adult else ''))
                accessible = xml_safe_text(accessible)
                opening = re.compile(rf'<g\s+id="panel-{n}"([^>]*)>')
                match = opening.search(text)
                if not match:
                    raise SystemExit(f'Recipe {rid}: missing source panel-{n}')
                attrs = match.group(1)
                replacement = (f'<g id="panel-{n}"{attrs} role="group" aria-labelledby="{pid}-title {pid}-desc">'
                               f'<title id="{pid}-title">{xml_safe_text(rec["title"])} — panel {n}</title>'
                               f'<desc id="{pid}-desc">{accessible}</desc>')
                text = opening.sub(lambda _: replacement, text, count=1)
                if adult:
                    # The original atlas already carries the adult-action pictogram. This label makes its meaning explicit.
                    anchor = replacement
                    if rid >= 30:
                        # The 30–47 atlas format has shorter panels and a row of ingredient
                        # glyphs near the bottom; place the label in its open top band.
                        tile_x = (18, 410, 800)[(n - 1) % 3]
                        tile_y = 18 if n <= 3 else 402
                        badge = (f'<g class="w01-adult-only-cue" aria-label="Adult only; Só adulto">'
                                 f'<rect x="{tile_x + 20}" y="{tile_y + 58}" width="342" height="26" rx="12" fill="#8f3434" stroke="#ffffff" stroke-width="2"/>'
                                 f'<text x="{tile_x + 191}" y="{tile_y + 76}" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="800" fill="#ffffff">ADULT ONLY • SÓ ADULTO</text></g>')
                    else:
                        badge = (f'<g class="w01-adult-only-cue" aria-label="Adult only; Só adulto">'
                                 f'<rect x="28" y="414" width="456" height="34" rx="15" fill="#8f3434" stroke="#ffffff" stroke-width="2"/>'
                                 f'<text x="256" y="437" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="800" fill="#ffffff">ADULT ONLY • SÓ ADULTO</text></g>')
                    start = text.find(replacement)
                    next_panel = text.find(f'<g id="panel-{n+1}"', start + len(replacement)) if n < 6 else -1
                    segment_end = next_panel if next_panel >= 0 else text.find('</svg>', start)
                    close = text.rfind('</g>', start, segment_end)
                    if close < 0:
                        raise SystemExit(f'Recipe {rid}: malformed panel {n}')
                    text = text[:close] + badge + text[close:]
                panel_records.append({'panel':n,'sourceStep':panel['step'],'sourceStepText':panel['sourceStepText'],
                                      'adultOnlyCue':adult,'originalSha256':rec['sourceSha256']})
            try:
                parsed=ET.fromstring(text)
            except ET.ParseError as e:
                raise SystemExit(f'Recipe {rid} output is invalid SVG: {e}')
            groups=[e for e in parsed.findall('.//svg:g',NS) if e.attrib.get('id','').startswith('panel-')]
            if len(groups)!=6:
                raise SystemExit(f'Recipe {rid} expected six source panels, found {len(groups)}')
            if text.count('w01-adult-only-cue') != sum(bool(p.get('adultOnlyCue')) for p in rec['panels']):
                raise SystemExit(f'Recipe {rid} adult cue count differs from source manifest')
            dest=OUT/f'recipe-{rid:02d}-draft.svg'
            dest.write_text(text,encoding='utf-8')
            index['recipes'].append({'id':rid,'title':rec['title'],'sourcePath':src_name,
                                     'sourceSha256':rec['sourceSha256'],'outputPath':str(dest.relative_to(ROOT)),
                                     'outputSha256':sha(dest.read_bytes()),'dimensions':rec['dimensions'],
                                     'panels':panel_records,'reviewStatus':'DRAFT ONLY; NOT APPROVED; NOT IN RUNTIME'})
    (ROOT/'manifest.json').write_text(json.dumps(index,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({'batch':'03','recipes':len(index['recipes']),'panels':sum(len(r['panels']) for r in index['recipes']),
                      'adultOnlyCues':sum(sum(p['adultOnlyCue'] for p in r['panels']) for r in index['recipes']),
                      'archiveSha256':archive_sha,'status':index['status']},indent=2))

if __name__=='__main__':
    main()
