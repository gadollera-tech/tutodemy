document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoAuth?.ready;
  await window.TutoMarketplace?.ready;
  const api=window.TutoMarketplace;
  const alert=document.querySelector("#admin-alert"),content=document.querySelector("#admin-content");
  const esc=v=>window.Tuto.escape(v),money=v=>window.Tuto.money(v);
  let tutors=[],bookings=[],reports=[];

  function tutorCard(t){
    const photo=api.publicAvatarUrl(t.profile_photo_path);
    return `<article class="admin-card" data-tutor-id="${t.user_id}"><div class="admin-card-head"><img src="${esc(photo)}" alt=""><div><span class="status-pill status-${t.status}">${esc(t.status)}</span><h3>${esc(t.display_name||"Unnamed tutor")}</h3><p>${esc(t.contact_email)} • ${esc([t.city,t.province].filter(Boolean).join(", "))}</p></div><b>${money(t.hourly_rate)}/hr</b></div><div class="admin-profile-summary"><p><b>Headline:</b> ${esc(t.headline||"—")}</p><p><b>Subjects:</b> ${esc((t.subjects||[]).join(", ")||"—")}</p><p><b>Modes:</b> ${esc((t.teaching_modes||[]).join(", ")||"—")}</p><p><b>Education:</b> ${esc(t.education||"—")}</p><p><b>Credentials:</b> ${esc(t.credentials_summary||"—")}</p><p><b>Bio:</b> ${esc(t.bio||"—")}</p></div><div class="admin-documents" data-documents>Loading private documents…</div><label class="founding-check"><input type="checkbox" data-founding ${t.founding_eligible?"checked":""}> Mark eligible for the Founding Tutor benefit</label><label>Admin reason or note<textarea data-reason rows="2" placeholder="Required for rejection or suspension">${esc(t.rejection_reason||"")}</textarea></label><div class="admin-actions"><button class="button approve-tutor" type="button">Approve</button><button class="button button-outline reject-tutor" type="button">Reject</button><button class="button button-outline suspend-tutor" type="button">Suspend</button>${t.status!=="pending"?`<button class="text-button set-pending" type="button">Return to pending</button>`:""}</div></article>`;
  }

  async function loadDocuments(card,tutorId){
    const box=card.querySelector("[data-documents]");
    try{const docs=await api.adminTutorDocuments(tutorId);box.innerHTML=docs.map(d=>`<button type="button" class="document-link" data-path="${esc(d.storage_path)}"><span><b>${esc(d.document_type)}</b><small>${esc(d.original_name)}</small></span><em>${esc(d.verification_status)}</em></button>`).join("")||`<p>No verification documents uploaded.</p>`;box.querySelectorAll(".document-link").forEach(btn=>btn.addEventListener("click",async()=>{try{const url=await api.signedDocumentUrl(btn.dataset.path);window.open(url,"_blank","noopener");}catch(error){alert.hidden=false;alert.textContent=error.message;}}));}catch(error){box.textContent=error.message;}
  }

  function renderTutors(){
    const list=document.querySelector("#admin-tutor-list");
    list.innerHTML=tutors.map(tutorCard).join("")||`<div class="empty-state"><h3>No tutor applications yet.</h3></div>`;
    list.querySelectorAll(".admin-card").forEach(card=>loadDocuments(card,card.dataset.tutorId));
    const action=async(card,status)=>{const reason=card.querySelector("[data-reason]").value.trim();if(["rejected","suspended"].includes(status)&&!reason)return window.Tuto.toast("Add an admin reason first.");if(!confirm(`Set this tutor profile to ${status}?`))return;try{card.classList.add("working");await api.adminSetTutorStatus(card.dataset.tutorId,status,reason,card.querySelector("[data-founding]").checked);await loadAll();}catch(error){alert.hidden=false;alert.textContent=error.message;}finally{card.classList.remove("working");}};
    list.querySelectorAll(".approve-tutor").forEach(btn=>btn.addEventListener("click",()=>action(btn.closest(".admin-card"),"approved")));
    list.querySelectorAll(".reject-tutor").forEach(btn=>btn.addEventListener("click",()=>action(btn.closest(".admin-card"),"rejected")));
    list.querySelectorAll(".suspend-tutor").forEach(btn=>btn.addEventListener("click",()=>action(btn.closest(".admin-card"),"suspended")));
    list.querySelectorAll(".set-pending").forEach(btn=>btn.addEventListener("click",()=>action(btn.closest(".admin-card"),"pending")));
  }

  function bookingCard(b){
    const canPay=b.status==="accepted",canComplete=b.status==="session_delivered"&&b.payment_status==="paid";
    return `<article class="admin-card booking-admin-card" data-booking-id="${b.id}"><div class="admin-card-head"><div><span class="status-pill status-${b.status}">${esc(b.status)}</span><h3>${esc(b.tutor_name_snapshot||"Tutor")} ↔ ${esc(b.learner_name_snapshot||"Learner")}</h3><p>${new Date(b.requested_start).toLocaleString()} • ${esc(b.subject)} • ${esc(b.mode)}</p></div><b>${money(b.gross_amount)}</b></div><dl class="booking-details"><div><dt>Payment</dt><dd>${esc(b.payment_status)}</dd></div><div><dt>Duration</dt><dd>${b.duration_minutes} minutes</dd></div>${b.commission_rate?`<div><dt>Commission</dt><dd>${b.commission_rate}% / ${money(b.commission_amount)}</dd></div><div><dt>Tutor net</dt><dd>${money(b.tutor_net_amount)}</dd></div>`:""}</dl>${canPay?`<div class="admin-payment-form"><label>Payment method<input data-payment-method placeholder="GCash, bank transfer, etc."></label><label>Payment reference<input data-payment-reference placeholder="Verified transaction reference"></label><button class="button confirm-payment" type="button">Confirm payment</button></div>`:""}<div class="booking-actions"><a class="button button-outline" href="messages.html?booking=${encodeURIComponent(b.id)}">Open conversation</a></div>${canComplete?`<div class="admin-complete-form"><label>Completion note<input data-completion-note placeholder="Optional admin note"></label><button class="button complete-booking" type="button">Complete booking and record commission</button></div>`:""}</article>`;
  }

  function renderBookings(){
    const list=document.querySelector("#admin-booking-list");
    list.innerHTML=bookings.map(bookingCard).join("")||`<div class="empty-state"><h3>No booking records yet.</h3></div>`;
    list.querySelectorAll(".confirm-payment").forEach(btn=>btn.addEventListener("click",async()=>{const card=btn.closest(".admin-card");const method=card.querySelector("[data-payment-method]").value.trim(),reference=card.querySelector("[data-payment-reference]").value.trim();if(!method||!reference)return window.Tuto.toast("Enter the verified payment method and reference.");if(!confirm("Confirm that payment was independently verified?"))return;try{btn.disabled=true;await api.adminConfirmPayment(card.dataset.bookingId,method,reference);await loadAll();}catch(error){alert.hidden=false;alert.textContent=error.message;btn.disabled=false;}}));
    list.querySelectorAll(".complete-booking").forEach(btn=>btn.addEventListener("click",async()=>{const card=btn.closest(".admin-card");if(!confirm("Complete this paid, delivered booking and create the commission ledger entry?"))return;try{btn.disabled=true;await api.adminCompleteBooking(card.dataset.bookingId,card.querySelector("[data-completion-note]").value.trim());await loadAll();}catch(error){alert.hidden=false;alert.textContent=error.message;btn.disabled=false;}}));
  }

  function reportCard(r){
    const message = r.reported_message_body ? `<blockquote>${esc(r.reported_message_body)}</blockquote>` : "";
    return `<article class="admin-card message-report-card" data-report-id="${esc(r.id)}"><div class="admin-card-head"><div><span class="status-pill status-${esc(r.status)}">${esc(r.status)}</span><h3>${esc(r.reason)}</h3><p>${esc(r.booking_label||"Booking conversation")} • Reported by ${esc(r.reporter_label||"Account")}</p></div><time>${new Date(r.created_at).toLocaleString()}</time></div>${message}${r.details?`<p><b>Details:</b> ${esc(r.details)}</p>`:""}<label>Administrator note<textarea data-report-note rows="2" placeholder="Record the review outcome">${esc(r.admin_note||"")}</textarea></label><div class="admin-actions"><a class="button button-outline" href="messages.html?booking=${encodeURIComponent(r.booking_id)}">Review conversation</a>${r.status!=="resolved"?`<button class="button report-resolve" type="button">Mark resolved</button>`:""}${r.status!=="dismissed"?`<button class="text-button report-dismiss" type="button">Dismiss</button>`:""}</div></article>`;
  }

  function renderReports(){
    const list=document.querySelector("#admin-report-list");
    list.innerHTML=reports.map(reportCard).join("")||`<div class="empty-state"><h3>No conversation reports.</h3><p>Reported booking conversations will appear here for administrator review.</p></div>`;
    const update=async(button,status)=>{const card=button.closest(".message-report-card");try{button.disabled=true;await api.adminResolveMessageReport(card.dataset.reportId,status,card.querySelector("[data-report-note]").value.trim());await loadAll();}catch(error){alert.hidden=false;alert.textContent=error.message;button.disabled=false;}};
    list.querySelectorAll(".report-resolve").forEach(button=>button.addEventListener("click",()=>update(button,"resolved")));
    list.querySelectorAll(".report-dismiss").forEach(button=>button.addEventListener("click",()=>update(button,"dismissed")));
  }

  async function loadAll(){
    const [tutorResult,bookingResult,reportResult]=await Promise.allSettled([api.adminPendingTutors(),api.adminBookings(),api.adminMessageReports()]);
    if(tutorResult.status==="rejected")throw tutorResult.reason;
    if(bookingResult.status==="rejected")throw bookingResult.reason;
    tutors=tutorResult.value||[];
    bookings=bookingResult.value||[];
    reports=reportResult.status==="fulfilled"?(reportResult.value||[]):[];
    renderTutors();renderBookings();renderReports();
  }

  if(!window.TutoAuth?.getUser?.()){location.replace("auth.html");return;}
  try{
    if(!api.isReady())throw new Error("The Admin Console is temporarily unavailable.");
    if(!await api.checkAdmin())throw new Error("Administrator access is required for this account.");
    content.hidden=false;alert.hidden=true;await loadAll();
  }catch(error){alert.hidden=false;alert.textContent=error.message||"Admin Console could not be opened.";}

  document.querySelectorAll("[data-admin-tab]").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll("[data-admin-tab]").forEach(x=>x.classList.toggle("active",x===btn));document.querySelectorAll(".admin-panel").forEach(p=>p.classList.toggle("active",p.id===`admin-${btn.dataset.adminTab}-panel`));}));
});
