document.addEventListener("DOMContentLoaded", async () => {
  const bank=window.TUTODEMY_BANK;
  document.querySelectorAll("[data-count]").forEach(el=>el.textContent=bank.counts[el.dataset.count]||0);
  const icons={"Mathematics":"∑","Language & Reading":"Aa","Science":"⚗","Reasoning":"◇"};
  const descriptions={
    "Mathematics":"Number sense, algebra, geometry, trigonometry, functions, statistics, and probability.",
    "Language & Reading":"English and Filipino grammar, mechanics, vocabulary, original passages, and comprehension.",
    "Science":"General and Earth Science, Biology, Chemistry, Physics, and scientific reasoning.",
    "Reasoning":"Number sequences, figure rotation, shape progression, odd-one-out, and matrix movement."
  };
  document.querySelector("#home-subjects").innerHTML=Object.entries(bank.counts).map(([name,count])=>`<article class="subject-home-card"><span>${icons[name]}</span><h3>${name}</h3><p>${descriptions[name]}</p><a href="practice.html?category=${encodeURIComponent(name)}">${count} questions →</a></article>`).join("");

  const holder=document.querySelector("#home-tutors");
  await window.TutoMarketplace?.ready;
  try{
    const tutors=window.TutoMarketplace?.isReady?.()?await window.TutoMarketplace.publicTutors({}):[];
    holder.innerHTML=tutors.slice(0,3).map(t=>`<a class="mini-tutor" href="tutor-profile.html?id=${encodeURIComponent(t.user_id)}"><img src="${window.TutoMarketplace.publicAvatarUrl(t.profile_photo_path)}" alt="${window.Tuto.escape(t.display_name)} profile photo"><div><b>${window.Tuto.escape(t.display_name)}</b><small>${window.Tuto.escape((t.subjects||[]).slice(0,2).join(" • ")||"Academic tutor")}</small></div></a>`).join("")||`<div class="tutor-launch-empty"><b>Approved tutor profiles will appear here.</b><p>Start the first tutor application or browse the directory.</p><a href="tutor-onboarding.html">Become a tutor →</a></div>`;
  }catch(error){holder.innerHTML=`<div class="tutor-launch-empty"><b>Tutor directory setup is in progress.</b><p>${window.Tuto.escape(error.message||"")}</p></div>`;}
});
