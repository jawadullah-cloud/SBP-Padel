(function(){
  'use strict';
  function user(){try{return JSON.parse(localStorage.getItem('sbpPadelUser')||'{}')}catch{return{}}}
  function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}
  function paint(){
    const hero=document.querySelector('#home .heroText');if(!hero)return;
    const u=user(),name=(u.full_name||'Player').trim().split(/\s+/)[0]||'Player';
    const over=hero.querySelector('.overline'),title=hero.querySelector('h1'),copy=hero.querySelector('p:not(.overline)');
    if(over)over.textContent=`${greeting()}, ${name}`;
    if(title)title.innerHTML='PLAY.<br><i>PADEL.</i>';
    if(copy)copy.textContent='Book your court. Fast, easy and seamless.';
  }
  paint();window.addEventListener('pageshow',paint);document.addEventListener('visibilitychange',()=>{if(!document.hidden)paint()});setTimeout(paint,250);
})();