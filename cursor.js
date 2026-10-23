(() => {
  'use strict';
  const root=document.documentElement, sprite=document.querySelector('#studio-cursor');
  const fine=matchMedia('(any-hover:hover) and (any-pointer:fine)'), colors=matchMedia('(forced-colors:active)');
  let point=null, target=null, mouse=false;
  const sprites={};
  function prepare(kind) {
    if(sprites[kind]!==undefined)return;
    sprites[kind]='loading';const image=new Image();
    image.onload=()=>{sprites[kind]=true;refresh();};
    image.onerror=()=>{sprites[kind]=false;refresh();};
    image.src=`./assets/cursors/${kind==='pet'?'pet':'wait'}-sheet.svg`;
  }
  function clear() {
    target?.classList.remove('cursor-sprite-target');target=null;sprite.hidden=true;delete root.dataset.cursor;
  }
  function refresh() {
    const available=fine.matches && !colors.matches && mouse && !document.hidden;
    root.classList.toggle('pixel-cursors',available);
    if(!available || !point)return clear();
    const element=document.elementFromPoint(point.x,point.y);
    const cat=element?.closest('#cat-hotspot:not(:disabled)');
    const busy=!element?.closest('input,textarea,[contenteditable=true]') && element?.closest('[aria-busy=true]');
    const next=cat || busy;
    if(!next || root.classList.contains('is-dragging'))return clear();
    const kind=cat?'pet':'wait';prepare(kind);
    // Retain the native/CSS cursor until the animated graphic has loaded.
    if(sprites[kind]!==true)return clear();
    if(target!==next) {clear();target=next;target.classList.add('cursor-sprite-target');}
    if(sprite.dataset.kind!==kind)sprite.dataset.kind=kind;
    root.dataset.cursor=kind;sprite.hidden=false;
    sprite.style.transform=`translate(${point.x-12}px,${point.y-4}px)`;
  }
  document.addEventListener('pointermove',event=> {
    mouse=event.pointerType==='mouse';point={x:event.clientX,y:event.clientY};refresh();
  },{passive:true});
  document.addEventListener('pointerdown',event=> {if(event.pointerType==='touch'){mouse=false;refresh();}},{passive:true});
  document.addEventListener('pointerleave',clear);
  addEventListener('blur',()=>{clear();root.classList.remove('is-dragging');});
  addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  document.addEventListener('studio:drag',event=> {root.classList.toggle('is-dragging',event.detail);refresh();});
  fine.addEventListener('change',refresh);colors.addEventListener('change',refresh);
  new MutationObserver(refresh).observe(document.querySelector('#app'),{subtree:true,childList:true,attributes:true,attributeFilter:['aria-busy','disabled','data-state','hidden']});
})();
