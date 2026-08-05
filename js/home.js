
document.addEventListener("DOMContentLoaded",()=>{
  const bank=window.TUTODEMY_BANK;
  document.querySelectorAll("[data-count]").forEach(el=>el.textContent=bank.counts[el.dataset.count]||0);
  const icons={"Mathematics":"∑","Language & Reading":"Aa","Science":"⚗","Reasoning":"◇"};
  const descriptions={
    "Mathematics":"Number sense, algebra, geometry, trigonometry, functions, statistics, and probability.",
    "Language & Reading":"English and Filipino grammar, mechanics, vocabulary, original passages, and comprehension.",
    "Science":"General and Earth Science, Biology, Chemistry, Physics, and scientific reasoning.",
    "Reasoning":"Number sequences, figure rotation, shape progression, odd-one-out, and matrix movement."
  };
  document.querySelector("#home-subjects").innerHTML=Object.entries(bank.counts).map(([name,count])=>`
    <article class="subject-home-card"><span>${icons[name]}</span><h3>${name}</h3><p>${descriptions[name]}</p><a href="practice.html?category=${encodeURIComponent(name)}">${count} questions →</a></article>`).join("");
  const tutors=(window.TUTODEMY_TUTORS||[]).slice(0,3);
  document.querySelector("#home-tutors").innerHTML=tutors.map(t=>`<a class="mini-tutor" href="tutor-profile.html?id=${t.id}"><img src="${t.photo}" alt="${t.name} placeholder portrait"><div><b>${t.name}</b><small>${t.subject}</small></div></a>`).join("");
});
