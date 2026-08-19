document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoAuth?.ready;
  await window.TutoMarketplace?.ready;

  const api = window.TutoMarketplace;
  const currentUser = window.TutoAuth?.getUser?.();

  if (!currentUser) {
    location.replace(
      `auth.html?redirect=${encodeURIComponent(
        location.pathname + location.search
      )}`
    );
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
  const closeInquiryButton = document.querySelector("#close-inquiry");
  const requestBookingButton =
    document.querySelector("#request-booking-from-inquiry");
  const viewLinkedBooking =
    document.querySelector("#view-linked-booking");
  const closedNote = document.querySelector("#message-closed-note");
  const noticeText =
    document.querySelector("#conversation-notice-text");

  let threads = [];
  let activeKey = null;
  let activeThread = null;
  let realtimeChannel = null;
  let fallbackTimer = null;
  let reconnectTimer = null;
  let realtimeRefreshTimer = null;
  let reconnectAttempt = 0;

  const esc = value => window.Tuto.escape(value);
  const statusLabel = value =>
    String(value || "").replaceAll("_", " ");

  function keyFor(kind, id) {
    return `${kind}:${id}`;
  }

  function normalizeBookingThread(thread) {
    return {
      kind: "booking",
      key: keyFor("booking", thread.booking_id),
      id: thread.booking_id,
      booking_id: thread.booking_id,
      inquiry_id: null,
      learner_id: thread.learner_id || null,
      tutor_id: thread.tutor_id || null,
      other_party_name:
        thread.other_party_name || "Booking",
      subject: thread.subject || "Tutoring session",
      status: thread.booking_status || "booking",
      last_message: thread.last_message || "",
      last_message_at: thread.last_message_at || null,
      unread_count: Number(thread.unread_count || 0),
      can_message: Boolean(thread.can_message),
      requested_start: thread.requested_start || null,
      linked_booking_id: thread.booking_id
    };
  }

  function normalizeInquiryThread(thread) {
    return {
      kind: "inquiry",
      key: keyFor("inquiry", thread.inquiry_id),
      id: thread.inquiry_id,
      inquiry_id: thread.inquiry_id,
      booking_id: null,
      learner_id: thread.learner_id,
      tutor_id: thread.tutor_id,
      other_party_name:
        thread.other_party_name || "Tutor inquiry",
      subject: thread.subject || "Tutoring inquiry",
      status: thread.inquiry_status || "open",
      linked_booking_status:
        thread.linked_booking_status || null,
      linked_booking_id:
        thread.linked_booking_id || null,
      last_message: thread.last_message || "",
      last_message_at: thread.last_message_at || null,
      unread_count: Number(thread.unread_count || 0),
      can_message: Boolean(thread.can_message),
      created_at: thread.created_at || null
    };
  }

  function linkify(value) {
    const text = String(value || "");
    const urlPattern = /https?:\/\/[^\s<]+/gi;
    let result = "";
    let cursor = 0;

    for (const match of text.matchAll(urlPattern)) {
      const start = match.index ?? 0;
      const url = match[0];

      result += esc(text.slice(cursor, start));
      result +=
        `<a href="${esc(url)}" target="_blank" ` +
        `rel="noopener noreferrer">${esc(url)}</a>`;

      cursor = start + url.length;
    }

    result += esc(text.slice(cursor));

    return result.replaceAll("\n", "<br>");
  }

  function formatThreadTime(value) {
    if (!value) return "New";

    const date = new Date(value);
    const today = new Date();

    return date.toDateString() === today.toDateString()
      ? date.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit"
        })
      : date.toLocaleDateString([], {
          month: "short",
          day: "numeric"
        });
  }

  function threadStatus(thread) {
    if (thread.kind === "inquiry") {
      if (thread.linked_booking_id) {
        return thread.linked_booking_status
          ? `Booking ${statusLabel(
              thread.linked_booking_status
            )}`
          : "Booking requested";
      }

      return thread.status === "closed"
        ? "Inquiry closed"
        : "Inquiry";
    }

    return statusLabel(thread.status);
  }

  function renderThreads() {
    threadList.innerHTML = threads.length
      ? threads.map(thread => {
          const selected = thread.key === activeKey;
          const unread = Number(thread.unread_count || 0);

          return `
            <button
              class="thread-item ${selected ? "active" : ""}"
              type="button"
              data-thread-key="${esc(thread.key)}">

              <span class="thread-avatar">
                ${esc(
                  (thread.other_party_name || "T")
                    .slice(0, 1)
                    .toUpperCase()
                )}
              </span>

              <span class="thread-copy">
                <span class="thread-title-row">
                  <b>${esc(
                    thread.other_party_name ||
                    "Conversation"
                  )}</b>

                  <time>
                    ${esc(
                      formatThreadTime(
                        thread.last_message_at
                      )
                    )}
                  </time>
                </span>

                <small>
                  ${thread.kind === "inquiry"
                    ? "Inquiry"
                    : "Booking"}
                  •
                  ${esc(threadStatus(thread))}
                </small>

                <span class="thread-preview">
                  ${esc(
                    thread.last_message ||
                    thread.subject ||
                    "No messages yet."
                  )}
                </span>
              </span>

              ${unread
                ? `<span class="thread-unread"
                    aria-label="${unread} unread messages">
                    ${unread > 99 ? "99+" : unread}
                   </span>`
                : ""}
            </button>`;
        }).join("")
      : `
        <div class="empty-state compact">
          <h3>No conversations yet.</h3>
          <p>Open a tutor profile to send an inquiry.</p>
          <a class="button" href="tutoring.html">
            Find a tutor
          </a>
        </div>`;

    threadList
      .querySelectorAll("[data-thread-key]")
      .forEach(button => {
        button.addEventListener("click", () =>
          selectThread(button.dataset.threadKey)
        );
      });
  }

  function renderMessages(messages) {
    stream.innerHTML = messages.length
      ? messages.map(message => {
          if (
            message.message_type === "system" ||
            message.sender_role === "system"
          ) {
            return `
              <div class="system-message">
                <span>${linkify(message.body)}</span>
                <time>
                  ${new Date(
                    message.created_at
                  ).toLocaleString()}
                </time>
              </div>`;
          }

          const classes = [
            "message-bubble",
            message.is_mine ? "mine" : "theirs",
            `role-${message.sender_role}`
          ].join(" ");

          return `
            <article
              class="${classes}"
              data-message-id="${esc(message.id)}">

              <div class="message-meta">
                <b>
                  ${esc(
                    message.is_mine
                      ? "You"
                      : message.sender_label
                  )}
                </b>

                <time>
                  ${new Date(
                    message.created_at
                  ).toLocaleString()}
                </time>
              </div>

              <p>${linkify(message.body)}</p>
            </article>`;
        }).join("")
      : `
        <div class="conversation-start">
          <b>No messages yet.</b>
          <p>Start with your question or session details.</p>
        </div>`;

    stream.scrollTop = stream.scrollHeight;
  }

  function updateConversationHeader(thread) {
    activeThread = thread;

    document.querySelector(
      "#conversation-name"
    ).textContent =
      thread.other_party_name || "Conversation";

    const badge =
      document.querySelector("#conversation-status");

    badge.textContent =
      thread.kind === "inquiry"
        ? thread.linked_booking_id
          ? "INQUIRY • BOOKING LINKED"
          : "INQUIRY"
        : statusLabel(thread.status).toUpperCase();

    badge.className =
      thread.kind === "inquiry"
        ? `status-pill inquiry-status-${thread.status}`
        : `status-pill status-${thread.status}`;

    const meta =
      document.querySelector("#conversation-meta");

    if (thread.kind === "inquiry") {
      meta.textContent =
        thread.subject || "Tutor inquiry";

      noticeText.innerHTML =
        thread.linked_booking_id
          ? "A booking has been requested from this inquiry. You can keep discussing details here while the booking moves forward."
          : "Discuss availability, subjects, learning needs, and session details here. No payment is required for an inquiry.";
    } else {
      const start = thread.requested_start
        ? new Date(
            thread.requested_start
          ).toLocaleString()
        : "";

      meta.textContent =
        [thread.subject, start]
          .filter(Boolean)
          .join(" • ");

      noticeText.innerHTML =
        `Use this thread for booking coordination. ` +
        `Payment should only be completed through ` +
        `<a href="bookings.html">My Bookings</a> ` +
        `after the tutor accepts.`;
    }

    const canMessage = Boolean(thread.can_message);

    body.disabled = !canMessage;
    sendButton.disabled = !canMessage;
    closedNote.hidden = canMessage;

    body.placeholder = canMessage
      ? thread.kind === "inquiry"
        ? "Ask about the session…"
        : "Type a message…"
      : "This conversation is read-only.";

    const isLearner =
      thread.kind === "inquiry" &&
      thread.learner_id === currentUser.id;

    requestBookingButton.hidden =
      !(
        isLearner &&
        thread.status === "open" &&
        !thread.linked_booking_id
      );

    if (!requestBookingButton.hidden) {
      requestBookingButton.href =
        `tutor-profile.html?id=${encodeURIComponent(
          thread.tutor_id
        )}` +
        `&inquiry=${encodeURIComponent(
          thread.inquiry_id
        )}` +
        `&subject=${encodeURIComponent(
          thread.subject || ""
        )}` +
        `#booking-request`;
    }

    viewLinkedBooking.hidden =
      !thread.linked_booking_id;

    if (thread.linked_booking_id) {
      viewLinkedBooking.href =
        `bookings.html?booking=${encodeURIComponent(
          thread.linked_booking_id
        )}`;
    }

    closeInquiryButton.hidden =
      !(
        thread.kind === "inquiry" &&
        thread.status === "open"
      );
  }

  async function getActiveMessages() {
    if (!activeThread) return [];

    return activeThread.kind === "inquiry"
      ? api.getInquiryMessages(activeThread.inquiry_id)
      : api.getBookingMessages(activeThread.booking_id);
  }

  async function markActiveRead() {
    if (!activeThread) return;

    if (activeThread.kind === "inquiry") {
      await api.markInquiryMessagesRead(
        activeThread.inquiry_id
      );

      try {
        await api.markInquiryNotificationsRead?.(
          activeThread.inquiry_id
        );
        await window.TutoNotifications?.refresh?.({
          quiet: true
        });
      } catch (error) {
        console.warn(
          "Inquiry notification could not be marked read:",
          error
        );
      }

      return;
    }

    await api.markMessagesRead(activeThread.booking_id);

    if (api.markBookingNotificationsRead) {
      try {
        await api.markBookingNotificationsRead(
          activeThread.booking_id,
          "new_message"
        );

        await window.TutoNotifications?.refresh?.({
          quiet: true
        });
      } catch (error) {
        console.warn(
          "Message notification could not be marked read:",
          error
        );
      }
    }
  }

  async function refreshMessages({
    quiet = false
  } = {}) {
    if (!activeThread) return;

    try {
      const messages = await getActiveMessages();

      renderMessages(messages);
      await markActiveRead();

      const current = threads.find(
        thread => thread.key === activeKey
      );

      if (current) current.unread_count = 0;

      renderThreads();

      if (!quiet) alertBox.hidden = true;
    } catch (error) {
      if (!quiet) {
        alertBox.hidden = false;
        alertBox.textContent =
          error.message ||
          "Messages could not be loaded.";
      }
    }
  }

  function stopRealtime() {
    if (realtimeChannel) {
      const channel = realtimeChannel;
      realtimeChannel = null;

      if (activeThread?.kind === "inquiry") {
        api.unsubscribeRealtimeChannel(channel);
      } else {
        api.unsubscribeBookingMessages(channel);
      }
    }

    clearInterval(fallbackTimer);
    clearTimeout(reconnectTimer);

    fallbackTimer = null;
    reconnectTimer = null;
  }

  function scheduleReconnect(key) {
    if (
      !key ||
      reconnectTimer ||
      !navigator.onLine
    ) return;

    const delay = Math.min(
      30000,
      1500 * (2 ** reconnectAttempt)
    );

    reconnectAttempt += 1;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;

      if (activeKey === key) {
        startRealtime(activeThread);
      }
    }, delay);
  }

  function startRealtime(thread) {
    stopRealtime();

    if (!thread) return;

    let channel = null;

    const onChange = async payload => {
      await Promise.all([
        refreshMessages({ quiet: true }),
        loadThreads({
          keepSelection: true,
          quiet: true
        })
      ]);

      const incoming = payload?.new;

      if (
        incoming?.sender_id &&
        incoming.sender_id !== currentUser.id &&
        document.hidden &&
        navigator.vibrate
      ) {
        try {
          navigator.vibrate(100);
        } catch {}
      }
    };

    const onStatus = status => {
      if (realtimeChannel !== channel) return;

      if (status === "SUBSCRIBED") {
        reconnectAttempt = 0;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      } else if (
        [
          "CHANNEL_ERROR",
          "TIMED_OUT",
          "CLOSED"
        ].includes(status)
      ) {
        scheduleReconnect(thread.key);
      }
    };

    channel =
      thread.kind === "inquiry"
        ? api.subscribeInquiryMessages(
            thread.inquiry_id,
            onChange,
            onStatus
          )
        : api.subscribeBookingMessages(
            thread.booking_id,
            onChange,
            onStatus
          );

    realtimeChannel = channel;

    fallbackTimer = setInterval(
      () => refreshMessages({ quiet: true }),
      20000
    );
  }

  async function selectThread(key) {
    const thread = threads.find(
      item => item.key === key
    );

    if (!thread) return;

    activeKey = key;
    activeThread = thread;

    const nextUrl =
      thread.kind === "inquiry"
        ? `messages.html?inquiry=${encodeURIComponent(
            thread.inquiry_id
          )}`
        : `messages.html?booking=${encodeURIComponent(
            thread.booking_id
          )}`;

    history.replaceState(null, "", nextUrl);

    empty.hidden = true;
    panel.hidden = false;

    updateConversationHeader(thread);
    renderThreads();

    await refreshMessages();
    startRealtime(thread);
  }

  async function loadThreads({
    keepSelection = false,
    quiet = false
  } = {}) {
    try {
      const [bookingResult, inquiryResult] =
        await Promise.allSettled([
          api.getMessageThreads(),
          api.getInquiryThreads()
        ]);

      const bookingThreads =
        bookingResult.status === "fulfilled"
          ? bookingResult.value.map(
              normalizeBookingThread
            )
          : [];

      const inquiryThreads =
        inquiryResult.status === "fulfilled"
          ? inquiryResult.value.map(
              normalizeInquiryThread
            )
          : [];

      threads = [
        ...inquiryThreads,
        ...bookingThreads
      ].sort((a, b) =>
        new Date(
          b.last_message_at ||
          b.created_at ||
          0
        ) -
        new Date(
          a.last_message_at ||
          a.created_at ||
          0
        )
      );

      if (
        activeKey &&
        keepSelection
      ) {
        const updated = threads.find(
          thread => thread.key === activeKey
        );

        if (updated) {
          activeThread = updated;
          updateConversationHeader(updated);
        }
      }

      renderThreads();

      const params =
        new URLSearchParams(location.search);

      const requestedInquiry =
        params.get("inquiry");

      const requestedBooking =
        params.get("booking");

      const requestedKey =
        requestedInquiry
          ? keyFor("inquiry", requestedInquiry)
          : requestedBooking
            ? keyFor(
                "booking",
                requestedBooking
              )
            : null;

      const nextKey =
        keepSelection && activeKey
          ? activeKey
          : requestedKey &&
              threads.some(
                thread =>
                  thread.key === requestedKey
              )
            ? requestedKey
            : null;

      if (
        nextKey &&
        nextKey !== activeKey
      ) {
        await selectThread(nextKey);
      }

      if (
        !nextKey &&
        !activeKey &&
        threads.length === 1
      ) {
        await selectThread(threads[0].key);
      }

      if (!quiet) alertBox.hidden = true;

      if (
        bookingResult.status === "rejected" &&
        inquiryResult.status === "rejected"
      ) {
        throw bookingResult.reason ||
          inquiryResult.reason;
      }
    } catch (error) {
      if (!quiet) {
        alertBox.hidden = false;
        alertBox.textContent =
          error.message ||
          "Conversations could not be loaded.";
      }
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (
      !activeThread ||
      !body.value.trim()
    ) return;

    try {
      sendButton.disabled = true;

      if (activeThread.kind === "inquiry") {
        await api.sendInquiryMessage(
          activeThread.inquiry_id,
          body.value
        );
      } else {
        await api.sendBookingMessage(
          activeThread.booking_id,
          body.value
        );
      }

      body.value = "";

      document.querySelector(
        "#message-count"
      ).textContent = "0";

      await Promise.all([
        refreshMessages({ quiet: true }),
        loadThreads({
          keepSelection: true,
          quiet: true
        })
      ]);

      body.focus();
    } catch (error) {
      alertBox.hidden = false;
      alertBox.textContent =
        error.message ||
        "The message could not be sent.";
    } finally {
      sendButton.disabled =
        !activeThread?.can_message;
    }
  });

  body.addEventListener("input", () => {
    document.querySelector(
      "#message-count"
    ).textContent =
      String(body.value.length);
  });

  closeInquiryButton.addEventListener(
    "click",
    async () => {
      if (
        activeThread?.kind !== "inquiry" ||
        activeThread.status !== "open"
      ) return;

      const confirmed = confirm(
        "Close this inquiry? The conversation will become read-only."
      );

      if (!confirmed) return;

      try {
        closeInquiryButton.disabled = true;

        await api.closeTutorInquiry(
          activeThread.inquiry_id
        );

        await loadThreads({
          keepSelection: true
        });

        await refreshMessages({
          quiet: true
        });

        window.Tuto.toast("Inquiry closed.");
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent =
          error.message ||
          "The inquiry could not be closed.";
      } finally {
        closeInquiryButton.disabled = false;
      }
    }
  );

  reportButton.addEventListener(
    "click",
    async () => {
      if (!activeThread) return;

      const reason = prompt(
        "Brief reason for the report:",
        "Safety or conduct concern"
      );

      if (!reason) return;

      const details =
        prompt(
          "Add details for the administrator. Do not include passwords or payment credentials.",
          ""
        ) || "";

      try {
        reportButton.disabled = true;

        if (activeThread.kind === "inquiry") {
          await api.reportInquiryConversation(
            activeThread.inquiry_id,
            null,
            reason,
            details
          );
        } else {
          await api.reportConversation(
            activeThread.booking_id,
            null,
            reason,
            details
          );
        }

        window.Tuto.toast(
          "Report submitted to TutoDemy."
        );
      } catch (error) {
        alertBox.hidden = false;
        alertBox.textContent =
          error.message ||
          "The report could not be submitted.";
      } finally {
        reportButton.disabled = false;
      }
    }
  );

  document.querySelector(
    "#refresh-threads"
  ).addEventListener(
    "click",
    () => loadThreads({
      keepSelection: true
    })
  );

  window.addEventListener(
    "tutodemy-live-notification",
    event => {
      const item =
        event.detail?.notification;

      if (!item?.notification_type) return;

      clearTimeout(realtimeRefreshTimer);

      realtimeRefreshTimer =
        setTimeout(async () => {
          const type =
            String(item.notification_type);

          if (
            type === "new_inquiry" ||
            type === "new_inquiry_message"
          ) {
            if (
              activeThread?.kind === "inquiry" &&
              String(item.booking_id) ===
                String(activeThread.inquiry_id)
            ) {
              await refreshMessages({
                quiet: true
              });
            }

            await loadThreads({
              keepSelection: true,
              quiet: true
            });

            return;
          }

          if (type === "new_message") {
            if (
              activeThread?.kind === "booking" &&
              item.booking_id ===
                activeThread.booking_id
            ) {
              await refreshMessages({
                quiet: true
              });
            }

            await loadThreads({
              keepSelection: true,
              quiet: true
            });

            return;
          }

          if (
            type.startsWith("booking_") ||
            type.startsWith("payment_") ||
            type === "session_delivered"
          ) {
            await loadThreads({
              keepSelection: true,
              quiet: true
            });
          }
        }, 180);
    }
  );

  window.addEventListener("online", () => {
    if (activeThread) {
      startRealtime(activeThread);
    }

    loadThreads({
      keepSelection: true,
      quiet: true
    });
  });

  window.addEventListener(
    "beforeunload",
    () => {
      clearTimeout(realtimeRefreshTimer);
      stopRealtime();
    }
  );

  try {
    if (!api.isReady()) {
      throw new Error(
        "Messages are temporarily unavailable."
      );
    }

    app.hidden = false;
    await loadThreads();
  } catch (error) {
    alertBox.hidden = false;
    alertBox.textContent =
      error.message ||
      "Messages could not be opened.";
  }
});
