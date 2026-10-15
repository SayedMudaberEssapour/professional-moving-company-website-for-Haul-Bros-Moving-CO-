(() => {
 const button=document.getElementById('hb-mobile-menu-button');
 const menu=document.getElementById('hb-mobile-menu');
 const more=document.getElementById('hb-quick-more-button');
 if(!button||!menu)return;
 const setOpen=open=>{
  menu.classList.toggle('hidden',!open);
  button.setAttribute('aria-expanded',String(open));
  button.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
  more?.setAttribute('aria-expanded',String(open));
  document.getElementById('hb-mobile-menu-open-icon')?.classList.toggle('hidden',open);
  document.getElementById('hb-mobile-menu-close-icon')?.classList.toggle('hidden',!open);
 };
 button.addEventListener('click',()=>setOpen(button.getAttribute('aria-expanded')!=='true'));
 more?.addEventListener('click',()=>setOpen(button.getAttribute('aria-expanded')!=='true'));
 menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setOpen(false)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
 window.addEventListener('resize',()=>{if(window.innerWidth>=1024)setOpen(false)});
})();
