'use strict';
const $=id=>document.getElementById(id),KEY='presentation-content-planner-v2:'+location.pathname;
let doc=null,timer,serial=Date.now(),history=[];
let drag=null;
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function notify(message){$('notice').textContent=message;$('notice').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('notice').style.display='none',4500);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({doc,draft:$('source').value}));$('save-status').textContent=$('source').value!==doc?.source?'Черновик сохранён. Разбейте текст, чтобы обновить слайды.':'Сохранено в этом браузере';}catch{$('save-status').textContent='Не удалось сохранить в браузере. Скачайте план.';}}
function textOf(id){const b=doc.blocks.find(b=>b.id===id);return doc.source.slice(b.start,b.end).trim();}
function btn(label,action,title){const b=el('button','',label);b.type='button';b.onclick=action;if(title)b.title=title;return b;}
function change(action){const before=JSON.stringify(doc);try{action();Planner.validate(doc);history.push(before);if(history.length>30)history.shift();cancelDrag();persist();render();}catch(err){doc=JSON.parse(before);notify(err.message);}}
function toolbar(){
 const ready=doc&&$('source').value===doc.source; $('chat-markup').value=ready?Planner.chatMarkup(doc):''; $('copy-markup').disabled=!ready;
 $('undo').disabled=!history.length;
}
function neighbors(id){const i=doc.slides.findIndex(s=>s.id===id);return [doc.slides[i-1],doc.slides[i+1]].filter(s=>s?.type==='content').map(s=>s.id);}
function cancelDrag(){
 if(!drag)return;
 cancelAnimationFrame(drag.frame);drag=null;
 document.querySelectorAll('.dragging,.drop-ready,.drop-over').forEach(e=>e.classList.remove('dragging','drop-ready','drop-over'));
 $('drag-status').textContent='';document.body.classList.remove('is-dragging');
}
function beginDrag(id,row,handle){
 cancelDrag();drag={id,row,handle,targets:neighbors(id),target:null,frame:0,y:0,x:0};
 row.classList.add('dragging');document.body.classList.add('is-dragging');
 document.querySelectorAll('[data-slide-id]').forEach(e=>{if(drag.targets.includes(e.dataset.slideId))e.classList.add('drop-ready');});
 $('drag-status').textContent=drag.targets.length?'Перенесите на подсвеченный слайд. Esc — отменить.':'Рядом нет контентного слайда для объединения.';
}
function setDropTarget(row){
 if(!drag)return;
 document.querySelectorAll('.drop-over').forEach(e=>e.classList.remove('drop-over'));
 drag.target=row&&drag.targets.includes(row.dataset.slideId)?row.dataset.slideId:null;
 if(drag.target){row.classList.add('drop-over');$('drag-status').textContent='Отпустите, чтобы объединить. Порядок текста сохранится.';}
 else $('drag-status').textContent='Перетащите на соседний контентный слайд. Esc — отменить.';
}
function finishDrag(){
 if(!drag)return;
 const {id,target}=drag;cancelDrag();
 if(target){change(()=>Planner.merge(doc,[id,target]));notify('Слайды объединены. Можно разъединить или отменить действие.');}
}
function startDrag(e,id,row,handle){
 if(e.button!==0)return;e.preventDefault();handle.focus();beginDrag(id,row,handle);
 drag.pointerId=e.pointerId;drag.x=e.clientX;drag.y=e.clientY;handle.setPointerCapture(e.pointerId);
 function move(event){if(!drag||event.pointerId!==drag.pointerId)return;drag.x=event.clientX;drag.y=event.clientY;setDropTarget(document.elementFromPoint(drag.x,drag.y)?.closest('[data-slide-id]'));}
 function cleanup(){handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',abort);handle.removeEventListener('lostpointercapture',abort);}
 function up(event){if(drag)move(event);cleanup();finishDrag();}
 function abort(){cleanup();cancelDrag();}
 handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',abort);handle.addEventListener('lostpointercapture',abort);
 function scroll(){if(!drag)return;const margin=80;const dy=drag.y<margin?-12:drag.y>innerHeight-margin?12:0;if(dy){window.scrollBy(0,dy);setDropTarget(document.elementFromPoint(drag.x,drag.y)?.closest('[data-slide-id]'));}drag.frame=requestAnimationFrame(scroll);}drag.frame=requestAnimationFrame(scroll);
}
function keyboardDrag(e,id,row,handle){
 if(e.key==='Escape'){e.preventDefault();cancelDrag();return;}
 if(e.key===' '||e.key==='Enter'){e.preventDefault();if(drag?.id===id)finishDrag();else beginDrag(id,row,handle);return;}
 if(drag?.id===id&&['ArrowUp','ArrowDown'].includes(e.key)){
  e.preventDefault();const index=doc.slides.findIndex(s=>s.id===id)+(e.key==='ArrowUp'?-1:1),target=doc.slides[index];
  const targetRow=[...document.querySelectorAll('[data-slide-id]')].find(r=>r.dataset.slideId===target?.id);
  setDropTarget(targetRow);if(drag.target)targetRow.scrollIntoView({block:'nearest'});
 }
}
window.addEventListener('keydown',e=>{if(e.key==='Escape')cancelDrag();});
window.addEventListener('blur',cancelDrag);
function insertDivider(index){change(()=>doc.slides.splice(index,0,{id:`s${++serial}`,type:'divider',blockIds:[],title:'',reason:''}));}
function insertion(index){const e=el('div','insertion');e.append(btn('+ Шмуцтитул',()=>insertDivider(index),`Добавить шмуцтитул перед слайдом ${index+1}`));return e;}
function render(){
 $('slides').replaceChildren();$('stats').replaceChildren();
 if(!doc){$('slides').append(el('p','empty','Вставьте текст слева. Каждый смысловой фрагмент станет отдельным слайдом — объединять их будете вы.'));toolbar();return;}
 for(const [value,label] of [[doc.blocks.length,'блоков'],[doc.slides.filter(s=>s.type==='content').length,'контентных слайдов'],[doc.slides.filter(s=>s.type==='divider').length,'шмуцтитулов']]){const item=el('div');item.append(el('strong','',String(value)),label);$('stats').append(item);}
 $('integrity').textContent='✓ Исходный текст сохранён полностью';
 doc.slides.forEach((s,i)=>{
  $('slides').append(insertion(i));
  const row=el('article','slide'),bar=el('div','slide-bar'),size=s.blockIds.reduce((n,id)=>n+Planner.count(textOf(id)),0);
  if(s.type==='content'){
   const handle=btn('⠿',()=>{},`Перетащить слайд ${i+1} на соседний`);handle.className='drag-handle';handle.setAttribute('aria-label',`Перетащить слайд ${i+1}`);handle.setAttribute('aria-describedby','drag-help');
   handle.onpointerdown=e=>startDrag(e,s.id,row,handle);
   handle.onkeydown=e=>keyboardDrag(e,s.id,row,handle);
   bar.append(handle,el('span','',`Слайд ${String(i+1).padStart(2,'0')}`));

  }else bar.append(el('span','',`Шмуцтитул ${String(i+1).padStart(2,'0')}`));
  bar.append(el('span','slide-size',`${size} знаков${s.blockIds.length>1?` · ${s.blockIds.length} блока`:''}`));
  if(s.type==='content'&&s.blockIds.length>1)bar.append(btn('Разъединить',()=>change(()=>Planner.ungroup(doc,s.id))));
  if(s.type!=='content'&&!s.blockIds.length)bar.append(btn('Удалить',()=>change(()=>doc.slides.splice(i,1))));
  row.append(bar);const canvas=el('div',`canvas ${s.type}`);
  if(s.type==='divider'){
   const title=el('textarea','divider-title');title.rows=2;title.placeholder='Название раздела';title.value=s.title||'';title.setAttribute('aria-label',`Название шмуцтитула ${i+1}`);
   let titleCheckpoint=false;title.oninput=()=>{if(!titleCheckpoint){history.push(JSON.stringify(doc));titleCheckpoint=true;}s.title=title.value;persist();toolbar();};title.onblur=()=>{titleCheckpoint=false;};canvas.append(title);
  }
  if(s.type==='photo')canvas.append(el('p','','Фотопауза из загруженного плана'));
  for(const id of s.blockIds){
   const b=doc.blocks.find(b=>b.id===id),part=el('div','slide-part'),p=el('p','block-text',textOf(id));p.tabIndex=0;
   let splitAt=null;
   const capture=()=>{const selection=getSelection();if(selection.rangeCount&&p.contains(selection.anchorNode)&&p.contains(selection.focusNode)){const selectedRange=selection.getRangeAt(0),r=selectedRange.cloneRange();r.selectNodeContents(p);r.setEnd(selectedRange.startContainer,selectedRange.startOffset);let offset=r.toString().length;if(offset===0)offset=selection.toString().length;splitAt=offset;}};
   p.addEventListener('mouseup',capture);p.addEventListener('keyup',capture);
   part.append(p);
   if(s.type==='content'){
    const split=btn('Разделить по выделению',()=>{
     const raw=doc.source.slice(b.start,b.end),leading=raw.length-raw.trimStart().length,cut=b.start+leading+splitAt;
     if(!splitAt||cut<=b.start||cut>=b.end||!doc.source.slice(cut,b.end).trim()){notify('Выделите начало следующего слайда в тексте.');return;}
     change(()=>{const next={...b,id:`b${++serial}`,start:cut};b.end=cut;doc.blocks.splice(doc.blocks.indexOf(b)+1,0,next);const pos=s.blockIds.indexOf(id);const rest=s.blockIds.splice(pos+1);doc.slides.splice(i+1,0,{id:`s${++serial}`,type:'content',blockIds:[next.id,...rest],reason:''});});
    });split.className='text-button split-button';part.append(split);
   }
   canvas.append(part);
  }
  row.append(canvas);
  if(size>900)row.append(el('p','slide-note warning','Больше 900 знаков: проверьте, поместится ли текст в выбранный макет.'));
  if(s.type==='content'&&s.blockIds.length===1&&size>400)row.append(el('p','slide-note','Длинное предложение сохранено целиком. Можно разделить вручную по выделению.'));
  row.dataset.slideId=s.id;row.dataset.type=s.type;$('slides').append(row);
 });
 $('slides').append(insertion(doc.slides.length));toolbar();
}
$('build').onclick=()=>{const source=$('source').value;if(!source.trim()){notify('Добавьте исходный текст.');return;}if(doc&&!confirm('Разбить текст заново? Текущие объединения и шмуцтитулы будут заменены.'))return;change(()=>{const blocks=Planner.tokenize(source);doc={schemaVersion:2,source,blocks,slides:Planner.plan(blocks)};});};
$('source').oninput=()=>{persist();toolbar();};
$('undo').onclick=()=>{if(!history.length)return;doc=JSON.parse(history.pop());cancelDrag();persist();render();if(!doc)$('integrity').textContent='';};
$('export').onclick=()=>{if(!doc){notify('Сначала разбейте текст на слайды.');return;}if($('source').value!==doc.source){notify('Исходник изменён. Обновите слайды перед скачиванием.');return;}const a=el('a'),url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));a.href=url;a.download='presentation-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('load').onclick=()=>$('file').click();$('file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const incoming=Planner.validate(JSON.parse(await file.text()));if(doc&&!confirm('Заменить текущий план загруженным?'))return;change(()=>{doc=incoming;$('source').value=doc.source;});notify('План открыт. Исходный текст сохранён.');}catch(err){notify(`Не удалось открыть план: ${err.message}`);}finally{e.target.value='';}};
$('example').onclick=()=>{if(($('source').value||doc)&&!confirm('Заменить текущий текст и план примером?'))return;$('source').value=`Пространство для встреч\n\nМы создаём место, где можно провести целый день: начать утро с завтрака, встретиться с командой и остаться на вечернюю программу. Пространство объединяет ресторан, открытый двор и небольшую сцену.\n\nДнём здесь проходят рабочие встречи и лекции. Вечером во дворе собираются гости на ужины и концерты. Каждая зона работает самостоятельно, но вместе они формируют единый маршрут гостя.\n\nПрограмма\n\nВ основе программы — регулярные встречи с местными авторами, камерные концерты и сезонные гастрономические события. Расписание публикуется заранее, чтобы гости могли спланировать визит.\n\nМы сохраняем свободные часы между событиями. Это время для обычной жизни пространства: разговоров, чтения и спокойного обеда.\n\nСледующий шаг\n\nНа первом этапе команда проверит расписание на небольшой серии событий. Обратная связь гостей поможет определить частоту встреч и наиболее удобное время.`;doc=null;cancelDrag();$('build').click();};
try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');if(stored){doc=stored.doc?Planner.validate(stored.doc):null;$('source').value=stored.draft||'';}}catch{notify('Не удалось восстановить план. Откройте скачанную копию.');}if(!doc&&window.INITIAL_PLAN){doc=Planner.validate(window.INITIAL_PLAN);$('source').value=doc.source;persist();}render();

$('show-result').onclick=()=>{$('handoff').scrollIntoView({behavior:'smooth',block:'start'});};
$('copy-markup').onclick=async()=>{toolbar();if(!doc||$('source').value!==doc.source){notify('Обновите слайды по текущему исходнику.');return;}try{await navigator.clipboard.writeText($('chat-markup').value);notify('Разметка скопирована. Вставьте её в этот чат.');}catch{$('chat-markup').focus();$('chat-markup').select();notify('Выделена вся разметка. Скопируйте её и вставьте в чат.');}};
