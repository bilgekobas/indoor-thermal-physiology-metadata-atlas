const beatById=new Map(window.atlasBeats.map(beat=>[beat.id,beat]));
const readingOrder=['growth','geography','participants','reporting','profile','setting','temperatures','signals','measurement','reuse','atlas'];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const atlasDestination=document.body.dataset.atlasUrl;
const escapeReading=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readingText=window.atlasReadingCopy;
const comparisonContext=readingText.comparisonContext;
const overrides=readingText.chapters;
document.querySelector('.reading-dek').textContent=readingText.hero.dek;
function copyMarkup(beat){
 const text=overrides[beat.id]??beat,paragraphs=text.paragraphs,lead=text.lead??beat.lead;
 return '<div class="chapter-copy">'+((text.eyebrow??beat.eyebrow)?'<p class="eyebrow">'+(text.eyebrow??beat.eyebrow)+'</p>':'')+'<h2>'+(text.title??beat.title)+'</h2>'+(lead?'<p class="lead">'+lead+'</p>':'')+paragraphs.map(t=>'<p>'+t+'</p>').join('')+(beat.action?'<a class="reading-action" href="'+atlasDestination+'">Explore the Atlas</a>':'')+'</div>';
}
function frameMarkup(beat){return '<iframe class="chapter-animation" title="'+escapeReading(overrides[beat.id]?.title??beat.title)+'" scrolling="no" data-scene="'+beat.id+'"></iframe>';}
const articleChapters=readingOrder.map(id=>{
 const beat=beatById.get(id),element=document.createElement('section');element.className='reading-chapter';element.id=id;element.dataset.scene=beat.scene;
 if(id==='growth'){
  element.classList.add('growth-chapter');
  element.innerHTML='<div class="growth-pin">'+copyMarkup(beat)+'<figure class="growth-field">'+frameMarkup(beat)+'</figure><div class="growth-space" aria-hidden="true"></div><p class="chapter-caption growth-caption">Circle area = sample size · n = 292</p></div>';
 }else if(id==='geography'){
  element.classList.add('geography-chapter');
  element.innerHTML=copyMarkup(beat)+'<div class="geography-scroll"><figure class="chapter-figure geography-graphic">'+frameMarkup(beat)+'</figure><div class="geography-steps"><div class="map-overview-spacer" aria-hidden="true"></div><section class="context-step" id="climate"><div class="context-card"><p class="eyebrow">'+readingText.climate.eyebrow+'</p><h3>'+readingText.climate.title+'</h3><p>'+readingText.climate.text+'</p></div></section></div></div>';
 }else if(id==='measurement'){
  element.classList.add('comparison-chapter');
  element.innerHTML=copyMarkup(beat)+'<div class="comparison-scroll"><figure class="chapter-figure comparison-graphic">'+frameMarkup(beat)+'</figure><div class="comparison-steps"><div class="comparison-overview-spacer" aria-hidden="true"></div>'+comparisonContext.map((step,i)=>'<section class="context-step" id="'+step.id+'" data-reveal="'+step.reveal+'"><div class="context-card"><p class="eyebrow">'+['Measurement sites','Sensor types','Exposure','Session design','Protocol controls','Clock time'][i]+'</p><h3>'+step.title+'</h3><p>'+step.text+'</p></div></section>').join('')+'</div></div>';
 }else if(id==='atlas'){
  element.innerHTML=copyMarkup(beat);
 }else{
  element.innerHTML=copyMarkup(beat)+'<figure class="chapter-figure">'+frameMarkup(beat)+'</figure>';
 }
 document.getElementById('reading-chapters').append(element);
 const iframe=element.querySelector('iframe'),chapter={...beat,element,copy:element.querySelector('.chapter-copy'),iframe,loaded:false,ready:false,started:null,phase:0,start:0,runway:0};
 if(iframe)iframe.addEventListener('load',()=>{chapter.ready=true;scheduleReading();});
 return chapter;
});
const comparison=articleChapters.find(c=>c.id==='measurement'),contextSteps=[...comparison.element.querySelectorAll('.context-step')];
const geographyChapter=articleChapters.find(c=>c.id==='geography');
let readingPending=null;
function clampReading(n){return Math.max(0,Math.min(1,n));}
function measureReading(){
 const viewport=innerHeight,header=document.querySelector('.top').offsetHeight,compact=innerWidth<1320;
 articleChapters.forEach(chapter=>{
  if(!chapter.iframe)return;
  if(chapter.id==='growth'){
   const pin=chapter.element.querySelector('.growth-pin'),caption=chapter.element.querySelector('.growth-caption');
   const pinHeight=Math.max(viewport-header,chapter.copy.offsetHeight+caption.offsetHeight+(innerWidth>800?370:340)+84);
   pin.style.height=pinHeight+'px';chapter.iframe.style.height=pinHeight+'px';
   chapter.runway=reduceMotion.matches?0:viewport*1.65;chapter.element.style.height=(pinHeight+chapter.runway)+'px';
   chapter.start=chapter.element.getBoundingClientRect().top+scrollY-header;return;
  }
  const w=chapter.iframe.parentElement.clientWidth;
 const heights={map:compact?Math.max(370,Math.min(540,w*.52+70)):Math.max(500,Math.min(640,w*.52+70)),participants:w<650?940:540,reporting:420,criteria:420,setting:w<650?560:460,temperatures:540,prevalence:1000,reuse:w<=600?1080:w<=900?760:560};
  let figureHeight=chapter.intrinsicHeight??heights[chapter.scene]??420;
  if(chapter.id==='measurement'){
   const introTop=header+(innerWidth<=700?18:20),introGap=innerWidth<=700?22:16;
   const figureTop=introTop+chapter.copy.offsetHeight+introGap,pinIntro=!reduceMotion.matches&&viewport-figureTop>=(compact?760:540);
   chapter.element.classList.toggle('comparison-with-intro',pinIntro);
   chapter.element.style.setProperty('--comparison-intro-top',introTop+'px');
   chapter.element.style.setProperty('--comparison-figure-top',figureTop+'px');
   chapter.element.style.setProperty('--comparison-page-width',document.documentElement.clientWidth+'px');
   const phone=innerWidth<=700;
   figureHeight=pinIntro?Math.min(compact?550:740,viewport-figureTop-(compact?210:24)):Math.max(compact?390:560,Math.min(compact?(phone?590:550):740,viewport-header-(compact?(phone?210:250):72)));
   chapter.element.style.setProperty('--comparison-height',figureHeight+'px');
   chapter.element.style.setProperty('--context-step-height',(compact?viewport*.85:viewport*.8)+'px');
   chapter.element.classList.toggle('comparison-compact',compact);
  }
  if(chapter.id==='geography'){
   const introTop=header+(innerWidth<=700?18:28),introGap=innerWidth<=700?22:36;
   const figureTop=introTop+chapter.copy.offsetHeight+introGap,available=viewport-figureTop;
   const pinIntro=!reduceMotion.matches&&available>=(compact?410:320);
   chapter.element.classList.toggle('geography-with-intro',pinIntro);
   chapter.element.style.setProperty('--geography-intro-top',introTop+'px');
   chapter.element.style.setProperty('--geography-figure-top',figureTop+'px');
   chapter.element.style.setProperty('--geography-page-width',document.documentElement.clientWidth+'px');
   if(pinIntro)figureHeight=Math.min(figureHeight,Math.max(compact?240:300,available-(compact?180:24)));
   chapter.element.classList.toggle('geography-compact',compact);
   chapter.element.style.setProperty('--geography-height',figureHeight+'px');
   chapter.element.style.setProperty('--context-step-height',viewport*.8+'px');
  }
  chapter.iframe.style.setProperty('--figure-height',figureHeight+'px');
 });
 // End each pinned sequence exactly when its last explanation has passed its visible text area.
 for(const [chapter,prefix] of [[comparison,'comparison'],[geographyChapter,'geography']]){
  const rail=chapter.element.querySelector('.'+prefix+'-scroll'),last=rail.querySelector('.context-step:last-child .context-card');
  rail.style.height='';
  if(!reduceMotion.matches){
   const bottom=last.getBoundingClientRect().bottom-rail.getBoundingClientRect().top;
   const compact=chapter.element.classList.contains(prefix+'-compact');
   rail.style.height=Math.ceil(bottom+(compact?0:chapter.iframe.offsetHeight))+'px';
  }
 }
 scheduleReading();
}
function updateSequence(chapter,prefix,viewport){
 const graphic=chapter.element.querySelector('.'+prefix+'-graphic').getBoundingClientRect(),compact=chapter.element.classList.contains(prefix+'-compact');
 const steps=chapter.element.querySelector('.'+prefix+'-steps'),clipTop=compact?graphic.bottom+12:graphic.top;
 steps.style.clipPath=!reduceMotion.matches?'inset('+Math.max(0,clipTop-steps.getBoundingClientRect().top)+'px 0 0 0)':'';
 if(chapter.element.classList.contains(prefix+'-with-intro')){
  const normalTop=parseFloat(chapter.element.style.getPropertyValue('--'+prefix+'-figure-top'));
  chapter.copy.style.transform='translateY('+Math.min(0,graphic.top-normalTop)+'px)';
 }else chapter.copy.style.transform='';
 if(prefix==='comparison'){
  const trigger=compact?graphic.bottom+(viewport-graphic.bottom)*.52:viewport*.58;
  let active=-1;contextSteps.forEach((step,i)=>{if(step.querySelector('.context-card').getBoundingClientRect().top<=trigger)active=i;});
  contextSteps.forEach((step,i)=>{step.classList.toggle('is-current',i===active);step.classList.toggle('is-past',i<active);});
  return {reveal:reduceMotion.matches?comparisonContext.at(-1).reveal:active<0?0:comparisonContext[active].reveal};
 }
 const card=steps.querySelector('.context-card'),r=card.getBoundingClientRect(),threshold=compact?graphic.bottom+(viewport-graphic.bottom)*.65:viewport*.76;
 const progress=reduceMotion.matches?1:clampReading((threshold-r.top)/(viewport*.30));
 card.parentElement.classList.toggle('is-current',progress>0);
 return {climateProgress:progress};
}
function updateReading(now){
 readingPending=null;const viewport=innerHeight,header=document.querySelector('.top').offsetHeight;let animating=false;
 articleChapters.forEach(chapter=>{
  if(!chapter.iframe)return;
  const rect=chapter.iframe.getBoundingClientRect(),near=rect.bottom>-viewport&&rect.top<viewport*2;
  if(near&&!chapter.loaded){chapter.loaded=true;chapter.iframe.src=chapter.id==='signals'?'sankey.html':'index.html?figure='+encodeURIComponent(chapter.id)+'&animation=internal';}
  if(!chapter.loaded||!chapter.ready)return;
  const visible=!document.hidden&&rect.bottom>header&&rect.top<viewport;let extra={};
  if(chapter.id==='growth'){
   chapter.phase=reduceMotion.matches?1:clampReading((scrollY-chapter.start)/chapter.runway);
   const r=chapter.copy.getBoundingClientRect(),pad=innerWidth>700?28:12,caption=chapter.element.querySelector('.growth-caption').getBoundingClientRect();
   extra.exclusions=[{left:Math.round(r.left-rect.left-pad),right:Math.round(r.right-rect.left+pad),top:Math.round(r.top-rect.top-18),bottom:Math.round(r.bottom-rect.top+28)},{left:Math.round(caption.left-rect.left-8),right:Math.round(caption.right-rect.left+8),top:Math.round(caption.top-rect.top-10),bottom:Math.round(caption.bottom-rect.top+10)}];
  }else{
   if(chapter.id==='measurement'){extra=updateSequence(chapter,'comparison',viewport);chapter.phase=1;}
   else{
    if(chapter.id==='geography')extra=updateSequence(chapter,'geography',viewport);
    const share=Math.max(0,Math.min(rect.bottom,viewport)-Math.max(rect.top,header))/Math.min(rect.height,viewport-header);
    if(chapter.started===null&&visible&&share>.45&&rect.top<viewport*.65)chapter.started=now;
    const duration=chapter.id==='signals'?2200:['reporting','criteria','reuse'].includes(chapter.scene)?1500:1200;
    chapter.phase=reduceMotion.matches?1:chapter.started===null?0:clampReading((now-chapter.started)/duration);
    if(visible&&chapter.phase<1&&chapter.started!==null)animating=true;
   }
  }
  chapter.iframe.contentWindow.postMessage({type:'atlas-figure-progress',id:chapter.id,phase:chapter.phase,visible,...extra},location.origin);
 });
 const hero=document.querySelector('.reading-hero'),top=document.querySelector('.top'),nameHidden=hero.querySelector('.eyebrow').getBoundingClientRect().bottom>header,hintHidden=hero.querySelector('.reading-hint').getBoundingClientRect().bottom>header;
 top.classList.toggle('has-name',!nameHidden);top.classList.toggle('has-hint',!hintHidden);
 top.querySelector('.name').setAttribute('aria-hidden',nameHidden);top.querySelector('.name').tabIndex=nameHidden?-1:0;
 top.querySelector('.header-hint').setAttribute('aria-hidden',hintHidden);
 top.querySelector('.header-hint').tabIndex=hintHidden?-1:0;
 const end=document.getElementById('atlas').getBoundingClientRect();document.body.classList.toggle('at-ending',end.top<=header+1&&end.bottom>=viewport-1);
 const total=document.documentElement.scrollHeight-innerHeight;document.getElementById('article-progress').style.width=(total>0?clampReading(scrollY/total)*100:0)+'%';
 if(animating)scheduleReading();
}
function scheduleReading(){if(readingPending===null)readingPending=requestAnimationFrame(updateReading);}
addEventListener('scroll',scheduleReading,{passive:true});addEventListener('resize',measureReading);document.addEventListener('visibilitychange',scheduleReading);reduceMotion.addEventListener('change',measureReading);
addEventListener('message',event=>{
 if(event.origin!==location.origin)return;
 const chapter=articleChapters.find(ch=>ch.id===event.data?.id&&ch.iframe?.contentWindow===event.source);if(!chapter)return;
 if(event.data.type==='atlas-figure-ready'){chapter.ready=true;scheduleReading();}
 if(event.data.type==='atlas-figure-height'&&Number.isFinite(event.data.height)&&event.data.height>100&&event.data.height<8000){chapter.intrinsicHeight=event.data.height;measureReading();}
});
document.fonts.ready.then(()=>{measureReading();if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start'});});
measureReading();
