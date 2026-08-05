
document.addEventListener("DOMContentLoaded", async ()=>{
  await window.TutoCloud?.ready;
  const tutors=window.TUTODEMY_TUTORS;
  const subject=document.querySelector("#tutor-subject"),level=document.querySelector("#tutor-level"),mode=document.querySelector("#tutor-mode"),grid=document.querySelector("#tutor-grid");
  [...new Set(tutors.map(t=>t.subject))].sort().forEach(x=>subject.insertAdjacentHTML("beforeend",`<option>${x}</option>`));
  [...new Set(tutors.flatMap(t=>t.levels))].sort().forEach(x=>level.insertAdjacentHTML("beforeend",`<option>${x}</option>`));
  function render(){
    const items=tutors.filter(t=>(subject.value==="all"||t.subject===subject.value)&&(level.value==="all"||t.levels.includes(level.value))&&(mode.value==="all"||t.mode.includes(mode.value)));
    grid.innerHTML=items.map(t=>`<article class="tutor-card"><img src="${t.photo}" alt="${t.name} placeholder portrait"><div><small>${t.verified?"Verified":"Placeholder profile"}</small><h3>${t.name}</h3><p>${t.subject}</p><div class="tutor-tags"><span>${t.mode}</span>${t.levels.slice(0,2).map(x=>`<span>${x}</span>`).join("")}</div><a href="tutor-profile.html?id=${t.id}">View profile</a></div></article>`).join("")||`<div class="empty-state">No placeholder tutor matches the current filters.</div>`;
  }
  [subject,level,mode].forEach(el=>el.addEventListener("change",render));render();

  const form=document.querySelector("#tutor-inquiry-form"),status=document.querySelector("#inquiry-status");
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(form).entries());
    data.id=`inq-${Date.now()}`;data.submittedAt=new Date().toISOString();data.status="Demo only";
    const inquiries=window.Tuto.storage.get("tutodemyTutorInquiries",[]);
    inquiries.unshift(data);window.Tuto.storage.set("tutodemyTutorInquiries",inquiries.slice(0,30));
    window.TutoCloud?.saveTutorInquiry?.(data).catch(error=>console.error("Tutor inquiry sync failed:",error));
    if(window.TutoCloud?.isAvailable?.()){
      status.textContent="Thank you! The inquiry was saved locally and queued for your TutoDemy account cloud record. It has not been emailed to a tutor yet.";
    } else if(window.TUTODEMY_CONFIG.googleAppsScriptEndpoint){
      status.textContent="The demo inquiry was saved locally. A live endpoint is configured, but submission is intentionally disabled in this static prototype.";
    } else {
      status.textContent="Thank you! The inquiry was saved on this device as a demonstration. Log in after account setup to sync it to the learner account.";
    }
    form.reset();window.Tuto.toast("Demo tutor inquiry saved locally.");
  });
});
