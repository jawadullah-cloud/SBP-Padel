(()=>{
  'use strict';
  if(window.__SBPThemeBridge)return;
  window.__SBPThemeBridge=true;
  const KEY='sbpPadelTheme';
  const valid=t=>t==='light'||t==='dark';
  const style=document.createElement('style');
  style.dataset.sbpThemeBridge='1';
  style.textContent=`
    .brandball{font-size:0!important;background-image:url('assets/ball-tennis.svg')!important;background-position:center!important;background-repeat:no-repeat!important;background-size:20px 20px!important}
    html[data-theme="light"]{
      --brand:#4f9218!important;--bg:#f7faf8!important;--surface:#ffffff!important;--surface2:#eef3f0!important;--line:#d7e0db!important;--text:#17201d!important;--muted:#66736d!important;color-scheme:light!important;
    }
    html[data-theme="light"],html[data-theme="light"] body{background:#f3f6f4!important;color:var(--text)!important}
    html[data-theme="light"] body .stage{background:radial-gradient(circle at 20% 10%,#dcece2,transparent 34%),#edf3ef!important}
    html[data-theme="light"] body .phone{background:var(--bg)!important;background-image:none!important;border-color:#c9d6cf!important;color:var(--text)!important;box-shadow:0 30px 80px #24382d26!important}
    html[data-theme="light"] body header,html[data-theme="light"] body nav{background:color-mix(in srgb,var(--bg) 94%,transparent)!important;border-color:var(--line)!important;color:var(--text)!important}
    html[data-theme="light"] body .nav{color:var(--muted)!important}html[data-theme="light"] body .nav.active{color:var(--brand)!important}
    html[data-theme="light"] body .back,html[data-theme="light"] body .theme,html[data-theme="light"] body .secondary,html[data-theme="light"] body .receipt,html[data-theme="light"] body .closeModal{background:var(--surface)!important;color:var(--text)!important;border-color:var(--line)!important}
    html[data-theme="light"] body .summary,html[data-theme="light"] body .payCard,html[data-theme="light"] body .priceCard,html[data-theme="light"] body .secure,html[data-theme="light"] body .entry,html[data-theme="light"] body .card,html[data-theme="light"] body .bookingCard,html[data-theme="light"] body .playerCard,html[data-theme="light"] body .policy,html[data-theme="light"] body .savedPlayer,html[data-theme="light"] body #livePolicy,html[data-theme="light"] body .pmAdd,html[data-theme="light"] body .pmPlayer,html[data-theme="light"] body .pmVenue,html[data-theme="light"] body .pmNotice,html[data-theme="light"] body .pmFaq,html[data-theme="light"] body .pmSupportHero,html[data-theme="light"] body .menu,html[data-theme="light"] body .menu button{background:var(--surface)!important;color:var(--text)!important;border-color:var(--line)!important;box-shadow:none!important}
    html[data-theme="light"] body .summaryGrid div,html[data-theme="light"] body .details div,html[data-theme="light"] body .grid div,html[data-theme="light"] body .meta div,html[data-theme="light"] body .payIcon,html[data-theme="light"] body .avatar,html[data-theme="light"] body .miniAvatar,html[data-theme="light"] body #livePolicy label,html[data-theme="light"] body .pmVenueMeta span,html[data-theme="light"] body .pmNoticeIcon{background:var(--surface2)!important;color:var(--text)!important}
    html[data-theme="light"] body #livePolicy .lpHead{background:#eef5f0!important}html[data-theme="light"] body #livePolicy .lpBody{color:var(--text)!important}
    html[data-theme="light"] body .tabs{background:#edf2ef!important;border-color:var(--line)!important}html[data-theme="light"] body .tabs button{color:var(--muted)!important}html[data-theme="light"] body .tabs button.on{background:#fff!important;color:var(--brand)!important;box-shadow:0 1px 3px #1d2b2412!important}
    html[data-theme="light"] body .wallet{background:linear-gradient(135deg,#eef7ea,#e4f1df)!important;border-color:#c9dcbf!important}html[data-theme="light"] body .wallet span{color:#53655d!important}
    html[data-theme="light"] body .payCard.selected .payIcon{background:#e5f2df!important;color:var(--brand)!important}html[data-theme="light"] body .bottom{background:linear-gradient(180deg,transparent,var(--bg) 28%)!important}
    html[data-theme="light"] body .statusRefund{color:#9a6a00!important}html[data-theme="light"] body .radio{border-color:#91a098!important}
    html[data-theme="light"] body .modalBackdrop{background:rgba(16,28,22,.26)!important}html[data-theme="light"] body .modal{background:#fff!important;color:var(--text)!important;border-color:var(--line)!important;box-shadow:0 -16px 45px #1c2d2518!important}
    html[data-theme="light"] body .manualAdd input,html[data-theme="light"] body .pmAdd input{background:#fff!important;color:var(--text)!important;border-color:var(--line)!important}
    html[data-theme="light"] body .policyContent,html[data-theme="light"] body .policyContent h3{color:var(--text)!important}html[data-theme="light"] body .draftNotice{background:#eef4f0!important;color:#596861!important;border-color:var(--line)!important}
    html[data-theme="light"] body .pmEmpty{color:var(--muted)!important;border-color:var(--line)!important}html[data-theme="light"] body .profilePhotoButton{background:var(--surface2)!important}
  `;
  document.head.appendChild(style);
  function current(){let t=localStorage.getItem(KEY);if(!valid(t)&&window.parent&&window.parent!==window){try{t=window.parent.document.documentElement.dataset.theme||window.parent.document.body.dataset.theme}catch{}}return valid(t)?t:'dark'}
  function paintControls(t){const button=document.getElementById('themeToggle');if(button){button.textContent=t==='dark'?'☾':'☀';button.setAttribute('aria-label',t==='dark'?'Switch to light theme':'Switch to dark theme');button.setAttribute('aria-pressed',String(t==='light'))}document.querySelectorAll('[data-profile-action="appearance"] .profileTail').forEach(x=>x.textContent=t.toUpperCase())}
  function apply(t=current()){if(!valid(t))t='dark';document.body.dataset.theme=t;document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;paintControls(t);return t}
  function set(t){if(!valid(t))return apply();localStorage.setItem(KEY,t);const applied=apply(t);try{window.dispatchEvent(new CustomEvent('sbp-theme-change',{detail:{theme:applied}}))}catch{}return applied}
  function toggle(){return set(apply()==='dark'?'light':'dark')}
  apply();
  window.SBPApplyTheme=apply;window.SBPSetTheme=set;window.SBPToggleTheme=toggle;
  document.addEventListener('click',e=>{const b=e.target.closest?.('#themeToggle');if(!b)return;e.preventDefault();e.stopPropagation();toggle()},true);
  window.addEventListener('storage',e=>{if(e.key===KEY)apply(e.newValue)});window.addEventListener('pageshow',()=>apply());
})();