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
      html.sbp-native-mobile,html.sbp-native-mobile body{width:100%;height:100%;min-height:100%;margin:0;overflow:hidden;background:var(--bg,#061012)!important}
      html.sbp-native-mobile body{overscroll-behavior:none}
      html.sbp-native-mobile #sbpDevBuild{display:none!important}
      html.sbp-native-mobile .stage{width:100%;height:100dvh;min-height:100dvh;padding:0!important;display:block!important;background:var(--bg,#061012)!important}
      html.sbp-native-mobile .phone{width:100%!important;max-width:none!important;height:100dvh!important;min-height:0!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:hidden!important;background:var(--bg,#061012)!important}
      html.sbp-native-mobile .phone>.status{display:none!important}
      html.sbp-native-mobile .app{height:100dvh!important;min-height:100dvh!important;overflow:hidden!important}
      html.sbp-native-mobile .app>header{height:56px!important;padding-top:8px!important}
      html.sbp-native-mobile .app>.screen{inset:56px 0 72px!important}
      html.sbp-native-mobile .app>nav{bottom:0!important;height:72px!important;padding-bottom:8px!important}
      html.sbp-native-mobile .screen,.sbp-native-mobile .formPanel{scrollbar-width:none;-webkit-overflow-scrolling:touch}
      html.sbp-native-mobile .screen::-webkit-scrollbar,html.sbp-native-mobile .formPanel::-webkit-scrollbar{display:none}

      html.sbp-native-mobile body>.phone{width:100%!important;max-width:none!important;height:100dvh!important;min-height:100dvh!important;border:0!important;border-radius:0!important;box-shadow:none!important}
      html.sbp-native-mobile body>.phone>.status{display:none!important}
      html.sbp-native-mobile body>.phone>.screen{inset:0!important}
      html.sbp-native-mobile .splash{padding-bottom:24px!important}
      html.sbp-native-mobile .splashBrand{top:28px!important}
      html.sbp-native-mobile .authTop{padding-top:22px!important}
      html.sbp-native-mobile .authHeadline{padding-top:58px!important}
      html.sbp-native-mobile .formPanel{bottom:0!important;left:0!important;right:0!important;border-radius:26px 26px 0 0!important;border-left:0!important;border-right:0!important;border-bottom:0!important}

      @media (max-width:420px){
        html.sbp-native-mobile .homeHero{margin-left:0!important;margin-right:0!important;border-radius:0 0 26px 26px!important}
        html.sbp-native-mobile .venueHero{margin-left:0!important;margin-right:0!important;border-radius:0 0 26px 26px!important}
      }
    `;
    document.head.appendChild(style);
  }catch(err){console.warn('SBP mobile runtime setup failed',err)}
})();
