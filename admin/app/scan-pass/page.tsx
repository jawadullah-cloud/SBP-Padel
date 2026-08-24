'use client';

import jsQR from 'jsqr';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

type Venue={id:string;name:string;city:string;role:string};
type PassBooking={id:string;booking_code:string;date:string;status:string;venue_id:string;venue_name:string;court_id:string;court_code:string|null;court_name:string;player:{id:string|null;full_name:string;email:string|null;phone:string|null};slots:{start_time:string;end_time:string}[];payment_status:string|null;payment_method:string|null;checked_in:boolean;checked_in_at:string|null};
type Validation={valid:boolean;reason:string;reason_code:string;booking?:PassBooking};
type BarcodeDetectorLike={detect:(source:ImageBitmapSource)=>Promise<{rawValue?:string}[]>};
type BarcodeDetectorCtor=new(options:{formats:string[]})=>BarcodeDetectorLike;

const API=process.env.NEXT_PUBLIC_API_URL||'http://127.0.0.1:8000/api/v1';
const niceDate=(iso:string)=>new Date(`${iso}T12:00:00`).toLocaleDateString('en-PK',{weekday:'long',day:'numeric',month:'short',year:'numeric'});
const niceTime=(value:string)=>{const[h,m]=value.split(':').map(Number);return new Date(2000,0,1,h,m||0).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
const checkedAt=(value:string|null)=>value?new Date(value).toLocaleString('en-PK',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'';
const cameraErrorText=(error:unknown)=>{if(error instanceof DOMException)return `${error.name}: ${error.message||'Camera access failed'}`;if(error instanceof Error)return `${error.name||'Error'}: ${error.message}`;return `Error: ${String(error||'Could not start camera')}`};

export default function ScanPassPage(){
 const[token,setToken]=useState(''),[venues,setVenues]=useState<Venue[]>([]),[venueId,setVenueId]=useState(''),[value,setValue]=useState(''),[result,setResult]=useState<Validation|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[cameraOn,setCameraOn]=useState(false),[cameraMessage,setCameraMessage]=useState('Camera is off. Use manual lookup or start the scanner.'),[uploading,setUploading]=useState(false);
 const videoRef=useRef<HTMLVideoElement|null>(null),streamRef=useRef<MediaStream|null>(null),frameRef=useRef<number|null>(null),scanningRef=useRef(false),canvasRef=useRef<HTMLCanvasElement|null>(null),fileRef=useRef<HTMLInputElement|null>(null);
 const currentVenue=venues.find(v=>v.id===venueId);

 async function api<T=unknown>(path:string,options:RequestInit={}):Promise<T>{const r=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},cache:'no-store'});let b:any=null;try{b=await r.json()}catch{}if(!r.ok)throw new Error(typeof b?.detail==='string'?b.detail:`Request failed (${r.status})`);return b as T}
 useEffect(()=>{const t=localStorage.getItem('sbp_padel_ops_token')||'';setToken(t)},[]);
 useEffect(()=>{if(!token)return;api<Venue[]>('/operations/my-venues').then(v=>{setVenues(v);if(v[0])setVenueId(v[0].id)}).catch(()=>location.href='/')},[token]);
 useEffect(()=>()=>stopCamera(),[]);
 useEffect(()=>{setResult(null);setError('')},[venueId]);

 function stopCamera(){if(frameRef.current!==null){cancelAnimationFrame(frameRef.current);frameRef.current=null}streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;scanningRef.current=false;setCameraOn(false)}
 async function validate(raw=value){const passValue=raw.trim();if(!passValue){setError('Scan a QR code or enter a booking ID / pass value first.');return}setLoading(true);setError('');try{const d=await api<Validation>('/operations/pass/validate',{method:'POST',body:JSON.stringify({venue_id:venueId,pass_value:passValue})});setValue(passValue);setResult(d);if(d.valid)stopCamera()}catch(e){setError(e instanceof Error?e.message:'Pass validation failed')}finally{setLoading(false)}}

 function decodePixels(data:Uint8ClampedArray,width:number,height:number){return jsQR(data,width,height,{inversionAttempts:'attemptBoth'})?.data?.trim()||''}
 function canvasDecode(canvas:HTMLCanvasElement){const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return '';const image=context.getImageData(0,0,canvas.width,canvas.height);return decodePixels(image.data,image.width,image.height)}
 function createFallbackDecoder(){
  return (video:HTMLVideoElement)=>{
   if(video.videoWidth<2||video.videoHeight<2)return '';
   const canvas=canvasRef.current||(canvasRef.current=document.createElement('canvas'));
   canvas.width=video.videoWidth;canvas.height=video.videoHeight;
   const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return '';
   context.drawImage(video,0,0,canvas.width,canvas.height);
   let raw=canvasDecode(canvas);if(raw)return raw;
   const cropScale=.72,sw=Math.floor(video.videoWidth*cropScale),sh=Math.floor(video.videoHeight*cropScale),sx=Math.floor((video.videoWidth-sw)/2),sy=Math.floor((video.videoHeight-sh)/2);
   canvas.width=960;canvas.height=Math.max(540,Math.round(960*(sh/sw)));
   const cropContext=canvas.getContext('2d',{willReadFrequently:true});if(!cropContext)return '';
   cropContext.imageSmoothingEnabled=false;cropContext.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
   return canvasDecode(canvas);
  };
 }

 async function createNativeDecoder():Promise<((source:ImageBitmapSource)=>Promise<string>)|null>{
  const Detector=(window as Window&{BarcodeDetector?:BarcodeDetectorCtor}).BarcodeDetector;
  if(!Detector)return null;
  try{const detector=new Detector({formats:['qr_code']});return async(source:ImageBitmapSource)=>String((await detector.detect(source))?.[0]?.rawValue||'').trim()}catch{return null}
 }

 async function startCamera(){
  setError('');setResult(null);
  if(!navigator.mediaDevices?.getUserMedia){setCameraMessage('Camera API unavailable in this browser. Manual booking lookup remains available.');setError('NotSupportedError: navigator.mediaDevices.getUserMedia is unavailable');return}
  try{
   stopCamera();setCameraMessage('Requesting camera access…');
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
   streamRef.current=stream;
   const [track]=stream.getVideoTracks();
   try{const capabilities=(track.getCapabilities?.()||{}) as MediaTrackCapabilities&{focusMode?:string[]};if(capabilities.focusMode?.includes('continuous'))await track.applyConstraints({advanced:[{focusMode:'continuous'} as MediaTrackConstraintSet]})}catch{}
   const video=videoRef.current;if(!video){stopCamera();throw new Error('Camera preview element is unavailable')}
   video.srcObject=stream;await video.play();setCameraOn(true);
   const nativeDecoder=await createNativeDecoder(),fallbackDecoder=createFallbackDecoder();
   setCameraMessage(nativeDecoder?'Camera live. Hold the QR inside the guide and keep it steady.':'Camera live. Hold the QR inside the guide and keep it steady. Compatible decoder active.');
   const loop=async()=>{if(!streamRef.current)return;if(!scanningRef.current&&video.readyState>=2){scanningRef.current=true;try{const raw=nativeDecoder?await nativeDecoder(video):fallbackDecoder(video);if(raw){setValue(raw);setCameraMessage('QR detected. Validating…');await validate(raw);return}}catch(e){console.warn('QR decode frame failed',e)}finally{scanningRef.current=false}}frameRef.current=requestAnimationFrame(loop)};
   frameRef.current=requestAnimationFrame(loop);
  }catch(e){stopCamera();const detail=cameraErrorText(e);setCameraMessage(`Camera failed: ${detail}`);setError(detail)}
 }

 async function decodeUploadedFile(file:File){
  setUploading(true);setError('');setResult(null);
  try{
   const bitmap=await createImageBitmap(file),nativeDecoder=await createNativeDecoder();
   let raw=nativeDecoder?await nativeDecoder(bitmap):'';
   if(!raw){const max=1400,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Could not prepare QR image');context.drawImage(bitmap,0,0,canvas.width,canvas.height);raw=canvasDecode(canvas)}
   bitmap.close();
   if(!raw)throw new Error('No QR code found in the selected image. Try a clearer or tighter crop.');
   setValue(raw);setCameraMessage('QR decoded from image. Validating…');await validate(raw);
  }catch(e){setError(e instanceof Error?e.message:'Could not read QR image')}finally{setUploading(false);if(fileRef.current)fileRef.current.value=''}
 }
 function onFileChange(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(file)void decodeUploadedFile(file)}

 async function checkIn(){const booking=result?.booking;if(!booking)return;setLoading(true);setError('');try{const d=await api<{checked_in:boolean;checked_in_at:string}>(`/operations/bookings/${booking.id}/check-in`,{method:'POST',body:'{}'});setResult(r=>r&&r.booking?{...r,reason:'Player is already checked in',reason_code:'already_checked_in',booking:{...r.booking,checked_in:true,checked_in_at:d.checked_in_at}}:r)}catch(e){setError(e instanceof Error?e.message:'Check-in failed')}finally{setLoading(false)}}
 function reset(){setResult(null);setValue('');setError('');setCameraMessage('Camera is off. Use manual lookup or start the scanner.');stopCamera()}
 function signOut(){stopCamera();localStorage.removeItem('sbp_padel_ops_token');location.href='/'}

 if(!token)return <main className="login"><div className="loginCard"><h1>Scan Pass</h1><p>Open the operations console and sign in first.</p><a className="btn" href="/">BACK TO SIGN IN</a></div></main>;
 return <div className="shell scanShell"><aside className="sidebar"><div className="brand"><small>SPORTS BOARD PUNJAB</small>SBP Padel</div><div className="nav"><a href="/">Operations Console</a><a href="/players">Players</a><a className="active" href="/scan-pass">Scan Pass</a></div><div className="sideFoot"><span>{currentVenue?.role?.toUpperCase()||'OPERATIONS'}</span><button onClick={signOut}>Sign out</button></div></aside><main className="main"><header className="top"><div><h1>Scan Pass / Check-In</h1><p>{currentVenue?`${currentVenue.name} · ${currentVenue.city}`:'Validate a player pass against the live booking system.'}</p></div><div className="playerTopActions"><select value={venueId} onChange={e=>setVenueId(e.target.value)}>{venues.map(v=><option key={v.id} value={v.id}>{v.name} · {v.city}</option>)}</select><div className="pill">{currentVenue?.role?.toUpperCase()||'OPERATIONS'}</div><a className="btn" href="/">BACK TO OPERATIONS</a></div></header>{error&&<div className="error errorBar">{error}<button onClick={()=>setError('')}>×</button></div>}<div className="scanGrid"><section className="card scanCard"><div className="scanTitle"><div><small className="eyebrow">QR SCANNER</small><h2>Player digital pass</h2></div><span className={`scannerState ${cameraOn?'on':''}`}>{cameraOn?'CAMERA LIVE':'CAMERA OFF'}</span></div><div className="cameraFrame"><video ref={videoRef} playsInline muted/><div className="cameraGuide"><i/><i/><i/><i/><span>ALIGN QR HERE</span></div>{!cameraOn&&<div className="cameraPlaceholder">QR</div>}</div><p className="sectionNote">{cameraMessage}</p><div className="scanActions"><button className="btn bigBtn" onClick={cameraOn?stopCamera:startCamera}>{cameraOn?'STOP CAMERA':'START CAMERA SCANNER'}</button><button className="btn secondaryBtn" disabled={uploading} onClick={()=>fileRef.current?.click()}>{uploading?'READING IMAGE…':'UPLOAD QR IMAGE'}</button><input ref={fileRef} className="hiddenQrInput" type="file" accept="image/*" onChange={onFileChange}/></div><p className="desktopHint">On desktop, you can upload a screenshot/photo of the pass instead of holding another screen in front of the laptop camera.</p><div className="manualLookup"><span>OR LOOK UP MANUALLY</span><div className="inlineField"><input value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();validate()}}} placeholder="Booking ID, UUID or scanned pass value"/><button className="btn" onClick={()=>validate()}>{loading?'CHECKING…':'VALIDATE'}</button></div></div></section><section className="card passResultCard">{!result?<div className="scanEmpty"><b>Waiting for a pass</b><span>Scan the player’s QR code, upload a QR image, or enter the booking ID. No check-in occurs until the pass has been validated.</span></div>:<><div className={`validationBanner ${result.valid?'valid':'invalid'}`}><small>{result.valid?'PASS VALIDATED':'PASS NOT VALID'}</small><h2>{result.reason}</h2></div>{result.booking&&<div className="passDetails"><div className="passPerson"><small>PLAYER</small><h2>{result.booking.player.full_name}</h2><span>{result.booking.player.phone||result.booking.player.email||'No contact detail'}</span></div><div className="passInfoGrid"><div><small>Booking ID</small><b>{result.booking.booking_code}</b></div><div><small>Court</small><b>{result.booking.court_code?`${result.booking.court_code} · `:''}{result.booking.court_name}</b></div><div><small>Date</small><b>{niceDate(result.booking.date)}</b></div><div><small>Time</small><b>{result.booking.slots.map(s=>`${niceTime(s.start_time)}–${niceTime(s.end_time)}`).join(', ')}</b></div><div><small>Booking</small><b>{result.booking.status.replaceAll('_',' ').toUpperCase()}</b></div><div><small>Payment</small><b>{String(result.booking.payment_status||'none').replaceAll('_',' ').toUpperCase()}</b></div></div>{result.booking.checked_in?<div className="alreadyChecked">✓ CHECKED IN{result.booking.checked_in_at&&<span>{checkedAt(result.booking.checked_in_at)}</span>}</div>:result.valid?<button className="btn checkInBtn" disabled={loading} onClick={checkIn}>{loading?'CHECKING IN…':'CHECK IN PLAYER'}</button>:null}</div>}<button className="resetPass" onClick={reset}>SCAN / LOOK UP ANOTHER PASS</button></>}</section></div></main></div>
}
