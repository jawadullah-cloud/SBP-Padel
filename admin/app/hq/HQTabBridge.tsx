'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

export default function HQTabBridge(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/hq')return;

  // Staff account administration has a dedicated canonical page with the
  // complete create/reset/disable/reactivate/delete workflow. Keep the HQ
  // dashboard's legacy Staff tab from opening its older reduced copy.
  const redirectStaff=(event:Event)=>{
   const target=event.target as HTMLElement|null;
   const button=target?.closest<HTMLButtonElement>('.hqHomeSidebar .hqNavGroup button');
   if(button?.textContent?.trim().toLowerCase()!=='staff')return;
   event.preventDefault();
   event.stopPropagation();
   location.href='/hq/staff';
  };
  document.addEventListener('click',redirectStaff,true);

  const tab=(new URLSearchParams(window.location.search).get('tab')||'').trim().toLowerCase();
  if(tab==='staff'){
   location.replace('/hq/staff');
   return()=>document.removeEventListener('click',redirectStaff,true);
  }
  if(!tab)return()=>document.removeEventListener('click',redirectStaff,true);

  let tries=0;
  const timer=window.setInterval(()=>{
   tries++;
   const buttons=[...document.querySelectorAll<HTMLButtonElement>('.hqHomeSidebar .hqNavGroup button')];
   const target=buttons.find(b=>b.textContent?.trim().toLowerCase()===tab);
   if(target){target.click();window.clearInterval(timer)}
   else if(tries>20)window.clearInterval(timer);
  },50);
  return()=>{window.clearInterval(timer);document.removeEventListener('click',redirectStaff,true)};
 },[pathname]);
 return null;
}
