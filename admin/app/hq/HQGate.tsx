'use client';
import {ReactNode,useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
export default function HQGate({children}:{children:ReactNode}){const path=usePathname();const[ready,setReady]=useState(path==='/hq');useEffect(()=>{if(path==='/hq'){setReady(true);return}const token=localStorage.getItem('sbp_padel_hq_token');if(!token){location.replace('/hq');return}setReady(true)},[path]);if(!ready)return <main className="hqBoot">Loading headquarters…</main>;return <>{children}</>}
