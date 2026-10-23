'use strict';
const data=window.STUDIO_DATA, $=id=>document.getElementById(id);
const storageKey=`presentation-studio:${data.project}:${data.version}:${data.fingerprint}`;
let choices=data.slides.map(()=>null),current=0,variant=1;
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(Array.isArray(saved)&&saved.length===choices.length)choices=saved.map(n=>Number.isInteger(n)&&n>=1&&n<=5?n:null);}catch{}
function scale(){const space=document.querySelector('.preview-space'),stage=document.querySelector('.stage');if(space&&stage)stage.style.width=`${Math.max(0,Math.min(space.clientWidth,space.clientHeight*16/9))}px`;document.querySelectorAll('.canvas').forEach(e=>{const f=e.querySelector('iframe');if(f)f.style.transform=`scale(${e.clientWidth/1920})`;});}
const layoutObserver=new ResizeObserver(scale);layoutObserver.observe(document.body);layoutObserver.observe(document.querySelector('.preview-space'));
function frame(path,title){const wrap=document.createElement('div');wrap.className='canvas';const f=document.createElement('iframe');f.title=title;f.setAttribute('sandbox','allow-same-origin');f.loading='lazy';f.src=path;f.tabIndex=-1;wrap.append(f);return wrap;}
function selection(){return {project:data.project,version:data.version,fingerprint:data.fingerprint,slideIds:data.slides.map(s=>s.id),choices};}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(choices));}catch{$('notice').textContent='Браузер не сохраняет выбор. Перед закрытием скачайте его.';}}
function render(){
 const s=data.slides[current];$('project').textContent=`${data.title} · ${data.version}`;document.title=`${data.title} — выбор дизайна`;
 $('progress').textContent=`Выбрано ${choices.filter(Boolean).length} из ${choices.length}`;
 $('position').textContent=`Слайд ${current+1} из ${choices.length}`;$('title').textContent=s.title;
 $('slides').replaceChildren(...data.slides.map((s,i)=>{const b=document.createElement('button');b.textContent=`${String(i+1).padStart(2,'0')} ${s.title}${choices[i]?' · ✓ '+choices[i]:''}`;b.setAttribute('aria-current',i===current);b.onclick=()=>go(i);return b;}));
 $('preview').src=s.variants[variant-1].path;
 $('variants').replaceChildren(...s.variants.map(v=>{const b=document.createElement('button');b.className='variant';b.setAttribute('aria-pressed',variant===v.number);b.setAttribute('aria-label',`Вариант ${v.number}: ${v.label}`);const label=document.createElement('span');label.className='label';label.textContent=`${v.number} · ${v.label}`;b.append(frame(v.path,`Вариант ${v.number}`),label);b.onclick=()=>{variant=v.number;render();};return b;}));
 $('current-status').textContent=choices[current]?`Выбран вариант ${choices[current]}`:'Дизайн пока не выбран';
 $('confirm').textContent=choices[current]===variant?'Вариант выбран':'Выбрать этот вариант';$('confirm').disabled=choices[current]===variant;
 $('prev').disabled=current===0;$('next').disabled=current===choices.length-1;
 const complete=choices.every(Boolean);$('selection').value=choices.map(n=>n??'—').join(',');$('copy').disabled=$('download').disabled=!complete;
 $('instructions').textContent=complete?'Отправьте список в чат — соберу презентацию. Файл выбора также сохраняет проект и версию.':`Осталось выбрать: ${choices.map((n,i)=>n?null:i+1).filter(Boolean).join(', ')}.`;
 if(!$('overview').hidden)overview();requestAnimationFrame(scale);
}
function go(i){current=i;variant=choices[i]||1;render();}
function overview(){$('overview-grid').replaceChildren(...data.slides.map((s,i)=>{const el=document.createElement('div');el.className='overview-item';if(choices[i])el.append(frame(s.variants[choices[i]-1].path,s.title));else{const p=document.createElement('div');p.className='empty';p.textContent='Не выбран';el.append(p);}const label=document.createElement('p');label.textContent=`${i+1}. ${s.title}${choices[i]?' · вариант '+choices[i]:''}`;const b=document.createElement('button');b.textContent='Изменить';b.onclick=()=>{closeOverview();go(i);};el.append(label,b);return el;}));requestAnimationFrame(scale);}
$('confirm').onclick=()=>{choices[current]=variant;save();render();};$('prev').onclick=()=>go(current-1);$('next').onclick=()=>go(current+1);
function closeOverview(){$('overview').hidden=true;document.querySelector('main').querySelectorAll(':scope > :not(#overview)').forEach(e=>e.inert=false);document.querySelector('aside').inert=false;$('overview-toggle').focus();}
$('overview-toggle').onclick=()=>{$('overview').hidden=false;render();document.querySelector('main').querySelectorAll(':scope > :not(#overview)').forEach(e=>e.inert=true);document.querySelector('aside').inert=true;$('overview-close').focus();};
$('overview-close').onclick=closeOverview;
document.addEventListener('keydown',e=>{if($('overview').hidden)return;if(e.key==='Escape'){closeOverview();return;}if(e.key==='Tab'){const buttons=[...$('overview').querySelectorAll('button')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(choices.join(','));$('notice').textContent='Список скопирован. Отправьте его в чат.';}catch{$('selection').focus();$('selection').select();$('notice').textContent='Скопируйте выделенный список вручную.';}};
$('download').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(selection(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${data.project}-${data.version}-selection.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
go(0);
