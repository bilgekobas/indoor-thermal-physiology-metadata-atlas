const sankeyData=window.atlasSankeyData;
const domains=window.atlasSignalDomains;
const studyTotals=Object.fromEntries(sankeyData.signal_totals.map(r=>[r.signal,r.count]));
const instanceTotals=Object.fromEntries(sankeyData.signal_instance_totals.map(r=>[r.signal,r.count]));
const allSignals=domains.flatMap((d,index)=>d.signals.filter(s=>studyTotals[s]>=5).sort((a,b)=>studyTotals[b]-studyTotals[a]).map(name=>({name,total:instanceTotals[name],studyTotal:studyTotals[name],color:d.color,domain:index})));
const signalFilter=document.getElementById('signal-filter'),brandMode=document.getElementById('brand-mode'),clearButton=document.getElementById('clear-sankey');
const small=()=>innerWidth<750;
signalFilter.innerHTML=(!small()?'<option value="all">All signals</option>':'')+allSignals.map(s=>'<option>'+s.name+'</option>').join('');
signalFilter.value=small()?'Skin temperature':'all';
let selection=null,layout,phase=parent===window?1:0;
const ns='http://www.w3.org/2000/svg';
function svgElement(tag,attrs={},text){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text!==undefined)e.textContent=text;return e;}
function column(entries,x,gap,unit,minHeight,labelWidth){
 let y=48;
 return entries.map(entry=>{const lines=wrapLabel(entry.name,labelWidth),h=Math.max(minHeight,lines.length*17+12,entry.total*unit);const node={...entry,x,y,h,lines};y+=h+gap;return node;});
}
function wrapLabel(value,max){
 const words=value.replaceAll('/',' / ').split(/\s+/).flatMap(word=>word.length>max?word.match(new RegExp('.{1,'+max+'}','g')):[word]),lines=[];let line='';
 for(const word of words){if(line&&line.length+word.length+1>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;
}
function buildLayout(){
 const signals=allSignals.filter(s=>signalFilter.value==='all'||s.name===signalFilter.value),active=new Set(signals.map(s=>s.name));
 const pairs=sankeyData.overall.filter(r=>active.has(r.signal));
 const methodTotals=new Map(),methodDomains=new Map();
 pairs.forEach(r=>{const key=r['physio-sensing-method'];methodTotals.set(key,(methodTotals.get(key)||0)+r.count);const d=allSignals.find(s=>s.name===r.signal).domain;if(!methodDomains.has(key))methodDomains.set(key,new Map());const m=methodDomains.get(key);m.set(d,(m.get(d)||0)+r.count);});
 const methods=[...methodTotals].map(([name,total])=>{const domain=[...methodDomains.get(name)].sort((a,b)=>b[1]-a[1])[0][0];return{name,total,domain,color:domains[domain].color};}).sort((a,b)=>a.domain-b.domain||b.total-a.total);
 const brandRows=sankeyData.signal_method_brand.filter(r=>active.has(r.signal));
 const methodBrands=new Map();brandRows.forEach(r=>{const method=r['physio-sensing-method'];if(!methodBrands.has(method))methodBrands.set(method,new Map());const map=methodBrands.get(method);map.set(r.brand,(map.get(r.brand)||0)+r.count);});
 const brands=[],rawBrandLinks=[];
 if(brandMode.value==='bySensor'){
  methods.forEach(method=>[...(methodBrands.get(method.name)||[])].sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(([name,total])=>{const key=method.name+'::'+name;brands.push({name,key,total,color:method.color});rawBrandLinks.push({method:method.name,key,count:total});}));
 }else{
  const totals=new Map();brandRows.forEach(r=>totals.set(r.brand,(totals.get(r.brand)||0)+r.count));
  [...totals].sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([name,total])=>{
   const connected=methods.filter(m=>methodBrands.get(m.name)?.has(name)).sort((a,b)=>methodBrands.get(b.name).get(name)-methodBrands.get(a.name).get(name));
   const key='brand::'+name;brands.push({name,key,total,color:connected[0].color,order:methods.indexOf(connected[0])});
   connected.forEach(m=>rawBrandLinks.push({method:m.name,key,count:methodBrands.get(m.name).get(name)}));
  });brands.sort((a,b)=>a.order-b.order||b.total-a.total);
 }
 const w=Math.max(320,innerWidth),compact=small(),unit=compact?.85:.72;
 const signalNodes=compact?[]:column(signals,w*.22,10,unit,32,25);
 const methodNodes=column(methods,compact?w*.40:w*.52,7,unit,24,compact?17:27);
 const brandNodes=column(brands,compact?w*.73:w*.82,7,unit,24,compact?11:22);
 const signalMap=new Map(signalNodes.map(n=>[n.name,n])),methodMap=new Map(methodNodes.map(n=>[n.name,n])),brandMap=new Map(brandNodes.map(n=>[n.key,n]));
 const links=[];
 if(!compact)pairs.forEach(r=>links.push({stage:0,source:signalMap.get(r.signal),target:methodMap.get(r['physio-sensing-method']),count:r.count,signal:r.signal,method:r['physio-sensing-method'],color:signalMap.get(r.signal).color}));
 rawBrandLinks.forEach(r=>links.push({stage:1,source:methodMap.get(r.method),target:brandMap.get(r.key),count:r.count,method:r.method,brand:r.key,color:methodMap.get(r.method).color}));
 for(const stage of [0,1]){
  const sourceUsed=new Map(),targetUsed=new Map();
  links.filter(l=>l.stage===stage).sort((a,b)=>a.source.y-b.source.y||a.target.y-b.target.y).forEach(l=>{
   const a=sourceUsed.get(l.source)||0,b=targetUsed.get(l.target)||0;l.sy=l.source.y+(l.source.h-l.source.total*unit)/2+a;l.ty=l.target.y+(l.target.h-l.target.total*unit)/2+b;l.thickness=l.count*unit;sourceUsed.set(l.source,a+l.thickness);targetUsed.set(l.target,b+l.thickness);
  });
 }
 const nodes=[...signalNodes,...methodNodes,...brandNodes],h=Math.max(...nodes.map(n=>n.y+n.h),100)+28;
 return{w,h,compact,signals:signalNodes,methods:methodNodes,brands:brandNodes,links,unit};
}
function pathFor(link){const x1=link.source.x+12,x2=link.target.x,m=(x1+x2)/2,y1=link.sy,y2=link.ty,t=link.thickness;return 'M'+x1+','+y1+'C'+m+','+y1+' '+m+','+y2+' '+x2+','+y2+'L'+x2+','+(y2+t)+'C'+m+','+(y2+t)+' '+m+','+(y1+t)+' '+x1+','+(y1+t)+'Z';}
function connected(obj){
 if(!selection)return true;
 const methodNames=selection.level==='signal'?new Set(layout.links.filter(l=>l.signal===selection.key).map(l=>l.method)):selection.level==='method'?new Set([selection.key]):new Set(layout.links.filter(l=>l.brand===selection.key).map(l=>l.method));
 if(obj.level==='signal')return selection.level==='signal'?obj.key===selection.key:layout.links.some(l=>l.signal===obj.key&&methodNames.has(l.method));
 if(obj.level==='method')return methodNames.has(obj.key);
 if(obj.level==='brand')return layout.links.some(l=>l.brand===obj.key&&methodNames.has(l.method));
 return obj.method&&methodNames.has(obj.method)&&(selection.level!=='signal'||obj.stage===1||obj.signal===selection.key);
}
function applyAppearance(){
 document.querySelectorAll('.sankey-link').forEach(e=>{const link=layout.links[Number(e.dataset.index)];e.style.opacity=connected(link)?1:.12;});
 document.querySelectorAll('.sankey-node').forEach(e=>{e.style.opacity=connected({level:e.dataset.level,key:e.dataset.key})?1:.2;e.setAttribute('aria-pressed',Boolean(selection&&selection.level===e.dataset.level&&selection.key===e.dataset.key));});
 clearButton.hidden=!selection;clearButton.textContent=selection?'Clear selection':'Clear selection';
 for(const stage of [0,1]){const clip=document.getElementById('reveal-'+stage);if(clip)clip.setAttribute('width',layout.w*Math.max(0,Math.min(1,(phase-stage*.25)/.70)));}
}
function renderSankey(){
 layout=buildLayout();const svg=svgElement('svg',{viewBox:'0 0 '+layout.w+' '+layout.h,role:'img','aria-label':'Signal, sensing method and brand associations from the Atlas'}),defs=svgElement('defs');svg.append(defs);
 for(const stage of [0,1]){const clip=svgElement('clipPath',{id:'clip-'+stage});clip.append(svgElement('rect',{id:'reveal-'+stage,x:0,y:0,width:0,height:layout.h}));defs.append(clip);}
 layout.links.forEach((link,index)=>{const p=svgElement('path',{d:pathFor(link),fill:link.color,'fill-opacity':.30,class:'sankey-link','data-index':index,'clip-path':'url(#clip-'+link.stage+')'});p.append(svgElement('title',{},link.source.name+' → '+link.target.name+': '+link.count+' experiment–signal–method instances'));svg.append(p);});
 const nodeGroups=[['signal',layout.signals],['method',layout.methods],['brand',layout.brands]];
 for(const [level,nodes] of nodeGroups)nodes.forEach(node=>{
  const key=level==='brand'?node.key:node.name,g=svgElement('g',{class:'sankey-node',tabindex:0,role:'button','aria-label':node.name+': '+(node.studyTotal??node.total)+(level==='signal'?' experiments':' instances')+', select connections','data-level':level,'data-key':key});
  const hitLeft=level==='brand'?node.x:Math.max(0,node.x-(layout.compact?150:245));
  const hitRight=level==='brand'?layout.w-3:node.x+14;
  g.append(svgElement('rect',{x:hitLeft,y:node.y,width:hitRight-hitLeft,height:node.h,fill:'transparent','pointer-events':'all',class:'sankey-hit'}));
  g.append(svgElement('rect',{x:node.x,y:node.y,width:12,height:node.h,fill:node.color,rx:1}));
  const tx=level==='brand'?node.x+19:node.x-9,anchor=level==='brand'?'start':'end';
  const count=node.studyTotal!==undefined?node.studyTotal+' / '+window.atlasStoryStats.total+' · '+Math.round(node.studyTotal/window.atlasStoryStats.total*100)+'%':node.total+' instances';
  const label=svgElement('text',{x:tx,y:node.y+node.h/2-(node.lines.length-1)*8.5-4,'text-anchor':anchor,class:'sankey-label'});
  node.lines.forEach((line,i)=>label.append(svgElement('tspan',{x:tx,dy:i?17:0},line)));
  label.append(svgElement('tspan',{x:tx,dy:17,class:'sankey-count'},count));g.append(label);
  g.append(svgElement('title',{},node.name+': '+count+(level==='signal'?'; '+node.total+' experiment–signal–method instances':'')));
  const choose=()=>{selection=selection?.level===level&&selection.key===key?null:{level,key};applyAppearance();notifyHeight();};g.addEventListener('click',choose);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});svg.append(g);
 });
 if(!layout.compact)svg.append(svgElement('text',{x:layout.w*.22,y:19,class:'sankey-heading'},'SIGNAL · EXPERIMENTS'));
 svg.append(svgElement('text',{x:layout.compact?layout.w*.04:layout.w*.52,y:19,class:'sankey-heading'},'SENSING METHOD'));
 svg.append(svgElement('text',{x:layout.compact?layout.w*.73:layout.w*.82,y:19,class:'sankey-heading'},'BRAND'));
 document.getElementById('sankey-figure').replaceChildren(svg);
 document.getElementById('sankey-summary').textContent=layout.compact?signalFilter.value+' · n = '+studyTotals[signalFilter.value]+' experiments':'n = '+layout.links.filter(l=>l.stage===0).reduce((sum,l)=>sum+l.count,0)+' signal–method instances';
 applyAppearance();notifyHeight();
}
function notifyHeight(){if(parent!==window)parent.postMessage({type:'atlas-figure-height',id:'signals',height:Math.ceil(document.body.getBoundingClientRect().height+8)},location.origin);}
signalFilter.addEventListener('change',()=>{selection=null;renderSankey();});brandMode.addEventListener('change',()=>{selection=null;renderSankey();});clearButton.addEventListener('click',()=>{selection=null;applyAppearance();notifyHeight();});
addEventListener('resize',renderSankey);
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='atlas-figure-progress'||event.data.id!=='signals')return;phase=event.data.phase;applyAppearance();});
document.fonts.ready.then(renderSankey);renderSankey();if(parent!==window)parent.postMessage({type:'atlas-figure-ready',id:'signals'},location.origin);
