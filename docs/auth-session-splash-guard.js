(()=>{
'use strict';
if(!window.__SBP_SESSION_SPLASH__)return;
const proto=Storage.prototype,original=proto.getItem;
let masking=true;
proto.getItem=function(key){
  if(masking&&this===localStorage&&key==='sbpPadelAccessToken')return null;
  return original.call(this,key);
};
window.addEventListener('DOMContentLoaded',()=>{
  masking=false;
  if(proto.getItem!==original)proto.getItem=original;
},{once:true});
})();
