(()=>{
  'use strict';
  const host=location.hostname;
  if(!host)return;
  const api=`${location.protocol}//${host}:8000/api/v1`;
  const previous=localStorage.getItem('sbpPadelApiBase')||'';
  if(previous!==api)localStorage.setItem('sbpPadelApiBase',api);
  localStorage.removeItem('sbpPadelBookingDatePicker');
  window.SBPApiBase=()=>`${location.protocol}//${location.hostname}:8000/api/v1`;
})();
