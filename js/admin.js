document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const content = document.querySelector("#admin-content");
  const alertBox = document.querySelector("#admin-alert");
  let api = null;
  let tutors = [];
  let bookings = [];
  let reports = [];
  let payouts = [];
  let overview = null;
  let overviewLoadedAt = null;
  let overviewLoading = false;
  let activeTab = "overview";

  const esc = value => window.Tuto.escape(value);
  const money = value => window.Tuto.money(value);
  const maskMobile = value => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length < 7) return digits || "Not provided";
    return `${digits.slice(0, 4)}•••${digits.slice(-4)}`;
  };

  const allowedTabs = new Set(["overview", "tutors", "bookings", "payouts", "reports"]);

  function tabFromUrl(urlLike = location.href) {
    const url = new URL(urlLike, location.href);
    const requested = url.searchParams.get("tab") || "overview";
    return allowedTabs.has(requested) ? requested : "overview";
  }

  function syncAdminNavigation(tab) {
    document.querySelectorAll("[data-admin-tab]").forEach(button => {
      const selected = button.dataset.adminTab === tab;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });

    document.querySelectorAll(".admin-panel").forEach(panel => {
      const selected = panel.id === `admin-${tab}-panel`;
      panel.classList.toggle("active", selected);
      panel.hidden = !selected;
    });

    document.querySelectorAll('#site-header a[href*="admin.html"], #site-footer a[href*="admin.html"]').forEach(link => {
      const linkTab = tabFromUrl(link.href);
      link.classList.toggle("active", linkTab === tab);
      if (linkTab === tab) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function activateAdminTab(tabName, { updateUrl = false, push = false, scroll = false } = {}) {
    const tab = allowedTabs.has(tabName) ? tabName : "overview";
    activeTab = tab;
    syncAdminNavigation(tab);

    if (updateUrl) {
      const url = new URL(location.href);
      if (tab === "overview") url.searchParams.delete("tab");
      else url.searchParams.set("tab", tab);
      history[push ? "pushState" : "replaceState"]({ adminTab: tab }, "", url);
    }

    document.querySelector(".main-nav")?.classList.remove("open");
    document.querySelector(".menu-toggle")?.setAttribute("aria-expanded", "false");
    if (scroll) content?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindAdminNavigation() {
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-admin-tab], [data-overview-tab]");
      if (button) {
        event.preventDefault();
        const tab = button.dataset.adminTab || button.dataset.overviewTab;
        activateAdminTab(tab, { updateUrl: true, scroll: Boolean(button.dataset.overviewTab) });
        return;
      }

      const link = event.target.closest('a[href*="admin.html"]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || !url.pathname.endsWith("/admin.html")) return;
      event.preventDefault();
      activateAdminTab(tabFromUrl(url), { updateUrl: true, push: true, scroll: true });
    });

    document.addEventListener("keydown", event => {
      const current = event.target.closest?.("[data-admin-tab]");
      if (!current || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const tabs = [...document.querySelectorAll("[data-admin-tab]")];
      const currentIndex = tabs.indexOf(current);
      let nextIndex = currentIndex;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      event.preventDefault();
      const next = tabs[nextIndex];
      activateAdminTab(next.dataset.adminTab, { updateUrl: true });
      next.focus();
    });

    window.addEventListener("popstate", () => activateAdminTab(tabFromUrl()));
    window.addEventListener("tutodemy-role-ready", () => syncAdminNavigation(activeTab));
  }

  function showAdminAlert(message, kind = "error") {
    if (!alertBox) return;
    alertBox.hidden = !message;
    alertBox.dataset.kind = kind;
    alertBox.textContent = message || "";
  }

  function metricNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function setMetric(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function renderOverview() {
    const pendingTutorsFallback = tutors.filter(tutor => tutor.status === "pending").length;
    const paymentActionsFallback = bookings.filter(booking =>
      (booking.payment_proof_path && booking.payment_status !== "paid") ||
      (booking.status === "session_delivered" && booking.payment_status === "paid")
    ).length;
    const payoutDueFallback = payouts.reduce((sum, row) => sum + Number(row.amount_due || 0), 0);
    const payoutItemsFallback = payouts.reduce((sum, row) => sum + Number(row.session_count || 0), 0);
    const openReportsFallback = reports.filter(report => !["resolved", "dismissed"].includes(report.status)).length;

    const accounts = overview?.accounts || {};
    const activity = overview?.activity || {};
    const bookingStats = overview?.bookings || {};
    const finance = overview?.finance || {};
    const safety = overview?.safety || {};

    const metrics = {
      "#admin-total-users": overview ? metricNumber(accounts.total_users).toLocaleString() : "—",
      "#admin-learner-users": overview ? metricNumber(accounts.learner_only_users).toLocaleString() : "—",
      "#admin-active-users-month": overview ? metricNumber(activity.active_users_month).toLocaleString() : "—",
      "#admin-approved-tutors": overview ? metricNumber(accounts.approved_tutors).toLocaleString() : tutors.filter(t => t.status === "approved").length.toLocaleString(),
      "#admin-pending-tutors": overview ? metricNumber(accounts.pending_tutor_applications).toLocaleString() : pendingTutorsFallback.toLocaleString(),
      "#admin-suspended-users": overview ? metricNumber(accounts.suspended_accounts).toLocaleString() : "—",
      "#admin-new-users-week": overview ? metricNumber(accounts.new_users_week).toLocaleString() : "—",
      "#admin-new-users-month": overview ? metricNumber(accounts.new_users_month).toLocaleString() : "—",
      "#admin-total-tutor-accounts": overview ? metricNumber(accounts.tutor_accounts).toLocaleString() : tutors.length.toLocaleString(),
      "#admin-total-admins": overview ? metricNumber(accounts.admin_accounts).toLocaleString() : "—",
      "#admin-booking-requests": overview ? metricNumber(bookingStats.booking_requests).toLocaleString() : bookings.filter(b => b.status === "requested").length.toLocaleString(),
      "#admin-upcoming-sessions": overview ? metricNumber(bookingStats.upcoming_sessions).toLocaleString() : bookings.filter(b => ["accepted", "paid"].includes(b.status) && new Date(b.requested_start) >= new Date()).length.toLocaleString(),
      "#admin-pending-payments": overview ? metricNumber(bookingStats.pending_payment_verification).toLocaleString() : paymentActionsFallback.toLocaleString(),
      "#admin-awaiting-completion": overview ? metricNumber(bookingStats.awaiting_completion).toLocaleString() : bookings.filter(b => b.status === "session_delivered" && b.payment_status === "paid").length.toLocaleString(),
      "#admin-payout-due": overview ? money(finance.pending_tutor_payout_amount) : money(payoutDueFallback),
      "#admin-payout-items": overview ? metricNumber(finance.pending_tutor_payout_items).toLocaleString() : payoutItemsFallback.toLocaleString(),
      "#admin-open-reports": overview ? metricNumber(safety.open_reports).toLocaleString() : openReportsFallback.toLocaleString(),
      "#admin-bookings-week": overview ? metricNumber(bookingStats.new_bookings_week).toLocaleString() : "—",
      "#admin-bookings-month": overview ? metricNumber(bookingStats.new_bookings_month).toLocaleString() : "—",
      "#admin-completed-month": overview ? metricNumber(bookingStats.completed_sessions_month).toLocaleString() : "—",
      "#admin-completed-all": overview ? metricNumber(bookingStats.completed_sessions_all_time).toLocaleString() : bookings.filter(b => b.status === "completed").length.toLocaleString(),
      "#admin-gross-completed": overview ? money(finance.gross_completed_value) : "—",
      "#admin-platform-commission": overview ? money(finance.platform_commission_earned) : "—",
      "#admin-platform-commission-month": overview ? money(finance.platform_commission_month) : "—",
      "#admin-tutor-net-recorded": overview ? money(finance.tutor_net_earned) : "—",
      "#admin-payouts-paid": overview ? money(finance.tutor_payouts_recorded_paid) : "—",
      "#admin-payout-pending-finance": overview ? money(finance.pending_tutor_payout_amount) : money(payoutDueFallback)
    };
    Object.entries(metrics).forEach(([selector, value]) => setMetric(selector, value));

    const setup = document.querySelector("#admin-overview-setup");
    if (setup) setup.hidden = Boolean(overview);

    const updated = document.querySelector("#admin-overview-updated");
    if (updated) {
      if (overviewLoading) updated.textContent = "Refreshing overview…";
      else if (overviewLoadedAt) updated.textContent = `Updated ${overviewLoadedAt.toLocaleString()}`;
      else updated.textContent = overview ? "Overview loaded" : "Overview database setup not detected";
    }
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

  async function loadAll({ manual = false } = {}) {
    if (overviewLoading) return;
    overviewLoading = true;
    const refreshButton = document.querySelector("#admin-overview-refresh");
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = manual ? "Refreshing…" : "Loading…";
    }
    renderOverview();

    const tasks = [
      ["Platform overview", () => api.adminPlatformOverview ? api.adminPlatformOverview() : Promise.reject(new Error("Admin Overview client method is unavailable."))],
      ["Tutor applications", () => api.adminPendingTutors?.()],
      ["Bookings and payments", () => api.adminBookings?.()],
      ["Message reports", () => api.adminMessageReports?.()],
      ["Weekly payouts", () => api.adminWeeklyPayoutSummary?.()]
    ];

    const results = await Promise.allSettled(tasks.map(([, task]) => Promise.resolve().then(task)));
    overview = results[0].status === "fulfilled" && results[0].value && typeof results[0].value === "object" ? results[0].value : null;
    tutors = results[1].status === "fulfilled" && Array.isArray(results[1].value) ? results[1].value : [];
    bookings = results[2].status === "fulfilled" && Array.isArray(results[2].value) ? results[2].value : [];
    reports = results[3].status === "fulfilled" && Array.isArray(results[3].value) ? results[3].value : [];
    payouts = results[4].status === "fulfilled" && Array.isArray(results[4].value) ? results[4].value : [];
    overviewLoadedAt = overview ? new Date(overview.generated_at || Date.now()) : null;
    overviewLoading = false;

    renderOverview();
    renderTutors();
    renderBookings();
    renderPayouts();
    renderReports();
    syncAdminNavigation(activeTab);

    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh overview";
    }

    const failures = results
      .map((result, index) => result.status === "rejected" ? `${tasks[index][0]}: ${result.reason?.message || "could not be loaded"}` : "")
      .filter(Boolean);
    if (failures.length) showAdminAlert(`Some admin data could not be loaded. ${failures.join(" • ")}`, "warning");
    else showAdminAlert("");
  }

  bindAdminNavigation();
  activateAdminTab(tabFromUrl());
  document.querySelector("#admin-overview-refresh")?.addEventListener("click", () => {
    if (!api) {
      showAdminAlert("The Admin Console is still loading. Please try again in a moment.", "warning");
      return;
    }
    loadAll({ manual: true });
  });

  await window.TutoAuth?.ready;
  if (window.TutoMarketplace?.ready) await window.TutoMarketplace.ready;
  api = window.TutoMarketplace;

  if (!window.TutoAuth?.getUser?.()) {
    location.replace(`auth.html?next=${encodeURIComponent("admin.html")}`);
    return;
  }

  try {
    if (!api?.isReady?.()) throw new Error("The Admin Console is temporarily unavailable.");
    if (!await api.checkAdmin()) throw new Error("Administrator access is required for this account.");
    content.hidden = false;
    showAdminAlert("");
    syncAdminNavigation(activeTab);
    await loadAll();
  } catch (error) {
    content.hidden = false;
    showAdminAlert(error.message || "Admin Console could not be opened.");
    syncAdminNavigation(activeTab);
  }
});
