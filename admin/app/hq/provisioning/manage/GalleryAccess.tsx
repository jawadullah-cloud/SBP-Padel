'use client';
import {useEffect,useState} from 'react';
export default function GalleryAccess(){const[id,setId]=useState('');useEffect(()=>setId(new URLSearchParams(location.search).get('venue')||''),[]);if(!id)return null;return <a className="galleryAccess btn" href={`/hq/provisioning/gallery?venue=${encodeURIComponent(id)}`}>FACILITY PHOTOS</a>}
