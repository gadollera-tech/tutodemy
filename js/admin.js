document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoAuth?.ready;
  await window.TutoMarketplace?.ready;

  const api = window.TutoMarketplace;
  const content = document.querySelector("#admin-content");
  const alertBox = document.querySelector("#admin-alert");
  let tutors = [];
  let bookings = [];
  let reports = [];
  let payouts = [];

  const esc = value => window.Tuto.escape(value);
  const money = value => window.Tuto.money(value);
  const maskMobile = value => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length < 7) return digits || "Not provided";
    return `${digits.slice(0, 4)}•••${digits.slice(-4)}`;
  };


  function renderOverview() {
    const pendingTutors = tutors.filter(tutor => tutor.status === "pending").length;
    const paymentActions = bookings.filter(booking =>
      (booking.payment_proof_path && booking.payment_status !== "paid") ||
      (booking.status === "session_delivered" && booking.payment_status === "paid")
    ).length;
    const payoutDue = payouts.reduce((sum, row) => sum + Number(row.amount_due || 0), 0);
    const openReports = reports.filter(report => !["resolved", "dismissed"].includes(report.status)).length;

    document.querySelector("#admin-metric-tutors").textContent = String(pendingTutors);
    document.querySelector("#admin-metric-payments").textContent = String(paymentActions);
    document.querySelector("#admin-metric-payouts").textContent = money(payoutDue);
    document.querySelector("#admin-metric-reports").textContent = String(openReports);

    document.querySelectorAll("[data-overview-tab]").forEach(button => button.addEventListener("click", () => {
      activateAdminTab(button.dataset.overviewTab, { updateUrl: true });
      document.querySelector("#admin-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }

  function tutorCard(tutor) {
    const photo = api.publicAvatarUrl(tutor.profile_photo_path);
    const payoutReady = Boolean(tutor.payout_account_name && tutor.payout_account_number);
    return `<article class="admin-card" data-tutor-id="${esc(tutor.user_id)}">
      <div class="admin-card-head">
        <img src="${esc(photo)}" alt="">
        <div>
          <span class="status-pill status-${esc(tutor.status)}">${esc(tutor.status)}</span>
          <h3>${esc(tutor.display_name || "Unnamed tutor")}</h3>
          <p>${esc(tutor.contact_email)} • ${esc([tutor.city, tutor.province].filter(Boolean).join(", "))}</p>
        </div>
        <b>${money(tutor.hourly_rate)}/hr</b>
      </div>
      <div class="admin-profile-summary">
        <p><b>Headline:</b> ${esc(tutor.headline || "—")}</p>
        <p><b>Subjects:</b> ${esc((tutor.subjects || []).join(", ") || "—")}</p>
        <p><b>Modes:</b> ${esc((tutor.teaching_modes || []).join(", ") || "—")}</p>
        <p><b>Education:</b> ${esc(tutor.education || "—")}</p>
        <p><b>Credentials:</b> ${esc(tutor.credentials_summary || "—")}</p>
        <p><b>Bio:</b> ${esc(tutor.bio || "—")}</p>
      </div>
      <div class="admin-private-payout ${payoutReady ? "ready" : "incomplete"}">
        <span>PRIVATE PAYOUT DESTINATION</span>
        <b>${payoutReady ? `${esc(tutor.payout_method || "GCash")} — ${esc(tutor.payout_account_name)}` : "Incomplete"}</b>
        <p>${payoutReady ? esc(tutor.payout_account_number) : "The tutor must add a registered GCash name and number before submitting."}</p>
        ${tutor.payout_qr_path ? `<button class="text-button view-tutor-payout-qr" type="button" data-path="${esc(tutor.payout_qr_path)}">View private payout QR</button>` : ""}
      </div>
      <div class="admin-documents" data-documents>Loading private documents…</div>
      <label class="founding-check"><input type="checkbox" data-founding ${tutor.founding_eligible ? "checked" : ""}> Mark eligible for the Founding Tutor benefit</label>
      <label>Admin reason or note<textarea data-reason rows="2" placeholder="Required for rejection or suspension">${esc(tutor.rejection_reason || "")}</textarea></label>
      <div class="admin-actions">
        <button class="button approve-tutor" type="button">Approve</button>
        <button class="button button-outline reject-tutor" type="button">Reject</button>
        <button class="button button-outline suspend-tutor" type="button">Suspend</button>
        ${tutor.status !== "pending" ? `<button class="text-button set-pending" type="button">Return to pending</button>` : ""}
      </div>
    </article>`;
  }

  async function loadDocuments(card, tutorId) {
    const box = card.querySelector("[data-documents]");
    try {
      const docs = await api.adminTutorDocuments(tutorId);
      box.innerHTML = docs.map(doc => `<button type="button" class="document-link" data-path="${esc(doc.storage_path)}">
        <span><b>${esc(doc.document_type)}</b><small>${esc(doc.original_name)}</small></span><em>${esc(doc.verification_status)}</em>
      </button>`).join("") || `<p>No verification documents uploaded.</p>`;
      box.querySelectorAll(".document-link").forEach(button => button.addEventListener("click", async () => {
        try {
          const url = await api.signedDocumentUrl(button.dataset.path);
          window.open(url, "_blank", "noopener");
        } catch (error) {
          alertBox.hidden = false;
          alertBox.textContent = error.message;
        }
      }));
    } catch (error) {
      box.textContent = error.message;
    }
  }

  function renderTutors() {
    const list = document.querySelector("#admin-tutor-list");
    list.innerHTML = tutors.map(tutorCard).join("") || `<div class="empty-state"><h3>No tutor applications yet.</h3></div>`;

    list.querySelectorAll(".admin-card").forEach(card => loadDocuments(card, card.dataset.tutorId));

    list.querySelectorAll(".view-tutor-payout-qr").forEach(button => button.addEventListener("click", async () => {
      try {
        const url = await api.signedPayoutQrUrl(button.dataset.path);
        window.open(url, "_blank", "noopener");
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent = error.message;
      }
    }));

    const action = async (card, status) => {
      const reason = card.querySelector("[data-reason]").value.trim();
      if (["rejected", "suspended"].includes(status) && !reason) return window.Tuto.toast("Add an admin reason first.");
      if (!confirm(`Set this tutor profile to ${status}?`)) return;
      try {
        card.classList.add("working");
        await api.adminSetTutorStatus(card.dataset.tutorId, status, reason, card.querySelector("[data-founding]").checked);
        await loadAll();
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent = error.message;
      } finally {
        card.classList.remove("working");
      }
    };

    list.querySelectorAll(".approve-tutor").forEach(button => button.addEventListener("click", () => action(button.closest(".admin-card"), "approved")));
    list.querySelectorAll(".reject-tutor").forEach(button => button.addEventListener("click", () => action(button.closest(".admin-card"), "rejected")));
    list.querySelectorAll(".suspend-tutor").forEach(button => button.addEventListener("click", () => action(button.closest(".admin-card"), "suspended")));
    list.querySelectorAll(".set-pending").forEach(button => button.addEventListener("click", () => action(button.closest(".admin-card"), "pending")));
  }

  function bookingCard(booking) {
    const hasProof = Boolean(booking.payment_proof_path);
    const pending = booking.status === "accepted" && booking.payment_status === "pending";
    const canComplete = booking.status === "session_delivered" && booking.payment_status === "paid";

    return `<article class="admin-card booking-admin-card" data-booking-id="${esc(booking.id)}">
      <div class="admin-card-head">
        <div>
          <span class="status-pill status-${esc(booking.status)}">${esc(booking.status)}</span>
          <h3>${esc(booking.tutor_name_snapshot || "Tutor")} ↔ ${esc(booking.learner_name_snapshot || "Learner")}</h3>
          <p>${new Date(booking.requested_start).toLocaleString()} • ${esc(booking.subject)} • ${esc(booking.mode)}</p>
        </div>
        <b>${money(booking.gross_amount)}</b>
      </div>
      <dl class="booking-details">
        <div><dt>Payment</dt><dd>${esc(booking.payment_status)}</dd></div>
        <div><dt>Duration</dt><dd>${booking.duration_minutes} minutes</dd></div>
        ${booking.payer_name ? `<div><dt>Payer</dt><dd>${esc(booking.payer_name)}</dd></div>` : ""}
        ${booking.payment_reference ? `<div><dt>Submitted reference</dt><dd>${esc(booking.payment_reference)}</dd></div>` : ""}
        ${booking.payment_submitted_at ? `<div><dt>Submitted</dt><dd>${new Date(booking.payment_submitted_at).toLocaleString()}</dd></div>` : ""}
        ${booking.commission_rate ? `<div><dt>Commission</dt><dd>${booking.commission_rate}% / ${money(booking.commission_amount)}</dd></div><div><dt>Tutor net</dt><dd>${money(booking.tutor_net_amount)}</dd></div>` : ""}
      </dl>
      ${booking.payment_review_note ? `<div class="payment-review-note"><b>Last payment review note:</b><span>${esc(booking.payment_review_note)}</span></div>` : ""}
      ${hasProof ? `<div class="admin-payment-proof"><button class="button button-outline open-payment-proof" type="button" data-path="${esc(booking.payment_proof_path)}">Open uploaded payment receipt</button><small>${esc(booking.payment_proof_original_name || "Private receipt")}</small></div>` : `<p class="muted">No payment receipt submitted yet.</p>`}
      ${pending ? `<div class="admin-payment-form">
        <label>Verified payment method<input data-payment-method value="LANDBANK transfer"></label>
        <label>Verified transaction reference<input data-payment-reference value="${esc(booking.payment_reference || "")}" placeholder="Reference confirmed in LANDBANK"></label>
        <div class="admin-actions"><button class="button confirm-payment" type="button">Confirm verified payment</button><button class="button button-outline return-payment" type="button">Return submission</button></div>
      </div>` : ""}
      <div class="booking-actions"><a class="button button-outline" href="messages.html?booking=${encodeURIComponent(booking.id)}">Open conversation</a></div>
      ${canComplete ? `<div class="admin-complete-form"><label>Completion note<input data-completion-note placeholder="Optional admin note"></label><button class="button complete-booking" type="button">Complete booking and record earnings</button></div>` : ""}
    </article>`;
  }

  function renderBookings() {
    const list = document.querySelector("#admin-booking-list");
    list.innerHTML = bookings.map(bookingCard).join("") || `<div class="empty-state"><h3>No booking records yet.</h3></div>`;

    list.querySelectorAll(".open-payment-proof").forEach(button => button.addEventListener("click", async () => {
      try {
        const url = await api.signedPaymentProofUrl(button.dataset.path);
        window.open(url, "_blank", "noopener");
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent = error.message;
      }
    }));

    list.querySelectorAll(".confirm-payment").forEach(button => button.addEventListener("click", async () => {
      const card = button.closest(".admin-card");
      const method = card.querySelector("[data-payment-method]").value.trim();
      const reference = card.querySelector("[data-payment-reference]").value.trim();
      if (!method || !reference) return window.Tuto.toast("Enter the verified payment method and reference.");
      if (!confirm("Confirm that the receipt matches an actual LANDBANK transaction?")) return;
      try {
        button.disabled = true;
        await api.adminConfirmPayment(card.dataset.bookingId, method, reference);
        await loadAll();
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent = error.message;
        button.disabled = false;
      }
    }));

    list.querySelectorAll(".return-payment").forEach(button => button.addEventListener("click", async () => {
      const card = button.closest(".admin-card");
      const reason = prompt("Reason for returning the payment submission:", "Receipt or transaction details could not be verified.");
      if (!reason) return;
      try {
        button.disabled = true;
        await api.adminRejectPaymentSubmission(card.dataset.bookingId, reason);
        await loadAll();
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent = error.message;
        button.disabled = false;
      }
    }));

    list.querySelectorAll(".complete-booking").forEach(button => button.addEventListener("click", async () => {
      const card = button.closest(".admin-card");
      if (!confirm("Complete this paid, delivered booking and add the tutor net earning to the weekly payout ledger?")) return;
      try {
        button.disabled = true;
        await api.adminCompleteBooking(card.dataset.bookingId, card.querySelector("[data-completion-note]").value.trim());
        await loadAll();
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent = error.message;
        button.disabled = false;
      }
    }));
  }

  function payoutCard(payout) {
    const payoutReady = Boolean(payout.payout_account_name && payout.payout_account_number);
    return `<article class="admin-card payout-admin-card" data-tutor-id="${esc(payout.tutor_id)}">
      <div class="admin-card-head">
        <div><span class="status-pill status-pending">WEEKLY PAYOUT DUE</span><h3>${esc(payout.display_name || "Tutor")}</h3><p>${payout.session_count} completed session${Number(payout.session_count) === 1 ? "" : "s"} • ${new Date(`${payout.period_start}T00:00:00`).toLocaleDateString()}–${new Date(`${payout.period_end}T00:00:00`).toLocaleDateString()}</p></div>
        <b>${money(payout.amount_due)}</b>
      </div>
      <div class="payout-destination-card ${payoutReady ? "ready" : "incomplete"}">
        <span>PRIVATE GCASH DESTINATION</span>
        <b>${esc(payout.payout_account_name || "Payout details incomplete")}</b>
        <p>${esc(payout.payout_account_number || "Ask the tutor to update their private payout profile.")}</p>
        ${payout.payout_qr_path ? `<button class="button button-outline open-payout-qr" data-path="${esc(payout.payout_qr_path)}" type="button">Open private GCash QR</button>` : ""}
      </div>
      ${payoutReady ? `<div class="admin-payout-form"><label>Successful GCash transaction reference<input data-payout-reference maxlength="120" placeholder="Reference after sending the full amount"></label><label>Admin note<input data-payout-note maxlength="300" placeholder="Optional payout note"></label><button class="button record-payout" type="button">Record weekly payout as paid</button><p class="muted">Send the money in GCash first. This button records the completed transfer; it does not move money automatically.</p></div>` : ""}
    </article>`;
  }

  function renderPayouts() {
    const list = document.querySelector("#admin-payout-list");
    list.innerHTML = payouts.map(payoutCard).join("") || `<div class="empty-state"><h3>No tutor payouts due.</h3><p>Completed tutor earnings that have not yet been paid will appear here.</p></div>`;

    list.querySelectorAll(".open-payout-qr").forEach(button => button.addEventListener("click", async () => {
      try {
        const url = await api.signedPayoutQrUrl(button.dataset.path);
        window.open(url, "_blank", "noopener");
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent = error.message;
      }
    }));

    list.querySelectorAll(".record-payout").forEach(button => button.addEventListener("click", async () => {
      const card = button.closest(".payout-admin-card");
      const reference = card.querySelector("[data-payout-reference]").value.trim();
      const note = card.querySelector("[data-payout-note]").value.trim();
      if (!reference) return window.Tuto.toast("Enter the successful GCash transaction reference.");
      if (!confirm("Confirm that the full displayed amount was already sent successfully to this tutor?")) return;
      try {
        button.disabled = true;
        await api.adminRecordWeeklyPayout(card.dataset.tutorId, reference, note);
        window.Tuto.toast("Weekly tutor payout recorded.");
        await loadAll();
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent = error.message;
        button.disabled = false;
      }
    }));
  }

  function reportCard(report) {
    const message = report.reported_message_body ? `<blockquote>${esc(report.reported_message_body)}</blockquote>` : "";
    return `<article class="admin-card message-report-card" data-report-id="${esc(report.id)}">
      <div class="admin-card-head"><div><span class="status-pill status-${esc(report.status)}">${esc(report.status)}</span><h3>${esc(report.reason)}</h3><p>${esc(report.booking_label || "Booking conversation")} • Reported by ${esc(report.reporter_label || "Account")}</p></div><time>${new Date(report.created_at).toLocaleString()}</time></div>
      ${message}${report.details ? `<p><b>Details:</b> ${esc(report.details)}</p>` : ""}
      <label>Administrator note<textarea data-report-note rows="2" placeholder="Record the review outcome">${esc(report.admin_note || "")}</textarea></label>
      <div class="admin-actions"><a class="button button-outline" href="messages.html?booking=${encodeURIComponent(report.booking_id)}">Review conversation</a>${report.status !== "resolved" ? `<button class="button report-resolve" type="button">Mark resolved</button>` : ""}${report.status !== "dismissed" ? `<button class="text-button report-dismiss" type="button">Dismiss</button>` : ""}</div>
    </article>`;
  }

  function renderReports() {
    const list = document.querySelector("#admin-report-list");
    list.innerHTML = reports.map(reportCard).join("") || `<div class="empty-state"><h3>No conversation reports.</h3><p>Reported booking conversations will appear here for administrator review.</p></div>`;
    const update = async (button, status) => {
      const card = button.closest(".message-report-card");
      try {
        button.disabled = true;
        await api.adminResolveMessageReport(card.dataset.reportId, status, card.querySelector("[data-report-note]").value.trim());
        await loadAll();
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent = error.message;
        button.disabled = false;
      }
    };
    list.querySelectorAll(".report-resolve").forEach(button => button.addEventListener("click", () => update(button, "resolved")));
    list.querySelectorAll(".report-dismiss").forEach(button => button.addEventListener("click", () => update(button, "dismissed")));
  }

  async function loadAll() {
    const [tutorResult, bookingResult, reportResult, payoutResult] = await Promise.allSettled([
      api.adminPendingTutors(),
      api.adminBookings(),
      api.adminMessageReports(),
      api.adminWeeklyPayoutSummary()
    ]);

    if (tutorResult.status === "rejected") throw tutorResult.reason;
    if (bookingResult.status === "rejected") throw bookingResult.reason;
    if (payoutResult.status === "rejected") throw payoutResult.reason;

    tutors = tutorResult.value || [];
    bookings = bookingResult.value || [];
    reports = reportResult.status === "fulfilled" ? (reportResult.value || []) : [];
    payouts = payoutResult.value || [];

    renderOverview();
    renderTutors();
    renderBookings();
    renderPayouts();
    renderReports();
  }

  if (!window.TutoAuth?.getUser?.()) {
    location.replace("auth.html");
    return;
  }

  try {
    if (!api.isReady()) throw new Error("The Admin Console is temporarily unavailable.");
    if (!await api.checkAdmin()) throw new Error("Administrator access is required for this account.");
    content.hidden = false;
    alertBox.hidden = true;
    await loadAll();
  } catch (error) {
    alertBox.hidden = false;
    alertBox.textContent = error.message || "Admin Console could not be opened.";
  }

  function activateAdminTab(tabName, { updateUrl = false } = {}) {
    const allowed = ["overview", "tutors", "bookings", "payouts", "reports"];
    const tab = allowed.includes(tabName) ? tabName : "overview";
    document.querySelectorAll("[data-admin-tab]").forEach(item => item.classList.toggle("active", item.dataset.adminTab === tab));
    document.querySelectorAll(".admin-panel").forEach(panel => panel.classList.toggle("active", panel.id === `admin-${tab}-panel`));
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set("tab", tab);
      history.replaceState({}, "", url);
    }
  }

  document.querySelectorAll("[data-admin-tab]").forEach(button => button.addEventListener("click", () => {
    activateAdminTab(button.dataset.adminTab, { updateUrl: true });
  }));

  activateAdminTab(new URLSearchParams(location.search).get("tab") || "overview");
});
