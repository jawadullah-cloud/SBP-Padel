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
      html.sbp-native-mobile .app>.screen{inset:56px 0 68px!important;overflow-y:auto!important;overflow-x:hidden!important;touch-action:auto!important;overscroll-behavior-y:auto!important;-webkit-overflow-scrolling:touch!important}
      html.sbp-native-mobile .app>nav{bottom:0!important;height:68px!important;padding-bottom:4px!important}
      html.sbp-native-mobile .screen::-webkit-scrollbar,html.sbp-native-mobile .formPanel::-webkit-scrollbar{display:none}
      html.sbp-native-mobile #venues,html.sbp-native-mobile #bookings,html.sbp-native-mobile #profile,html.sbp-native-mobile #nishtar,html.sbp-native-mobile #select,html.sbp-native-mobile #time,html.sbp-native-mobile #reviewNative{overflow-y:auto!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
      html.sbp-native-mobile #venues>.content,html.sbp-native-mobile #bookings .bkWrap,html.sbp-native-mobile #profile>.content,html.sbp-native-mobile #nishtar>.content,html.sbp-native-mobile #select>.content,html.sbp-native-mobile #time>.content{padding-bottom:40px!important;min-height:max-content!important}
      html.sbp-native-mobile #home .homeContent{padding-bottom:8px!important}
      html.sbp-native-mobile #home .homeFeature{margin-bottom:0!important}

      html.sbp-native-mobile body>.phone{width:100%!important;max-width:none!important;height:100%!important;min-height:100%!important;border:0!important;border-radius:0!important;box-shadow:none!important}
      html.sbp-native-mobile body>.phone>.status{display:none!important}
      html.sbp-native-mobile body>.phone>.screen{height:100%!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;touch-action:pan-y!important;overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch!important}
      html.sbp-native-mobile body>.phone>.screen button,
      html.sbp-native-mobile body>.phone>.screen a,
      html.sbp-native-mobile body>.phone>.screen input,
      html.sbp-native-mobile body>.phone>.screen label,
      html.sbp-native-mobile body>.phone>.screen select,
      html.sbp-native-mobile body>.phone>.screen textarea,
      html.sbp-native-mobile body>.phone>.screen [role="button"],
      html.sbp-native-mobile #reviewNative button,
      html.sbp-native-mobile #reviewNative input,
      html.sbp-native-mobile #reviewNative label{touch-action:manipulation}
      html.sbp-native-mobile .authLayer{overflow:hidden!important}
      html.sbp-native-mobile .authScreen.authPage{overflow-y:auto!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important;padding-bottom:36px!important}
      html.sbp-native-mobile .authTop{padding-top:8px!important;margin-bottom:20px!important}
      html.sbp-native-mobile .authTitle{font-size:30px!important}
      html.sbp-native-mobile .authSub{margin-bottom:18px!important}
      html.sbp-native-mobile.sbp-keyboard-open .authTop{margin-bottom:8px!important}
      html.sbp-native-mobile.sbp-keyboard-open .authTitle{font-size:23px!important;margin-bottom:5px!important}
      html.sbp-native-mobile.sbp-keyboard-open .authSub{display:none!important}
      html.sbp-native-mobile.sbp-keyboard-open .authPage{padding-top:6px!important;padding-bottom:calc(36px + var(--sbp-native-ime,0px))!important}

      @media (max-width:420px){
        html.sbp-native-mobile .homeHero{margin-left:0!important;margin-right:0!important;border-radius:0 0 26px 26px!important}
        html.sbp-native-mobile .venueHero{margin-left:0!important;margin-right:0!important;border-radius:0 0 26px 26px!important}
      }
    `;
    document.head.appendChild(style);

    const viewport=window.visualViewport;
    const revealFocused=()=>{
      const el=document.activeElement;
      if(!el?.matches?.('input,textarea,select'))return;
      const page=el.closest('.authPage,.authScreen,.screen,.formPanel')||el.parentElement;
      try{el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});}catch{}
      if(page&&typeof page.scrollTop==='number'){
        const r=el.getBoundingClientRect();
        const bottom=viewport?viewport.offsetTop+viewport.height:window.innerHeight;
        if(r.bottom>bottom-28)page.scrollTop+=r.bottom-(bottom-28);
      }
    };
    window.SBPAndroidRevealFocused=()=>{
      document.documentElement.classList.add('sbp-keyboard-open');
      setTimeout(revealFocused,20);setTimeout(revealFocused,140);setTimeout(revealFocused,320);
    };
    const keyboardGap=()=>viewport?Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop):0;
    const syncKeyboard=()=>{
      const nativeIme=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sbp-native-ime'))||0;
      const open=keyboardGap()>80||nativeIme>80;
      document.documentElement.classList.toggle('sbp-keyboard-open',open);
      if(open)setTimeout(revealFocused,30);
    };
    viewport?.addEventListener('resize',syncKeyboard);
    viewport?.addEventListener('scroll',syncKeyboard);
    document.addEventListener('focusin',e=>{if(e.target?.matches?.('input,textarea,select'))window.SBPAndroidRevealFocused()});
    document.addEventListener('focusout',()=>setTimeout(syncKeyboard,120));

    // Android System WebView can fail nested CSS scrolling on absolutely
    // positioned screens. Own vertical touch movement for every long player
    // surface, including Date/Court and Time slot selection. Preserve taps by
    // giving interactive controls a larger movement threshold.
    let scroller=null,startY=0,lastY=0,moved=false,moveThreshold=6;
    const ownedScroller=target=>target?.closest?.('#venues,#bookings,#profile,#nishtar,#select,#time,#reviewNative,.phone>.screen');
    const interactiveTarget=target=>!!target?.closest?.('button,a,input,label,select,textarea,[role="button"],[onclick]');
    document.addEventListener('touchstart',e=>{
      if(e.touches.length!==1)return;
      scroller=ownedScroller(e.target);
      if(!scroller)return;
      startY=lastY=e.touches[0].clientY;moved=false;
      moveThreshold=interactiveTarget(e.target)?16:6;
    },{passive:true,capture:true});
    document.addEventListener('touchmove',e=>{
      if(!scroller||e.touches.length!==1)return;
      const y=e.touches[0].clientY,delta=lastY-y;
      if(!moved&&Math.abs(y-startY)>moveThreshold)moved=true;
      if(moved&&Math.abs(delta)>0.5){scroller.scrollTop+=delta;lastY=y;e.preventDefault()}
    },{passive:false,capture:true});
    const clearScroller=()=>{scroller=null;moved=false;moveThreshold=6};
    document.addEventListener('touchend',clearScroller,{passive:true,capture:true});
    document.addEventListener('touchcancel',clearScroller,{passive:true,capture:true});
    window.addEventListener('pagehide',clearScroller);
    window.addEventListener('blur',clearScroller);
    syncKeyboard();
  }catch(err){console.warn('SBP mobile runtime setup failed',err)}
})();