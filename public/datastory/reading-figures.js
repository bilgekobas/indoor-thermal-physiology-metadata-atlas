// Figures used only by the continuous reading edition.
(()=>{
 if(!figureMode?.internal)return;
 const ns='http://www.w3.org/2000/svg';
 const element=(tag,attrs={},value)=>{const node=document.createElementNS(ns,tag);for(const [key,item] of Object.entries(attrs))node.setAttribute(key,String(item));if(value!==undefined)node.textContent=value;return node;};
 const climateColors=['#5B5BFF','#8A8A8A','#C1C1C1','#79FFFB','#D5FF99','#FB3640','#4A4A4A','#F1FF71','#FF4DA6','#E4E4E4'];
 let mapSizing='experiments',flowClip,flowFigure,flowSize='',mapTools,climateLegend;
 const mappedCount=records.filter(r=>siteByExperiment.get(r.id).length).length;
 const mappedSamples=records.filter(r=>siteByExperiment.get(r.id).length&&r.size!==null).length;
 function initialiseMap(){
  if(mapTools||figureMode.id!=='geography')return;
  mapTools=document.createElement('div');mapTools.className='reading-map-tools';
  mapTools.innerHTML='<span class="map-n">n = '+mappedCount+'</span><div class="map-size-buttons" role="group" aria-label="Size location markers by"><button type="button" data-size="experiments" aria-pressed="true">Experiments</button><button type="button" data-size="samples" aria-pressed="false">Summed samples</button></div>';
  mapTools.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
   mapSizing=button.dataset.size;
   mapTools.querySelector('.map-n').textContent='n = '+(mapSizing==='samples'?mappedSamples:mappedCount);
   mapTools.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===button));hideTooltip();schedule();
  }));pick('visual').append(mapTools);
  climateLegend=document.createElement('div');climateLegend.className='reading-climate-legend';climateLegend.setAttribute('aria-label','Location climate');
  climateLegend.innerHTML=groups.map((label,i)=>'<span><i style="background:'+climateColors[i]+'"></i>'+escapeHTML(label)+'</span>').join('');pick('visual').append(climateLegend);
 }
 function drawMap(phase){
  initialiseMap();drawMapBase(1);
  const climate=ease(figureMode.climateProgress??0),markers=layouts.map.markers;
  const maximum=Math.max(...markers.map(m=>mapSizing==='samples'?m.sampleSum:m.count),1),maxRadius=width<650?17:31;
  if(climateLegend){climateLegend.style.setProperty('--climate-reveal',climate);climateLegend.setAttribute('aria-hidden',climate===0);}
  let moving=false;
  markers.forEach((m,i)=>{
   const weight=mapSizing==='samples'?m.sampleSum:m.count,target=maxRadius*Math.sqrt(weight/maximum);
   if(m.drawR===undefined)m.drawR=target;
   m.drawR=mix(m.drawR,target,reduced.matches?1:.22);if(Math.abs(m.drawR-target)>.025)moving=true;else m.drawR=target;
   if(m.drawR<=0)return;
   const reveal=ease((phase-(i%17)*.015)/.55),radius=m.drawR*(.35+.65*reveal);
   if(reveal<=0)return;
   const shares=Array(groups.length).fill(0);
   m.ids.forEach(id=>{const record=recordById.get(id);if(record)shares[record.zone]+=mapSizing==='samples'?(record.size??0):1;});
   const sum=shares.reduce((a,b)=>a+b,0);let angle=-Math.PI/2;
   ctx.save();ctx.globalAlpha=reveal;
   shares.forEach((value,zone)=>{
    if(!value||!sum)return;
    const next=angle+value/sum*Math.PI*2,hex=climateColors[zone],rgb=hex.match(/[\da-f]{2}/gi).map(v=>parseInt(v,16));
    ctx.fillStyle=colorBlend(pink,rgb,climate);ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.arc(m.x,m.y,radius,angle,next);ctx.closePath();ctx.fill();angle=next;
   });
   ctx.beginPath();ctx.arc(m.x,m.y,radius,0,Math.PI*2);ctx.strokeStyle='#FCFCFC';ctx.lineWidth=.8;ctx.stroke();ctx.restore();
  });
  if(moving)schedule();
 }
 const settingOrder=['Lab','Living Lab','Field','Mixed'],typeOrder=['Office/Workstations','Desk&Chair','Seating','Classroom/Study room','Residential','Free-living'];
 const complete=records.filter(r=>settingOrder.includes(r.setting)&&typeOrder.includes(r.typology));
 const settingColors=['#FB3640','#5B5BFF','#79CFCB','#8A8A8A'];
 const labels={'Living Lab':'Living laboratory','Office/Workstations':'Office / workstation','Desk&Chair':'Desk & chair','Classroom/Study room':'Classroom / study room'};
 function resizeFlow(){
  if(figureMode.id!=='setting'||flowSize===width+'x'+height)return;
  flowSize=width+'x'+height;
  if(!flowFigure){flowFigure=document.createElement('figure');flowFigure.className='setting-flow';flowFigure.setAttribute('aria-label','Experimental setting and spatial type in '+complete.length+' experiments');pick('visual').append(flowFigure);}
  const compact=width<650,left=compact?113:245,right=width-(compact?124:275),bar=10,margin=66,gap=compact?32:29;
  const pairs=new Map();complete.forEach(r=>{const key=r.setting+'|'+r.typology;pairs.set(key,(pairs.get(key)??0)+1);});
  const unit=(height-margin-24-gap*(typeOrder.length-1))/Math.max(1,complete.length);
  const makeNodes=(order,key,x)=>{
   const totalGap=gap*(order.length-1),used=complete.length*unit+totalGap;let y=margin+(height-margin-24-used)/2;
   return order.map((name,i)=>{const count=complete.filter(r=>r[key]===name).length,node={name,count,x,y,h:count*unit,color:settingColors[i]};y+=node.h+gap;return node;});
  };
  const source=makeNodes(settingOrder,'setting',left),target=makeNodes(typeOrder,'typology',right),svg=element('svg',{viewBox:'0 0 '+width+' '+height,role:'img','aria-label':flowFigure.getAttribute('aria-label')}),defs=element('defs'),clip=element('clipPath',{id:'setting-flow-clip'});
  flowClip=element('rect',{x:0,y:0,width:0,height});clip.append(flowClip);defs.append(clip);svg.append(defs);
  svg.append(element('text',{x:left-10,y:23,'text-anchor':'end',class:'flow-heading'},compact?'Setting':'Experimental setting'));
  svg.append(element('text',{x:right+bar+10,y:23,class:'flow-heading'},'Spatial type'));
  svg.append(element('text',{x:width/2,y:45,'text-anchor':'middle',class:'flow-count'},'n = '+complete.length));
  const sourceUsed=new Map(),targetUsed=new Map();
  for(const a of source)for(const b of target){
   const count=pairs.get(a.name+'|'+b.name)??0;if(!count)continue;
   const sy=a.y+(sourceUsed.get(a.name)??0),ty=b.y+(targetUsed.get(b.name)??0),t=count*unit,x1=left+bar,x2=right,m=(x1+x2)/2;
   sourceUsed.set(a.name,(sourceUsed.get(a.name)??0)+t);targetUsed.set(b.name,(targetUsed.get(b.name)??0)+t);
   const path=element('path',{d:'M'+x1+','+sy+'C'+m+','+sy+' '+m+','+ty+' '+x2+','+ty+'L'+x2+','+(ty+t)+'C'+m+','+(ty+t)+' '+m+','+(sy+t)+' '+x1+','+(sy+t)+'Z',fill:a.color,'fill-opacity':.30,'clip-path':'url(#setting-flow-clip)'});
   path.append(element('title',{},(labels[a.name]??a.name)+' → '+(labels[b.name]??b.name)+': '+count+' experiments'));svg.append(path);
  }
  for(const [column,nodes] of [[0,source],[1,target]])for(const node of nodes){
   const x=node.x+(column?bar+10:-10),anchor=column?'start':'end',name=compact?({'Office/Workstations':'Office','Classroom/Study room':'Classroom','Living Lab':'Living lab'}[node.name]??labels[node.name]??node.name):(labels[node.name]??node.name);
   const g=element('g');g.append(element('rect',{x:node.x,y:node.y,width:bar,height:node.h,fill:column?'#BBBBBB':node.color}));
   g.append(element('text',{x,y:node.y+node.h/2-2,'text-anchor':anchor,class:'flow-label'},name));
   g.append(element('text',{x,y:node.y+node.h/2+14,'text-anchor':anchor,class:'flow-count'},node.count));g.append(element('title',{},(labels[node.name]??node.name)+': '+node.count+' experiments'));svg.append(g);
  }
  flowFigure.replaceChildren(svg);
 }
 function drawSetting(phase){resizeFlow();if(flowClip)flowClip.setAttribute('width',width*ease(phase/.85));}
 function summarise(values){
  const sorted=[...values].sort((a,b)=>a-b),quantile=p=>{const i=(sorted.length-1)*p;return mix(sorted[Math.floor(i)],sorted[Math.ceil(i)],i%1);};
  const q1=quantile(.25),median=quantile(.5),q3=quantile(.75),iqr=q3-q1,low=sorted.find(v=>v>=q1-1.5*iqr),high=sorted.findLast(v=>v<=q3+1.5*iqr);
  return {q1,median,q3,low,high,outliers:sorted.filter(v=>v<low||v>high)};
 }
 const participantData=window.atlasParticipantIntervals;
 const participantSummaries=Object.fromEntries(['age','bmi'].map(key=>[key,summarise(participantData[key].map(row=>row[1]))]));
 const temperatureRows=[...temperatureById.values()].sort((a,b)=>(a.low+a.high)-(b.low+b.high)||a.low-b.low);
 const temperatureSummaries={low:summarise(temperatureRows.map(r=>r.low)),high:summarise(temperatureRows.map(r=>r.high))};
 function summaryBox(summary,x,y,progress,label,left){
  const grow=value=>x(mix(summary.median,value,progress)),a=grow(summary.low),b=grow(summary.high),q1=grow(summary.q1),q3=grow(summary.q3);
  ctx.save();ctx.globalAlpha=progress;ctx.lineWidth=1;ctx.strokeStyle='#8A8A8A';line(a,y,b,y);line(a,y-7,a,y+7);line(b,y-7,b,y+7);
  ctx.fillStyle='#FFF0F1';ctx.fillRect(q1,y-8,q3-q1,16);ctx.strokeRect(q1,y-8,q3-q1,16);ctx.strokeStyle='#FB3640';ctx.lineWidth=2;line(x(summary.median),y-8,x(summary.median),y+8);
  ctx.fillStyle='#FB3640';summary.outliers.forEach(value=>{ctx.beginPath();ctx.arc(grow(value),y,1.8,0,Math.PI*2);ctx.fill();});ctx.restore();
  text(label,left,y-18,'left',false,width<650?10:12);
 }
 function plotAxis(x,min,max,ticks,top,axis,font=width<650?10:12){
  ctx.save();ctx.strokeStyle='#E4E4E4';ctx.lineWidth=1;
  for(const tick of ticks){line(x(tick),top,x(tick),axis);text(tick,x(tick),axis+21,'center',false,font);}
  ctx.strokeStyle='#8A8A8A';line(x(min),axis,x(max),axis);ctx.restore();
 }
 function participantRegionsForRanges(){
  if(width<650){const h=(height-20)/2;return [{x:14,w:width-28,top:0,h},{x:14,w:width-28,top:h+20,h}];}
  const gap=52,w=(width-48-gap)/2;return [{x:24,w,top:0,h:height},{x:24+w+gap,w,top:0,h:height}];
 }
 function drawParticipants(phase){
  const regions=participantRegionsForRanges();ctx.save();
  ['age','bmi'].forEach((key,j)=>{
   const region=regions[j],data=participantData[key],min=key==='age'?10:16,max=key==='age'?80:30,ticks=key==='age'?[10,20,30,40,50,60,70,80]:[16,18,20,22,24,26,28,30];
   const left=region.x+14,right=region.x+region.w-14,x=value=>left+(value-min)/(max-min)*(right-left),top=region.top+66,bottom=region.top+region.h-142,axis=region.top+region.h-35,box=axis-40;
   text((key==='age'?'Age (years)':'BMI (kg/m²)')+' · n = '+data.length,region.x+region.w/2,region.top+20,'center',true,width<650?12:14);
   text('Mean ± SD',region.x+region.w/2,region.top+42,'center',false,width<650?10:12);
   plotAxis(x,min,max,ticks,top,axis);
   if(key==='bmi'){
    ctx.save();ctx.strokeStyle='#8A8A8A';ctx.setLineDash([4,4]);for(const value of [18.5,25]){line(x(value),top,x(value),axis);text(value,x(value),top-8,'center',false,width<650?9:11);}ctx.restore();
   }
   data.forEach(([id,mean,sd],i)=>{
    const y=top+i/Math.max(1,data.length-1)*(bottom-top),reveal=ease((phase-i/data.length*.2-j*.04)/.66),m=x(mean);
    if(reveal<=0)return;
    if(sd!==null){const a=x(mean-sd*reveal),b=x(mean+sd*reveal);ctx.strokeStyle='rgba(251,54,64,'+(reveal*.32)+')';ctx.lineWidth=.8;line(a,y,b,y);ctx.fillStyle='rgba(251,54,64,'+(reveal*.65)+')';for(const endpoint of [a,b]){ctx.beginPath();ctx.arc(endpoint,y,width<650?.7:1,0,Math.PI*2);ctx.fill();}}
    ctx.fillStyle='rgba(251,54,64,'+reveal+')';ctx.beginPath();ctx.arc(m,y,width<650?1.2:1.55,0,Math.PI*2);ctx.fill();
   });
   if(data.length)summaryBox(participantSummaries[key],x,box,ease((phase-.28-j*.04)/.62),'Experiment means',left);
  });ctx.restore();
 }
 function drawTemperatures(phase){
  if(!temperatureRows.length)return;
  const left=width<650?30:34,right=width-left,min=Math.floor(Math.min(...temperatureRows.map(r=>r.low))/10)*10,max=Math.ceil(Math.max(...temperatureRows.map(r=>r.high))/10)*10;
  const x=value=>left+(value-min)/(max-min)*(right-left),top=54,bottom=height-180,axis=height-37,ticks=[];for(let tick=min;tick<=max;tick+=10)ticks.push(tick);
  ctx.save();plotAxis(x,min,max,ticks,top,axis);
  text('Tested temperature (°C) · n = '+temperatureRows.length,width/2,22,'center',true,width<650?11:14);
  temperatureRows.forEach((row,i)=>{
   const reveal=ease((phase-i/temperatureRows.length*.2)/.66),y=top+i/Math.max(1,temperatureRows.length-1)*(bottom-top),a=x(row.low),b=x(mix(row.low,row.high,reveal));
   if(reveal<=0)return;
   ctx.strokeStyle='rgba(251,54,64,'+(reveal*.30)+')';ctx.lineWidth=.8;line(a,y,b,y);ctx.fillStyle='rgba(251,54,64,'+reveal+')';for(const endpoint of [a,b]){ctx.beginPath();ctx.arc(endpoint,y,width<650?1.1:1.4,0,Math.PI*2);ctx.fill();}
  });
  summaryBox(temperatureSummaries.low,x,height-117,ease((phase-.28)/.62),'Lower bounds',left);
  summaryBox(temperatureSummaries.high,x,height-73,ease((phase-.34)/.62),'Upper bounds',left);ctx.restore();
 }
 window.atlasReadingFigures={drawMap,drawSetting,drawParticipants,drawTemperatures,resize:resizeFlow};
 if(figureMode.id==='geography')initialiseMap();
 if(figureMode.id==='setting')resizeFlow();
 document.querySelectorAll('#cases .source,#access-chart a').forEach(link=>{link.target='_blank';link.rel='noopener';});
 if(figureMode.id==='reporting'||figureMode.id==='profile'){
  const chart=figureMode.id==='reporting'?metadataChart:criteriaChart,caption=chart.querySelector('figcaption');
  caption.querySelector('strong').textContent+=' · n = '+records.length;caption.querySelector('span').remove();
 }
 schedule();
})();
