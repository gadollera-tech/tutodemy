
document.addEventListener("DOMContentLoaded", async ()=>{
  await window.TutoCloud?.ready;
  const grid=document.querySelector("#reviewer-grid");
  const search=document.querySelector("#reviewer-search");
  const count=document.querySelector("#reviewer-count");
  const filters=[...document.querySelectorAll("[data-filter]")];
  let active="all";

  function render(){
    const term=search.value.toLowerCase().trim();
    const plan=window.Tuto.getPlan();
    const saved=window.Tuto.getSavedReviewers();
    const items=window.TUTODEMY_REVIEWERS.filter(r=>{
      const matches=active==="all"||r.category===active;
      const hay=`${r.title} ${r.category} ${r.summary} ${r.domain}`.toLowerCase();
      return matches&&(!term||hay.includes(term));
    });
    count.textContent=`${items.length} reviewer${items.length===1?"":"s"}`;
    grid.innerHTML=items.map(r=>{
      const locked=r.access==="Premium"&&plan!=="pro";
      return `<article class="reviewer-card">
        <div class="reviewer-code">${r.domain}</div><small>${r.access} · ${r.category}</small>
        <h3>${r.title}</h3><p>${r.summary}</p>
        <div class="reviewer-actions"><a class="small-button" href="reviewer.html?id=${r.id}">Open reviewer</a><button class="bookmark" data-save="${r.id}" aria-label="Save reviewer">${saved.includes(r.id)?"★":"☆"}</button></div>
        ${locked?`<div class="reviewer-lock"><div><span>🔒</span><p><b>Premium preview reviewer</b></p><a href="pricing.html">Activate preview →</a></div></div>`:""}
      </article>`;
    }).join("")||`<div class="empty-state">No reviewer matches the current search.</div>`;
    grid.querySelectorAll("[data-save]").forEach(btn=>btn.addEventListener("click",()=>{
      const isSaved=window.Tuto.toggleReviewer(btn.dataset.save);
      btn.textContent=isSaved?"★":"☆";
      window.Tuto.toast(isSaved?"Reviewer saved.":"Reviewer removed.");
    }));
  }
  search.addEventListener("input",render);
  filters.forEach(btn=>btn.addEventListener("click",()=>{
    filters.forEach(x=>x.classList.remove("active"));btn.classList.add("active");active=btn.dataset.filter;render();
  }));
  window.addEventListener("tutodemy-plan-change",render);
  render();
});
