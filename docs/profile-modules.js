(function(){
  'use strict';
  if(window.__SBPProfileModules)return;
  window.__SBPProfileModules=true;

  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='profile-modules.css?v=20260823-profile4';
  document.head.appendChild(css);

  const app=document.querySelector('.app');
  const nav=document.querySelector('nav');
  const profile=document.getElementById('profile');
  if(!app||!nav||!profile)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const initials=n=>String(n||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('');
  const defaults=['Sara Khan','Hamza Ali','Mariam Shah'];
  const playersKey='sbpPadelSavedPlayers';
  const favKey='sbpPadelFavouriteNishtar';

  function makeScreen(id){
    let screen=document.getElementById(id);
    if(screen)return screen;
    screen=document.createElement('section');
    screen.className='screen';
    screen.id=id;
    app.insertBefore(screen,nav);
    return screen;
  }
  const saved=makeScreen('savedPlayers');
  const favs=makeScreen('favouriteVenues');
  const help=makeScreen('helpSupport');

  function switchScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
    document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.nav==='profile'));
    nav.classList.remove('flowHidden');
    document.getElementById(id)?.scrollTo({top:0,behavior:'auto'});
  }
  const backProfile=()=>switchScreen('profile');

  function getPlayers(){
    try{const rows=JSON.parse(localStorage.getItem(playersKey)||'null');return Array.isArray(rows)?rows:defaults.slice()}catch{return defaults.slice()}
  }
  function setPlayers(rows){localStorage.setItem(playersKey,JSON.stringify(rows))}
  if(!localStorage.getItem(playersKey))setPlayers(defaults.slice());
  if(localStorage.getItem(favKey)===null)localStorage.setItem(favKey,'1');
  const isFav=()=>localStorage.getItem(favKey)!=='0';

  function renderPlayers(){
    const rows=getPlayers();
    saved.innerHTML=`<div class="pmWrap"><div class="pmHead"><button type="button" class="pmBack" data-pm-back>←</button><div><small>PROFILE</small><h1>Saved Players</h1></div></div><p class="pmIntro">Keep regular playing partners ready so they can be added to a court booking quickly.</p><section class="pmAdd"><label>ADD NEW PLAYER</label><div class="pmAddRow"><input id="pmPlayerName" maxlength="40" placeholder="Player name"><button type="button" id="pmAddPlayer">ADD</button></div></section><div class="pmSectionTitle"><h2>Your players</h2><small>${rows.length} saved</small></div><div class="pmList">${rows.map((p,i)=>`<article class="pmPlayer"><div class="pmAvatar">${initials(p)}</div><div><b>${esc(p)}</b><small>Saved playing partner</small></div><button type="button" class="pmRemove" data-remove-player="${i}">×</button></article>`).join('')}</div><div class="pmEmpty ${rows.length?'':'show'}">No saved players yet.<br>Add a regular playing partner above.</div></div>`;
  }
  function addPlayer(){
    const input=saved.querySelector('#pmPlayerName');
    const name=(input?.value||'').trim();
    if(!name)return;
    const rows=getPlayers();
    if(!rows.some(p=>p.toLowerCase()===name.toLowerCase()))rows.push(name);
    setPlayers(rows);renderPlayers();
  }

  function renderFavs(){
    const fav=isFav();
    favs.innerHTML=`<div class="pmWrap"><div class="pmHead"><button type="button" class="pmBack" data-pm-back>←</button><div><small>PROFILE</small><h1>Favourite Venues</h1></div></div><p class="pmIntro">Your saved SBP Padel facilities appear here for faster access and booking.</p><div class="pmSectionTitle"><h2>Saved venues</h2><small>${fav?'1 venue':'None yet'}</small></div>${fav?`<article class="pmVenue"><div class="pmVenueImage"><span class="pmVenueBadge">OPEN · LAHORE</span><button type="button" class="pmHeart" data-toggle-favourite>♥</button></div><div class="pmVenueBody"><h3>Nishtar Park Sports Complex</h3><p>1 Championship · 4 Training Courts · Floodlit</p><div class="pmVenueMeta"><span>Parking</span><span>Cafeteria</span><span>Changing</span></div><div class="pmVenueActions"><button type="button" class="pmExplore" data-open-nishtar>EXPLORE VENUE</button><button type="button" class="pmDirections" data-directions>DIRECTIONS ↗</button></div></div></article>`:`<div class="pmEmpty show">No favourite venues yet.<br>Save a venue to see it here.</div>`}</div>`;
  }

  function renderHelp(){
    help.innerHTML=`<div class="pmWrap"><div class="pmHead"><button type="button" class="pmBack" data-pm-back>←</button><div><small>SUPPORT</small><h1>Help & Support</h1></div></div><p class="pmIntro">Quick answers and support for bookings, payments and SBP Padel facilities.</p><section class="pmSupportHero"><div class="pmSupportIcon">?</div><div><small>SBP PADEL SUPPORT</small><h2>How can we help?</h2><p>Find a quick answer below.</p></div></section><div class="pmSectionTitle"><h2>Frequently asked</h2></div><div class="pmFaq"><button type="button" data-faq><span><b>How do I cancel a booking?</b><small>Cancellation and refund process</small></span><i>＋</i></button><div class="pmFaqAnswer">Open My Bookings, select the upcoming booking and choose Cancel Booking. Any eligible refund will be shown before confirmation.</div><button type="button" data-faq><span><b>Can I reschedule my court?</b><small>Changing date or time</small></span><i>＋</i></button><div class="pmFaqAnswer">Open the booking details. Rescheduling options will appear when permitted by the active booking policy.</div><button type="button" data-faq><span><b>What if the venue closes?</b><small>Venue-side closure</small></span><i>＋</i></button><div class="pmFaqAnswer">Venue-side changes will be reflected in your booking activity and any applicable refund or rescheduling process.</div></div></div>`;
  }

  function installThemeRow(){
    const menu=profile.querySelector('.menu');
    if(!menu||menu.querySelector('.themeProfileRow'))return;
    const btn=document.createElement('button');
    btn.type='button';btn.className='themeProfileRow';
    btn.innerHTML='◐ <span>Appearance</span><em class="themeModePill"><b></b> ›</em>';
    const helpBtn=[...menu.querySelectorAll('button')].find(b=>b.querySelector('span')?.textContent?.trim()==='Help & Support');
    menu.insertBefore(btn,helpBtn||null);
    const refresh=()=>{const b=btn.querySelector('b');if(b)b.textContent=(document.body.dataset.theme||'dark').toUpperCase()};
    btn.onclick=e=>{e.preventDefault();const theme=(document.body.dataset.theme||'dark')==='dark'?'light':'dark';document.body.dataset.theme=theme;localStorage.setItem('sbpPadelTheme',theme);refresh()};
    refresh();
  }

  // Profile modules intentionally do NOT own Notifications. notifications-live.js is the only owner.
  const menu=profile.querySelector('.menu');
  menu?.addEventListener('click',e=>{
    const btn=e.target.closest('button');if(!btn)return;
    const label=btn.querySelector('span')?.textContent?.trim();
    if(label==='Notifications')return;
    if(label==='Saved Players'){e.preventDefault();renderPlayers();switchScreen('savedPlayers')}
    if(label==='Favourite Venues'){e.preventDefault();renderFavs();switchScreen('favouriteVenues')}
    if(label==='Help & Support'){e.preventDefault();renderHelp();switchScreen('helpSupport')}
  });

  saved.addEventListener('click',e=>{
    if(e.target.closest('[data-pm-back]')){backProfile();return}
    if(e.target.closest('#pmAddPlayer')){addPlayer();return}
    const remove=e.target.closest('[data-remove-player]');
    if(remove){const rows=getPlayers();rows.splice(Number(remove.dataset.removePlayer),1);setPlayers(rows);renderPlayers()}
  });
  saved.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='pmPlayerName'){e.preventDefault();addPlayer()}});
  favs.addEventListener('click',e=>{
    if(e.target.closest('[data-pm-back]')){backProfile();return}
    if(e.target.closest('[data-toggle-favourite]')){localStorage.setItem(favKey,isFav()?'0':'1');renderFavs();return}
    if(e.target.closest('[data-open-nishtar]')){window.SBPNavigate?window.SBPNavigate('nishtar'):switchScreen('nishtar');return}
    if(e.target.closest('[data-directions]'))window.open('https://www.google.com/maps/dir/?api=1&destination=31.511617,74.337527','_blank','noopener');
  });
  help.addEventListener('click',e=>{
    if(e.target.closest('[data-pm-back]')){backProfile();return}
    const faq=e.target.closest('[data-faq]');if(!faq)return;
    const answer=faq.nextElementSibling;if(!answer)return;answer.classList.toggle('open');const i=faq.querySelector('i');if(i)i.textContent=answer.classList.contains('open')?'−':'＋';
  });

  const stored=localStorage.getItem('sbpPadelTheme');if(stored==='light'||stored==='dark')document.body.dataset.theme=stored;
  installThemeRow();
})();
