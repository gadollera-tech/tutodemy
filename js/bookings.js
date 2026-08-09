document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoAuth?.ready;
  await window.TutoMarketplace?.ready;

  const api = window.TutoMarketplace;
  const user = window.TutoAuth?.getUser?.();
  if (!user) {
    location.replace("auth.html");
    return;
  }

  const list = document.querySelector("#booking-list");
  const alertBox = document.querySelector("#bookings-alert");
  let bookings = [];
  let tutorMap = new Map();
  let reviewed = new Set();
  let filter = "active";
  let realtimeRefreshTimer = null;

  const esc = value => window.Tuto.escape(value);
  const money = value => window.Tuto.money(value);
  const activeStatuses = new Set(["requested", "accepted", "paid", "session_delivered", "disputed"]);

  function statusText(booking) {
    if (booking.status === "accepted" && booking.payment_status === "pending") {
      return "Payment submitted — awaiting admin verification";
    }
    return ({
      requested: "Waiting for tutor",
      accepted: "Tutor accepted — payment required",
      paid: "Payment confirmed",
      session_delivered: "Tutor marked session delivered",
      completed: "Completed",
      declined: "Declined by tutor",
      cancelled: "Cancelled",
      refunded: "Refunded",
      disputed: "Under review"
    })[booking.status] || booking.status;
  }

  function visibleItems() {
    if (filter === "active") return bookings.filter(booking => activeStatuses.has(booking.status));
    if (filter === "completed") return bookings.filter(booking => booking.status === "completed");
    if (filter === "closed") return bookings.filter(booking => ["declined", "cancelled", "refunded"].includes(booking.status));
    return bookings;
  }

  function paymentPanelShell(booking) {
    const eligible = ["accepted", "paid", "session_delivered", "completed", "disputed"].includes(booking.status);
    if (!eligible) return "";
    return `<section class="booking-payment-panel" data-payment-panel>
      <div class="payment-panel-loading">Loading secure payment details…</div>
    </section>`;
  }

  function bookingCard(booking) {
    const tutor = tutorMap.get(booking.tutor_id);
    const tutorName = tutor?.display_name || booking.tutor_name_snapshot || "Tutor profile";
    const canCancel = ["requested", "accepted"].includes(booking.status) && booking.payment_status === "unpaid";
    const canReview = booking.status === "completed" && !reviewed.has(booking.id);
    const canMessage = ["accepted", "paid", "session_delivered", "completed", "disputed"].includes(booking.status);

    return `<article class="booking-item" data-id="${esc(booking.id)}">
      <div class="booking-item-head">
        <div>
          <span class="status-pill status-${esc(booking.status)}">${esc(statusText(booking))}</span>
          <h2>${esc(tutorName)}</h2>
          <p>${esc(booking.subject)} • ${esc(booking.mode)}</p>
        </div>
        <a href="tutor-profile.html?id=${encodeURIComponent(booking.tutor_id)}">View tutor</a>
      </div>
      <dl class="booking-details">
        <div><dt>Schedule</dt><dd>${new Date(booking.requested_start).toLocaleString()}</dd></div>
        <div><dt>Duration</dt><dd>${booking.duration_minutes} minutes</dd></div>
        <div><dt>Session amount</dt><dd>${money(booking.gross_amount)}</dd></div>
        <div><dt>Payment</dt><dd>${esc(booking.payment_status)}</dd></div>
      </dl>
      ${booking.learning_goal ? `<p class="booking-goal"><b>Learning goal:</b> ${esc(booking.learning_goal)}</p>` : ""}
      ${booking.tutor_response_note ? `<p class="booking-note-inline"><b>Tutor note:</b> ${esc(booking.tutor_response_note)}</p>` : ""}
      ${paymentPanelShell(booking)}
      <div class="booking-actions">
        ${canMessage ? `<a class="button" href="messages.html?booking=${encodeURIComponent(booking.id)}">Open messages</a>` : ""}
        ${canCancel ? `<button class="button button-outline cancel-booking" type="button">Cancel request</button>` : ""}
        ${canReview ? `<button class="button review-booking" type="button">Leave verified review</button>` : ""}
      </div>
      ${canReview ? `<form class="inline-review-form" hidden>
        <label>Rating<select name="rating"><option value="5">5 — Excellent</option><option value="4">4 — Very good</option><option value="3">3 — Good</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label>
        <label>Review<textarea name="review_text" rows="3" maxlength="800"></textarea></label>
        <button class="button" type="submit">Submit review</button>
        <p class="form-status"></p>
      </form>` : ""}
    </article>`;
  }

  function copyButton(label, value) {
    return `<button class="text-button copy-payment-value" type="button" data-copy-value="${esc(value)}">Copy ${esc(label)}</button>`;
  }

  async function hydratePaymentPanel(card, booking) {
    const panel = card.querySelector("[data-payment-panel]");
    if (!panel) return;

    try {
      const payment = await api.getBookingPaymentInstructions(booking.id);
      if (!payment) throw new Error("Payment instructions are unavailable.");

      const isPaid = ["paid", "session_delivered", "completed"].includes(booking.status) || payment.payment_status === "paid";
      const isPending = payment.payment_status === "pending";
      const canSubmit = booking.status === "accepted" && payment.payment_status === "unpaid";
      let paymentQrUrl = "";
      if (payment.payment_qr_path) {
        try {
          paymentQrUrl = await api.signedPlatformPaymentQrUrl(payment.payment_qr_path);
        } catch (qrError) {
          console.warn("Private payment QR could not be loaded:", qrError);
        }
      }

      if (isPaid) {
        panel.innerHTML = `<div class="payment-confirmed-card"><span>PAYMENT CONFIRMED</span><b>${money(payment.amount)}</b><p>Your payment has been verified. Keep all schedule and lesson coordination inside the private booking messages.</p></div>`;
        return;
      }

      panel.innerHTML = `<div class="payment-panel-heading">
          <div><span class="eyebrow">PRIVATE PAYMENT INSTRUCTIONS</span><h3>Pay the exact booking amount</h3></div>
          <span class="status-pill status-${isPending ? "pending" : "accepted"}">${isPending ? "Awaiting verification" : "Payment required"}</span>
        </div>
        ${payment.review_note ? `<div class="payment-review-note"><b>Payment submission returned:</b><span>${esc(payment.review_note)}</span></div>` : ""}
        <div class="payment-instruction-grid">
          <div><span>Bank</span><b>${esc(payment.bank_name)}</b></div>
          <div><span>Account name</span><b>${esc(payment.account_name)}</b>${copyButton("name", payment.account_name)}</div>
          <div><span>Account number</span><b class="payment-account-number">${esc(payment.account_number)}</b>${copyButton("number", payment.account_number)}</div>
          <div><span>Amount</span><b>${money(payment.amount)}</b></div>
          <div class="full"><span>Booking reference</span><b>${esc(payment.booking_reference)}</b>${copyButton("reference", payment.booking_reference)}</div>
        </div>
        <p class="payment-instructions-copy">${esc(payment.instructions)}</p>
        ${paymentQrUrl ? `<section class="payment-qr-card" aria-label="Private LANDBANK payment QR">
          <div class="payment-qr-copy">
            <span class="eyebrow">SCAN TO PAY</span>
            <h4>LANDBANK InstaPay QR</h4>
            <p>Scan this QR using a participating banking or e-wallet app. Check the recipient name and amount before confirming the transfer.</p>
            <a class="button button-outline" href="${esc(paymentQrUrl)}" target="_blank" rel="noopener">Open payment QR</a>
          </div>
          <img src="${esc(paymentQrUrl)}" alt="Private LANDBANK InstaPay QR for this booking payment" loading="lazy" decoding="async">
        </section>` : ""}
        <div class="payment-warning"><b>Important:</b><span>Do not pay the tutor directly. Your booking becomes paid only after a TutoDemy administrator verifies the bank transaction.</span></div>
        ${isPending ? `<div class="payment-pending-message"><b>Receipt submitted.</b><p>The administrator will compare your receipt with the actual LANDBANK transaction before confirming the booking.</p></div>` : ""}
        ${canSubmit ? `<form class="payment-proof-form">
          <div class="form-grid">
            <label>Payer name<input name="payer_name" maxlength="120" required placeholder="Name used for the bank transfer"></label>
            <label>Transaction reference<input name="payment_reference" maxlength="120" required placeholder="Reference from your bank receipt"></label>
            <label class="full">Payment receipt<input type="file" name="payment_proof" accept="application/pdf,image/jpeg,image/png,image/webp" required><small>PDF, JPG, PNG, or WebP; maximum 10 MB.</small></label>
          </div>
          <button class="button" type="submit">Submit payment receipt</button>
          <p class="form-status" role="status" aria-live="polite"></p>
        </form>` : ""}`;

      panel.querySelectorAll(".copy-payment-value").forEach(button => {
        button.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(button.dataset.copyValue || "");
            window.Tuto.toast("Copied.");
          } catch {
            window.Tuto.toast("Copy was not available. Select the value manually.");
          }
        });
      });

      const form = panel.querySelector(".payment-proof-form");
      if (form) {
        form.addEventListener("submit", async event => {
          event.preventDefault();
          const status = form.querySelector(".form-status");
          const submitButton = form.querySelector("button[type='submit']");
          const file = form.elements.payment_proof.files[0];
          if (!file) return;
          try {
            submitButton.disabled = true;
            status.textContent = "Uploading receipt securely…";
            const proofPath = await api.uploadPaymentProof(booking.id, file);
            status.textContent = "Submitting payment details…";
            await api.submitPaymentProof(
              booking.id,
              form.elements.payer_name.value.trim(),
              form.elements.payment_reference.value.trim(),
              proofPath,
              file.name
            );
            window.Tuto.toast("Payment receipt submitted for verification.");
            await load();
          } catch (error) {
            status.textContent = error.message || "The payment receipt could not be submitted.";
            status.classList.add("error");
            submitButton.disabled = false;
          }
        });
      }
    } catch (error) {
      panel.innerHTML = `<div class="payment-panel-error"><b>Payment instructions could not be loaded.</b><span>${esc(error.message || "Please try again later.")}</span></div>`;
    }
  }

  async function render() {
    const items = visibleItems();
    list.innerHTML = items.map(bookingCard).join("") || `<div class="empty-state"><h3>No bookings in this category.</h3><p>Browse approved tutors to request a session.</p><a class="button" href="tutoring.html">Find a tutor</a></div>`;

    const cards = [...list.querySelectorAll(".booking-item")];
    await Promise.all(cards.map(card => {
      const booking = items.find(item => item.id === card.dataset.id);
      return booking ? hydratePaymentPanel(card, booking) : Promise.resolve();
    }));

    list.querySelectorAll(".cancel-booking").forEach(button => button.addEventListener("click", async () => {
      const card = button.closest(".booking-item");
      if (!confirm("Cancel this unpaid booking request?")) return;
      try {
        button.disabled = true;
        await api.cancelBooking(card.dataset.id, "Cancelled by learner");
        await load();
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent = error.message;
        button.disabled = false;
      }
    }));

    list.querySelectorAll(".review-booking").forEach(button => button.addEventListener("click", () => {
      const form = button.closest(".booking-item").querySelector(".inline-review-form");
      form.hidden = !form.hidden;
    }));

    list.querySelectorAll(".inline-review-form").forEach(form => form.addEventListener("submit", async event => {
      event.preventDefault();
      const status = form.querySelector(".form-status");
      const values = Object.fromEntries(new FormData(form).entries());
      try {
        status.textContent = "Submitting review…";
        await api.submitReview(form.closest(".booking-item").dataset.id, values.rating, values.review_text);
        status.textContent = "Review submitted.";
        await load();
      } catch (error) {
        status.textContent = error.message;
        status.classList.add("error");
      }
    }));
  }

  async function load({ quiet = false } = {}) {
    try {
      if (!api.isReady()) throw new Error("Bookings are temporarily unavailable. Please try again later.");
      [bookings] = await Promise.all([api.getMyBookings("learner")]);
      const [tutors, reviews] = await Promise.all([
        api.publicTutors({ acceptingOnly: false }),
        api.getMyReviews()
      ]);
      tutorMap = new Map(tutors.map(tutor => [tutor.user_id, tutor]));
      reviewed = new Set(reviews.map(review => review.booking_id));
      alertBox.hidden = true;
      await render();
    } catch (error) {
      if (!quiet) {
        alertBox.hidden = false;
        alertBox.textContent = error.message || "Bookings could not be loaded.";
        list.innerHTML = "";
      } else {
        console.warn("Realtime booking refresh failed:", error);
      }
    }
  }

  document.querySelectorAll("[data-booking-filter]").forEach(button => button.addEventListener("click", async () => {
    document.querySelectorAll("[data-booking-filter]").forEach(item => item.classList.toggle("active", item === button));
    filter = button.dataset.bookingFilter;
    await render();
  }));

  window.addEventListener("tutodemy-live-notification", event => {
    const item = event.detail?.notification;
    if (!item?.notification_type) return;
    const type = String(item.notification_type);
    const affectsBookings = type.startsWith("booking_") || type.startsWith("payment_") || type === "session_delivered";
    if (!affectsBookings) return;
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(() => load({ quiet: true }), 220);
  });

  window.addEventListener("beforeunload", () => clearTimeout(realtimeRefreshTimer));
  await load();
});
