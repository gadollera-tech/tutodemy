
document.addEventListener("DOMContentLoaded", async ()=>{
  await window.TutoCloud?.ready;
  const id=new URLSearchParams(location.search).get("id")||"math-m1";
  const r=window.TUTODEMY_REVIEWERS.find(x=>x.id===id)||window.TUTODEMY_REVIEWERS[0];
  if(r.access==="Premium"&&window.Tuto.getPlan()!=="pro"){ location.replace("pricing.html"); return; }
  document.title=`${r.title} | TutoDemy Learning PH`;
  document.querySelector("#reader-meta").textContent=`${r.access} · ${r.category}`;
  document.querySelector("#reader-title").textContent=r.title;
  document.querySelector("#reader-summary").textContent=r.summary;
  document.querySelector("#reader-badge").textContent=r.domain;
  document.querySelector("#reader-points").innerHTML=r.points.map((p,i)=>`<div class="reader-point"><span>${i+1}</span><p>${p}</p></div>`).join("");
  const practice=document.querySelector("#practice-reviewer");
  practice.href=`practice.html?category=${encodeURIComponent(r.category)}&domain=${encodeURIComponent(r.domain)}`;
  const save=document.querySelector("#save-reviewer");
  const refresh=()=>save.textContent=window.Tuto.getSavedReviewers().includes(r.id)?"★ Saved reviewer":"☆ Save reviewer";
  save.addEventListener("click",()=>{const s=window.Tuto.toggleReviewer(r.id);window.Tuto.toast(s?"Reviewer saved.":"Reviewer removed.");refresh();});
  refresh();
});
