import { expect, test } from '@playwright/test';

const QR_DATA='iVBORw0KGgoAAAANSUhEUgAAASIAAAEiAQAAAAB1xeIbAAABh0lEQVR4nO2awW2EMBBF38RIOYKUAlKK6SAlpTVcSjqw76CfA2Z3s5GSXFgIjE/GepK/0Ogz84WJ31d6+gMETjnllFNO7Z2yupq668ty0m+q6xRUlCRl0ABoIEiS9JV6vK5TUKXWuL3nemJmzfa6jkw1d89K3co3OvUDFWT9Y288KbXUfSuggMX8gihwO3TtVf0hqGRmZl09tJ5pbnO21nVoaq77a40rdZi+Vv1+1R+Bsr40QDGDdsR6JoPSYP2muo5NVb+fq70VFj+eBQQBk3vOA6iYa0OvoR0v9h98tlqTQpcFraSBIKIkYq7DrYa9qv/f1Ow5BmGE0oxGm1GazWYy4rCNrjNQN33OYjBToyiAEkbbStcZKG4jM8LtLubFkdxzVqHqu685ZpCkkSXRrM7v735daskxSR2YdUHXRHP/6v8ndZ9jUvv7yZRex+UbsFf1x6LmUCdZHXOt34muI1L3OabSW8aigJhfvM9Zk/rW58QclgErg39rV6TM/41yyimnnDoF9QkOH7b6T0xNtwAAAABJRU5ErkJggg==';

test('camera opens and fallback decoder validates QR without BarcodeDetector',async({page})=>{
 let validatedPayload:any=null;
 await page.addInitScript(({qr})=>{
  localStorage.setItem('sbp_padel_ops_token','qa-token');
  Object.defineProperty(window,'BarcodeDetector',{value:undefined,configurable:true});
  const mediaDevices=navigator.mediaDevices||{} as MediaDevices;
  Object.defineProperty(navigator,'mediaDevices',{value:mediaDevices,configurable:true});
  mediaDevices.getUserMedia=async()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
   const context=canvas.getContext('2d')!;
   const image=new Image();image.src=`data:image/png;base64,${qr}`;
   await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('QR fixture failed to load'))});
   const draw=()=>{context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,175,95,290,290)};
   draw();setInterval(draw,100);
   return canvas.captureStream(10);
  };
 },{qr:QR_DATA});
 await page.route('http://127.0.0.1:8000/api/v1/operations/my-venues',route=>route.fulfill({json:[{id:'venue-1',name:'QA Venue',city:'Lahore',role:'operator'}]}));
 await page.route('http://127.0.0.1:8000/api/v1/operations/pass/validate',async route=>{validatedPayload=route.request().postDataJSON();await route.fulfill({json:{valid:false,reason:'QA pass decoded',reason_code:'qa_decoded'}})});
 await page.goto('/scan-pass');
 await page.getByRole('button',{name:'START CAMERA SCANNER'}).click();
 await expect(page.getByText('CAMERA LIVE')).toBeVisible();
 await expect(page.getByText('Camera live. Using compatible QR decoder fallback.')).toBeVisible();
 await expect(page.getByPlaceholder('Booking ID, UUID or scanned pass value')).toHaveValue('BOOK-TEST-001',{timeout:10000});
 await expect(page.getByText('QA pass decoded')).toBeVisible();
 expect(validatedPayload).toEqual({venue_id:'venue-1',pass_value:'BOOK-TEST-001'});
});

test('camera errors expose browser error names',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('sbp_padel_ops_token','qa-token');
  const mediaDevices=navigator.mediaDevices||{} as MediaDevices;
  Object.defineProperty(navigator,'mediaDevices',{value:mediaDevices,configurable:true});
  mediaDevices.getUserMedia=async()=>{throw new DOMException('Camera is busy','NotReadableError')};
 });
 await page.route('http://127.0.0.1:8000/api/v1/operations/my-venues',route=>route.fulfill({json:[{id:'venue-1',name:'QA Venue',city:'Lahore',role:'operator'}]}));
 await page.goto('/scan-pass');
 await page.getByRole('button',{name:'START CAMERA SCANNER'}).click();
 await expect(page.getByText(/NotReadableError: Camera is busy/)).toBeVisible();
 await expect(page.getByText('CAMERA OFF')).toBeVisible();
});
