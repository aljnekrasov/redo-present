import importlib.util,json,tempfile,unittest,shutil
from pathlib import Path
R=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('studio',R/'skills/redo-present/scripts/studio.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class StudioTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.base=Path(self.tmp.name);self.root=self.base/'bundle';self.fixture();m.prepare(self.root);self.man=m.read(self.root/'manifest.json')
 def fixture(self):
  self.root.mkdir();(self.root/'assets').mkdir();(self.root/'assets/slides.css').write_text('body{margin:0}')
  slides=[{'id':i,'title':i,'blocks':{'title':'10 rooms'}} for i in ['cover','metrics','closing']]
  m.write(self.root/'content.json',{'project':'test-deck','version':'1','title':'Test deck','slides':slides})
  variants={}
  for s in slides:
   variants[s['id']]=[]
   for n in range(1,6):
    rel=f"variants/{s['id']}/{n}.html";p=self.root/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(f'<html><h1 data-content-id="title">10 rooms</h1><!-- variant {n} --></html>')
    variants[s['id']].append({'number':n,'label':f'Layout {n}','path':rel})
  m.write(self.root/'variants.json',variants)
 def test_installed_copy_is_portable(self):
  package=self.base/'installed/redo-present';shutil.copytree(R/'skills/redo-present',package)
  import subprocess
  result=subprocess.run([__import__('sys').executable,str(package/'scripts/studio.py'),'prepare',str(self.root)],cwd=self.base,capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr);self.assertTrue((self.root/'selector.html').is_file())
 def tearDown(self):self.tmp.cleanup()
 def selection(self,choices):
  p=self.base/'choice.json';m.write(p,{k:self.man[k] for k in ['project','version','fingerprint']}|{'slideIds':[s['id'] for s in self.man['slides']],'choices':choices});return p
 def test_exact_assembly(self):
  out=self.base/'final';m.assemble(self.root,out,None,self.selection([2,5,1]));self.assertEqual(len(list((out/'variants').rglob('*.html'))),3)
  for s,n in zip(self.man['slides'],[2,5,1]):
   p=s['variants'][n-1]['path'];self.assertEqual((self.root/p).read_bytes(),(out/p).read_bytes())
 def test_invalid_choices(self):
  for c in [[1,2],[1,2,6],[True,2,3],[1,2,3.0]]:
   with self.assertRaises(ValueError):m.assemble(self.root,self.base/'bad',None,self.selection(c))
 def test_stale_selection(self):
  p=self.selection([1,2,3]);d=m.read(p);d['version']='other';m.write(p,d)
  with self.assertRaises(ValueError):m.assemble(self.root,self.base/'bad',None,p)
 def test_content_drift(self):
  p=self.root/'variants/cover/1.html';p.write_text(p.read_text().replace('10 rooms','11 rooms'))
  with self.assertRaises(ValueError):m.inspect(self.root)
 def test_asset_change(self):
  p=self.root/'assets/slides.css';p.write_text(p.read_text()+'\n/* changed */')
  with self.assertRaises(ValueError):m.prepare(self.root)
  with self.assertRaises(ValueError):m.assemble(self.root,self.base/'bad',None,self.selection([1,2,3]))
 def test_plain_list_requires_identity(self):
  with self.assertRaises(ValueError):m.assemble(self.root,self.base/'bad','2,5,1')
  m.assemble(self.root,self.base/'ok','2, 5\n1',expected=self.man['fingerprint'])
if __name__=='__main__':unittest.main()
