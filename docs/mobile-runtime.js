(()=>{
  'use strict';
  try{
    const params=new URLSearchParams(location.search);
    const api=params.get('api');
    if(api){
      localStorage.setItem('sbpPadelApiBase',api.replace(/\/$/,''));
      sessionStorage.setItem('sbpPadelMobileRuntime','1');
    }
    if(sessionStorage.getItem('sbpPadelMobileRuntime')!=='1')return;

    document.documentElement.dataset.sbpMobile='1';
    document.documentElement.classList.add('sbp-native-mobile');

    const style=document.createElement('style');
    style.id='sbpNativeMobileCss';
    style.textContent=`
      html.sbp-native-mobile,html.sbp-native-mobile body{width:100%;height:100%;min-height:100%;margin:0;background:var(--bg,#061012)!important}
      html.sbp-native-mobile body{overflow:hidden!important;overscroll-behavior:none}
      html.sbp-native-mobile #sbpDevBuild{display:none!important}
      html.sbp-native-mobile .stage{width:100%;height:100%;min-height:100%;padding:0!important;display:block!important;background:var(--bg,#061012)!important}
      html.sbp-native-mobile .phone{width:100%!important;max-width:none!important;height:100%!important;min-height:0!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:hidden!important;background:var(--bg,#061012)!important}
      html.sbp-native-mobile .phone>.status{display:none!important}
      html.sbp-native-mobile .app{height:100%!important;min-height:0!important;overflow:hidden!important}
      html.sbp-native-mobile .app>header{height:56px!important;padding:8px 16px!important}
      html.sbp-native-mobile .app>.screen{inset:56px 0 68px!important;overflow-y:scroll!important;overflow-x:hidden!important;touch-action:pan-y!important;overscroll-behavior-y:auto!important;-webkit-overflow-scrolling:touch!important}
      html.sbp-native-mobile .app>nav{bottom:0!important;height:68px!important;padding-bottom:4px!important}
      html.sbp-native-mobile .screen::-webkit-scrollbar,html.sbp-native-mobile .formPanel::-webkit-scrollbar{display:none}
      html.sbp-native-mobile #venues,html.sbp-native-mobile #bookings,html.sbp-native-mobile #profile{overflow-y:scroll!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
      html.sbp-native-mobile #venues>.content,html.sbp-native-mobile #bookings .bkWrap,html.sbp-native-mobile #profile>.content{padding-bottom:34px!important}
      html.sbp-native-mobile #home .homeContent{padding-bottom:8px!important}
      html.sbp-native-mobile #home .homeFeature{margin-bottom:0!important}

      html.sbp-native-mobile body>.phone{width:100%!important;max-width:none!important;height:100%!important;min-height:100%!important;border:0!important;border-radius:0!important;box-shadow:none!important}
      html.sbp-native-mobile body>.phone>.status{display:none!important}
      html.sbp-native-mobile body>.phone>.screen{height:100%!important;min-height:0!important;overflow-y:auto!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
      html.sbp-native-mobile .authLayer{overflow:hidden!important}
      html.sbp-native-mobile .authScreen.authPage{overflow-y:auto!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important;padding-bottom:32px!important}
      html.sbp-native-mobile .authTop{padding-top:8px!important;margin-bottom:20px!important}
      html.sbp-native-mobile .authTitle{font-size:30px!important}
      html.sbp-native-mobile .authSub{margin-bottom:18px!important}
      html.sbp-native-mobile.sbp-keyboard-open .authTop{margin-bottom:10px!important}
      html.sbp-native-mobile.sbp-keyboard-open .authTitle{font-size:24px!important;margin-bottom:6px!important}
      html.sbp-native-mobile.sbp-keyboard-open .authSub{display:none!important}
      html.sbp-native-mobile.sbp-keyboard-open .authPage{padding-top:8px!important;padding-bottom:220px!important}

      @media (max-width:420px){
        html.sbp-native-mobile .homeHero{margin-left:0!important;margin-right:0!important;border-radius:0 0 26px 26px!important}
        html.sbp-native-mobile .venueHero{margin-left:0!important;margin-right:0!important;border-radius:0 0 26px 26px!important}
      }
    `;
    document.head.appendChild(style);

    const viewport=window.visualViewport;
    const keyboardGap=()=>viewport?Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop):0;
    const revealFocused=()=>{
      const el=document.activeElement;
      if(!el?.matches?.('input,textarea,select'))return;
      const page=el.closest('.authPage,.authScreen,.screen,.formPanel')||el.parentElement;
      try{el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});}catch{}
      if(page&&typeof page.scrollTop==='number'){
        const r=el.getBoundingClientRect();
        const vr=viewport?{top:viewport.offsetTop,bottom:viewport.offsetTop+viewport.height}:{top:0,bottom:window.innerHeight};
        if(r.bottom>vr.bottom-24)page.scrollTop+=r.bottom-(vr.bottom-24);
        if(r.top<vr.top+24)page.scrollTop-=vr.top+24-r.top;
      }
    };
    const syncKeyboard=()=>{
      const gap=keyboardGap();
      document.documentElement.classList.toggle('sbp-keyboard-open',gap>100);
      if(gap>100)setTimeout(revealFocused,40);
    };
    viewport?.addEventListener('resize',syncKeyboard);
    viewport?.addEventListener('scroll',syncKeyboard);
    document.addEventListener('focusin',e=>{
      if(!e.target?.matches?.('input,textarea,select'))return;
      document.documentElement.classList.add('sbp-keyboard-open');
      setTimeout(revealFocused,80);
      setTimeout(revealFocused,260);
    });
    document.addEventListener('focusout',()=>setTimeout(syncKeyboard,120));
    syncKeyboard();
  }catch(err){console.warn('SBP mobile runtime setup failed',err)}
})();
