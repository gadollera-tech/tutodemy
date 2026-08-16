(() => {
  "use strict";

  const RELEASE = "20260809-live1";
  const BASE_TITLE = document.title.replace(/^\(\d+\)\s*/, "");
  const handledEvents = new Map();

  let initialized = false;
  let currentUserId = null;
  let realtimeChannel = null;
  let fallbackTimer = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let notifications = [];
  let unreadCount = 0;
  let center = null;
  let button = null;
  let badge = null;
  let popover = null;
  let list = null;
  let status = null;
  let markAllButton = null;
  let liveStack = null;

  const api = () => window.TutoMarketplace;
  const auth = () => window.TutoAuth;
  const esc = value => window.Tuto?.escape?.(value) ?? String(value ?? "");

  const iconMap = {
    booking_request: "calendar",
    booking_accepted: "check",
    booking_declined: "close",
    booking_cancelled: "close",
    payment_submitted: "receipt",
    payment_confirmed: "check",
    payment_action_needed: "alert",
    session_delivered: "book",
    booking_completed: "star",
    booking_disputed: "alert",
    booking_refunded: "receipt",
    new_message: "message"
  };

  function iconSvg(type) {
    const icon = iconMap[type] || "bell";
    const paths = {
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
      check: '<path d="M20 6 9 17l-5-5"/>',
      close: '<path d="m18 6-12 12M6 6l12 12"/>',
      receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
      alert: '<path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4v15.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4Z"/>',
      star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2Z"/>',
      message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[icon]}</svg>`;
  }

  function installLiveAlertStyles() {
    if (document.querySelector(`style[data-tutodemy-live-alerts="${RELEASE}"]`)) return;
    const style = document.createElement("style");
    style.dataset.tutodemyLiveAlerts = RELEASE;
    style.textContent = `
      .td-live-alert-stack{position:fixed;z-index:260;right:18px;top:92px;width:min(390px,calc(100vw - 28px));display:grid;gap:10px;pointer-events:none}
      .td-live-alert{pointer-events:auto;display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:11px;align-items:start;padding:13px 13px 13px 14px;border:1px solid rgba(17,21,111,.16);border-left:4px solid #f0b429;border-radius:15px;background:#fff;box-shadow:0 18px 55px rgba(17,21,111,.20);color:#22263b;animation:tdAlertIn .24s ease both}
      .td-live-alert.type-new_message{border-left-color:#5874db}.td-live-alert.type-booking_accepted,.td-live-alert.type-payment_confirmed,.td-live-alert.type-booking_completed{border-left-color:#2d9c70}.td-live-alert.type-booking_declined,.td-live-alert.type-booking_cancelled,.td-live-alert.type-booking_disputed,.td-live-alert.type-payment_action_needed{border-left-color:#b73769}
      .td-live-alert-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#fff4cd;color:#765000}.td-live-alert.type-new_message .td-live-alert-icon{background:#eef3ff;color:#2747a7}.td-live-alert-icon svg{width:19px;height:19px}
      .td-live-alert-copy{min-width:0;display:grid;gap:4px}.td-live-alert-copy b{color:#0C046D;font-size:.88rem;line-height:1.3}.td-live-alert-copy span{color:#6B686A;font-size:.77rem;line-height:1.42}.td-live-alert-copy a{justify-self:start;color:#0C046D;font-size:.74rem;font-weight:900;text-decoration:none}.td-live-alert-copy a:hover,.td-live-alert-copy a:focus-visible{text-decoration:underline;outline:none}
      .td-live-alert-close{width:31px;height:31px;min-height:31px;padding:0;border:0;border-radius:50%;display:grid;place-items:center;background:transparent;color:#7a7e8c;font-size:1.2rem;line-height:1}.td-live-alert-close:hover,.td-live-alert-close:focus-visible{background:#f1f2f6;color:#0C046D;outline:none}
      .td-live-alert.leaving{animation:tdAlertOut .18s ease both}@keyframes tdAlertIn{from{opacity:0;transform:translateY(-10px) scale(.98)}to{opacity:1;transform:none}}@keyframes tdAlertOut{to{opacity:0;transform:translateY(-8px) scale(.98)}}
      @media(max-width:760px){.td-live-alert-stack{top:auto;right:12px;left:12px;bottom:max(14px,env(safe-area-inset-bottom));width:auto}.td-live-alert{grid-template-columns:40px minmax(0,1fr) auto;padding:12px}}
      @media(prefers-reduced-motion:reduce){.td-live-alert{animation:none}.td-live-alert.leaving{animation:none;opacity:0}}
    `;
    document.head.append(style);
  }

  function ensureLiveStack() {
    if (liveStack?.isConnected) return liveStack;
    liveStack = document.createElement("div");
    liveStack.id = "tutodemy-live-alerts";
    liveStack.className = "td-live-alert-stack";
    liveStack.setAttribute("aria-live", "polite");
    liveStack.setAttribute("aria-relevant", "additions");
    document.body.append(liveStack);
    return liveStack;
  }

  function dismissLiveAlert(card) {
    if (!card?.isConnected || card.classList.contains("leaving")) return;
    card.classList.add("leaving");
    setTimeout(() => card.remove(), 190);
  }

  function actionLabel(item) {
    if (item.notification_type === "new_message") return "Open message";
    if (item.notification_type === "booking_request") return "Review request";
    return "View update";
  }

  function showLiveAlert(item) {
    if (!item?.title) return;
    const stack = ensureLiveStack();
    while (stack.children.length >= 3) stack.firstElementChild?.remove();

    const card = document.createElement("article");
    card.className = `td-live-alert type-${String(item.notification_type || "update").replace(/[^a-z0-9_-]/gi, "")}`;
    card.setAttribute("role", "status");
    card.innerHTML = `
      <span class="td-live-alert-icon">${iconSvg(item.notification_type)}</span>
      <span class="td-live-alert-copy">
        <b>${esc(item.title)}</b>
        <span>${esc(item.body || "Open TutoDemy to view the update.")}</span>
        <a href="${esc(item.link || "dashboard.html")}">${esc(actionLabel(item))} →</a>
      </span>
      <button class="td-live-alert-close" type="button" aria-label="Dismiss notification">×</button>`;

    const link = card.querySelector("a");
    link.addEventListener("click", async event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      try { await api()?.markNotificationRead?.(item.id); } catch {}
      location.href = link.getAttribute("href") || "dashboard.html";
    });
    card.querySelector("button").addEventListener("click", () => dismissLiveAlert(card));
    stack.append(card);

    let timer = setTimeout(() => dismissLiveAlert(card), 9000);
    card.addEventListener("mouseenter", () => clearTimeout(timer));
    card.addEventListener("mouseleave", () => { timer = setTimeout(() => dismissLiveAlert(card), 4500); });
    card.addEventListener("focusin", () => clearTimeout(timer));
    card.addEventListener("focusout", () => { timer = setTimeout(() => dismissLiveAlert(card), 4500); });

    if (document.hidden && navigator.vibrate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      try { navigator.vibrate(120); } catch {}
    }
  }


  async function maybeShowDeviceNotification(item) {
    if (!item?.title || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission !== "granted") return;
    try {
      if (localStorage.getItem("tutodemyBrowserNotifications") !== "enabled") return;
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: "TUTODEMY_SHOW_NOTIFICATION",
        notification: {
          title: item.title,
          body: item.body || "Open TutoDemy to view the update.",
          link: item.link || "dashboard.html",
          tag: `tutodemy-${item.notification_type || "update"}-${item.booking_id || item.id || Date.now()}`
        }
      });
    } catch (error) {
      console.warn("Device notification could not be shown:", error);
    }
  }

  function relativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const abs = Math.abs(seconds);
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (abs < 60) return formatter.format(seconds, "second");
    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 7) return formatter.format(days, "day");
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
  }

  function updateDocumentTitle() {
    document.title = unreadCount ? `(${unreadCount > 99 ? "99+" : unreadCount}) ${BASE_TITLE}` : BASE_TITLE;
  }

  function setBadge(count) {
    unreadCount = Math.max(0, Number(count) || 0);
    updateDocumentTitle();
    if (!badge || !button) return;
    badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    badge.hidden = unreadCount === 0;
    button.classList.toggle("has-unread", unreadCount > 0);
    button.setAttribute("aria-label", unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications, none unread");
    markAllButton.disabled = unreadCount === 0;
  }

  function render() {
    if (!list || !status) return;
    status.hidden = true;
    if (!notifications.length) {
      list.innerHTML = `<div class="notification-empty">${iconSvg("bell")}<b>You’re all caught up.</b><span>Booking and message updates will appear here.</span></div>`;
      return;
    }

    list.innerHTML = notifications.map(item => {
      const unread = item.is_unread || !item.read_at;
      const href = item.link || "dashboard.html";
      return `<a class="notification-item ${unread ? "unread" : ""}" href="${esc(href)}" data-notification-id="${esc(item.id)}">
        <span class="notification-icon type-${esc(item.notification_type)}">${iconSvg(item.notification_type)}</span>
        <span class="notification-copy">
          <span class="notification-title-row"><b>${esc(item.title)}</b>${unread ? '<i aria-label="Unread"></i>' : ""}</span>
          <span>${esc(item.body)}</span>
          <time datetime="${esc(item.created_at)}" title="${esc(new Date(item.created_at).toLocaleString())}">${esc(relativeTime(item.created_at))}</time>
        </span>
      </a>`;
    }).join("");

    list.querySelectorAll("[data-notification-id]").forEach(link => {
      link.addEventListener("click", async event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const href = link.getAttribute("href") || "dashboard.html";
        try { await api()?.markNotificationRead?.(link.dataset.notificationId); } catch (error) { console.warn("Notification could not be marked as read:", error); }
        location.href = href;
      });
    });
  }

  function setLoading(message = "Loading notifications…") {
    status.hidden = false;
    status.textContent = message;
    list.innerHTML = "";
  }

  function setUnavailable(message = "Notifications are temporarily unavailable.") {
    status.hidden = false;
    status.textContent = message;
    list.innerHTML = "";
  }

  async function refresh({ quiet = false } = {}) {
    if (!currentUserId || !api()?.getMyNotifications) return;
    if (!quiet && !notifications.length) setLoading();
    try {
      const [items, count] = await Promise.all([api().getMyNotifications(30), api().getUnreadNotificationCount()]);
      notifications = items || [];
      setBadge(count);
      render();
      center.dataset.ready = "true";
    } catch (error) {
      console.warn("TutoDemy notification refresh failed:", error);
      center.dataset.ready = "false";
      if (!quiet) setUnavailable(error?.message || "Notifications are temporarily unavailable.");
    }
  }

  function closePopover() {
    if (!popover || !button) return;
    popover.hidden = true;
    button.setAttribute("aria-expanded", "false");
    center.classList.remove("open");
  }

  async function openPopover() {
    if (!popover || !button) return;
    popover.hidden = false;
    button.setAttribute("aria-expanded", "true");
    center.classList.add("open");
    await refresh({ quiet: notifications.length > 0 });
  }

  function togglePopover() {
    if (popover.hidden) openPopover();
    else closePopover();
  }

  async function stopRealtime() {
    clearInterval(fallbackTimer);
    clearTimeout(reconnectTimer);
    fallbackTimer = null;
    reconnectTimer = null;
    if (realtimeChannel) {
      const channel = realtimeChannel;
      realtimeChannel = null;
      try {
        if (api()?.unsubscribeRealtimeChannel) await api().unsubscribeRealtimeChannel(channel);
        else await api()?.unsubscribeBookingMessages?.(channel);
      } catch {}
    }
  }

  function scheduleReconnect() {
    if (!currentUserId || reconnectTimer || !navigator.onLine) return;
    const delay = Math.min(30000, 1500 * (2 ** reconnectAttempt));
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (currentUserId) startRealtime(currentUserId);
    }, delay);
  }

  function eventSignature(item) {
    return `${item?.id || "none"}:${item?.created_at || ""}:${item?.read_at || "unread"}`;
  }

  function isRecentUnread(item) {
    if (!item || item.read_at) return false;
    const timestamp = new Date(item.created_at).getTime();
    return Number.isFinite(timestamp) && Date.now() - timestamp < 2 * 60 * 1000;
  }

  async function handleRealtimePayload(payload) {
    const incoming = payload?.new;
    if (!incoming?.id || incoming.user_id !== currentUserId) return;

    if (!incoming.read_at) {
      window.dispatchEvent(new CustomEvent("tutodemy-live-notification", {
        detail: { notification: incoming, eventType: payload.eventType || "UPDATE" }
      }));
    }

    const signature = eventSignature(incoming);
    const alreadyHandled = handledEvents.has(signature);
    handledEvents.set(signature, Date.now());
    for (const [key, time] of handledEvents) if (Date.now() - time > 5 * 60 * 1000) handledEvents.delete(key);

    const activeBooking = new URLSearchParams(location.search).get("booking");
    const viewingConversation = document.body.dataset.page === "messages"
      && activeBooking
      && activeBooking === incoming.booking_id
      && incoming.notification_type === "new_message";

    if (!alreadyHandled && isRecentUnread(incoming) && !viewingConversation) {
      showLiveAlert(incoming);
      maybeShowDeviceNotification(incoming);
    }
    await refresh({ quiet: true });
  }

  function startRealtime(userId) {
    stopRealtime();
    if (!userId || !api()?.subscribeMyNotifications) return;

    let channel = null;
    channel = api().subscribeMyNotifications(userId, handleRealtimePayload, realtimeStatus => {
      if (realtimeChannel !== channel) return;
      center.dataset.realtimeStatus = String(realtimeStatus || "").toLowerCase();
      if (realtimeStatus === "SUBSCRIBED") {
        reconnectAttempt = 0;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(realtimeStatus)) {
        scheduleReconnect();
      }
    });
    realtimeChannel = channel;

    fallbackTimer = window.setInterval(() => refresh({ quiet: true }), 30000);
  }

  async function syncAuth() {
    const user = auth()?.getUser?.();
    const nextId = user?.id || null;
    if (nextId === currentUserId && center && !center.hidden) return;

    await stopRealtime();
    currentUserId = nextId;
    notifications = [];
    setBadge(0);
    closePopover();

    if (!nextId) {
      center.hidden = true;
      return;
    }

    center.hidden = false;
    setLoading();
    await refresh();
    if (center.dataset.ready === "true") startRealtime(nextId);
  }

  async function markAllRead() {
    if (!unreadCount) return;
    try {
      markAllButton.disabled = true;
      await api()?.markAllNotificationsRead?.();
      notifications = notifications.map(item => ({ ...item, is_unread: false, read_at: item.read_at || new Date().toISOString() }));
      setBadge(0);
      render();
    } catch (error) {
      window.Tuto?.toast?.(error?.message || "Notifications could not be updated.");
      markAllButton.disabled = false;
    }
  }

  function bindElements() {
    center = document.querySelector("#notification-center");
    button = document.querySelector("#notification-bell");
    badge = document.querySelector("#notification-badge");
    popover = document.querySelector("#notification-popover");
    list = document.querySelector("#notification-list");
    status = document.querySelector("#notification-status");
    markAllButton = document.querySelector("#notification-mark-all");
    return Boolean(center && button && badge && popover && list && status && markAllButton);
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    if (!bindElements()) return;
    installLiveAlertStyles();

    button.addEventListener("click", event => { event.stopPropagation(); togglePopover(); });
    markAllButton.addEventListener("click", markAllRead);
    document.addEventListener("click", event => { if (!event.target.closest("#notification-center")) closePopover(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && !popover.hidden) { closePopover(); button.focus(); } });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && currentUserId) refresh({ quiet: true }); });
    window.addEventListener("online", () => { if (currentUserId) { refresh({ quiet: true }); startRealtime(currentUserId); } });
    window.addEventListener("offline", scheduleReconnect);
    window.addEventListener("tutodemy-auth-change", syncAuth);
    window.addEventListener("beforeunload", stopRealtime);

    await auth()?.ready;
    await api()?.ready;
    await syncAuth();
  }

  window.TutoNotifications = { init, refresh, close: closePopover, showLiveAlert };
})();
