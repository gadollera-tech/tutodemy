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

  function browserAlertsEnabled() {
    try { return localStorage.getItem("tutodemyBrowserNotifications") === "enabled"; }
    catch { return false; }
  }

  function updateBrowserNotificationStatus() {
    if (!browserNotificationStatus || !enableBrowserNotifications) return;

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      browserNotificationStatus.textContent = "This browser does not support TutoDemy device alerts.";
      enableBrowserNotifications.disabled = true;
      return;
    }

    if (Notification.permission === "granted" && browserAlertsEnabled()) {
      browserNotificationStatus.textContent = "Enabled on this device.";
      enableBrowserNotifications.textContent = "Enabled";
      enableBrowserNotifications.disabled = true;
      return;
    }

    if (Notification.permission === "denied") {
      browserNotificationStatus.textContent = "Blocked in your browser settings. Allow notifications for tutodemy.net to enable them.";
      enableBrowserNotifications.textContent = "Blocked";
      enableBrowserNotifications.disabled = true;
      return;
    }

    browserNotificationStatus.textContent = "Not enabled on this device yet.";
    enableBrowserNotifications.textContent = "Enable on this device";
    enableBrowserNotifications.disabled = false;
  }

  async function loadNotificationPreferences() {
    updateBrowserNotificationStatus();
    if (!window.TutoMarketplace?.getMyNotificationPreferences) return;
    try {
      const prefs = await window.TutoMarketplace.getMyNotificationPreferences();
      if (emailBookingPref) emailBookingPref.checked = prefs?.email_booking_updates !== false;
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
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        localStorage.setItem("tutodemyBrowserNotifications", "enabled");
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({ type: "TUTODEMY_NOTIFICATION_PERMISSION_READY" });
        window.Tuto?.toast?.("Phone/browser alerts enabled on this device.");
      }
    } catch (error) {
      window.Tuto?.toast?.(error?.message || "Browser notifications could not be enabled.");
    }
    updateBrowserNotificationStatus();
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
    document.querySelector("#account-role-heading").textContent = tutorRole ? "Tutor account" : "Learner / Parent account";
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
