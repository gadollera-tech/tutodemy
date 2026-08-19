document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoAuth?.ready;
  await window.TutoCloud?.ready;

  const form = document.querySelector("#profile-form");
  const status = document.querySelector("#profile-status");
  const syncHeading = document.querySelector("#sync-heading");
  const syncDescription = document.querySelector("#sync-description");
  const syncNow = document.querySelector("#sync-now");
  const cloudBadge = document.querySelector("#profile-cloud-badge");
  const lastSync = document.querySelector("#last-sync");


  const notificationPrefStatus = document.querySelector("#notification-preference-status");
  const emailBookingPref = document.querySelector("#pref-email-bookings");
  const emailMessagePref = document.querySelector("#pref-email-messages");
  const browserNotificationStatus = document.querySelector("#browser-notification-status");
  const enableBrowserNotifications = document.querySelector("#enable-browser-notifications");
  const saveNotificationPreferences = document.querySelector("#save-notification-preferences");

  const VAPID_PUBLIC_KEY = String(window.TUTODEMY_CONFIG?.vapidPublicKey || "").trim();

  function urlBase64ToUint8Array(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from(raw, character => character.charCodeAt(0));
  }

  function webPushSupported() {
    return Boolean(
      window.isSecureContext &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );
  }

  async function currentPushSubscription() {
    if (!webPushSupported()) return null;
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  }

  async function syncExistingPushSubscription() {
    if (!webPushSupported() || Notification.permission !== "granted") return null;

    const subscription = await currentPushSubscription();
    if (!subscription) return null;

    if (window.TutoMarketplace?.saveMyWebPushSubscription) {
      await window.TutoMarketplace.saveMyWebPushSubscription(subscription);
    }
    return subscription;
  }

  async function updateBrowserNotificationStatus() {
    if (!browserNotificationStatus || !enableBrowserNotifications) return;
    const pushDeviceCard = document.querySelector("#push-device-card");
    pushDeviceCard?.classList.remove("is-active", "needs-activation", "is-blocked", "is-unavailable");

    if (!webPushSupported()) {
      browserNotificationStatus.textContent = window.isSecureContext
        ? "This browser does not support Web Push notifications."
        : "Web Push requires a secure HTTPS connection.";
      enableBrowserNotifications.textContent = "Unavailable";
      enableBrowserNotifications.disabled = true;
      enableBrowserNotifications.dataset.pushState = "unavailable";
      pushDeviceCard?.classList.add("is-unavailable");
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      browserNotificationStatus.textContent = "TutoDemy Web Push is not configured yet.";
      enableBrowserNotifications.textContent = "Unavailable";
      enableBrowserNotifications.disabled = true;
      enableBrowserNotifications.dataset.pushState = "unavailable";
      pushDeviceCard?.classList.add("is-unavailable");
      return;
    }

    if (Notification.permission === "denied") {
      browserNotificationStatus.textContent = "Notifications are blocked. Allow them for tutodemy.net, then reload.";
      enableBrowserNotifications.textContent = "Blocked by browser";
      enableBrowserNotifications.disabled = true;
      enableBrowserNotifications.dataset.pushState = "blocked";
      pushDeviceCard?.classList.add("is-blocked");
      return;
    }

    try {
      const subscription = await currentPushSubscription();

      if (Notification.permission === "granted" && subscription) {
        browserNotificationStatus.textContent = "ON — true phone/browser push is active on this device.";
        enableBrowserNotifications.textContent = "Turn off on this device";
        enableBrowserNotifications.disabled = false;
        enableBrowserNotifications.dataset.pushState = "enabled";
        pushDeviceCard?.classList.add("is-active");
        return;
      }

      browserNotificationStatus.textContent = Notification.permission === "granted"
        ? "Tap once to activate phone alerts."
        : "Activate phone alerts on this device.";
      enableBrowserNotifications.textContent = "Turn on phone alerts";
      enableBrowserNotifications.disabled = false;
      enableBrowserNotifications.dataset.pushState = "disabled";
      pushDeviceCard?.classList.add("needs-activation");
    } catch (error) {
      console.warn("Could not inspect Web Push subscription:", error);
      browserNotificationStatus.textContent = "Could not confirm this device's push subscription.";
      enableBrowserNotifications.textContent = "Try turning on";
      enableBrowserNotifications.disabled = false;
      enableBrowserNotifications.dataset.pushState = "disabled";
      pushDeviceCard?.classList.add("needs-activation");
    }
  }

  async function enableTrueWebPush() {
    if (!webPushSupported()) throw new Error("Web Push is not supported on this device.");
    if (!VAPID_PUBLIC_KEY) throw new Error("The TutoDemy Web Push public key is missing.");

    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error(
        permission === "denied"
          ? "Notifications were blocked. Allow them for tutodemy.net in browser settings."
          : "Notification permission was not granted."
      );
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    if (!window.TutoMarketplace?.saveMyWebPushSubscription) {
      throw new Error("The TutoDemy push subscription service is unavailable.");
    }

    await window.TutoMarketplace.saveMyWebPushSubscription(subscription);
    return subscription;
  }

  async function disableTrueWebPush() {
    if (!webPushSupported()) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;

    if (window.TutoMarketplace?.deleteMyWebPushSubscription) {
      await window.TutoMarketplace.deleteMyWebPushSubscription(endpoint);
    }

    const unsubscribed = await subscription.unsubscribe();
    if (!unsubscribed) throw new Error("The browser could not remove this push subscription.");
  }

  async function loadNotificationPreferences() {
    // Booking email is the account default. The backend also treats a missing
    // preference row as email_booking_updates = true.
    if (emailBookingPref && !emailBookingPref.dataset.loadedFromServer) {
      emailBookingPref.checked = true;
    }

    await updateBrowserNotificationStatus();

    if (Notification.permission === "granted") {
      try {
        await syncExistingPushSubscription();
        await updateBrowserNotificationStatus();
      } catch (error) {
        console.warn("Existing Web Push subscription could not be synced:", error);
      }
    }

    if (!window.TutoMarketplace?.getMyNotificationPreferences) return;
    try {
      const prefs = await window.TutoMarketplace.getMyNotificationPreferences();
      if (emailBookingPref) {
        emailBookingPref.checked = prefs?.email_booking_updates !== false;
        emailBookingPref.dataset.loadedFromServer = "true";
      }
      if (emailMessagePref) emailMessagePref.checked = Boolean(prefs?.email_message_updates);
    } catch (error) {
      console.warn("Notification preferences could not be loaded:", error);
      if (notificationPrefStatus) {
        notificationPrefStatus.textContent = error?.message || "Notification preferences are not enabled yet.";
        notificationPrefStatus.classList.add("error");
      }
    }
  }

  enableBrowserNotifications?.addEventListener("click", async () => {
    const currentState = enableBrowserNotifications.dataset.pushState;
    enableBrowserNotifications.disabled = true;

    try {
      if (currentState === "enabled") {
        await disableTrueWebPush();
        if (notificationPrefStatus) {
          notificationPrefStatus.textContent = "Phone/browser push disabled on this device.";
          notificationPrefStatus.classList.remove("error");
        }
        window.Tuto?.toast?.("Phone alerts turned off on this device.");
      } else {
        await enableTrueWebPush();
        if (notificationPrefStatus) {
          notificationPrefStatus.textContent = "Phone alerts are on for this device.";
          notificationPrefStatus.classList.remove("error");
        }
        window.Tuto?.toast?.("Phone alerts are ON for this device.");
      }
    } catch (error) {
      if (notificationPrefStatus) {
        notificationPrefStatus.textContent = error?.message || "Phone/browser push could not be updated.";
        notificationPrefStatus.classList.add("error");
      }
      window.Tuto?.toast?.(error?.message || "Phone/browser push could not be updated.");
    } finally {
      await updateBrowserNotificationStatus();
    }
  });

  saveNotificationPreferences?.addEventListener("click", async () => {
    if (!window.TutoMarketplace?.saveMyNotificationPreferences) return;
    try {
      saveNotificationPreferences.disabled = true;
      if (notificationPrefStatus) {
        notificationPrefStatus.textContent = "Saving notification preferences…";
        notificationPrefStatus.classList.remove("error");
      }
      await window.TutoMarketplace.saveMyNotificationPreferences({
        email_booking_updates: Boolean(emailBookingPref?.checked),
        email_message_updates: Boolean(emailMessagePref?.checked)
      });
      if (notificationPrefStatus) notificationPrefStatus.textContent = "Notification preferences saved.";
      window.Tuto?.toast?.("Notification preferences saved.");
    } catch (error) {
      if (notificationPrefStatus) {
        notificationPrefStatus.textContent = error?.message || "Notification preferences could not be saved.";
        notificationPrefStatus.classList.add("error");
      }
    } finally {
      saveNotificationPreferences.disabled = false;
    }
  });

  const configured = window.TutoAuth?.isConfigured?.();
  const user = window.TutoAuth?.getUser?.();

  const setFormDisabled = disabled => {
    form.querySelectorAll("input,select,button").forEach(element => element.disabled = disabled);
  };

  if (!configured) {
    document.querySelector("#account-heading").textContent = "Account service is temporarily unavailable";
    document.querySelector("#account-email").textContent = "Please try again later.";
    cloudBadge.textContent = "Unavailable";
    syncHeading.textContent = "Cloud sync unavailable";
    syncDescription.textContent = "Your local learning progress remains available on this device.";
    syncNow.disabled = true;
    setFormDisabled(true);
    document.querySelector("#logout-button").textContent = "Return to home";
    document.querySelector("#logout-button").addEventListener("click", () => location.href = "index.html");
    refreshStats();
    return;
  }

  if (!user) {
    location.replace("auth.html");
    return;
  }

  function initials(name) {
    return String(name || user.email || "User").split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]?.toUpperCase()).join("") || "U";
  }

  async function loadProfile() {
    cloudBadge.textContent = "Loading…";
    let profile = null;
    try {
      profile = await window.TutoCloud.getProfile();
    } catch (error) {
      console.error(error);
      status.textContent = "The profile could not be loaded from the cloud. You can still use local progress.";
      status.classList.add("error");
    }

    const fallback = user.user_metadata || {};
    const provinceSelect = document.querySelector("#profile-province");
    window.TutoPH?.populateProvinceSelect?.(provinceSelect, profile?.province || fallback.province || "");
    const values = {
      full_name: profile?.full_name || fallback.full_name || "",
      student_level: profile?.student_level || fallback.student_level || "",
      target_exam: profile?.target_exam || fallback.target_exam || "",
      school: profile?.school || "",
      province: profile?.province || fallback.province || "",
      city: profile?.city || fallback.city || "",
      share_location_insights: Boolean(profile?.share_location_insights ?? fallback.share_location_insights ?? false),
      avatar_url: profile?.avatar_url || fallback.avatar_url || "",
      role: profile?.role || fallback.role || "learner"
    };

    Object.entries(values).forEach(([name, value]) => {
      const field = form.elements[name];
      if (!field) return;
      if (field.type === "checkbox") field.checked = Boolean(value);
      else field.value = value || "";
    });

    document.querySelector("#account-heading").textContent = values.full_name ? `Hi, ${values.full_name.split(" ")[0]}!` : "My TutoDemy account";
    document.querySelector("#account-email").textContent = user.email || "Authenticated learner";
    document.querySelector("#account-avatar").textContent = initials(values.full_name);
    const tutorRole = values.role === "tutor";
    document.querySelector("#account-role-heading").textContent = tutorRole ? "Tutor account" : "Student / Parent account";
    document.querySelector("#account-role-description").textContent = tutorRole ? "Manage your tutor application, bookings, commission tier, and earnings." : "Book approved tutors and save learning progress.";
    document.querySelector("#account-role-actions").innerHTML = tutorRole
      ? `<a class="button full" href="tutor-dashboard.html">Open tutor dashboard</a><a class="button button-outline full" href="tutor-onboarding.html">Edit tutor profile</a><a class="button button-outline full" href="bookings.html">Bookings as learner</a>`
      : `<a class="button full" href="bookings.html">My tutor bookings</a><a class="button button-outline full" href="tutor-onboarding.html">Apply as a tutor</a>`;
    cloudBadge.textContent = "Cloud connected";
    cloudBadge.classList.add("connected");
  }

  function refreshStats() {
    const attempts = window.Tuto?.storage?.get("tutodemyHistory", []) || [];
    const reviewers = window.Tuto?.getSavedReviewers?.() || [];
    const active = window.Tuto?.storage?.get("tutodemyActiveSession", null);
    document.querySelector("#sync-attempts").textContent = attempts.length;
    document.querySelector("#sync-reviewers").textContent = reviewers.length;
    document.querySelector("#sync-active").textContent = active ? "Yes" : "No";
  }

  function updateSyncStatus(detail = window.TutoCloud.getStatus()) {
    if (detail.status === "syncing" || detail.syncing) {
      syncHeading.textContent = "Syncing…";
      syncDescription.textContent = "Uploading local changes and downloading your latest cloud progress.";
      syncNow.disabled = true;
      return;
    }
    syncNow.disabled = false;
    if (detail.status === "error" || detail.lastError) {
      syncHeading.textContent = "Local copy is safe";
      syncDescription.textContent = detail.error || detail.lastError || "Cloud sync failed. Try again when the connection is stable.";
      return;
    }
    syncHeading.textContent = "Progress is linked to your account";
    syncDescription.textContent = "Attempts, saved reviewers, unfinished exams, and tutor inquiries can sync across devices.";
    const at = detail.at || detail.lastSyncAt;
    if (at) lastSync.textContent = `Last sync: ${new Date(at).toLocaleString()}`;
    refreshStats();
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    status.textContent = "Saving profile…";
    status.classList.remove("error");
    const values = Object.fromEntries(new FormData(form).entries());
    values.share_location_insights = Boolean(form.elements.share_location_insights?.checked);
    try {
      const profile = await window.TutoCloud.upsertProfile(values);
      await window.TutoSupabase.client.auth.updateUser({
        data: {
          full_name: profile.full_name,
          student_level: profile.student_level,
          target_exam: profile.target_exam,
          province: profile.province,
          city: profile.city,
          share_location_insights: profile.share_location_insights,
          avatar_url: profile.avatar_url
        }
      });
      status.textContent = "Profile saved.";
      document.querySelector("#account-heading").textContent = profile.full_name ? `Hi, ${profile.full_name.split(" ")[0]}!` : "My TutoDemy account";
      document.querySelector("#account-avatar").textContent = initials(profile.full_name);
      window.Tuto.toast("Profile saved to your account.");
    } catch (error) {
      status.textContent = error.message || "Profile could not be saved.";
      status.classList.add("error");
    }
  });

  syncNow.addEventListener("click", async () => {
    await window.TutoCloud.syncAll();
    updateSyncStatus(window.TutoCloud.getStatus());
    refreshStats();
  });

  document.querySelector("#logout-button").addEventListener("click", async () => {
    try {
      await window.TutoCloud.syncAll({ silent: true });
      await window.TutoAuth.signOut();
      location.replace("auth.html");
    } catch (error) {
      window.Tuto.toast(error.message || "Could not log out.");
    }
  });

  document.querySelector("#export-data").addEventListener("click", () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: Object.fromEntries(new FormData(form).entries()),
      attempts: window.Tuto.storage.get("tutodemyHistory", []),
      savedReviewers: window.Tuto.getSavedReviewers(),
      activeSession: window.Tuto.storage.get("tutodemyActiveSession", null),
      tutorInquiries: window.Tuto.storage.get("tutodemyTutorInquiries", []),
      accountRole: document.querySelector("#account-role-heading")?.textContent || ""
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tutodemy-data-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  window.addEventListener("tutodemy-sync-change", event => updateSyncStatus(event.detail));

  await loadProfile();
  await loadNotificationPreferences();
  updateSyncStatus(window.TutoCloud.getStatus());
  refreshStats();
});
