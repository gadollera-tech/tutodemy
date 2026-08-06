document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoAuth?.ready;
  await window.TutoMarketplace?.ready;
  const api = window.TutoMarketplace;
  const user = window.TutoAuth?.getUser?.();
  if (!user) { location.replace("auth.html"); return; }
  const list = document.querySelector("#booking-list");
  const alert = document.querySelector("#bookings-alert");
  let bookings = [], tutorMap = new Map(), reviewed = new Set(), filter = "active";
  const esc = v => window.Tuto.escape(v);
  const money = v => window.Tuto.money(v);
  const activeStatuses = new Set(["requested","accepted","paid","session_delivered","disputed"]);

  const statusText = status => ({requested:"Waiting for tutor",accepted:"Tutor accepted — payment confirmation pending",paid:"Payment confirmed",session_delivered:"Tutor marked session delivered",completed:"Completed",declined:"Declined by tutor",cancelled:"Cancelled",refunded:"Refunded",disputed:"Under review"}[status] || status);

  function visibleItems() {
    if (filter === "active") return bookings.filter(b => activeStatuses.has(b.status));
    if (filter === "completed") return bookings.filter(b => b.status === "completed");
    if (filter === "closed") return bookings.filter(b => ["declined","cancelled","refunded"].includes(b.status));
    return bookings;
  }

  function bookingCard(b) {
    const tutor = tutorMap.get(b.tutor_id);
    const tutorName = tutor?.display_name || "Tutor profile";
    const canCancel = ["requested","accepted"].includes(b.status) && b.payment_status === "unpaid";
    const canReview = b.status === "completed" && !reviewed.has(b.id);
    const canMessage = ["accepted","paid","session_delivered","completed","disputed"].includes(b.status);
    return `<article class="booking-item" data-id="${b.id}">
      <div class="booking-item-head"><div><span class="status-pill status-${b.status}">${esc(statusText(b.status))}</span><h2>${esc(tutorName)}</h2><p>${esc(b.subject)} • ${esc(b.mode)}</p></div><a href="tutor-profile.html?id=${encodeURIComponent(b.tutor_id)}">View tutor</a></div>
      <dl class="booking-details"><div><dt>Schedule</dt><dd>${new Date(b.requested_start).toLocaleString()}</dd></div><div><dt>Duration</dt><dd>${b.duration_minutes} minutes</dd></div><div><dt>Session amount</dt><dd>${money(b.gross_amount)}</dd></div><div><dt>Payment</dt><dd>${esc(b.payment_status)}</dd></div></dl>
      ${b.learning_goal ? `<p class="booking-goal"><b>Learning goal:</b> ${esc(b.learning_goal)}</p>` : ""}
      ${b.tutor_response_note ? `<p class="booking-note-inline"><b>Tutor note:</b> ${esc(b.tutor_response_note)}</p>` : ""}
      <div class="booking-actions">${canMessage?`<a class="button" href="messages.html?booking=${encodeURIComponent(b.id)}">Open messages</a>`:""}${canCancel?`<button class="button button-outline cancel-booking" type="button">Cancel request</button>`:""}${canReview?`<button class="button review-booking" type="button">Leave verified review</button>`:""}</div>
      ${canReview?`<form class="inline-review-form" hidden><label>Rating<select name="rating"><option value="5">5 — Excellent</option><option value="4">4 — Very good</option><option value="3">3 — Good</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label><label>Review<textarea name="review_text" rows="3" maxlength="800"></textarea></label><button class="button" type="submit">Submit review</button><p class="form-status"></p></form>`:""}
    </article>`;
  }

  function render() {
    const items = visibleItems();
    list.innerHTML = items.map(bookingCard).join("") || `<div class="empty-state"><h3>No bookings in this category.</h3><p>Browse approved tutors to request a session.</p><a class="button" href="tutoring.html">Find a tutor</a></div>`;
    list.querySelectorAll(".cancel-booking").forEach(button => button.addEventListener("click", async () => {
      const card = button.closest(".booking-item");
      if (!confirm("Cancel this unpaid booking request?")) return;
      try { button.disabled=true; await api.cancelBooking(card.dataset.id,"Cancelled by learner"); await load(); } catch(error){ alert.hidden=false;alert.textContent=error.message;button.disabled=false; }
    }));
    list.querySelectorAll(".review-booking").forEach(button => button.addEventListener("click", () => {
      const form = button.closest(".booking-item").querySelector(".inline-review-form");
      form.hidden = !form.hidden;
    }));
    list.querySelectorAll(".inline-review-form").forEach(form => form.addEventListener("submit", async event => {
      event.preventDefault();
      const status = form.querySelector(".form-status");
      const values = Object.fromEntries(new FormData(form).entries());
      try { status.textContent="Submitting review…"; await api.submitReview(form.closest(".booking-item").dataset.id,values.rating,values.review_text); status.textContent="Review submitted."; await load(); } catch(error){ status.textContent=error.message;status.classList.add("error"); }
    }));
  }

  async function load() {
    try {
      if (!api.isReady()) throw new Error("Bookings are temporarily unavailable. Please try again later.");
      [bookings] = await Promise.all([api.getMyBookings("learner")]);
      const [tutors,reviews] = await Promise.all([api.publicTutors({acceptingOnly:false}),api.getMyReviews()]);
      tutorMap = new Map(tutors.map(t=>[t.user_id,t]));
      reviewed = new Set(reviews.map(r=>r.booking_id));
      alert.hidden=true;
      render();
    } catch(error) {
      alert.hidden=false;alert.textContent=error.message||"Bookings could not be loaded.";
      list.innerHTML="";
    }
  }

  document.querySelectorAll("[data-booking-filter]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-booking-filter]").forEach(x=>x.classList.toggle("active",x===button));
    filter=button.dataset.bookingFilter;render();
  }));
  await load();
});
