document.addEventListener("DOMContentLoaded", () => {
  const api = window.TutoMarketplace;

  const alertBox = document.querySelector("#dashboard-alert");
  const bookingList = document.querySelector("#tutor-booking-list");
  let profile = null;
  let bookings = [];
  let ledger = [];
  let payouts = [];
  let feePolicy = [];
  let filter = "action";
  let realtimeRefreshTimer = null;
  let initialized = false;

  alertBox.hidden = false;
  alertBox.textContent = "Loading your tutor workspace…";

  const esc = value => window.Tuto.escape(value);
  const money = value => window.Tuto.money(value);

  function setTextIfPresent(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value ?? "";
  }
  const labels = {
    requested: "New request",
    accepted: "Accepted — awaiting payment",
    paid: "Payment confirmed",
    session_delivered: "Waiting for admin completion",
    completed: "Completed",
    declined: "Declined",
    cancelled: "Cancelled",
    refunded: "Refunded",
    disputed: "Under review"
  };

  function requestedStartTime(booking) {
    const value = new Date(booking?.requested_start || "").getTime();
    return Number.isFinite(value) ? value : null;
  }

  function isExpiredRequest(booking) {
    const time = requestedStartTime(booking);
    return booking?.status === "requested" && time !== null && time <= Date.now();
  }

  function bookingFeedback(card, message, isError = false) {
    const feedback = card?.querySelector(".booking-action-feedback");
    if (!feedback) return;
    feedback.hidden = !message;
    feedback.textContent = message || "";
    feedback.classList.toggle("error", Boolean(isError));
    feedback.classList.toggle("success", Boolean(message) && !isError);
  }

  function maskMobile(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length !== 11) return digits || "Not provided";
    return `${digits.slice(0, 4)} ••• ${digits.slice(-4)}`;
  }

  function setApprovedWorkspace(approved) {
    document.querySelector("#private-tutor-metrics").hidden = !approved;
    document.querySelector("#private-compensation-panel").hidden = !approved;
    document.querySelector("#private-payout-section").hidden = !approved;
    document.querySelector("#private-ledger-section").hidden = !approved;
    document.querySelector("#booking-requests").hidden = !approved;
    document.querySelector("#toggle-bookings").hidden = !approved;
  }

  function revealPrivateSections() {
    setApprovedWorkspace(true);
    document.querySelector("#private-tier-rules").innerHTML = feePolicy.map(row => `<div><b>${esc(row.tier_label)} — ${Number(row.rate)}%</b><span>${esc(row.description)}</span></div>`).join("") || `<div><b>Your current platform fee is shown above.</b><span>Additional tier details are temporarily unavailable.</span></div>`;
  }

  function updateMetrics() {
    if (!profile) return;
    revealPrivateSections();

    const estimate = api.estimateCommission(profile, Number(document.querySelector("#commission-gross").value || 0));
    const totalRecorded = ledger.reduce((sum, row) => sum + Number(row.tutor_net_amount || 0), 0);
    const pendingPayout = ledger.filter(row => row.payout_status !== "paid").reduce((sum, row) => sum + Number(row.tutor_net_amount || 0), 0);
    const totalPaidOut = payouts.filter(row => row.status === "paid").reduce((sum, row) => sum + Number(row.amount || 0), 0);

    document.querySelector("#metric-tier").textContent = estimate.tier;
    document.querySelector("#metric-rate").textContent = `${estimate.rate}% platform commission`;
    document.querySelector("#metric-completed").textContent = profile.completed_sessions || 0;
    const remaining = profile.founding_eligible && profile.completed_sessions < 20
      ? 20 - profile.completed_sessions
      : Math.max(0, 50 - profile.completed_sessions);
    document.querySelector("#metric-progress").textContent = profile.founding_eligible && profile.completed_sessions < 20
      ? `${remaining} founding-rate sessions remaining`
      : `${remaining} sessions to the first top-rated volume threshold`;
    document.querySelector("#metric-rating").textContent = profile.average_rating ? `${Number(profile.average_rating).toFixed(1)} ★` : "New";
    document.querySelector("#metric-reviews").textContent = `${profile.review_count || 0} verified review${profile.review_count === 1 ? "" : "s"}`;
    document.querySelector("#metric-earnings").textContent = money(totalRecorded);
    document.querySelector("#metric-pending-payout").textContent = money(pendingPayout);
    document.querySelector("#metric-paid-out").textContent = money(totalPaidOut);
    document.querySelector("#commission-fee").textContent = money(estimate.commission);
    document.querySelector("#commission-net").textContent = money(estimate.net);
    document.querySelector("#commission-description").textContent = `${estimate.tier}: ${estimate.rate}% commission. The final rate is recorded only when an administrator completes a paid, delivered booking.`;

    const payoutReady = Boolean(profile.payout_account_name && profile.payout_account_number);
    document.querySelector("#private-payout-account").innerHTML = payoutReady
      ? `<div><span>Method</span><b>${esc(profile.payout_method || "GCash")}</b></div><div><span>Registered name</span><b>${esc(profile.payout_account_name)}</b></div><div><span>Mobile number</span><b>${esc(maskMobile(profile.payout_account_number))}</b></div><div><span>QR code</span><b>${profile.payout_qr_path ? "Private QR uploaded" : "Not uploaded"}</b></div>`
      : `<div class="payment-panel-error"><b>Payout details incomplete.</b><span>Add your registered GCash name and mobile number before your tutor application can be submitted.</span></div>`;
  }

  function profileStatus() {
    const label = {
      draft: "Draft",
      pending: "Pending admin review",
      approved: "Approved and public",
      rejected: "Needs revision",
      suspended: "Suspended"
    }[profile?.status] || "No tutor profile";
    document.querySelector("#dash-profile-status").textContent = label;
    document.querySelector("#dash-profile-message").textContent = profile?.status === "approved"
      ? (profile.is_accepting_bookings ? "Your profile is accepting requests." : "Your approved profile is not accepting new requests.")
      : profile?.rejection_reason || "Complete and submit your tutor application.";
  }

  function currentBookings() {
    if (filter === "action") {
      return bookings.filter(booking =>
        booking.status === "paid" ||
        (booking.status === "requested" && !isExpiredRequest(booking))
      );
    }
    if (filter === "upcoming") return bookings.filter(booking => ["accepted", "paid", "session_delivered"].includes(booking.status));
    if (filter === "completed") return bookings.filter(booking => booking.status === "completed");
    return bookings;
  }

  function bookingCard(booking) {
    const expired = isExpiredRequest(booking);
    const canRespond = booking.status === "requested" && !expired;
    const canCloseExpired = booking.status === "requested" && expired;
    const canDeliver = booking.status === "paid";
    const canMessage = ["accepted", "paid", "session_delivered", "completed", "disputed"].includes(booking.status);
    const statusClass = expired ? "expired" : booking.status;
    const statusLabel = expired ? "Expired request" : (labels[booking.status] || booking.status);

    return `<article class="booking-item${expired ? " booking-item-expired" : ""}" data-id="${esc(booking.id)}">
      <div class="booking-item-head"><div><span class="status-pill status-${esc(statusClass)}">${esc(statusLabel)}</span><h2>${esc(booking.learner_name_snapshot || "Learner booking")}</h2><p>${esc(booking.subject)} • ${esc(booking.mode)}</p></div><b>${money(booking.gross_amount)}</b></div>
      <dl class="booking-details"><div><dt>Schedule</dt><dd>${new Date(booking.requested_start).toLocaleString()}</dd></div><div><dt>Duration</dt><dd>${booking.duration_minutes} minutes</dd></div><div><dt>Payment</dt><dd>${esc(booking.payment_status)}</dd></div>${booking.status === "completed" ? `<div><dt>Your net</dt><dd>${money(booking.tutor_net_amount)}</dd></div><div><dt>Commission</dt><dd>${booking.commission_rate}%</dd></div>` : ""}</dl>
      ${booking.learning_goal ? `<p class="booking-goal"><b>Learning goal:</b> ${esc(booking.learning_goal)}</p>` : ""}
      ${expired ? `<p class="booking-expired-note"><b>This schedule has already passed.</b> The request can no longer be accepted. Ask the learner to submit a new future schedule.</p>` : ""}
      <div class="booking-actions">
        ${canMessage ? `<a class="button" href="messages.html?booking=${encodeURIComponent(booking.id)}">Open messages</a>` : ""}
        ${canRespond ? `<button class="button accept-booking" type="button">Accept</button><button class="button button-outline decline-booking" type="button">Decline</button>` : ""}
        ${canCloseExpired ? `<button class="button button-outline decline-booking" data-expired="true" type="button">Close expired request</button>` : ""}
        ${canDeliver ? `<button class="button deliver-booking" type="button">Mark session delivered</button>` : ""}
      </div>
      <p class="booking-action-feedback form-status" hidden aria-live="polite"></p>
    </article>`;
  }

  function renderBookings() {
    const rows = currentBookings();
    bookingList.innerHTML = rows.map(bookingCard).join("") || `<div class="empty-state"><h3>No bookings in this category.</h3></div>`;

    bookingList.querySelectorAll(".accept-booking,.decline-booking").forEach(button => button.addEventListener("click", async () => {
      const card = button.closest(".booking-item");
      const bookingId = card?.dataset.id;
      const booking = bookings.find(row => String(row.id) === String(bookingId));
      const accept = button.classList.contains("accept-booking");

      if (accept && isExpiredRequest(booking)) {
        bookingFeedback(card, "This schedule has already passed. Ask the learner to submit a new future schedule.", true);
        button.disabled = true;
        return;
      }

      const note = prompt(
        accept
          ? "Optional note for the learner:"
          : (button.dataset.expired === "true"
              ? "Optional note when closing this expired request:"
              : "Reason for declining (recommended):"),
        ""
      ) || "";

      try {
        card?.querySelectorAll("button").forEach(item => item.disabled = true);
        bookingFeedback(card, accept ? "Accepting booking…" : "Saving response…");
        await api.tutorRespond(bookingId, accept, note);
        window.Tuto?.toast?.(accept ? "Booking accepted." : "Booking request closed.");
        await load();
      } catch (error) {
        bookingFeedback(
          card,
          error?.message || "This booking response could not be saved.",
          true
        );
        card?.querySelectorAll("button").forEach(item => item.disabled = false);
      }
    }));

    bookingList.querySelectorAll(".deliver-booking").forEach(button => button.addEventListener("click", async () => {
      if (!confirm("Confirm that the paid tutoring session was delivered?")) return;
      const card = button.closest(".booking-item");
      try {
        button.disabled = true;
        bookingFeedback(card, "Saving delivered-session status…");
        await api.markDelivered(card.dataset.id);
        window.Tuto?.toast?.("Session marked delivered.");
        await load();
      } catch (error) {
        bookingFeedback(card, error?.message || "The session status could not be updated.", true);
        button.disabled = false;
      }
    }));
  }

  function renderLedger() {
    document.querySelector("#commission-ledger").innerHTML = ledger.length
      ? `<div class="ledger-row ledger-head"><span>Date</span><span>Gross</span><span>Tier</span><span>Commission</span><span>Tutor net</span><span>Payout</span></div>${ledger.map(row => `<div class="ledger-row"><span>${new Date(row.created_at).toLocaleDateString()}</span><span>${money(row.gross_amount)}</span><span>${esc(row.commission_tier)}</span><span>${money(row.commission_amount)}</span><span><b>${money(row.tutor_net_amount)}</b></span><span class="status-pill status-${row.payout_status === "paid" ? "paid" : "pending"}">${esc(row.payout_status || "pending")}</span></div>`).join("")}`
      : `<div class="empty-state"><p>No completed earnings records yet.</p></div>`;

    document.querySelector("#payout-history").innerHTML = payouts.length
      ? `<div class="ledger-row ledger-head"><span>Paid date</span><span>Coverage</span><span>Sessions</span><span>Amount</span><span>Method</span><span>Reference</span></div>${payouts.map(row => `<div class="ledger-row"><span>${new Date(row.paid_at).toLocaleDateString()}</span><span>${new Date(`${row.period_start}T00:00:00`).toLocaleDateString()}–${new Date(`${row.period_end}T00:00:00`).toLocaleDateString()}</span><span>${row.session_count}</span><span><b>${money(row.amount)}</b></span><span>${esc(row.payout_method)}</span><span>${esc(row.payout_reference)}</span></div>`).join("")}`
      : `<div class="empty-state"><p>No weekly payout records yet.</p></div>`;
  }

  async function load({ quiet = false } = {}) {
    try {
      if (!api.isReady()) throw new Error("The tutor dashboard is temporarily unavailable. Please try again later.");
      profile = await api.getMyTutorProfile();
      if (!profile) {
        setApprovedWorkspace(false);
        setTextIfPresent("#tutor-dashboard-title", "Start your tutor application.");
        setTextIfPresent("#tutor-dashboard-intro", "Create your tutor profile and submit the required details for administrator review.");
        profileStatus();
        alertBox.hidden = false;
        alertBox.innerHTML = `<b>Your tutor workspace is not active yet.</b> Complete your profile and submit your application to unlock booking, session, earnings, and payout tools. <a href="tutor-onboarding.html">Start application →</a>`;
        return;
      }

      profileStatus();
      if (profile.status !== "approved") {
        setApprovedWorkspace(false);
        const copy = {
          draft: ["Complete your tutor application.", "Finish your profile, availability, credentials, and payout details, then submit them for review."],
          pending: ["Your application is under review.", "You can update your profile while TutoDemy reviews your application. Booking and payout tools will open after approval."],
          rejected: ["Your application needs revision.", profile.rejection_reason || "Review the administrator note, update your application, and submit it again."],
          suspended: ["Your tutor access is currently suspended.", "Contact TutoDemy support before accepting or managing tutoring sessions."]
        }[profile.status] || ["Your tutor workspace is not active yet.", "Complete the required application steps to continue."];
        setTextIfPresent("#tutor-dashboard-title", copy[0]);
        setTextIfPresent("#tutor-dashboard-intro", copy[1]);
        alertBox.hidden = false;
        alertBox.innerHTML = `<b>${esc(copy[0])}</b> ${esc(copy[1])} <a href="tutor-onboarding.html">Open tutor profile →</a>`;
        return;
      }

      setTextIfPresent("#tutor-dashboard-title", "Manage your profile, bookings, and earnings.");
      setTextIfPresent("#tutor-dashboard-intro", "Respond to schedule requests, track payment confirmation, mark delivered sessions, and review your payout records.");
      [bookings, ledger, feePolicy, payouts] = await Promise.all([
        api.getMyBookings("tutor"),
        api.getMyLedger(),
        api.getMyTutorFeePolicy(),
        api.getMyPayouts()
      ]);

      alertBox.hidden = true;
      updateMetrics();
      renderBookings();
      renderLedger();

      const toggle = document.querySelector("#toggle-bookings");
      toggle.hidden = false;
      toggle.textContent = profile.is_accepting_bookings ? "Pause new bookings" : "Accept new bookings";
    } catch (error) {
      if (!quiet) {
        alertBox.hidden = false;
        alertBox.textContent = error.message || "Tutor dashboard could not be loaded.";
      } else {
        console.warn("Realtime tutor dashboard refresh failed:", error);
      }
    }
  }

  document.querySelector("#toggle-bookings").addEventListener("click", async () => {
    if (!initialized || !profile) {
      alertBox.hidden = false;
      alertBox.textContent = "Your tutor workspace is still loading. Please wait a moment.";
      return;
    }
    try {
      const next = !profile.is_accepting_bookings;
      profile = await api.setAcceptingBookings(next);
      profileStatus();
      document.querySelector("#toggle-bookings").textContent = next ? "Pause new bookings" : "Accept new bookings";
      window.Tuto.toast(next ? "New booking requests enabled." : "New booking requests paused.");
    } catch (error) {
      alertBox.hidden = false;
      alertBox.textContent = error.message;
    }
  });

  document.querySelector("#commission-gross").addEventListener("input", updateMetrics);
  document.querySelectorAll("[data-tutor-filter]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-tutor-filter]").forEach(item => item.classList.toggle("active", item === button));
    filter = button.dataset.tutorFilter;
    renderBookings();
  }));

  window.addEventListener("tutodemy-live-notification", event => {
    const item = event.detail?.notification;
    if (!item?.notification_type) return;
    const type = String(item.notification_type);
    const affectsTutorDashboard = type.startsWith("booking_") || type.startsWith("payment_") || type === "session_delivered";
    if (!affectsTutorDashboard) return;
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(() => load({ quiet: true }), 220);
  });

  window.addEventListener("beforeunload", () => clearTimeout(realtimeRefreshTimer));

  async function initialize() {
    try {
      await window.TutoAuth?.ready;
      await window.TutoMarketplace?.ready;
      if (!window.TutoAuth?.getUser?.()) {
        location.replace("auth.html");
        return;
      }
      initialized = true;
      await load();
    } catch (error) {
      alertBox.hidden = false;
      alertBox.textContent = error.message || "Tutor dashboard could not be initialized.";
    }
  }

  initialize();
});
