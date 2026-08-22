(()=>{
  if(window.__sbpReviewPolicyGate)return;
  window.__sbpReviewPolicyGate=true;
  if(!/review-booking\.html$/i.test(location.pathname))return;

  function mount(){
    const oldCard=document.getElementById('policyCard');
    const bottom=document.querySelector('.bottom');
    const pay=document.getElementById('toPayment');
    const sectionLabel=oldCard?.previousElementSibling;
    const sourceContent=document.querySelector('#policyModal .policyContent');
    const sourceDraft=document.querySelector('#policyModal .draftNotice');
    if(!oldCard||!bottom||!pay||!sourceContent)return false;

    if(sectionLabel?.querySelector('h2'))sectionLabel.querySelector('h2').textContent='Booking, cancellation & refund policy';

    const style=document.createElement('style');
    style.textContent=`
      .policyInline{border:1px solid var(--line);background:var(--surface);border-radius:16px;overflow:hidden;margin-bottom:4px}
      .policyInlineHead{padding:12px 13px;border-bottom:1px solid var(--line);background:linear-gradient(135deg,#102319,#0c1919)}
      .policyInlineHead small{display:block;color:var(--brand);font:800 9px var(--sport);letter-spacing:.11em;margin-bottom:3px}
      .policyInlineHead b{display:block;font-size:11px;line-height:1.35}
      .policyInlineBody{padding:12px 13px;color:#c2cec9;font-size:9px;line-height:1.55}
      .policyInlineBody .draftNotice{margin:0 0 12px}
      .policyInlineBody h3{font-size:11px;color:var(--text);margin:14px 0 5px}
      .policyInlineBody h3:first-of-type{margin-top:0}
      .policyInlineBody p{margin:0 0 7px}.policyInlineBody ul{margin:6px 0 9px;padding-left:17px}.policyInlineBody li{margin:4px 0}
      .policyAccept{display:flex;align-items:flex-start;gap:10px;padding:12px 13px;border-top:1px solid var(--line);background:var(--surface2);cursor:pointer}
      .policyAccept input{appearance:none;width:20px;height:20px;min-width:20px;border:1px solid #486159;border-radius:6px;background:var(--surface);position:relative;margin:0}
      .policyAccept input:checked{background:var(--brand);border-color:var(--brand)}
      .policyAccept input:checked:after{content:'✓';position:absolute;inset:0;display:grid;place-items:center;color:#071006;font-size:12px;font-weight:900}
      .policyAccept span{font-size:9px;line-height:1.45;color:var(--text)}
      .policyAccept span b{color:var(--brand)}
      #toPayment:disabled{opacity:.42;cursor:not-allowed;filter:saturate(.35);box-shadow:none}
      .policyGateNote{font-size:8px;color:#e5c46e;text-align:center;margin-top:8px;line-height:1.4}
    `;
    document.head.appendChild(style);

    const inline=document.createElement('section');
    inline.className='policyInline';
    inline.innerHTML=`
      <div class="policyInlineHead"><small>PLEASE REVIEW BEFORE PAYMENT</small><b>The following booking, cancellation and refund terms apply to this booking.</b></div>
      <div class="policyInlineBody">${sourceDraft?sourceDraft.outerHTML:''}${sourceContent.innerHTML}</div>
      <label class="policyAccept"><input type="checkbox" id="acceptBookingPolicy"><span>I have read and accept the <b>Booking, Cancellation & Refund Policy</b>.</span></label>
    `;
    oldCard.replaceWith(inline);

    pay.disabled=true;
    pay.setAttribute('aria-disabled','true');
    const gateNote=document.createElement('div');
    gateNote.className='policyGateNote';
    gateNote.textContent='Please read and accept the policy above to continue to payment.';
    bottom.appendChild(gateNote);

    const accept=inline.querySelector('#acceptBookingPolicy');
    accept.addEventListener('change',()=>{
      pay.disabled=!accept.checked;
      pay.setAttribute('aria-disabled',String(!accept.checked));
      gateNote.textContent=accept.checked?'Policy accepted. You can continue to payment.':'Please read and accept the policy above to continue to payment.';
      gateNote.style.color=accept.checked?'var(--brand)':'#e5c46e';
    });
    return true;
  }

  if(!mount()){
    const observer=new MutationObserver(()=>{if(mount())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();