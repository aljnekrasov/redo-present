#!/usr/bin/env python3
"""Validate, preview and assemble frozen HTML slide variants (Python standard library)."""
import argparse, hashlib, html, json, re, shutil, sys
from pathlib import Path
from html.parser import HTMLParser

HERE=Path(__file__).resolve().parent

def read(p): return json.loads(p.read_text())
def write(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def local(root,name):
    p=(root/name).resolve()
    if not p.is_relative_to(root.resolve()) or not p.is_file(): raise ValueError(f'Missing or unsafe file: {name}')
    return p

def norm(s): return ' '.join(s.split())
class ContentParser(HTMLParser):
    def __init__(self): super().__init__();self.blocks={};self.active=None;self.depth=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'data-content-id' in a:
            if self.active or a['data-content-id'] in self.blocks: raise ValueError('Duplicate or nested content block')
            self.active=a['data-content-id'];self.blocks[self.active]='';self.depth=0
        if self.active and tag not in ['img','br','hr','meta','link','input']: self.depth+=1
        if self.active and tag=='br': self.blocks[self.active]+=' '
    def handle_endtag(self,tag):
        if self.active:
            self.depth-=1
            if self.depth==0:self.active=None
    def handle_data(self,data):
        if self.active:self.blocks[self.active]+=data

def palette(content):
    options=content.get('backgroundOptions',[])
    if not isinstance(options,list):raise ValueError('backgroundOptions must be an array')
    ids=[]
    for o in options:
        if not isinstance(o,dict) or not re.fullmatch(r'[a-z0-9-]+',o.get('id','')) or not isinstance(o.get('label'),str):raise ValueError('Invalid background option')
        if any(not re.fullmatch(r'#[0-9a-fA-F]{6}',o.get(k,'')) for k in ['color','textColor']):raise ValueError('Background colors must be six-digit hex values')
        ids.append(o['id'])
    if len(ids)!=len(set(ids)):raise ValueError('Duplicate background IDs')
    return options

def background_css(option):
    return '[data-background-surface]{background-color:'+option['color']+'!important;color:'+option['textColor']+'!important}[data-background-ink]{color:'+option['textColor']+'!important}'

def inspect(root):
    root=root.resolve()
    content=read(root/'content.json'); variants=read(root/'variants.json'); options=palette(content)
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]*',content['project']):raise ValueError('Invalid project identifier')
    if not isinstance(content['version'],str) or not content['version'].strip():raise ValueError('Version is required')
    slides=content['slides']; ids=[s['id'] for s in slides]
    if not slides or len(ids)!=len(set(ids)):raise ValueError('Slide IDs must be unique and nonempty')
    if set(variants)!=set(ids):raise ValueError('Variants must match content slide IDs')
    paths=set()
    for s in slides:
        blocks=s['blocks']
        if not blocks or not all(isinstance(v,str) for v in blocks.values()):raise ValueError('Blocks must be nonempty text mappings')
        vv=variants[s['id']]
        if len(vv)!=5 or [v['number'] for v in vv]!=[1,2,3,4,5]:raise ValueError(f"{s['id']}: expected variants 1–5")
        for v in vv:
            name=v['path']
            if not name.startswith('variants/') or not name.endswith('.html') or name in paths:raise ValueError('Variant paths must be unique HTML files inside variants/')
            paths.add(name);p=local(root,name);parser=ContentParser();parser.feed(p.read_text())
            if options and 'data-background-surface' not in p.read_text():raise ValueError(f'Missing background surface hook: {name}')
            if {k:norm(t) for k,t in parser.blocks.items()}!={k:norm(t) for k,t in blocks.items()}:raise ValueError(f'Content mismatch: {name}')
    # Include all assets, so even replacing a photograph invalidates old selections.
    files=[root/'content.json',root/'variants.json']+[local(root,p) for p in sorted(paths)]
    if (root/'assets').exists():files+=sorted(p for p in (root/'assets').rglob('*') if p.is_file())
    h=hashlib.sha256()
    for p in files:
        local(root,str(p.relative_to(root)));h.update(str(p.relative_to(root)).encode());h.update(b'\0');h.update(p.read_bytes());h.update(b'\0')
    return content,variants,h.hexdigest()

def prepare(root):
    c,v,digest=inspect(root)
    if (root/'manifest.json').exists():
        old=read(root/'manifest.json')
        if old['version']==c['version'] and old['fingerprint']!=digest:raise ValueError('Content changed: bump version before preparing this set again')
    m={'schema':1,'project':c['project'],'version':c['version'],'title':c['title'],'fingerprint':digest,'slides':[{'id':s['id'],'title':s['title'],'variants':v[s['id']]} for s in c['slides']]}
    m['backgroundOptions']=palette(c)
    write(root/'manifest.json',m)
    (root/'studio-data.js').write_text('window.STUDIO_DATA='+json.dumps(m,ensure_ascii=False).replace('<','\\u003c')+';\n')
    for p in (HERE.parent/'assets/viewer').iterdir():shutil.copy2(p,root/p.name)
    return {'selector':str(root/'selector.html'),'slides':len(c['slides']),'variants':len(c['slides'])*5,'fingerprint':digest}

