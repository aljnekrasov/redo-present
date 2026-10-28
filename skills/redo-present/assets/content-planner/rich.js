(function(root){
'use strict';
// Raw HTML stays in an inert template. Only a small structural vocabulary is rendered.
const allowed=new Set(['p','h1','h2','h3','ul','ol','li','table','caption','thead','tbody','tfoot','tr','th','td','strong','em','br']);
const ignored=new Set(['script','style','head','iframe','object','embed','svg','math','img','video','audio','link','meta','input','button','select','textarea']);
const inline=new Set(['text','strong','em','br']);
function parse(input){
 const template=document.createElement('template');template.innerHTML=input;let omitted=0;
 function convert(node){
  if(node.nodeType===3)return [{type:'text',text:node.textContent}];
  if(node.nodeType!==1)return [];
  let type=node.tagName.toLowerCase();if(ignored.has(type)){omitted++;return [];}
  if(type==='b')type='strong';if(type==='i')type='em';if(/^h[4-6]$/.test(type))type='h3';
  let children=[...node.childNodes].flatMap(convert);
  // Whitespace between semantic children is formatting, not a text element.
  if(['ul','ol','table','thead','tbody','tfoot','tr'].includes(type))children=children.filter(c=>c.type!=='text'||c.text.trim());
  if(!allowed.has(type)){
   if(['div','section','article','main','header','footer','blockquote'].includes(type)&&children.length&&children.every(c=>inline.has(c.type)))return [{type:'p',children}];
   return children;
  }
  const item={type,children};
  for(const key of (['td','th'].includes(type)?['colspan','rowspan']:type==='ol'?['start']:[])){
   const value=Number(node.getAttribute(key));if(Number.isInteger(value)&&value>0&&(key==='start'||value<=100))item[key]=value;
  }
  return [item];
 }
 const nodes=[...template.content.childNodes].flatMap(convert);const normalized=[];let pending=[];
 function flush(){if(pending.some(n=>Planner.nodeText(n).trim()))normalized.push({type:'p',children:pending});pending=[];}
 for(const node of nodes){if(inline.has(node.type))pending.push(node);else{flush();normalized.push(node);}}flush();
 const chunks=[];let heading=[];
 for(const node of normalized){
  if(/^h[123]$/.test(node.type)){heading.push(node);continue;}
  if(!Planner.nodeText(node).trim())continue;
  // Tables, lists and formatted paragraphs stay intact; the 250-character target is soft.
  let parts=[node];
  if(node.type==='p'&&node.children.every(c=>c.type==='text')&&Planner.count(Planner.nodeText(node))>350){
   const text=Planner.nodeText(node);parts=Planner.tokenize(text).map(b=>({type:'p',children:[{type:'text',text:text.slice(b.start,b.end)}]}));
  }
  for(const part of parts){chunks.push([...heading,part]);heading=[];}
 }
 if(heading.length)chunks.push(heading);
 if(!chunks.length)throw Error('В HTML не найдено текстового содержимого.');
 let source='';const blocks=[];
 for(const content of chunks){const start=source.length;source+=Planner.contentText(content)+'\n\n';blocks.push({id:`b${blocks.length+1}`,kind:'text',start,end:source.length,content});}
 const doc={schemaVersion:3,inputFormat:'html',inputHtml:input,source,blocks,slides:Planner.plan(blocks)};
 Planner.validate(doc);return {doc,omitted};
}
function render(content){
 Planner.validateContent(content);const fragment=document.createDocumentFragment();
 function create(node){
  if(node.type==='text')return document.createTextNode(node.text);
  const e=document.createElement(node.type);
  for(const k of ['colspan','rowspan','start'])if(node[k]!==undefined)e.setAttribute(k,String(node[k]));
  for(const c of node.children||[])e.append(create(c));return e;
 }
 for(const node of content)fragment.append(create(node));return fragment;
}
root.RichContent={parse,render};
})(globalThis);
