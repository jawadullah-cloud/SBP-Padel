(()=>{
  'use strict';
  try{
    const params=new URLSearchParams(location.search);
    const api=params.get('api');
    if(api){
      localStorage.setItem('sbpPadelApiBase',api.replace(/\/$/,''));
      sessionStorage.setItem('sbpPadelMobileRuntime','1');
    }
    if(sessionStorage.getItem('sbpPadelMobileRuntime')==='1'){
      document.documentElement.dataset.sbpMobile='1';
    }
  }catch(err){console.warn('SBP mobile runtime setup failed',err)}
})();
