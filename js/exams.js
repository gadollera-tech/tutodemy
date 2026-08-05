
document.addEventListener("DOMContentLoaded",()=>{
  const icons={"Mathematics":"∑","Language & Reading":"Aa","Science":"⚗","Reasoning":"◇"};
  const grid=document.querySelector("#exam-subject-grid");
  grid.innerHTML=Object.entries(window.TUTODEMY_TAXONOMY).map(([category,domains])=>`
    <article class="exam-subject-card">
      <header><span>${icons[category]}</span><b>220 QUESTIONS</b></header>
      <h3>${category}</h3><div class="domain-pill-list">${domains.map(d=>`<span>${d.id} · ${d.title}</span>`).join("")}</div>
      <a href="practice.html?category=${encodeURIComponent(category)}">Build a ${category} set →</a>
    </article>`).join("");
});
