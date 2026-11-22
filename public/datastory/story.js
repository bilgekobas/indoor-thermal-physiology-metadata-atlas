const {groups,experiments,context,caseContext}=window.atlasStory;
const records=experiments.map(([id,year,size,zone,age,bmi,skin])=>({id,year,size,zone,age,bmi,skin,...context[id]}));
const beats=window.atlasBeats,audit=window.atlasAudit,geography=window.atlasGeography;
const figureMode=window.atlasFigure??null;
const pick=id=>document.getElementById(id),ctx=pick('plot').getContext('2d');
const pink=[251,54,64],soft=[218,218,218],ink='#0A0A0A';
const minmax=(value,low=0,high=1)=>Math.max(low,Math.min(high,value));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=n=>{const t=minmax(n);return t*t*(3-2*t);};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const canonicalCountry=c=>({'Great Britain':'UK','Republic of Korea':'South Korea'}[c]??c);
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const criteria=audit.criteria.map(c=>({...c,ids:new Set(c.experimentIds)}));
const storyData=window.atlasNarrative;
const membershipDefinitions={criteria,prevalence:storyData.prevalence.map(c=>({...c,ids:new Set(c.experimentIds)}))};
const temperatureById=new Map(storyData.temperatureRanges.map(r=>[r.id,r]));
const sharedRecords=audit.access.records;
const sharedById=new Map(sharedRecords.map(r=>[r.id,r]));
const recordById=new Map(records.map(r=>[r.id,r]));
const sourceNames={'1083_1':'Dryad','1188_1':'GitHub','1212_1':'Figshare','1243_1':'Mendeley Data','1249_1':'Publication','1269_1':'Dryad'};
function accessReference(record){
 const url=record.url||record.intendedPublicUrl||record.publicationDoi;
 const status=record.url?(record.status==='verified_public_repository'?'Public code and data':'Public dataset'):record.intendedPublicUrl?'Reported link · unavailable when checked':'No repository link reported';
 return '<div class="repository-reference"><a href="'+escapeHTML(url)+'">'+sourceNames[record.id]+' · '+record.id+'</a><small>'+status+'</small></div>';
}
const atlasUrl=document.querySelector('.atlas-link').href;
const track=pick('text-track'),narrative=pick('narrative-layer');
track.innerHTML='<div class="opening-title"><div class="eyebrow">Indoor Thermal Physiology Metadata Atlas</div><h1>Measuring<br>the <em>human.</em></h1><p class="dek">What a growing field reveals about how we study the human response to indoor environments.</p><p class="scroll-hint">Scroll to follow 295 experiments</p></div>';
beats.forEach((beat,i)=>{
 const step=document.createElement('section');step.className='story-step';step.id=beat.id;step.style.setProperty('--length',beat.length??1.08);
 step.innerHTML='<div class="sr-only"><h2>'+beat.title+'</h2>'+beat.paragraphs.map(p=>'<p>'+p+'</p>').join('')+(beat.note?'<p>'+beat.note+'</p>':'')+'</div>';
 track.append(step);beat.marker=step;
 const card=document.createElement('section');card.className='copy anchor-'+beat.anchor;card.dataset.beat=beat.id;card.setAttribute('aria-label',beat.title);card.setAttribute('aria-hidden','true');card.inert=true;
 card.innerHTML=(beat.eyebrow?'<div class="eyebrow">'+beat.eyebrow+'</div>':'')+'<h2>'+beat.title+'</h2>'+(beat.lead?'<p class="lead">'+beat.lead+'</p>':'')+beat.paragraphs.map(p=>'<p>'+p+'</p>').join('')+(beat.note?'<p class="note">'+beat.note+'</p>':'');
 if(beat.links)card.insertAdjacentHTML('beforeend','<div class="repository-links">'+sharedRecords.map(accessReference).join('')+'</div>');
 if(beat.action)card.insertAdjacentHTML('beforeend','<a class="action" href="'+atlasUrl+'">Explore the Atlas</a>');
 narrative.append(card);beat.card=card;
});
const metadataChart=pick('metadata-chart');
metadataChart.innerHTML='<figcaption id="metadata-chart-caption"><strong>Participant information reported</strong><span>Share of all 295 experiments · fields overlap</span></figcaption><div class="metadata-scale" aria-hidden="true"><span></span><span class="metadata-axis"><span>0%</span><span>100%</span></span><span class="metadata-value-heading">n · %</span></div><ol class="metadata-rows">'+storyData.reporting.map(item=>'<li class="metadata-row" style="--share:'+(item.count/records.length*100)+'%"><span class="metadata-label">'+escapeHTML(item.label)+'</span><span class="metadata-track" aria-hidden="true"><span class="metadata-fill"></span></span><span class="metadata-values"><strong>'+item.count+'</strong><span>'+(item.count/records.length*100).toFixed(1)+'%</span></span></li>').join('')+'</ol>';
const metadataRows=[...metadataChart.querySelectorAll('.metadata-row')];
const criteriaChart=document.createElement('figure');
criteriaChart.id='criteria-chart';criteriaChart.className='metadata-chart criteria-chart';criteriaChart.hidden=true;
criteriaChart.setAttribute('aria-label','Reported participant selection criteria');
const criterionLabels=['Generally healthy','Thermal history','Medication / treatment','Cardiovascular / blood-pressure disease','Smoking status'];
criteriaChart.innerHTML='<figcaption><strong>Reported selection criteria</strong><span>Share of all 295 experiments · criteria overlap</span></figcaption><div class="metadata-scale" aria-hidden="true"><span></span><span class="metadata-axis"><span>0%</span><span>100%</span></span><span class="metadata-value-heading">n · %</span></div><ol class="metadata-rows">'+criteria.map((item,i)=>'<li class="metadata-row" style="--share:'+(item.count/records.length*100)+'%"><span class="metadata-label">'+criterionLabels[i]+'</span><span class="metadata-track" aria-hidden="true"><span class="metadata-fill"></span></span><span class="metadata-values"><strong>'+item.count+'</strong><span>'+(item.count/records.length*100).toFixed(1)+'%</span></span></li>').join('')+'</ol>';
metadataChart.after(criteriaChart);
const accessChart=document.createElement('figure');
accessChart.id='access-chart';accessChart.className='access-chart';accessChart.hidden=true;
accessChart.setAttribute('aria-label','The six reported sharing records and their access routes');
accessChart.innerHTML='<figcaption><h3>Reported routes to data or code</h3><div class="access-summary"><span><strong>'+sharedRecords.length+'</strong> sharing records</span><span><strong>'+sharedRecords.filter(r=>r.url).length+'</strong> verified repositories</span></div></figcaption><div class="access-routes">'+sharedRecords.map(record=>{
 const verified=Boolean(record.url),url=record.url||record.intendedPublicUrl||record.publicationDoi;
 const status=verified?'Verified repository':record.intendedPublicUrl?'Reported link unavailable':'Repository URL not located';
 const action=verified?'View repository':record.intendedPublicUrl?'View reported DOI':'View publication';
 return '<article class="access-route" data-verified="'+verified+'"><p class="route-status">'+status+'</p><h3>'+sourceNames[record.id]+'</h3><p class="route-experiment">Experiment '+record.id+'</p><a href="'+escapeHTML(url)+'">'+action+'</a></article>';
}).join('')+'</div>';
criteriaChart.after(accessChart);
const metrics={
 age:{name:'Mean age',unit:'years',min:15,max:70,ticks:[20,30,40,50,60,70]},
 bmi:{name:'Mean BMI',unit:'kg/m²',min:18,max:27,ticks:[18,19,20,21,22,23,24,25,26,27]},
};
let width=0,height=0,layouts,pending=null,activeIndex=-2,selectedCase=0,bodyReveal=0,lastState;
const caseGrid=pick('case-grid');
const details = [
  {id:'1210_1',short:'iButtons',title:'Four-site Ramanathan mean',sensor:'DS1922 Thermochron iButtons',sites:'Chest, upper arm, thigh, calf',hours:[[9,12.5],[14,17.5]],time:'09:00–12:30 · 14:00–17:30',doi:'10.1016/j.buildenv.2023.110203'},
  {id:'1232_1',short:'Infrared camera',title:'Local skin temperatures',sensor:'A315 infrared camera',sites:'Nose, both cheeks and both hands',hours:[[15,20]],time:'15:00–20:00',doi:'10.1016/j.buildenv.2022.109811'},
  {id:'1003_1',short:'Thermocouples',title:'Eight-site ISO 9886 mean',sensor:'Thermocouples',sites:'Forehead, chest, back, upper arm, lower arm, hand, thigh, calf',hours:[],time:'Not reported',doi:'10.1177/1420326X12447614'},
];

