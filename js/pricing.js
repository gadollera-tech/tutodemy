
document.addEventListener("DOMContentLoaded",()=>{
  const refresh=()=>document.querySelectorAll(".set-plan").forEach(btn=>{
    const active=btn.dataset.plan===window.Tuto.getPlan();
    btn.textContent=active?"✓ Active preview":(btn.dataset.plan==="pro"?"Activate Pro preview":"Use Free preview");
  });
  document.querySelectorAll(".set-plan").forEach(btn=>btn.addEventListener("click",()=>{
    window.Tuto.setPlan(btn.dataset.plan);
    window.Tuto.toast(btn.dataset.plan==="pro"?"Pro preview activated locally.":"Free preview activated.");
    refresh();
  }));
  refresh();
});
