
document.addEventListener("DOMContentLoaded", async ()=>{
  await window.TutoCloud?.ready;
  const history=window.Tuto.storage.get("tutodemyHistory",[]);
  const accountTitle=document.querySelector("#dashboard-account-title");
  const accountDescription=document.querySelector("#dashboard-account-description");
  const accountLink=document.querySelector("#dashboard-account-link");
  if(!window.TutoAuth?.isConfigured?.()){
    accountTitle.textContent="Account sync is temporarily unavailable";
    accountDescription.textContent="Your local learning progress remains available on this device.";
    accountLink.href="auth.html";accountLink.textContent="Account";
  }else if(window.TutoAuth.getUser()){
    accountTitle.textContent="Progress is linked to your learner account";
    accountDescription.textContent=window.TutoCloud?.getStatus?.().lastError?"Local copy saved; cloud sync needs attention.":"Your account can synchronize attempts, saved reviewers, and active exams.";
    accountLink.href="profile.html";accountLink.textContent="My profile";
  }else{
    accountTitle.textContent="Log in to use this progress on another device";
    accountDescription.textContent="Current progress is stored only in this browser until it is connected to an account.";
    accountLink.href="auth.html";accountLink.textContent="Log in";
  }

  const saved=window.Tuto.getSavedReviewers();
  const inquiries=window.Tuto.storage.get("tutodemyTutorInquiries",[]);
  document.querySelector("#dash-attempts").textContent=history.length;
  const totalQ=history.reduce((s,h)=>s+(h.total||0),0),totalCorrect=history.reduce((s,h)=>s+(h.correct||0),0);
  document.querySelector("#dash-accuracy").textContent=totalQ?`${Math.round(totalCorrect/totalQ*100)}%`:"—";
  document.querySelector("#dash-saved").textContent=saved.length;
  document.querySelector("#dash-inquiries").textContent=inquiries.length;

  const historyBox=document.querySelector("#attempt-history");
  function renderHistory(){
    const items=window.Tuto.storage.get("tutodemyHistory",[]);
    historyBox.innerHTML=items.length?items.slice(0,12).map(h=>`<div class="history-item"><div><b>${h.category}</b><small>${h.modeLabel} · ${h.total} items · ${new Date(h.completedAt).toLocaleString()}</small></div><span>${h.correct}/${h.total}</span><span>${h.accuracy}%</span><a href="practice.html">New set</a></div>`).join(""):`<div class="empty-state">No completed attempts yet.</div>`;
  }
  renderHistory();
  document.querySelector("#clear-history").addEventListener("click",async()=>{
    if(!confirm("Clear all attempt history from this browser and, when logged in, from the learner account?")) return;
    window.Tuto.storage.remove("tutodemyHistory");
    try{await window.TutoCloud?.clearAttemptHistory?.();}catch(error){console.error(error);window.Tuto.toast("Local history cleared, but cloud deletion needs attention.");}
    location.reload();
  });

  const categories=["Mathematics","Language & Reading","Science","Reasoning"];
  document.querySelector("#subject-performance").innerHTML=categories.map(cat=>{
    const attempts=history.filter(h=>h.category===cat||h.category==="Mixed");
    const q=attempts.reduce((s,h)=>s+(h.categoryBreakdown?.[cat]?.total||0),0);
    const c=attempts.reduce((s,h)=>s+(h.categoryBreakdown?.[cat]?.correct||0),0);
    const pct=q?Math.round(c/q*100):0;
    return `<div class="performance-row"><b>${cat}</b><span>${q?pct+"%":"No data"}</span><div class="performance-bar"><i style="width:${pct}%"></i></div></div>`;
  }).join("");

  const savedItems=window.TUTODEMY_REVIEWERS.filter(r=>saved.includes(r.id));
  document.querySelector("#saved-reviewers").innerHTML=savedItems.length?savedItems.map(r=>`<a href="reviewer.html?id=${r.id}"><span>${r.domain}</span><div><b>${r.title}</b><small>${r.category}</small></div></a>`).join(""):`<div class="empty-state">No saved reviewers yet.</div>`;
});