details.forEach((item,i)=>{
 const button=document.createElement('button');button.type='button';button.textContent=item.id;button.setAttribute('aria-pressed',i===selectedCase);
 button.addEventListener('click',()=>{selectedCase=i;updateCases();});pick('case-select').append(button);
 const source=caseContext[item.id],exposure=source['exp-tested-target-temps']==='Free running'?'Free-running indoor conditions':source['exp-tested-target-temps']+' °C targets';
 const reported=value=>value==='Y'?'Reported':'Not reported';
 const bar=item.hours.map(([a,b])=>'<span style="left:'+a/24*100+'%;width:'+(b-a)/24*100+'%"></span>').join('');
 const card=document.createElement('article');card.className='case';card.dataset.selected=i===0;card.dataset.experiment=item.id;
 const row=(label,value,level)=>'<dt class="reveal-block" data-level="'+level+'">'+label+'</dt><dd class="reveal-block" data-level="'+level+'">'+value+'</dd>';
 card.innerHTML='<h2 class="case-id"><a class="source" href="https://doi.org/'+item.doi+'">'+item.id+'</a></h2><div class="case-artwork" data-stage="body" role="img" aria-label="'+escapeHTML(item.sensor+'; measurement sites: '+item.sites.toLowerCase())+'">'+['body','sites','sensor'].map(layer=>'<img class="artwork-'+layer+'" src="artwork/skin-temperature/'+item.id+'-'+layer+'.svg?v=20261122-largersensors" alt="" decoding="async" draggable="false">').join('')+'</div><div class="case-caption"><h2 class="case-title reveal-block" data-level="1">'+item.title+'</h2><p class="sites reveal-block" data-level="1">'+item.sites+'</p></div><p class="instrument reveal-block" data-level="2"><strong>'+item.sensor+'</strong></p><dl class="protocol reveal-block" data-level="3">'+row('Setting',source['exp-type'],3)+row('Exposure',exposure,3)+row('Session',source['exp-session-length']+' min',4)+row('Normalisation',source['exp-normalisation-length']+' min',4)+row('Activity specified',reported(source['protocol-defined-activity']),5)+row('Fixed clothing',reported(source['protocol-fixed-clo']),5)+'</dl><div class="time reveal-block" data-level="6"><div class="track'+(item.hours.length?'':' missing')+'">'+bar+'</div><div class="tick"><span>00:00</span><span>12:00</span><span>24:00</span></div><p>'+item.time+'</p></div>';
 caseGrid.append(card);
});
function updateCases(){
 const body=lastState?.scene==='bodies';
 pick('cases').hidden=!body;
 pick('cases').dataset.reveal=bodyReveal;
 pick('cases').classList.toggle('is-active',body);
 [...pick('case-select').children].forEach((b,i)=>b.setAttribute('aria-pressed',i===selectedCase));
 [...caseGrid.children].forEach((card,i)=>{
  card.dataset.selected=i===selectedCase;
  card.querySelector('.case-artwork').setAttribute('aria-label',bodyReveal===0?'Unmarked body diagrams for experiment '+details[i].id:(bodyReveal>=2?details[i].sensor+'; ':'')+details[i].title+'; measurement sites: '+details[i].sites.toLowerCase());
  for(const block of card.querySelectorAll('[data-level]')){
   const visible=Number(block.dataset.level)<=bodyReveal;block.classList.toggle('is-revealed',visible);block.classList.toggle('newly-added',Boolean(figureMode?.internal)&&Number(block.dataset.level)===bodyReveal);block.setAttribute('aria-hidden',!visible);block.inert=!visible;
  }
 });
 if(!body)return;
 const copyHeight=figureMode?0:lastState.card.offsetHeight;
 const internal=Boolean(figureMode?.internal);
 const area=Math.max(180,height-copyHeight-(internal?8:width<=850?34:38));document.documentElement.style.setProperty('--case-area',area+'px');
 const visible=[...caseGrid.children].filter(card=>getComputedStyle(card).display!=='none');
 for(const card of visible)card.style.setProperty('--body-height','0px');
 const used=Math.max(0,...visible.map(card=>card.offsetHeight)),room=area-caseGrid.offsetTop-used-8;
 const bodyLimit=internal?(width>850?360:300):(width>850?320:260);
 const bodyHeight=Math.max(0,Math.min(bodyLimit,room));
 for(const card of visible){card.style.setProperty('--body-height',bodyHeight+'px');updateBodyArtwork(card.querySelector('.case-artwork'));}
}
function updateBodyArtwork(artwork){
 artwork.dataset.stage=bodyReveal===0?'body':bodyReveal===1?'sites':'sensors';
}

