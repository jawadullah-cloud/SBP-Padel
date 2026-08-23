(()=>{
  'use strict';
  const KEY='sbpPadelTheme';
  const valid=t=>t==='light'||t==='dark';
  const style=document.createElement('style');
  style.dataset.sbpThemeBridge='1';
  style.textContent=`
    html[data-theme="light"]{
      --brand:#4f9218!important;
      --bg:#f7faf8!important;
      --surface:#ffffff!important;
      --surface2:#eef3f0!important;
      --line:#d7e0db!important;
      --text:#17201d!important;
      --muted:#66736d!important;
      color-scheme:light!important;
    }
    html[data-theme="light"],html[data-theme="light"] body{
      background:#f3f6f4!important;
      color:var(--text)!important;
    }
    html[data-theme="light"] body .phone{
      background:var(--bg)!important;
      border-color:var(--line)!important;
      color:var(--text)!important;
    }
    html[data-theme="light"] body .back,
    html[data-theme="light"] body .secondary,
    html[data-theme="light"] body .receipt{
      background:var(--surface)!important;
      color:var(--text)!important;
      border-color:var(--line)!important;
    }
    html[data-theme="light"] body .summary,
    html[data-theme="light"] body .payCard,
    html[data-theme="light"] body .priceCard,
    html[data-theme="light"] body .secure,
    html[data-theme="light"] body .entry,
    html[data-theme="light"] body .card{
      background:var(--surface)!important;
      color:var(--text)!important;
      border-color:var(--line)!important;
      box-shadow:none!important;
    }
    html[data-theme="light"] body .summaryGrid div,
    html[data-theme="light"] body .details div,
    html[data-theme="light"] body .grid div,
    html[data-theme="light"] body .payIcon{
      background:var(--surface2)!important;
      color:var(--text)!important;
    }
    html[data-theme="light"] body .tabs{
      background:#edf2ef!important;
      border-color:var(--line)!important;
    }
    html[data-theme="light"] body .tabs button{color:var(--muted)!important}
    html[data-theme="light"] body .tabs button.on{
      background:#ffffff!important;
      color:var(--brand)!important;
      box-shadow:0 1px 3px #1d2b2412!important;
    }
    html[data-theme="light"] body .wallet{
      background:linear-gradient(135deg,#eef7ea,#e4f1df)!important;
      border-color:#c9dcbf!important;
    }
    html[data-theme="light"] body .wallet span{color:#53655d!important}
    html[data-theme="light"] body .payCard.selected .payIcon{background:#e5f2df!important;color:var(--brand)!important}
    html[data-theme="light"] body .bottom{background:linear-gradient(180deg,transparent,var(--bg) 28%)!important}
    html[data-theme="light"] body .statusRefund{color:#9a6a00!important}
    html[data-theme="light"] body .radio{border-color:#91a098!important}
    html[data-theme="light"] body .phone[style],html[data-theme="light"] body .phone{background-image:none!important}
  `;
  document.head.appendChild(style);
  function current(){
    let t=localStorage.getItem(KEY);
    if(!valid(t)&&window.parent&&window.parent!==window){try{t=window.parent.document.body.dataset.theme}catch{}}
    return valid(t)?t:'dark';
  }
  function apply(t=current()){
    if(!valid(t))t='dark';
    document.body.dataset.theme=t;
    document.documentElement.dataset.theme=t;
    document.documentElement.style.colorScheme=t;
  }
  apply();
  window.SBPApplyTheme=apply;
  window.addEventListener('storage',e=>{if(e.key===KEY)apply(e.newValue)});
  window.addEventListener('pageshow',()=>apply());
})();