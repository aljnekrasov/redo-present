#!/usr/bin/env python3
"""Copy the bundled content planner to a new project directory with an initial plan."""
import argparse,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def prepare(plan_path,output):
    plan=json.loads(plan_path.read_text())
    source=plan['source'];blocks=plan['blocks'];slides=plan['slides']
    if not isinstance(source,str) or not source.strip():raise ValueError('Source text is required')
    end=0;ids=set();used=[]
    for b in blocks:
        if type(b['start']) is not int or type(b['end']) is not int or b['start']!=end or b['end']<=end or b['id'] in ids:raise ValueError('Invalid block coverage')
        ids.add(b['id']);end=b['end']
    if end!=len(source.encode('utf-16-le'))//2:raise ValueError('Blocks must cover the entire source using UTF-16 offsets')
    for s in slides:used.extend(s['blockIds'])
    if len(used)!=len(set(used)) or set(used)!=ids:raise ValueError('Every block must appear exactly once')
    if output.exists():raise ValueError('Choose a new output directory')
    shutil.copytree(ROOT/'assets/content-planner',output)
    (output/'initial-plan.js').write_text('window.INITIAL_PLAN='+json.dumps(plan,ensure_ascii=False).replace('<','\\u003c')+';\n')
    page=output/'index.html';page.write_text(page.read_text().replace('<script src="app.js">','<script src="initial-plan.js"></script><script src="app.js">'))
    print(output/'index.html')
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('plan',type=Path);p.add_argument('output',type=Path);a=p.parse_args();prepare(a.plan,a.output)
