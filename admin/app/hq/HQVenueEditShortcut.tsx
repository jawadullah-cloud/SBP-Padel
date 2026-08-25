'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
export default function HQVenueEditShortcut(){const path=usePathname(),[venue,setVenue]=useState('');useEffect(()=>{if(!path.startsWith('/hq/provisioning/manage')){setVenue('');return}setVenue(new URLSearchParams(window.location.search).get('venue')||'')},[path]);if(!path.startsWith('/hq/provisioning/manage')||!venue)return null;return <div className="hqVenueProfileShortcut"><a className="btn" href={`/hq/provisioning/profile?venue=${encodeURIComponent(venue)}`}>EDIT VENUE PROFILE & AMENITIES</a></div>}
