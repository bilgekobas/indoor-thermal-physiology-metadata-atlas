// The reading version reuses the same figures without their overlaid narrative.
const requestedFigure=new URLSearchParams(location.search).get('figure');
if(requestedFigure){
 document.documentElement.classList.add('figure-only');
 const internal=new URLSearchParams(location.search).get('animation')==='internal';
 if(internal)document.documentElement.classList.add('figure-internal');
 window.atlasFigure={id:requestedFigure,internal,phase:parent===window?1:0,visible:parent===window,exclusions:[]};
}
