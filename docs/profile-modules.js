(function(){
  const css=document.createElement('link');css.rel='stylesheet';css.href='profile-modules.css?v=20260823-profile1';document.head.appendChild(css);
  const app=document.querySelector('.app'),nav=document.querySelector('nav'),profile=document.getElementById('profile');if(!app||!nav||!profile)return;
  const defaults=['Sara Khan','Hamza Ali','Mariam Shah'];
  const getPlayers=()=>{try{const v=JSON.parse(localStorage.getItem('sbpPadelSavedPlayers')||'null');return Array.isArray(v)?v:defaults.slice()}catch{return defaults.slice()}};
  const setPlayers=v=>localStorage.setItem('sbpPadelSavedPlayers',JSON.stringify(v));
  if(!localStorage.getItem('sbpPadelSavedPlayers'))setPlayers(defaults);
  const favKey='sbpPadelFavouriteNishtar';
  const isFav=()=>localStorage.getItem(favKey)!=='0';
  if(localStorage.getItem(favKey)===null)localStorage.setItem(favKey,'1');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials=n=>n.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('');
  function makeScreen(id){const s=document.createElement('section');s.className='screen';s.id=id;app.insertBefore(s,nav);return s}
  const saved=document.getElementById('savedPlayers')||makeScreen('savedPlayers');
  const favs=document.getElementById('favouriteVenues')||makeScreen('favouriteVenues');
  function switchScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.nav==='profile'));nav.classList.remove('flowHidden');document.getElementById(id)?.scrollTo({top:0,behavior:'smooth'})}
  function backProfile(){switchScreen('profile')}
  function renderPlayers(){const players=getPlayers();saved.innerHTML=`<div class="pmWrap"><div class="pmHead"><button class="pmBack" data-pm-back>←</button><div><small>PROFILE</small><h1>Saved Players</h1></div></div><p class="pmIntro">Keep regular playing partners ready so they can be added to a court booking in one tap.</p><section class="pmAdd"><label>ADD NEW PLAYER</label><div class="pmAddRow"><input id="pmPlayerName" maxlength="40" placeholder="Player name"><button id="pmAddPlayer">ADD</button></div></section><div class="pmSectionTitle"><h2>Your players</h2><small>${players.length} saved</small></div><div class="pmList">${players.map((p,i)=>`<article class="pmPlayer"><div class="pmAvatar">${initials(p)}</div><div><b>${esc(p)}</b><small>Saved playing partner</small></div><button class="pmRemove" data-remove-player="${i}" aria-label="Remove ${esc(p)}">×</button></article>`).join('')}</div><div class="pmEmpty ${players.length?'':'show'}">No saved players yet.<br>Add a regular playing partner above.</div></div>`;
  }
  function addSaved(){const input=saved.querySelector('#pmPlayerName');const name=(input?.value||'').trim();if(!name)return;const players=getPlayers();if(!players.some(p=>p.toLowerCase()===name.toLowerCase())){players.push(name);setPlayers(players)}renderPlayers()}
  function renderFavs(){const fav=isFav();favs.innerHTML=`<div class="pmWrap"><div class="pmHead"><button class="pmBack" data-pm-back>←</button><div><small>PROFILE</small><h1>Favourite Venues</h1></div></div><p class="pmIntro">Your saved SBP Padel facilities appear here for faster access and booking.</p><div class="pmSectionTitle"><h2>Saved venues</h2><small>${fav?'1 venue':'None yet'}</small></div>${fav?`<article class="pmVenue"><div class="pmVenueImage"><span class="pmVenueBadge">OPEN · LAHORE</span><button class="pmHeart" data-toggle-favourite aria-label="Remove favourite">♥</button></div><div class="pmVenueBody"><h3>Nishtar Park Sports Complex</h3><p>1 Championship · 4 Training Courts · Floodlit</p><div class="pmVenueMeta"><span>Parking</span><span>Cafeteria</span><span>Changing</span></div><div class="pmVenueActions"><button class="pmExplore" data-open-nishtar>EXPLORE VENUE</button><button class="pmDirections" data-directions>DIRECTIONS ↗</button></div></div></article>`:`<div class="pmEmpty show">No favourite venues yet.<br>Tap the heart on a venue to save it here.</div>`}</div>`}
  function syncHeart(){const heart=document.querySelector('#nishtar .heartBtn');if(heart){heart.textContent=isFav()?'♥':'♡';heart.style.color=isFav()?'#ff5f6d':'var(--text)';heart.setAttribute('aria-label',isFav()?'Remove from favourites':'Add to favourites')}}
  profile.addEventListener('click',e=>{const btn=e.target.closest('.menu button');if(!btn)return;const label=btn.querySelector('span')?.textContent?.trim();if(label==='Saved Players'){e.preventDefault();e.stopPropagation();renderPlayers();switchScreen('savedPlayers')}if(label==='Favourite Venues'){e.preventDefault();e.stopPropagation();renderFavs();switchScreen('favouriteVenues')}});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-pm-back]')){e.preventDefault();backProfile();return}
    if(e.target.closest('#pmAddPlayer')){e.preventDefault();addSaved();return}
    const rm=e.target.closest('[data-remove-player]');if(rm){const players=getPlayers();players.splice(Number(rm.dataset.removePlayer),1);setPlayers(players);renderPlayers();return}
    if(e.target.closest('[data-toggle-favourite]')){localStorage.setItem(favKey,isFav()?'0':'1');renderFavs();syncHeart();return}
    if(e.target.closest('[data-open-nishtar]')){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='nishtar'));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.nav==='venues'));nav.classList.add('flowHidden');return}
    if(e.target.closest('[data-directions]')){window.open('https://www.google.com/maps/dir/?api=1&destination=31.511617,74.337527','_blank','noopener');return}
    const heart=e.target.closest('#nishtar .heartBtn');if(heart){e.preventDefault();e.stopPropagation();localStorage.setItem(favKey,isFav()?'0':'1');syncHeart();return}
    const mainNav=e.target.closest('.nav,[data-nav="home"],[data-nav="venues"],[data-nav="bookings"],[data-nav="profile"]');if(mainNav){saved.classList.remove('active');favs.classList.remove('active')}
  },true);
  syncHeart();
  window.addEventListener('storage',()=>{syncHeart();if(saved.classList.contains('active'))renderPlayers();if(favs.classList.contains('active'))renderFavs()});
})();
