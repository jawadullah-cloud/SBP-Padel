const screens = [...document.querySelectorAll('.screen')];
const navItems = [...document.querySelectorAll('.nav-item')];

function go(id){
  screens.forEach(s => s.classList.toggle('active', s.id === id));
  navItems.forEach(n => n.classList.toggle('active', n.dataset.nav === id));
}

document.querySelectorAll('[data-nav]').forEach(el=>{
  el.addEventListener('click',()=>go(el.dataset.nav));
});

const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click',()=>{
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = next;
  themeToggle.querySelector('.theme-icon').textContent = next === 'dark' ? '☾' : '☀';
});

document.querySelectorAll('.date-chip').forEach(chip=>{
  chip.addEventListener('click',()=>{
    document.querySelectorAll('.date-chip').forEach(c=>c.classList.remove('selected'));
    chip.classList.add('selected');
  });
});

document.querySelectorAll('.time-slot:not(.disabled)').forEach(slot=>{
  slot.addEventListener('click',()=>{
    document.querySelectorAll('.time-slot').forEach(s=>s.classList.remove('selected'));
    slot.classList.add('selected');
    document.getElementById('summaryTime').textContent = `${slot.textContent} · Court 02`;
  });
});

document.getElementById('continueBtn').addEventListener('click',()=>{
  const btn = document.getElementById('continueBtn');
  const old = btn.innerHTML;
  btn.innerHTML = 'Selected ✓';
  btn.style.filter = 'brightness(1.08)';
  setTimeout(()=>{ btn.innerHTML = old; btn.style.filter = ''; },1200);
});