def assemble(root,out,choice,selection_file=None,expected=None):
    c,v,digest=inspect(root);m=read(root/'manifest.json')
    if m['fingerprint']!=digest or m['version']!=c['version']:raise ValueError('Prepared set has changed; prepare a new version')
    if selection_file:
        selection=read(selection_file)
        if any(selection.get(k)!=m[k] for k in ['project','version','fingerprint']):raise ValueError('Selection belongs to another project or version')
        if selection.get('slideIds')!=[s['id'] for s in c['slides']]:raise ValueError('Selection slide order mismatch')
        choices=selection['choices']
        backgrounds=selection.get('backgrounds',[None]*len(c['slides']))
    else:
        if expected!=digest:raise ValueError('Plain number lists require --fingerprint from the reviewed manifest')
        tokens=re.split(r'[\s,]+',choice.strip()) if choice else []
        if any(not re.fullmatch('[1-5]',x) for x in tokens):raise ValueError('Every choice must be an integer from 1 to 5')
        choices=[int(x) for x in tokens]
        backgrounds=[None]*len(c['slides'])
    if len(choices)!=len(c['slides']):raise ValueError(f"Expected {len(c['slides'])} choices; got {len(choices)}")
    if any(type(n) is not int or n not in range(1,6) for n in choices):raise ValueError('Choices must be integers from 1 to 5')
    options={o['id']:o for o in palette(c)}
    if not isinstance(backgrounds,list) or len(backgrounds)!=len(c['slides']) or any(n is not None and (not isinstance(n,str) or n not in options) for n in backgrounds):raise ValueError('Invalid background selection')
    if out.exists():raise ValueError('Output already exists; choose a new output folder')
    if root==out or root.is_relative_to(out):raise ValueError('Output cannot contain the source set')
    selected=[v[s['id']][n-1] for s,n in zip(c['slides'],choices)]
    out.mkdir(parents=True)
    if (root/'assets').exists():shutil.copytree(root/'assets',out/'assets')
    for item,bg in zip(selected,backgrounds):
        target=out/item['path'];target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(local(root,item['path']),target)
        if bg is not None:
            source=target.read_text();style='<style data-studio-background>'+background_css(options[bg])+'</style>'
            source=re.sub(r'</head>',lambda _:style+'</head>',source,count=1,flags=re.I) if re.search(r'</head>',source,re.I) else source+style
            target.write_text(source)
    shutil.copy2(root/'content.json',out/'content.json')
    write(out/'selection.json',{k:m[k] for k in ['project','version','fingerprint']}|{'slideIds':[s['id'] for s in c['slides']],'choices':choices,'backgrounds':backgrounds})
    panels=''.join(f'<section><div class="canvas"><iframe title="{html.escape(s["title"],quote=True)}" src="{html.escape(item["path"],quote=True)}"></iframe></div></section>' for s,item in zip(c['slides'],selected))
    (out/'index.html').write_text('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(c['title'])+'</title><style>body{margin:0;background:#242321}section{padding:24px;break-after:page}.canvas{position:relative;aspect-ratio:16/9;overflow:hidden}iframe{position:absolute;inset:0;border:0;width:1920px;height:1080px;transform-origin:0 0}@media print{section{padding:0}@page{size:landscape;margin:0}}</style>'+panels+'<script>new ResizeObserver(()=>document.querySelectorAll(".canvas").forEach(e=>e.firstChild.style.transform="scale("+e.clientWidth/1920+")")).observe(document.body)</script></html>')
    return {'presentation':str(out/'index.html'),'choices':choices,'slides':len(selected)}

def main():
    p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='cmd',required=True)
    for name in ['prepare','validate','assemble']:
        a=sub.add_parser(name);a.add_argument('bundle',type=Path)
        if name=='assemble':
            a.add_argument('--output',type=Path,required=True);g=a.add_mutually_exclusive_group(required=True);g.add_argument('--choices');g.add_argument('--selection',type=Path);a.add_argument('--fingerprint')
    a=p.parse_args();root=a.bundle.resolve()
    try:
        if a.cmd=='prepare':result=prepare(root)
        elif a.cmd=='validate':c,v,h=inspect(root);result={'valid':True,'slides':len(c['slides']),'fingerprint':h}
        else:result=assemble(root,a.output.resolve(),a.choices,a.selection,a.fingerprint)
        print(json.dumps(result,ensure_ascii=False))
    except (ValueError,KeyError,TypeError,OSError,json.JSONDecodeError) as e:print(f'Error: {e}',file=sys.stderr);sys.exit(1)
if __name__=='__main__':main()