function packed(w,h,exclusions=[],density=1){
  const order=records.map((r,index)=>({n:r.size??0,index})).sort((a,b)=>b.n-a.n);
  const freeArea=Math.max(w*h*.15,w*h-exclusions.reduce((sum,box)=>sum+Math.max(0,box.right-box.left)*Math.max(0,box.bottom-box.top),0));
  let ratio=Math.min(Math.sqrt(.31*freeArea/(Math.PI*13777)),Math.min(w,h)/107)*density;
  const limit=Math.min(1.2,Math.sqrt(w*h/records.length)*.08);
  for(let attempt=0;attempt<12;attempt++){
    let seed=4282;
    const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const placed=[];
    for(const {n,index} of order){
      const r=n?Math.sqrt(n)*ratio:3;
      let found=false;
      for(let slot=0;slot<1700;slot++){
        const x=r+2+rand()*(w-2*r-4),y=r+2+rand()*(h-2*r-4);
        const clearText=exclusions.every(box=>{const px=Math.max(box.left,Math.min(x,box.right)),py=Math.max(box.top,Math.min(y,box.bottom));return (x-px)**2+(y-py)**2>(r+3)**2;});
        if(clearText&&placed.every(p=>(x-p.x)**2+(y-p.y)**2>=(r+p.r+limit)**2)){
          placed.push({x,y,r,index});found=true;break;
        }
      }
      if(!found)break;
    }
    if(placed.length===records.length)return placed.sort((a,b)=>a.index-b.index);
    ratio*=.83;
  }
  if(exclusions.length)return packed(w,h,exclusions,density*.5);
  return records.map((item,i)=>({x:(i%20+.5)*w/20,y:(Math.floor(i/20)+.5)*h/15,r:item.size?Math.sqrt(item.size)*ratio:2.5}));
}
// Co-located records share one marker. Keep precision flags and experiment IDs.
const siteGroups=new Map();
for(const site of geography.sites){
 const key=[site.country,site.lat,site.lon].join('|');let group=siteGroups.get(key);
 if(!group){group={...site,names:[],precisions:[],ids:[]};siteGroups.set(key,group);}
 group.names=[...new Set([...group.names,site.city])];group.precisions=[...new Set([...group.precisions,site.precision])];group.ids=[...new Set([...group.ids,...site.ids])];
 if(site.precision==='city')group.city=site.city;
}
const sites=[...siteGroups.values()].map(site=>({...site,count:site.ids.length,sampleSum:site.ids.reduce((s,id)=>s+(recordById.get(id)?.size??0),0)}));
const siteByExperiment=new Map(records.map(r=>[r.id,sites.flatMap((s,i)=>s.ids.includes(r.id)?[i]:[])]));
const mapPaths=geography.paths.map(p=>({...p,path:new Path2D(p.d)}));
const hitCanvas=document.createElement('canvas');hitCanvas.width=820;hitCanvas.height=400;
const hitCtx=hitCanvas.getContext('2d');
let tooltipPinned=false;
const worldAliases={'United States of America':'USA','United States':'USA','United Kingdom':'UK','Republic of Korea':'South Korea','Korea':'South Korea','Taiwan':'Taiwan'};
function mapTransform(){
 const compact=width<650;
 if(figureMode?.internal){const scale=Math.min((width-28)/820,(height-140)/400);return {scale,x:(width-820*scale)/2,y:54+(height-140-400*scale)/2};}
 const scale=Math.min((width-44)/820,(height-(figureMode?90:compact?250:100))/400);
 return {scale,x:(width-820*scale)/2,y:figureMode?(height-400*scale)/2:compact?54:(height-400*scale)/2-15};
}
function layoutMap(){
 const transform=mapTransform();
 const unlocated={x:Math.max(24,width-(width<650?180:215)),y:60};
 const markers=sites.map((site,i)=>({...site,siteIndex:i,x:transform.x+site.x*transform.scale,y:transform.y+site.y*transform.scale,r:Math.sqrt(site.count)*(width<650?2.2:3.5)}));
 let missing=0;
 const points=records.map(record=>{
  const index=siteByExperiment.get(record.id)[0];
  if(index!==undefined){const m=markers[index];return {x:m.x,y:m.y,r:3.5};}
  const i=missing++;return {x:unlocated.x+(i%10)*10,y:unlocated.y+20+Math.floor(i/10)*10,r:3.3};
 });
 return {points,markers,transform,unlocated};
}
function cardHeight(scene){return figureMode?0:Math.max(0,...beats.filter(b=>b.scene===scene).map(b=>b.card.offsetHeight));}
function figureRegion(scene){
 const compact=width<650;
 return {x:compact?18:Math.max(32,(width-1120)/2),w:compact?width-36:Math.min(width-64,1120),top:compact?40:35,h:Math.max(150,Math.min(height*.48,height-cardHeight(scene)-145))};
}
function layoutMetric(key,r){
 const set=metrics[key],lo=r.x+8,hi=r.x+r.w-8;
 const top=r.top+48,axis=r.top+r.h-86,box=axis-32,x=value=>lo+(hi-lo)*(value-set.min)/(set.max-set.min);
 const bins=Math.max(70,Math.floor((hi-lo)/6)),levels=new Map();
 const data=records.map(record=>{
  if(record[key]===null)return null;const bucket=Math.floor((record[key]-set.min)/(set.max-set.min)*bins);const level=levels.get(bucket)??0;levels.set(bucket,level+1);return {x:x(record[key]),level};
 });
 const columns=Math.max(15,Math.floor((hi-lo)/6)),spacing=Math.min(7,(hi-lo)/columns),gap=Math.min(9,Math.max(.6,(box-top-12)/Math.max(...levels.values())));let missing=0;
 const points=data.map(p=>{if(p)return {x:p.x,y:box-12-p.level*gap,r:width<650?1.65:2.7};const i=missing++;return{x:lo+(i%columns)*spacing,y:axis+40+Math.floor(i/columns)*spacing,r:width<650?1.2:2};});
 const values=records.flatMap(r=>r[key]===null?[]:[r[key]]).sort((a,b)=>a-b);
 const q=p=>{const i=(values.length-1)*p;return mix(values[Math.floor(i)],values[Math.ceil(i)],i%1);};
 const q1=q(.25),q3=q(.75),iqr=q3-q1;
 return {points,x,axis,box,top,q1,q3,med:q(.5),low:values.find(v=>v>=q1-1.5*iqr),high:values.findLast(v=>v<=q3+1.5*iqr),missing,left:r.x,titleX:r.x+r.w/2,titleY:r.top+13};
}
function participantRegions(){
 if(figureMode?.internal&&width<650){const h=(height-30)/2;return [{x:20,w:width-40,top:5,h},{x:20,w:width-40,top:h+25,h}];}
 const total=Math.min(width-36,1120),left=(width-total)/2,gap=width<650?20:50;
 const h=Math.max(190,height-cardHeight('participants')-75);
 return [{x:left,w:(total-gap)*.61,top:38,h},{x:left+(total-gap)*.61+gap,w:(total-gap)*.39,top:38,h}];
}
function layoutTemperatures(){
 const region=figureRegion('temperatures'),left=region.x+12,right=region.x+region.w-12,top=55;
 const bottom=Math.max(top+48,height-cardHeight('temperatures')-140),axis=bottom+24;
 const values=[...temperatureById.values()].sort((a,b)=>(a.low+a.high)-(b.low+b.high)||a.low-b.low);
 const min=Math.floor(Math.min(...values.map(v=>v.low))/10)*10,max=Math.ceil(Math.max(...values.map(v=>v.high))/10)*10;
 const x=value=>left+(value-min)/(max-min)*(right-left),positions=new Map();
 values.forEach((v,i)=>positions.set(v.id,{x:x(v.low),highX:x(v.high),y:top+i/(values.length-1)*(bottom-top),r:width<650?1.2:1.45}));
 let missing=0;
 const points=records.map(r=>{if(positions.has(r.id))return positions.get(r.id);const i=missing++;return {x:left+i*8,y:axis+51,r:2.5};});
 return {points,x,left,right,top,bottom,axis,min,max};
}
function cluster(cx,cy,radius){
 return records.map((_,i)=>{const angle=i*Math.PI*(3-Math.sqrt(5)),distance=radius*Math.sqrt((i+.5)/records.length);return{x:cx+Math.cos(angle)*distance,y:cy+Math.sin(angle)*distance,r:radius/22};});
}
function layoutMembership(scene,count){
 const compact=width<650,available=Math.max(150,height-cardHeight(scene)-100);
 if(compact&&count===5){
  const radius=Math.min((width-50)/6.9,55,Math.max(18,(available-70)/4)),step=radius*2.3,cx=width/2;
  return Array.from({length:5},(_,i)=>{const row=i<3?0:1,col=i<3?i-1:i-3.5;return {cx:cx+col*step,cy:50+radius+row*(radius*2+45),radius};});
 }
 const radius=Math.min((width-(compact?44:80))/(count*2.3),available*.33,compact?82:185),step=radius*2.3;
 return Array.from({length:count},(_,i)=>({cx:width/2+(i-(count-1)/2)*step,cy:Math.max(radius+48,available*.5+15),radius}));
}
const settingLabels=['Lab','Living Lab','Field','Mixed','NR'];
const spatialLabels=['Office/Workstations','Desk&Chair','Seating','Classroom/Study room','Residential','Free-living','NR'];
const readableLabels={'NR':'Not reported','Office/Workstations':'Office / workstations','Desk&Chair':'Desk & chair','Classroom/Study room':'Classroom / study room'};
function layoutGroups(labels,key){
 const compact=width<650,gap=compact?8.3:11.5,plotWidth=Math.min(width-48,1000),left=(width-plotWidth)/2;
 const columns=Math.max(10,Math.floor(plotWidth/gap)),positions=new Map(),headings=[];let y=0;
 labels.forEach(label=>{const subset=records.filter(r=>r[key]===label);headings.push({label:readableLabels[label]??label,count:subset.length,y:y-13});subset.forEach((record,i)=>positions.set(record.id,{x:left+(i%columns+.5)*gap,y:y+Math.floor(i/columns)*gap,r:gap*.34}));y+=Math.ceil(subset.length/columns)*gap+(compact?25:35);});
 const top=Math.max(45,(height-cardHeight(key==='setting'?'setting':'spaces')-60-y)/2);
 return {left,labels:headings.map(l=>({...l,y:l.y+top})),points:records.map(r=>({...positions.get(r.id),y:positions.get(r.id).y+top}))};
}
function rebuildLayouts(){
 const regions=participantRegions();
 layouts={growth:packed(width,height-(figureMode?.internal?80:65),figureMode?.internal&&figureMode.id==='growth'?figureMode.exclusions:[]),map:layoutMap(),age:layoutMetric('age',regions[0]),bmi:layoutMetric('bmi',regions[1]),temperatures:layoutTemperatures(),setting:layoutGroups(settingLabels,'setting'),spaces:layoutGroups(spatialLabels,'typology'),signals:cluster(width/2,width<650?height*.23:height*.31,Math.min(width*.29,height*.25))};
 for(const [scene,definitions] of Object.entries(membershipDefinitions))layouts[scene]=layoutMembership(scene,definitions.length).map(c=>({...c,points:cluster(c.cx,c.cy,c.radius)}));
 metadataChart.style.setProperty('--metadata-room',Math.max(250,height-cardHeight('reporting')-42)+'px');
 criteriaChart.style.setProperty('--metadata-room',Math.max(300,height-32)+'px');
 beats.forEach(b=>b.docY=b.marker.getBoundingClientRect().top+scrollY);
 placeAccessCard();
 updateCases();
 window.atlasReadingFigures?.resize();
}
function placeAccessCard(){
 if(figureMode)return;
 const card=beats.find(b=>b.scene==='reuse').card,cw=card.offsetWidth,ch=card.offsetHeight;
 const targets=records.flatMap((r,i)=>sharedById.has(r.id)?[layouts.growth[i]]:[]);
 const preferredX=width*.25,preferredY=24,candidates=[];
 for(const x of [preferredX,18,(width-cw)/2,width-cw-18])for(const y of [24,height*.18,height-ch-24]){
  const left=minmax(x,15,Math.max(15,width-cw-15)),top=minmax(y,15,Math.max(15,height-ch-15));
  const covered=targets.filter(p=>p.x+p.r>=left-8&&p.x-p.r<=left+cw+8&&p.y+p.r>=top-8&&p.y-p.r<=top+ch+8).length;
  candidates.push({left,top,score:covered*100+Math.abs(left-preferredX)/width+Math.abs(top-preferredY)/height});
 }
 const best=candidates.sort((a,b)=>a.score-b.score)[0];card.style.left=best.left+'px';card.style.top=best.top+'px';card.style.bottom='auto';card.style.right='auto';
}
function resize(){
 const r=pick('visual').getBoundingClientRect();if(r.width<40||r.height<40)return;
 width=r.width;height=r.height;const d=Math.min(devicePixelRatio||1,2),canvas=pick('plot');canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);
 rebuildLayouts();hideTooltip();schedule();
}
function storyState(){
 if(figureMode){const index=Math.max(0,beats.findIndex(b=>b.id===figureMode.id));return {...beats[index],index,phase:figureMode.phase,...(Number.isInteger(figureMode.reveal)?{reveal:figureMode.reveal}:figureMode.internal&&beats[index].scene==='bodies'?{reveal:0}:{})};}
 const trigger=scrollY+innerHeight*.55,index=beats.findLastIndex(b=>b.docY<=trigger);
 if(index<0)return {index:-1,scene:'intro',phase:0};
 const beat=beats[index],next=beats[index+1]?.docY??(beat.docY+beat.marker.offsetHeight);
 return {...beat,index,phase:minmax((trigger-beat.docY)/(next-beat.docY))};
}
function targetPoints(beat){
 if(membershipDefinitions[beat?.scene])return layouts[beat.scene][0].points;
 switch(beat?.scene){
  case 'map':return layouts.map.points;
  case 'participants':return layouts.age.points;
  case 'temperatures':return layouts.temperatures.points;
  case 'setting':return layouts.setting.points;
  case 'spaces':return layouts.spaces.points;
  case 'signals':case 'bodies':return layouts.signals;
  default:return layouts.growth;
 }
}
function colorFor(beat,record,criterionIndex=0){
 if(!beat)return pink;
 const definitions=membershipDefinitions[beat.scene];
 const selected=definitions?definitions[Math.min(criterionIndex,definitions.length-1)].ids.has(record.id):beat.scene==='participants'?record[criterionIndex?'bmi':'age']!==null:beat.scene==='temperatures'?temperatureById.has(record.id):beat.scene==='reuse'?sharedById.has(record.id):true;
 return selected?pink:soft;
}
function colorBlend(a,b,t){return 'rgb('+a.map((v,i)=>Math.round(mix(v,b[i],t))).join(',')+')';}
function isSubset(beat){return !!membershipDefinitions[beat?.scene]||['participants','temperatures','reuse'].includes(beat?.scene);}
function text(value,x,y,align='left',bold=false,size=width<650?11:14){ctx.font=(bold?'600 ':'')+size+'px "IBM Plex Mono",monospace';ctx.fillStyle=ink;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(String(value),x,y);}
function line(x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function drawMapBase(alpha,focus){
 if(alpha<=0)return;const t=layouts.map.transform;ctx.save();ctx.translate(t.x,t.y);ctx.scale(t.scale,t.scale);ctx.globalAlpha=alpha;ctx.lineWidth=.65/t.scale;
 for(const geo of mapPaths){ctx.fillStyle=focus==='China'&&geo.name==='China'?'#FBE8EB':'#EEEEEE';ctx.strokeStyle='#D7D7D7';ctx.fill(geo.path);ctx.stroke(geo.path);}ctx.restore();
}
function drawMapMarkers(alpha,state){
 if(alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;
 for(const m of layouts.map.markers){const color=state.focus==='China'&&m.country!=='China'?soft:pink;ctx.fillStyle='rgb('+color.join(',')+')';ctx.strokeStyle=ctx.fillStyle;ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,Math.PI*2);if(m.precisions.every(p=>p==='province'||p==='institute')){ctx.lineWidth=1.5;ctx.stroke();}else{ctx.fill();ctx.strokeStyle='#FCFCFC';ctx.lineWidth=.75;ctx.stroke();}}
 ctx.restore();
}
function drawMetric(key,alpha,progress=1){
 const set=metrics[key],p=layouts[key],{x,axis,box,top,q1,q3,med,low,high}=p;ctx.save();ctx.globalAlpha=alpha;
 if(key==='bmi'){if(!figureMode?.internal){ctx.fillStyle='rgba(10,10,10,.025)';ctx.fillRect(x(18.5),top,x(25)-x(18.5),axis-top);}ctx.strokeStyle='#8A8A8A';ctx.lineWidth=1;ctx.setLineDash([4,4]);line(x(18.5),top,x(18.5),axis);line(x(25),top,x(25),axis);ctx.setLineDash([]);text('18.5',x(18.5),top-9,'center',false,width<650?9:12);text('25',x(25),top-9,'center',false,width<650?9:12);}
 ctx.strokeStyle='#8A8A8A';ctx.lineWidth=1;line(x(set.min),axis,x(set.max),axis);
 const ticks=width<650&&key==='bmi'?[18,21,24,27]:set.ticks;
 for(const tick of ticks){line(x(tick),axis,x(tick),axis+5);text(tick,x(tick),axis+20,'center',false,width<650?10:13);}
 const grow=value=>mix(med,value,progress),a=x(grow(low)),b=x(grow(high)),qLeft=x(grow(q1)),qRight=x(grow(q3));
 line(a,box,b,box);line(a,box-7*progress,a,box+7*progress);line(b,box-7*progress,b,box+7*progress);ctx.fillStyle='#FFF0F1';ctx.fillRect(qLeft,box-8,qRight-qLeft,16);ctx.strokeRect(qLeft,box-8,qRight-qLeft,16);ctx.strokeStyle='#FB3640';ctx.lineWidth=2;line(x(med),box-8*progress,x(med),box+8*progress);
 text(set.name+' ('+set.unit+')'+(figureMode?.internal?' · n = '+(records.length-p.missing):''),p.titleX,p.titleY,'center',true,width<650?10:14);if(!figureMode?.internal)text(p.missing+' without mean',p.left,axis+33,'left',false,width<650?9:12);ctx.restore();
}
function drawParticipants(state,previous,motion){
 const from=targetPoints(previous);
 ['age','bmi'].forEach((key,j)=>{
  records.forEach((record,i)=>{const a=from[i],b=layouts[key].points[i];ctx.globalAlpha=j?motion:1;ctx.fillStyle=colorBlend(pink,record[key]===null?soft:pink,motion);ctx.beginPath();ctx.arc(mix(a.x,b.x,motion),mix(a.y,b.y,motion),mix(a.r,b.r,motion),0,7);ctx.fill();});
  drawMetric(key,motion);
 });ctx.globalAlpha=1;
}
function drawMembership(state,previous,motion){
 const from=targetPoints(previous),definitions=membershipDefinitions[state.scene];
 const highlight=reduced.matches?1:ease((state.phase-.08)/.30);
 const short={'Generally healthy':'Healthy','No ongoing treatment or medication use':'Medication','No cardiovascular or blood-pressure disease':'CV / BP','Smoking status':'Smoking','Heart/Pulse rate':'Heart / pulse rate','Core/Body temperature':'Core / body temp.','Age information':'Age information'};
 layouts[state.scene].forEach((group,j)=>{
  records.forEach((record,i)=>{const a=from[i],b=group.points[i];ctx.globalAlpha=j?motion:1;ctx.fillStyle=colorBlend(pink,colorFor(state,record,j),highlight);ctx.beginPath();ctx.arc(mix(a.x,b.x,motion),mix(a.y,b.y,motion),mix(a.r,b.r,motion),0,7);ctx.fill();});
  ctx.globalAlpha=motion;const item=definitions[j],criteriaNames=width<1000?['Healthy','Thermal history','Medication','CV / BP','Smoking']:['Generally healthy','Thermal history','Medication / treatment','Cardiovascular / BP','Smoking status'],name=state.scene==='criteria'?criteriaNames[j]:width<1000?(short[item.label]??item.label):item.label;
  text(name,group.cx,group.cy+group.radius+21,'center',false,width<650?9.5:width<1000?11:13);
  text(item.count+' / 295 · '+Math.round(item.count/295*100)+'%',group.cx,group.cy+group.radius+40,'center',true,width<650?9.5:13);
 });ctx.globalAlpha=1;
}
function drawDepartingCopies(previous,to,motion){
 if(motion>=1)return;
 const copies=membershipDefinitions[previous.scene]?layouts[previous.scene].slice(1).map((group,j)=>({points:group.points,index:j+1})):previous.scene==='participants'?[{points:layouts.bmi.points,index:1}]:[];
 for(const copy of copies)records.forEach((record,i)=>{const a=copy.points[i],b=to[i];ctx.globalAlpha=1-motion;ctx.fillStyle=colorBlend(colorFor(previous,record,copy.index),pink,motion);ctx.beginPath();ctx.arc(mix(a.x,b.x,motion),mix(a.y,b.y,motion),mix(a.r,b.r,motion),0,7);ctx.fill();});
 ctx.globalAlpha=1;
}
function drawTemperatures(previous,motion){
 const p=layouts.temperatures,from=targetPoints(previous);ctx.save();
 ctx.globalAlpha=motion;ctx.strokeStyle='#E4E4E4';ctx.lineWidth=1;
 for(let tick=p.min;tick<=p.max;tick+=10){line(p.x(tick),p.top,p.x(tick),p.axis);text(tick,p.x(tick),p.axis+20,'center',false,width<650?10:13);}
 text('Coded tested-temperature bounds (°C)',width/2,22,'center',true,width<650?11:14);
 records.forEach((record,i)=>{
  const a=from[i],b=p.points[i],x=mix(a.x,b.x,motion),y=mix(a.y,b.y,motion),r=mix(a.r,b.r,motion),known=temperatureById.has(record.id);
  if(known){const high=mix(a.x,b.highX,motion);ctx.globalAlpha=motion*.23;ctx.strokeStyle='#FB3640';ctx.lineWidth=.8;line(x,y,high,y);ctx.globalAlpha=motion;ctx.fillStyle='#FB3640';ctx.beginPath();ctx.arc(high,y,b.r,0,7);ctx.fill();}
  ctx.globalAlpha=1;ctx.fillStyle=known?'#FB3640':'#DADADA';ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
 });
 ctx.globalAlpha=motion;text(storyData.temperatureSummary.missing+' without numeric bounds',p.left,p.axis+40,'left',false,width<650?10:12);ctx.restore();
}
function showBeat(state){
 const displayKey=state.scene==='bodies'?state.index+':'+state.reveal:state.index;
 if(displayKey===activeIndex)return;activeIndex=displayKey;hideTooltip();
 beats.forEach((b,i)=>{b.card.classList.toggle('is-active',i===state.index);b.card.classList.toggle('is-past',i<state.index);b.card.inert=i!==state.index;b.card.setAttribute('aria-hidden',i!==state.index);});
 const map=state.scene==='map';pick('map-key').hidden=!map;pick('plot-help').hidden=!map;
 metadataChart.hidden=state.scene!=='reporting';
 criteriaChart.hidden=!(figureMode?.internal&&state.scene==='criteria');
 accessChart.hidden=!(figureMode?.internal&&state.scene==='reuse');
 pick('plot-help').textContent=map?'Hover or tap the map to explore locations':'';
 const body=state.scene==='bodies';bodyReveal=state.reveal??0;
 pick('scene-label').textContent=['intro','growth','map','bodies','end','reporting'].includes(state.scene)||figureMode?.internal&&['criteria','reuse'].includes(state.scene)?'':state.scene==='participants'?'Two views of experiment-level means':membershipDefinitions[state.scene]?membershipDefinitions[state.scene].length+' overlapping views of 295 experiments':state.scene==='temperatures'?'One row = one experiment’s coded temperature range':state.scene==='reuse'?'Circle area = reported sample size':'One circle = one experiment';
 if(figureMode?.internal){pick('map-key').hidden=true;pick('plot-help').hidden=true;pick('scene-label').hidden=true;}
 updateCases();
}
function drawFinale(state,time){
 const progress=reduced.matches?1:minmax(state.phase/.30),merge=ease(progress),t=reduced.matches?0:time/1000;
 const reveal=ease((progress-.76)/.24),hidden=reveal<.05;
 state.card.style.setProperty('--finale-reveal',reveal);
 if(state.card.inert!==hidden){state.card.inert=hidden;state.card.setAttribute('aria-hidden',hidden);}
 const compact=width<650,cx=width/2,cy=height/2;
 const rx=compact?width*.46:Math.min(width*.43,height*.76),ry=compact?Math.min(height*.41,width*.87):height*.42;
 const growth=ease((progress-.22)/.78);
 ctx.fillStyle='#FB3640';
 if(growth>0){
  ctx.beginPath();
  for(let i=0;i<=96;i++){
   const angle=i/96*Math.PI*2;
   const swell=1+.045*Math.sin(angle*3+t*.48)+.028*Math.sin(angle*5-t*.31)+.025*Math.cos(angle*2+t*.37);
   const x=cx+Math.cos(angle)*rx*swell*growth,y=cy+Math.sin(angle)*ry*swell*growth;
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.fill();
 }
 if(merge<1){
  records.forEach((record,i)=>{
   const p=layouts.growth[i],angle=i*Math.PI*(3-Math.sqrt(5)),distance=.48*Math.sqrt((i+.5)/records.length);
   const x=mix(p.x,cx+Math.cos(angle)*rx*distance,merge),y=mix(p.y,cy+Math.sin(angle)*ry*distance,merge);
   ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();
  });
 }
 if(!reduced.matches)schedule();
}
// Article figures reveal their own marks. They never borrow another chart's coordinates.
function paintInternal(state,time){
 const phase=reduced.matches?1:state.phase;
 const dot=(p,color,alpha=1,scale=1,outline=false)=>{
  if(alpha<=0||p.r<=0)return;
  ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.strokeStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,p.r*scale,0,Math.PI*2);
  if(outline){ctx.lineWidth=1.4;ctx.stroke();}else ctx.fill();ctx.globalAlpha=1;
 };
 const sampleLabel=(record,p,alpha,color)=>{
  if(!record.size||alpha<=0)return;
  let size=Math.min(19,p.r*.96);ctx.font='600 '+size+'px "IBM Plex Sans",sans-serif';
  const measured=ctx.measureText(String(record.size)).width;
  if(measured>p.r*1.7){size*=p.r*1.7/measured;ctx.font='600 '+size+'px "IBM Plex Sans",sans-serif';}
  ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(record.size,p.x,p.y+.2);ctx.globalAlpha=1;ctx.textBaseline='alphabetic';
 };
 if(state.scene==='end'){drawFinale({...state,phase:1},time);return;}
 if(state.scene==='bodies'){pick('cases').style.opacity=1;return;}
 if(state.scene==='reuse'){
  [...accessChart.querySelectorAll('.access-route')].forEach((card,i)=>card.style.setProperty('--route-reveal',ease((phase-i*.065)/.6)));
  return;
 }
 if(state.scene==='criteria'||state.scene==='reporting'){
  const chart=state.scene==='criteria'?criteriaChart:metadataChart;
  chart.style.setProperty('--metadata-opacity',1);
  [...chart.querySelectorAll('.metadata-row')].forEach((row,i)=>row.style.setProperty('--bar-reveal',ease((phase-i*.055)/.55)));
  return;
 }
 if(state.scene==='map'){
  window.atlasReadingFigures?.drawMap(phase);return;
 }
 if(state.scene==='participants'){
  window.atlasReadingFigures?.drawParticipants(phase);return;
 }
 if(state.scene==='temperatures'){
  window.atlasReadingFigures?.drawTemperatures(phase);return;
 }
 if(state.scene==='prevalence'){drawMembership(state,state,1);return;}
 if(state.scene==='setting'){window.atlasReadingFigures?.drawSetting(phase);return;}
 if(state.scene==='setting'||state.scene==='spaces'){
  const p=layouts[state.scene];for(const row of p.labels)text(row.label+' · '+row.count,p.left,row.y,'left',true,width<650?11:14);
  records.forEach((r,i)=>dot(p.points[i],'#FB3640',ease((phase-i/records.length*.35)/.55)));return;
 }
 if(state.scene==='growth'||state.scene==='reuse'){
  const cursor=minmax(phase/.86)*12;
  records.forEach((r,i)=>{
   if(r.size===null)return;
   const reveal=state.scene==='growth'?ease((cursor-(r.year-2013)-(i%13)/13*.6)/.35):ease((phase-(i%17)*.012)/.55);
   const p=layouts.growth[i],shared=sharedById.has(r.id),color=state.scene==='reuse'&&!shared?'#DADADA':'#FB3640';
   dot(p,color,reveal,.5+.5*reveal,!r.size);sampleLabel(r,p,reveal,state.scene==='reuse'&&!shared?'#666':'#FFF');
  });
  if(state.scene==='growth'){
   text(Math.min(2024,2013+Math.floor(cursor)),22,height-31,'left',true);text('Publication year',22,height-12,'left',false,12);
   const gap=(width-44)/12;for(let j=0;j<12;j++){const count=records.filter(r=>r.year===2013+j).length;ctx.fillStyle=cursor>j?'#FB3640':'#E4E4E4';ctx.fillRect(22+j*gap,height-56-count*.55,gap-4,count*.55);}
  }
 }
}
function paint(time=0){
 pending=null;if(!layouts||figureMode&&!figureMode.visible)return;const state=storyState();lastState=state;showBeat(state);ctx.clearRect(0,0,width,height);
 if(!figureMode)pick('reading-progress').style.width=(minmax(scrollY/(document.documentElement.scrollHeight-innerHeight))*100)+'%';
 if(state.index<0)return;
 if(figureMode?.internal){paintInternal(state,time);return;}
 if(state.scene==='end'){drawFinale(state,time);return;}
 const previous=beats[Math.max(0,state.index-1)],motion=reduced.matches?1:ease(state.phase/.32),from=targetPoints(previous),to=targetPoints(state);
 if(state.scene==='reporting'){
  metadataChart.style.setProperty('--metadata-opacity',motion);
  metadataRows.forEach((row,i)=>row.style.setProperty('--bar-reveal',reduced.matches?1:ease((state.phase-i*.018)/.30)));
  return;
 }
 const enteringMap=state.scene==='map'&&previous.scene!=='map';
 const exitingMap=previous.scene==='map'&&state.scene!=='map';
 if(state.scene==='map'||exitingMap){drawMapBase(state.scene==='map'?(enteringMap?motion:1):1-motion,state.focus);}
 drawDepartingCopies(previous,to,motion);
 if(state.scene==='bodies'){
  const arrival=previous.scene==='bodies'?1:motion;pick('cases').style.opacity=arrival;
  if(arrival<1){records.forEach((record,i)=>{const p=from[i],which=details.findIndex(d=>d.id===record.id);ctx.globalAlpha=(1-arrival)*(which>=0?1:.45);ctx.fillStyle='#FB3640';ctx.beginPath();ctx.arc(which<0?p.x:mix(p.x,width*(which+.5)/3,arrival),which<0?p.y:mix(p.y,height*.25,arrival),p.r,0,7);ctx.fill();});ctx.globalAlpha=1;}
  return;
 }
 if(membershipDefinitions[state.scene]){drawMembership(state,previous,motion);return;}
 if(state.scene==='participants'){drawParticipants(state,previous,motion);if(exitingMap)drawMapMarkers(1-motion,state);return;}
 if(state.scene==='temperatures'){drawTemperatures(previous,motion);return;}
 const mapMerge=state.scene==='map'?(enteringMap?ease((state.phase-.14)/.20):1):exitingMap?1-motion:0;
 const yearCursor=minmax(state.phase/.76)*12,labels=[];
 records.forEach((record,i)=>{
  let a=from[i],b=to[i],alpha=1,outline=false;
  let old=isSubset(state)?colorFor(previous,record):pink,target=colorFor(state,record);
  if(state.scene==='growth'){
   const appeared=reduced.matches?1:minmax((yearCursor-(record.year-2013)-((i%13)/13)*.6)/.35);if(appeared===0)return;
   alpha=appeared;b={...b,r:b.r*(.44+.56*ease(appeared))};a=b;outline=!record.size;
  }
  if(state.scene==='reuse')outline=!record.size;
  if(state.scene==='map'&&siteByExperiment.get(record.id).length)alpha*=1-mapMerge;
  if(exitingMap)alpha*=motion;
  if(previous.scene==='bodies')alpha*=motion;
  const p={x:mix(a.x,b.x,motion),y:mix(a.y,b.y,motion),r:mix(a.r,b.r,motion)};
  ctx.globalAlpha=alpha;ctx.fillStyle=colorBlend(old,target,motion);ctx.strokeStyle=ctx.fillStyle;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);if(outline){ctx.lineWidth=1.5;ctx.stroke();}else ctx.fill();
  if((state.scene==='growth'||state.scene==='reuse')&&record.size)labels.push({p,n:record.size,alpha,color:state.scene==='reuse'&&!sharedById.has(record.id)?'#666':'#FFF'});
 });ctx.globalAlpha=1;
 if(state.scene==='map'){
  drawMapMarkers(mapMerge,state);text(geography.unmappedIds.length+' experiments not mapped',layouts.map.unlocated.x,layouts.map.unlocated.y,'left',true,width<650?10:12);
 }else if(exitingMap)drawMapMarkers(1-motion,state);
 for(const label of labels){const {p,n,alpha,color}=label;let size=Math.min(19,p.r*.96);ctx.font='600 '+size+'px "IBM Plex Sans",sans-serif';const measured=ctx.measureText(String(n)).width;if(measured>p.r*1.7){size*=p.r*1.7/measured;ctx.font='600 '+size+'px "IBM Plex Sans",sans-serif';}ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(n),p.x,p.y+.2);}ctx.globalAlpha=1;ctx.textBaseline='alphabetic';
 if(state.scene==='growth'){
  const year=reduced.matches?2024:Math.min(2024,2013+Math.floor(yearCursor));text(year,22,height-31,'left',true);text('Publication year',22,height-12,'left',false,12);
  const gap=(width-44)/12;for(let j=0;j<12;j++){const count=records.filter(r=>r.year===2013+j).length;ctx.fillStyle=reduced.matches||yearCursor>j?'#FB3640':'#E4E4E4';ctx.fillRect(22+j*gap,height-56-count*.55,gap-4,count*.55);}
 }
 if(state.scene==='setting'||state.scene==='spaces'){
  ctx.globalAlpha=motion;const p=layouts[state.scene];for(const row of p.labels)text(row.label+' · '+row.count,p.left,row.y,'left',true,width<650?11:14);ctx.globalAlpha=1;
 }
}
function hideTooltip(){tooltipPinned=false;pick('map-tooltip').hidden=true;}
function tooltipAt(html,x,y){
 const tip=pick('map-tooltip');tip.innerHTML=html;tip.hidden=false;tip.style.left=minmax(x+16,8,width-tip.offsetWidth-10)+'px';tip.style.top=minmax(y+16,8,height-tip.offsetHeight-10)+'px';
}
function mapTooltip(event){
 if(lastState?.scene!=='map'){hideTooltip();return;}
 const rect=pick('plot').getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
 const markers=layouts.map.markers.filter(m=>(!figureMode?.internal||m.drawR>0)&&Math.hypot(x-m.x,y-m.y)<=Math.max((figureMode?.internal?m.drawR:m.r)+5,9)).sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y));
 const marker=markers[0];
 if(marker){
  const country=geography.countryCounts[marker.country];
  const approximate=marker.precisions.some(p=>p==='province'||p==='institute');
  const known=marker.ids.filter(id=>recordById.get(id)?.size!==null).length;
  tooltipAt('<strong>'+escapeHTML(marker.city)+'</strong>'+escapeHTML(marker.country)+'<br><b>'+marker.count+'</b> experiment'+(marker.count===1?'':'s')+' at this mapped location<br>'+(known?'<b>'+marker.sampleSum.toLocaleString()+'</b> summed reported samples':'Sample size not reported')+'<small>'+country.count+' experiments in '+escapeHTML(marker.country)+' overall.'+(known&&known<marker.count?' Sample-size sum covers '+known+' of these '+marker.count+' experiments.':'')+(approximate?' Includes approximate province/state or institution-level locations.':'')+(marker.precisions.includes('multi')?' Includes a multi-site experiment.':'')+'</small>',x,y);return;
 }
 const unmapped=figureMode?.internal?[]:records.filter(r=>siteByExperiment.get(r.id).length===0),unlocatedPoint=unmapped.find(r=>{const p=layouts.map.points[records.indexOf(r)];return Math.hypot(x-p.x,y-p.y)<7;});
 if(unlocatedPoint){tooltipAt('<strong>Experiment '+unlocatedPoint.id+'</strong>City not reported<br>Country: '+escapeHTML(canonicalCountry(unlocatedPoint.country))+'<br>Reported sample size: '+(unlocatedPoint.size??'Not reported'),x,y);return;}
 const t=layouts.map.transform,mx=(x-t.x)/t.scale,my=(y-t.y)/t.scale;
 const country=mapPaths.find(p=>hitCtx.isPointInPath(p.path,mx,my));
 if(country){const name=worldAliases[country.name]??country.name,entry=geography.countryCounts[name];tooltipAt('<strong>'+escapeHTML(name)+'</strong><b>'+(entry?.count??0)+'</b> reviewed experiment'+(entry?.count===1?'':'s')+(entry?'<br><b>'+entry.samples.toLocaleString()+'</b> summed reported samples':'')+(name==='China'?'<small>China follows the corpus country label. Hong Kong is counted separately.</small>':''),x,y);return;}
 hideTooltip();
}
pick('plot').addEventListener('pointermove',event=>{if(event.pointerType!=='touch'&&!tooltipPinned)mapTooltip(event);});
pick('plot').addEventListener('pointerleave',()=>{if(!tooltipPinned)hideTooltip();});
pick('plot').addEventListener('click',event=>{tooltipPinned=false;mapTooltip(event);tooltipPinned=!pick('map-tooltip').hidden;});
addEventListener('keydown',event=>{if(event.key==='Escape')hideTooltip();});
function schedule(){if(pending===null)pending=requestAnimationFrame(paint);}
addEventListener('scroll',()=>{hideTooltip();schedule();},{passive:true});reduced.addEventListener('change',schedule);
new ResizeObserver(resize).observe(pick('visual'));document.fonts.ready.then(resize);resize();
if(figureMode){
 addEventListener('message',event=>{
  const data=event.data;
  if(event.origin!==location.origin||event.source!==parent||data?.type!=='atlas-figure-progress'||data.id!==figureMode.id||!Number.isFinite(data.phase))return;
  figureMode.phase=minmax(data.phase);figureMode.visible=Boolean(data.visible);
  if(figureMode.internal){
   if(Number.isFinite(data.climateProgress))figureMode.climateProgress=minmax(data.climateProgress);
   if(Number.isInteger(data.reveal)&&data.reveal>=0&&data.reveal<=6)figureMode.reveal=data.reveal;
   if(Array.isArray(data.exclusions)){
    const boxes=data.exclusions.filter(b=>['left','right','top','bottom'].every(k=>Number.isFinite(b[k])));
    const signature=JSON.stringify(boxes);
    if(signature!==figureMode.exclusionSignature){figureMode.exclusions=boxes;figureMode.exclusionSignature=signature;rebuildLayouts();}
   }
  }
  schedule();
 });
 if(parent!==window)parent.postMessage({type:'atlas-figure-ready',id:figureMode.id},location.origin);
}
if(location.hash)requestAnimationFrame(()=>{const id=location.hash.slice(1),aliases={china:'geography',climate:'geography',bmi:'participants',health:'profile','thermal-history':'profile',medication:'profile',cardiovascular:'profile',smoking:'profile','skin-temperature':'signals','body-sites':'measurement',sensors:'measurement',calculation:'measurement',duration:'protocol',controls:'protocol'};pick(aliases[id]??id)?.scrollIntoView({block:'start'});});
