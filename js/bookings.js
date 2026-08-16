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


  const returnParams = new URLSearchParams(location.search);
  const payMongoReturnState = returnParams.get("payment");
  const payMongoReturnBookingId = returnParams.get("booking");

  function clearPaymentReturnQuery() {
    if (!payMongoReturnState) return;
    const url = new URL(location.href);
    url.searchParams.delete("payment");
    url.searchParams.delete("booking");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function showPayMongoReturnMessage() {
    if (!payMongoReturnState || !alertBox) return;

    alertBox.hidden = false;
    alertBox.classList.remove("error");

    if (payMongoReturnState === "success") {
      alertBox.textContent =
        "PayMongo checkout completed. Confirming the payment securely…";
    } else if (payMongoReturnState === "cancelled") {
      alertBox.textContent =
        "PayMongo checkout was cancelled. No booking payment was confirmed.";
    }
  }

  function isExpiredRequest(booking) {
    const time = new Date(booking?.requested_start || "").getTime();
    return booking?.status === "requested" && Number.isFinite(time) && time <= Date.now();
  }

  function statusText(booking) {
    if (isExpiredRequest(booking)) {
      return "Expired — choose a new schedule";
    }
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
    const expired = isExpiredRequest(booking);
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
      ${expired ? `<p class="booking-expired-note"><b>This requested schedule has passed.</b> Cancel this request, then open the tutor profile and submit a new future schedule.</p>` : ""}
      ${paymentPanelShell(booking)}
      <div class="booking-actions">
        ${canMessage ? `<a class="button" href="messages.html?booking=${encodeURIComponent(booking.id)}">Open messages</a>` : ""}
        ${canCancel ? `<button class="button button-outline cancel-booking" type="button">${expired ? "Cancel expired request" : "Cancel request"}</button>` : ""}
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
      if (!payment) throw new Error("Payment details are unavailable.");

      const isPaid =
        ["paid", "session_delivered", "completed"].includes(booking.status) ||
        payment.payment_status === "paid";

      const isLegacyPending = payment.payment_status === "pending";

      const canPayWithPayMongo =
        booking.status === "accepted" &&
        payment.payment_status === "unpaid";

      if (isPaid) {
        panel.innerHTML = `
          <div class="payment-confirmed-card paymongo-confirmed-card">
            <span>PAYMENT CONFIRMED</span>
            <b>${money(payment.amount)}</b>
            <p>Your booking payment is confirmed. Keep schedule and lesson coordination inside the private booking messages.</p>
          </div>`;
        return;
      }

      if (canPayWithPayMongo) {
        panel.innerHTML = `
          <section class="paymongo-checkout-card">
            <div class="paymongo-checkout-copy">
              <span class="eyebrow">SECURE CHECKOUT</span>
              <h3>Pay ${money(payment.amount)} with PayMongo</h3>
              <p>Complete your booking using TutoDemy's secure PayMongo checkout. Your booking will be marked paid automatically only after PayMongo confirms the successful payment.</p>

              <dl class="paymongo-payment-summary">
                <div>
                  <dt>Booking amount</dt>
                  <dd>${money(payment.amount)}</dd>
                </div>
                <div>
                  <dt>Booking reference</dt>
                  <dd>${esc(payment.booking_reference || `TD-${booking.id}`)}</dd>
                </div>
              </dl>

              ${payment.review_note ? `<p class="payment-review-note"><b>Previous payment submission:</b> ${esc(payment.review_note)}</p>` : ""}

              <button class="button paymongo-checkout-button" type="button">
                Pay securely with PayMongo
              </button>

              <p class="paymongo-checkout-status form-status" role="status" aria-live="polite"></p>
              <small class="paymongo-trust-note">Payment status comes from PayMongo's verified server webhook—not from a screenshot or browser redirect.</small>
            </div>
          </section>`;

        const button = panel.querySelector(".paymongo-checkout-button");
        const status = panel.querySelector(".paymongo-checkout-status");

        button?.addEventListener("click", async () => {
          try {
            button.disabled = true;
            status.classList.remove("error");
            status.textContent = "Opening secure PayMongo checkout…";

            const checkout = await api.createPayMongoCheckout(booking.id);

            status.textContent = "Redirecting to PayMongo…";
            location.assign(checkout.checkoutUrl);
          } catch (error) {
            status.textContent =
              error?.message ||
              "PayMongo checkout could not be opened. Please try again.";
            status.classList.add("error");
            button.disabled = false;
          }
        });

        return;
      }

      // Compatibility only for payment receipts already submitted before
      // PayMongo rollout. New accepted/unpaid bookings use PayMongo above.
      if (isLegacyPending) {
        panel.innerHTML = `
          <section class="payment-legacy-pending-card">
            <span class="status-pill status-pending">Legacy payment pending</span>
            <h3>Existing receipt is awaiting verification</h3>
            <p>This payment was submitted before PayMongo checkout was enabled. The administrator can finish reviewing this existing submission; no second payment is required.</p>
            ${payment.review_note ? `<div class="payment-review-note"><b>Admin note:</b><span>${esc(payment.review_note)}</span></div>` : ""}
          </section>`;
        return;
      }

      panel.innerHTML = `
        <div class="payment-panel-error">
          <b>Payment is not available for this booking.</b>
          <span>Please refresh the booking or contact TutoDemy support if the status looks incorrect.</span>
        </div>`;
    } catch (error) {
      panel.innerHTML = `
        <div class="payment-panel-error">
          <b>Payment details could not be loaded.</b>
          <span>${esc(error.message || "Please try again later.")}</span>
        </div>`;
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

      if (!payMongoReturnState) {
        alertBox.hidden = true;
      }

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

  showPayMongoReturnMessage();
  await load();

  if (payMongoReturnState === "success") {
    // Webhook processing can finish a moment after PayMongo redirects back.
    // Refresh a few times without forcing the learner to reload manually.
    [1200, 3000, 6500].forEach(delay => {
      setTimeout(() => load({ quiet: true }), delay);
    });

    setTimeout(() => {
      const returnedBooking = bookings.find(
        item => String(item.id) === String(payMongoReturnBookingId || "")
      );

      if (
        returnedBooking &&
        ["paid", "session_delivered", "completed"].includes(returnedBooking.status)
      ) {
        alertBox.hidden = false;
        alertBox.textContent = "Payment confirmed by PayMongo. Your booking is paid.";
        window.Tuto?.toast?.("Payment confirmed by PayMongo.");
      } else {
        alertBox.hidden = false;
        alertBox.textContent =
          "PayMongo checkout returned successfully. Payment confirmation may still be processing; this page will update automatically when the webhook is received.";
      }

      clearPaymentReturnQuery();
    }, 7200);
  } else if (payMongoReturnState === "cancelled") {
    setTimeout(clearPaymentReturnQuery, 800);
  }
});
