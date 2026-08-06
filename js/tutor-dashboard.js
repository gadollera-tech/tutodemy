document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoAuth?.ready;
  await window.TutoMarketplace?.ready;
  const api = window.TutoMarketplace;
  if (!window.TutoAuth?.getUser?.()) { location.replace("auth.html"); return; }
  const alert = document.querySelector("#dashboard-alert");
  const bookingList = document.querySelector("#tutor-booking-list");
  let profile = null, bookings = [], ledger = [], filter = "action";
  const esc = v => window.Tuto.escape(v);
  const money = v => window.Tuto.money(v);
  const labels = {requested:"New request",accepted:"Accepted — awaiting payment",paid:"Payment confirmed",session_delivered:"Waiting for admin completion",completed:"Completed",declined:"Declined",cancelled:"Cancelled",refunded:"Refunded",disputed:"Under review"};

  function updateMetrics() {
    if (!profile) return;
    const estimate = api.estimateCommission(profile, Number(document.querySelector("#commission-gross").value||0));
    document.querySelector("#metric-tier").textContent = estimate.tier;
    document.querySelector("#metric-rate").textContent = `${estimate.rate}% platform commission`;
    document.querySelector("#metric-completed").textContent = profile.completed_sessions || 0;
    const remaining = profile.founding_eligible && profile.completed_sessions < 20 ? 20-profile.completed_sessions : Math.max(0,50-profile.completed_sessions);
    document.querySelector("#metric-progress").textContent = profile.founding_eligible && profile.completed_sessions < 20 ? `${remaining} founding-rate sessions remaining` : `${remaining} sessions to the first top-rated volume threshold`;
    document.querySelector("#metric-rating").textContent = profile.average_rating ? `${Number(profile.average_rating).toFixed(1)} ★` : "New";
    document.querySelector("#metric-reviews").textContent = `${profile.review_count||0} verified review${profile.review_count===1?"":"s"}`;
    document.querySelector("#metric-earnings").textContent = money(ledger.reduce((sum,row)=>sum+Number(row.tutor_net_amount||0),0));
    document.querySelector("#commission-fee").textContent = money(estimate.commission);
    document.querySelector("#commission-net").textContent = money(estimate.net);
    document.querySelector("#commission-description").textContent = `${estimate.tier}: ${estimate.rate}% commission. The final rate is snapshotted only when an admin completes a paid, delivered booking.`;
  }

  function profileStatus() {
    const label = {draft:"Draft",pending:"Pending admin review",approved:"Approved and public",rejected:"Needs revision",suspended:"Suspended"}[profile?.status] || "No tutor profile";
    document.querySelector("#dash-profile-status").textContent = label;
    document.querySelector("#dash-profile-message").textContent = profile?.status === "approved" ? (profile.is_accepting_bookings?"Your profile is accepting requests.":"Your approved profile is not accepting new requests.") : profile?.rejection_reason || "Complete and submit your tutor application.";
  }

  function currentBookings() {
    if (filter === "action") return bookings.filter(b=>b.status==="requested"||b.status==="paid");
    if (filter === "upcoming") return bookings.filter(b=>["accepted","paid","session_delivered"].includes(b.status));
    if (filter === "completed") return bookings.filter(b=>b.status==="completed");
    return bookings;
  }

  function card(b) {
    const canRespond=b.status==="requested", canDeliver=b.status==="paid";
    return `<article class="booking-item" data-id="${b.id}"><div class="booking-item-head"><div><span class="status-pill status-${b.status}">${esc(labels[b.status]||b.status)}</span><h2>${esc(b.learner_name_snapshot||"Learner booking")}</h2><p>${esc(b.subject)} • ${esc(b.mode)}</p></div><b>${money(b.gross_amount)}</b></div><dl class="booking-details"><div><dt>Schedule</dt><dd>${new Date(b.requested_start).toLocaleString()}</dd></div><div><dt>Duration</dt><dd>${b.duration_minutes} minutes</dd></div><div><dt>Payment</dt><dd>${esc(b.payment_status)}</dd></div>${b.status==="completed"?`<div><dt>Your net</dt><dd>${money(b.tutor_net_amount)}</dd></div><div><dt>Commission</dt><dd>${b.commission_rate}%</dd></div>`:""}</dl>${b.learning_goal?`<p class="booking-goal"><b>Learning goal:</b> ${esc(b.learning_goal)}</p>`:""}<div class="booking-actions">${canRespond?`<button class="button accept-booking" type="button">Accept</button><button class="button button-outline decline-booking" type="button">Decline</button>`:""}${canDeliver?`<button class="button deliver-booking" type="button">Mark session delivered</button>`:""}</div></article>`;
  }

  function renderBookings() {
    const rows=currentBookings();
    bookingList.innerHTML=rows.map(card).join("")||`<div class="empty-state"><h3>No bookings in this category.</h3></div>`;
    bookingList.querySelectorAll(".accept-booking,.decline-booking").forEach(btn=>btn.addEventListener("click",async()=>{
      const accept=btn.classList.contains("accept-booking");
      const note=prompt(accept?"Optional note for the learner:":"Reason for declining (recommended):","")||"";
      try{btn.disabled=true;await api.tutorRespond(btn.closest(".booking-item").dataset.id,accept,note);await load();}catch(error){alert.hidden=false;alert.textContent=error.message;btn.disabled=false;}
    }));
    bookingList.querySelectorAll(".deliver-booking").forEach(btn=>btn.addEventListener("click",async()=>{
      if(!confirm("Confirm that the paid tutoring session was delivered?"))return;
      try{btn.disabled=true;await api.markDelivered(btn.closest(".booking-item").dataset.id);await load();}catch(error){alert.hidden=false;alert.textContent=error.message;btn.disabled=false;}
    }));
  }

  function renderLedger() {
    document.querySelector("#commission-ledger").innerHTML = ledger.length ? `<div class="ledger-row ledger-head"><span>Date</span><span>Gross</span><span>Tier</span><span>Rate</span><span>Commission</span><span>Tutor net</span></div>${ledger.map(row=>`<div class="ledger-row"><span>${new Date(row.created_at).toLocaleDateString()}</span><span>${money(row.gross_amount)}</span><span>${esc(row.commission_tier)}</span><span>${row.commission_rate}%</span><span>${money(row.commission_amount)}</span><span><b>${money(row.tutor_net_amount)}</b></span></div>`).join("")}` : `<div class="empty-state"><p>No completed commission records yet.</p></div>`;
  }

  async function load() {
    try {
      if(!api.isReady()) throw new Error("Run the Tutor Marketplace Supabase upgrade before using the tutor dashboard.");
      profile=await api.getMyTutorProfile();
      if(!profile){profileStatus();document.querySelector("#metric-tier").textContent="Not started";bookingList.innerHTML=`<div class="empty-state"><h3>Create your tutor profile first.</h3><a class="button" href="tutor-onboarding.html">Start application</a></div>`;return;}
      [bookings,ledger]=await Promise.all([api.getMyBookings("tutor"),api.getMyLedger()]);
      alert.hidden=true;profileStatus();updateMetrics();renderBookings();renderLedger();
      const toggle=document.querySelector("#toggle-bookings");
      toggle.hidden=profile.status!=="approved";
      toggle.textContent=profile.is_accepting_bookings?"Pause new bookings":"Accept new bookings";
    }catch(error){alert.hidden=false;alert.textContent=error.message||"Tutor dashboard could not be loaded.";}
  }


  document.querySelector("#toggle-bookings").addEventListener("click",async()=>{
    try{const next=!profile.is_accepting_bookings;profile=await api.setAcceptingBookings(next);profileStatus();document.querySelector("#toggle-bookings").textContent=next?"Pause new bookings":"Accept new bookings";window.Tuto.toast(next?"New booking requests enabled.":"New booking requests paused.");}catch(error){alert.hidden=false;alert.textContent=error.message;}
  });
  document.querySelector("#commission-gross").addEventListener("input",updateMetrics);
  document.querySelectorAll("[data-tutor-filter]").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll("[data-tutor-filter]").forEach(x=>x.classList.toggle("active",x===button));filter=button.dataset.tutorFilter;renderBookings();}));
  await load();
});
