from pathlib import Path
import json
r=Path(__file__).resolve().parent
s=(r/'run.cjs').read_text(encoding='utf-8')
demo=s.replace("const PILOT=process.argv.includes('--pilot'), PAIRS=PILOT?1:20;","const PILOT=true, PAIRS=1;").replace("out=path.join(root,'measurements')","out=path.join(root,'demonstration')").replace("(PILOT?'P':'R')","(PILOT?'D':'R')").replace("if(pair===1)await page.screenshot","if(pair===1)await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(100);if(pair===1)await page.screenshot")
(r/'demonstrate.cjs').write_text(demo,encoding='utf-8')
pkg=Path('C:/Users/shayk/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')
v=json.loads(pkg.read_text())['version']
portable=s.replace("require('C:/Users/shayk/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')","require('playwright')")
(r/'run_portable.cjs').write_text(portable,encoding='utf-8')
(r/'package.json').write_text(json.dumps({'name':'rmt-a4-supplementary-benchmark','private':True,'version':'1.0.0','dependencies':{'playwright':v}},indent=2),encoding='utf-8')
print('Portable collector created; browser protocol unchanged. Playwright '+v)
