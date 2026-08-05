
document.addEventListener("DOMContentLoaded",()=>{
  const id=new URLSearchParams(location.search).get("id")||"tutor-01";
  const t=window.TUTODEMY_TUTORS.find(x=>x.id===id)||window.TUTODEMY_TUTORS[0];
  document.title=`${t.name} | TutoDemy Learning PH`;
  document.querySelector("#profile-photo").src=t.photo;
  document.querySelector("#profile-photo").alt=`${t.name} placeholder portrait`;
  document.querySelector("#profile-name").textContent=t.name;
  document.querySelector("#profile-subject").textContent=t.subject;
  document.querySelector("#profile-tags").innerHTML=[t.mode,...t.levels].map(x=>`<span>${x}</span>`).join("");
  document.querySelector("#profile-bio").textContent=t.bio;
  document.querySelector("#profile-highlights").innerHTML=t.highlights.map(x=>`<span>✓ ${x}</span>`).join("");
  document.querySelector("#profile-experience").textContent=t.experience;
  document.querySelector("#profile-availability").textContent=t.availability;
  document.querySelector("#profile-rate").textContent=t.rate;
});
