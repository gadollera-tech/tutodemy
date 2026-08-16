document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoAuth?.ready;
  await window.TutoMarketplace?.ready;

  const api = window.TutoMarketplace;
  const currentUser = window.TutoAuth?.getUser?.();
  if (!currentUser) {
    location.replace(`auth.html?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    return;
  }

  const alertBox = document.querySelector("#messages-alert");
  const app = document.querySelector("#message-app");
  const threadList = document.querySelector("#thread-list");
  const empty = document.querySelector("#conversation-empty");
  const panel = document.querySelector("#conversation-panel");
  const stream = document.querySelector("#message-stream");
  const form = document.querySelector("#message-form");
  const body = document.querySelector("#message-body");
  const sendButton = document.querySelector("#send-message");
  const reportButton = document.querySelector("#report-conversation");
  const closedNote = document.querySelector("#message-closed-note");

  let threads = [];
  let activeBookingId = null;
  let activeThread = null;
  let realtimeChannel = null;
  let fallbackTimer = null;
  let reconnectTimer = null;
  let realtimeRefreshTimer = null;
  let reconnectAttempt = 0;

  const esc = value => window.Tuto.escape(value);
  const statusLabel = value => String(value || "booking").replaceAll("_", " ");

  function linkify(value) {
    const text = String(value || "");
    const urlPattern = /https?:\/\/[^\s<]+/gi;
    let result = "";
    let cursor = 0;
    for (const match of text.matchAll(urlPattern)) {
      const start = match.index ?? 0;
      const url = match[0];
      result += esc(text.slice(cursor, start));
      result += `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;
      cursor = start + url.length;
    }
    result += esc(text.slice(cursor));
    return result.replaceAll("\n", "<br>");
  }

  function formatThreadTime(value) {
    if (!value) return "No messages";
    const date = new Date(value);
    const today = new Date();
    return date.toDateString() === today.toDateString()
      ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function renderThreads() {
    threadList.innerHTML = threads.length
      ? threads.map(thread => {
          const selected = thread.booking_id === activeBookingId;
          const unread = Number(thread.unread_count || 0);
          return `<button class="thread-item ${selected ? "active" : ""}" type="button" data-booking-id="${esc(thread.booking_id)}">
            <span class="thread-avatar">${esc((thread.other_party_name || "B").slice(0, 1).toUpperCase())}</span>
            <span class="thread-copy">
              <span class="thread-title-row"><b>${esc(thread.other_party_name || "Booking")}</b><time>${esc(formatThreadTime(thread.last_message_at))}</time></span>
              <small>${esc(thread.subject || "Tutoring session")} • ${esc(statusLabel(thread.booking_status))}</small>
              <span class="thread-preview">${esc(thread.last_message || "No messages yet.")}</span>
            </span>
            ${unread ? `<span class="thread-unread" aria-label="${unread} unread messages">${unread > 99 ? "99+" : unread}</span>` : ""}
          </button>`;
        }).join("")
      : `<div class="empty-state compact"><h3>No booking conversations yet.</h3><p>Messaging becomes available after a tutor accepts a booking.</p><a class="button" href="tutoring.html">Find a tutor</a></div>`;

    threadList.querySelectorAll("[data-booking-id]").forEach(button => {
      button.addEventListener("click", () => selectThread(button.dataset.bookingId));
    });
  }

  function renderMessages(messages) {
    stream.innerHTML = messages.length
      ? messages.map(message => {
          if (message.message_type === "system") {
            return `<div class="system-message"><span>${linkify(message.body)}</span><time>${new Date(message.created_at).toLocaleString()}</time></div>`;
          }
          const classes = ["message-bubble", message.is_mine ? "mine" : "theirs", `role-${message.sender_role}`].join(" ");
          return `<article class="${classes}" data-message-id="${esc(message.id)}">
            <div class="message-meta"><b>${esc(message.is_mine ? "You" : message.sender_label)}</b><time>${new Date(message.created_at).toLocaleString()}</time></div>
            <p>${linkify(message.body)}</p>
          </article>`;
        }).join("")
      : `<div class="conversation-start"><b>No messages yet.</b><p>Start with a short greeting and confirm the agreed schedule or lesson goal.</p></div>`;
    stream.scrollTop = stream.scrollHeight;
  }

  function updateConversationHeader(thread) {
    document.querySelector("#conversation-name").textContent = thread.other_party_name || "Booking conversation";
    document.querySelector("#conversation-status").textContent = statusLabel(thread.booking_status).toUpperCase();
    document.querySelector("#conversation-status").className = `status-pill status-${thread.booking_status}`;
    document.querySelector("#conversation-meta").textContent = `${thread.subject || "Tutoring session"} • ${new Date(thread.requested_start).toLocaleString()}`;
    const canMessage = Boolean(thread.can_message);
    body.disabled = !canMessage;
    sendButton.disabled = !canMessage;
    closedNote.hidden = canMessage;
    body.placeholder = canMessage
      ? "Confirm the schedule, ask about lesson materials, or share a private meeting link."
      : "Messaging is unavailable for this booking status.";
  }

  async function refreshMessages({ quiet = false } = {}) {
    if (!activeBookingId) return;
    try {
      const messages = await api.getBookingMessages(activeBookingId);
      renderMessages(messages);
      await api.markMessagesRead(activeBookingId);
      if (api.markBookingNotificationsRead) {
        try {
          await api.markBookingNotificationsRead(activeBookingId, "new_message");
          await window.TutoNotifications?.refresh?.({ quiet: true });
        } catch (notificationError) {
          console.warn("Message notification could not be marked as read:", notificationError);
        }
      }
      const current = threads.find(thread => thread.booking_id === activeBookingId);
      if (current) current.unread_count = 0;
      renderThreads();
      if (!quiet) {
        alertBox.hidden = true;
      }
    } catch (error) {
      if (!quiet) {
        alertBox.hidden = false;
        alertBox.textContent = error.message || "Messages could not be loaded.";
      }
    }
  }

  function stopRealtime() {
    if (realtimeChannel) {
      const channel = realtimeChannel;
      realtimeChannel = null;
      api.unsubscribeBookingMessages(channel);
    }
    clearInterval(fallbackTimer);
    clearTimeout(reconnectTimer);
    fallbackTimer = null;
    reconnectTimer = null;
  }

  function scheduleReconnect(bookingId) {
    if (!bookingId || reconnectTimer || !navigator.onLine) return;
    const delay = Math.min(30000, 1500 * (2 ** reconnectAttempt));
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (activeBookingId === bookingId) startRealtime(bookingId);
    }, delay);
  }

  function startRealtime(bookingId) {
    stopRealtime();
    let channel = null;
    channel = api.subscribeBookingMessages(bookingId, async payload => {
      await Promise.all([refreshMessages({ quiet: true }), loadThreads({ keepSelection: true, quiet: true })]);
      const incoming = payload?.new;
      if (incoming?.sender_id && incoming.sender_id !== currentUser.id && document.hidden && navigator.vibrate) {
        try { navigator.vibrate(100); } catch {}
      }
    }, realtimeStatus => {
      if (realtimeChannel !== channel) return;
      if (realtimeStatus === "SUBSCRIBED") {
        reconnectAttempt = 0;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(realtimeStatus)) {
        scheduleReconnect(bookingId);
      }
    });
    realtimeChannel = channel;
    fallbackTimer = setInterval(() => refreshMessages({ quiet: true }), 20000);
  }

  async function selectThread(bookingId) {
    const thread = threads.find(item => item.booking_id === bookingId);
    if (!thread) return;
    activeBookingId = bookingId;
    activeThread = thread;
    history.replaceState(null, "", `messages.html?booking=${encodeURIComponent(bookingId)}`);
    empty.hidden = true;
    panel.hidden = false;
    updateConversationHeader(thread);
    renderThreads();
    await refreshMessages();
    startRealtime(bookingId);
  }

  async function loadThreads({ keepSelection = false, quiet = false } = {}) {
    try {
      threads = await api.getMessageThreads();
      if (activeBookingId) {
        const updatedThread = threads.find(thread => thread.booking_id === activeBookingId);
        if (updatedThread) {
          activeThread = updatedThread;
          if (!panel.hidden) updateConversationHeader(updatedThread);
        }
      }
      renderThreads();
      const requested = new URLSearchParams(location.search).get("booking");
      const nextId = keepSelection && activeBookingId
        ? activeBookingId
        : requested && threads.some(thread => thread.booking_id === requested)
          ? requested
          : null;
      if (nextId && nextId !== activeBookingId) await selectThread(nextId);
      if (!nextId && !activeBookingId && threads.length === 1) await selectThread(threads[0].booking_id);
      if (!quiet) alertBox.hidden = true;
    } catch (error) {
      if (!quiet) {
        alertBox.hidden = false;
        alertBox.textContent = error.message || "Booking conversations could not be loaded.";
      }
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!activeBookingId || !body.value.trim()) return;
    try {
      sendButton.disabled = true;
      await api.sendBookingMessage(activeBookingId, body.value);
      body.value = "";
      document.querySelector("#message-count").textContent = "0";
      await Promise.all([refreshMessages({ quiet: true }), loadThreads({ keepSelection: true, quiet: true })]);
      body.focus();
    } catch (error) {
      alertBox.hidden = false;
      alertBox.textContent = error.message || "The message could not be sent.";
    } finally {
      sendButton.disabled = !activeThread?.can_message;
    }
  });

  body.addEventListener("input", () => {
    document.querySelector("#message-count").textContent = String(body.value.length);
  });

  reportButton.addEventListener("click", async () => {
    if (!activeBookingId) return;
    const reason = prompt("Brief reason for the report:", "Safety or conduct concern");
    if (!reason) return;
    const details = prompt("Add details for the administrator. Do not include passwords or payment credentials.", "") || "";
    try {
      reportButton.disabled = true;
      await api.reportConversation(activeBookingId, null, reason, details);
      window.Tuto.toast("Report submitted to TutoDemy.");
    } catch (error) {
      alertBox.hidden = false;
      alertBox.textContent = error.message || "The report could not be submitted.";
    } finally {
      reportButton.disabled = false;
    }
  });

  document.querySelector("#refresh-threads").addEventListener("click", () => loadThreads({ keepSelection: true }));

  window.addEventListener("tutodemy-live-notification", event => {
    const item = event.detail?.notification;
    if (!item?.notification_type) return;
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(async () => {
      const type = String(item.notification_type);
      if (type === "new_message") {
        if (item.booking_id === activeBookingId) await refreshMessages({ quiet: true });
        await loadThreads({ keepSelection: true, quiet: true });
        return;
      }
      if (type.startsWith("booking_") || type.startsWith("payment_") || type === "session_delivered") {
        await loadThreads({ keepSelection: true, quiet: true });
      }
    }, 180);
  });

  window.addEventListener("online", () => {
    if (activeBookingId) startRealtime(activeBookingId);
    loadThreads({ keepSelection: true, quiet: true });
  });
  window.addEventListener("beforeunload", () => {
    clearTimeout(realtimeRefreshTimer);
    stopRealtime();
  });

  try {
    if (!api.isReady()) throw new Error("Booking messages are temporarily unavailable.");
    app.hidden = false;
    await loadThreads();
  } catch (error) {
    alertBox.hidden = false;
    alertBox.textContent = error.message || "Booking messages could not be opened.";
  }
});
