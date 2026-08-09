document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const active = document.body.dataset.page || "";
  const params = new URLSearchParams(location.search);
  const ROLE_VIEW_KEY = "tutodemyPreferredWorkspace";
  let roleContext = {
    accountRole: "guest",
    view: "public",
    isAdmin: false,
    isTutorAccount: false,
    tutorStatus: null,
    publicPreview: false,
    profile: null,
    tutorProfile: null
  };

  const isActive = (...pages) => pages.includes(active) ? "active" : "";
  const currentAdminTab = () => params.get("tab") || "overview";

  function practiceDropdown(label = "Practice & Reviewers") {
    const practiceActive = ["exams", "practice", "dost", "reviewers", "reviewer"].includes(active);
    return `
      <div class="nav-dropdown ${practiceActive ? "active" : ""}">
        <button class="nav-dropdown-toggle ${practiceActive ? "active" : ""}" type="button" aria-expanded="false" aria-haspopup="true">
          ${label} <span aria-hidden="true">⌄</span>
        </button>
        <div class="nav-submenu" aria-label="${label} submenu">
          <a href="exams.html" class="${isActive("exams")}">All Practice Hubs</a>
          <a href="practice.html" class="${isActive("practice")}">UPCAT & CET Practice</a>
          <a href="dost-sei.html" class="${isActive("dost")}">DOST-SEI Practice</a>
          <a href="reviewers.html" class="${isActive("reviewers", "reviewer")}">Academic Reviewers</a>
        </div>
      </div>`;
  }

  function publicNavigation() {
    const tutorActive = ["tutoring", "for-tutors", "tutor-profile", "tutor-terms"].includes(active);
    return [
      `<a href="index.html" class="${isActive("home")}">Home</a>`,
      practiceDropdown("Exam Preparation"),
      `<a href="tutoring.html" class="${isActive("tutoring", "tutor-profile")}">Find a Tutor</a>`,
      `<a href="for-tutors.html" class="${isActive("for-tutors")}">Become a Tutor</a>`,
      `<a href="about.html" class="${isActive("about")}">About</a>`
    ].join("");
  }

  function learnerNavigation() {
    return [
      `<a href="dashboard.html" class="${isActive("dashboard")}">Dashboard</a>`,
      practiceDropdown(),
      `<a href="tutoring.html" class="${isActive("tutoring", "tutor-profile")}">Find a Tutor</a>`,
      `<a href="bookings.html?role=learner" class="${isActive("bookings")}">My Bookings</a>`,
      `<a href="messages.html" class="${isActive("messages")}">Messages</a>`
    ].join("");
  }

  function tutorNavigation() {
    return [
      `<a href="tutor-dashboard.html" class="${isActive("tutor-dashboard")}">Tutor Dashboard</a>`,
      `<a href="tutor-onboarding.html" class="${isActive("tutor-onboarding")}">Profile & Availability</a>`,
      `<a href="tutor-dashboard.html#booking-requests" class="${isActive("bookings")}">Booking Requests</a>`,
      `<a href="messages.html" class="${isActive("messages")}">Messages</a>`,
      `<a href="tutor-dashboard.html#private-ledger-section" class="${active === "tutor-dashboard" && location.hash === "#private-ledger-section" ? "active" : ""}">Earnings & Payouts</a>`,
      `<a href="tutor-terms.html" class="${isActive("tutor-terms")}">Tutor Guidelines</a>`
    ].join("");
  }

  function adminNavigation() {
    const tab = currentAdminTab();
    return [
      `<a href="admin.html" class="${active === "admin" && currentAdminTab() === "overview" ? "active" : ""}">Overview</a>`,
      `<a href="admin.html?tab=tutors" class="${active === "admin" && params.has("tab") && tab === "tutors" ? "active" : ""}">Tutor Applications</a>`,
      `<a href="admin.html?tab=bookings" class="${active === "admin" && tab === "bookings" ? "active" : ""}">Bookings & Payments</a>`,
      `<a href="admin.html?tab=payouts" class="${active === "admin" && tab === "payouts" ? "active" : ""}">Payouts</a>`,
      `<a href="admin.html?tab=reports" class="${active === "admin" && tab === "reports" ? "active" : ""}">Reports</a>`
    ].join("");
  }

  function rolePresentation(context) {
    if (context.publicPreview) {
      return {
        bodyClass: "role-public role-admin-preview",
        badge: "PUBLIC PREVIEW",
        note: "PUBLIC SITE PREVIEW • You are still signed in as an administrator",
        navigation: publicNavigation(),
        planVisible: true,
        switchLabel: "Return to Admin",
        switchKind: "admin-return"
      };
    }
    if (context.view === "admin") {
      return {
        bodyClass: "role-admin",
        badge: "ADMIN",
        note: "ADMIN CONSOLE • Restricted operational workspace",
        navigation: adminNavigation(),
        planVisible: false,
        switchLabel: "View public site",
        switchKind: "admin-preview"
      };
    }
    if (context.view === "tutor") {
      return {
        bodyClass: "role-tutor",
        badge: context.tutorStatus === "approved" ? "TUTOR" : "TUTOR APPLICANT",
        note: "TUTOR WORKSPACE • Manage your profile, requests, sessions, messages, and payouts",
        navigation: tutorNavigation(),
        planVisible: false,
        switchLabel: "Switch to Learner View",
        switchKind: "learner"
      };
    }
    if (context.view === "learner") {
      return {
        bodyClass: context.isTutorAccount ? "role-learner role-dual-account" : "role-learner",
        badge: context.isTutorAccount ? "LEARNER VIEW" : "LEARNER",
        note: "LEARNER WORKSPACE • Practice, find tutors, and manage your sessions",
        navigation: learnerNavigation(),
        planVisible: true,
        switchLabel: context.isTutorAccount ? "Switch to Tutor View" : "",
        switchKind: context.isTutorAccount ? "tutor" : ""
      };
    }
    return {
      bodyClass: "role-public",
      badge: "",
      note: "UPCAT & CET preparation • DOST-SEI preparation • Admin-approved tutor marketplace",
      navigation: publicNavigation(),
      planVisible: true,
      switchLabel: "",
      switchKind: ""
    };
  }

  function notificationFooter(context) {
    if (context.view === "admin") return `<a href="admin.html?tab=bookings">Admin bookings</a><a href="admin.html?tab=reports">Reports</a>`;
    if (context.view === "tutor") return `<a href="tutor-dashboard.html#booking-requests">Booking requests</a><a href="messages.html">Messages</a>`;
    return `<a href="bookings.html?role=learner">My bookings</a><a href="messages.html">Messages</a>`;
  }

  function footerMarkup(context) {
    if (context.view === "admin" && !context.publicPreview) {
      return `
        <footer class="site-footer role-footer admin-role-footer">
          <div class="container role-footer-grid">
            <div class="footer-brand"><img src="assets/images/wordmark.png" alt="TutoDemy Learning PH"><p>Restricted administrative workspace for tutor approvals, bookings, payments, payouts, and safety reports.</p></div>
            <div><h3>Operations</h3><a href="admin.html?tab=tutors">Tutor applications</a><a href="admin.html?tab=bookings">Bookings & payments</a><a href="admin.html?tab=payouts">Weekly payouts</a><a href="admin.html?tab=reports">Message reports</a></div>
            <div><h3>Account</h3><a href="profile.html">Admin profile</a><a href="index.html?public=1">View public site</a><a href="privacy.html">Privacy notice</a><a href="terms.html">Terms of use</a></div>
          </div>
          <div class="container footer-bottom"><span>© <span data-year></span> TutoDemy Learning PH.</span><span>Authorized access only.</span></div>
        </footer>`;
    }
    if (context.view === "tutor") {
      return `
        <footer class="site-footer role-footer tutor-role-footer">
          <div class="container role-footer-grid">
            <div class="footer-brand"><img src="assets/images/wordmark.png" alt="TutoDemy Learning PH"><p>Your tutor workspace for applications, availability, booking requests, private messages, sessions, and payout records.</p></div>
            <div><h3>Tutor workspace</h3><a href="tutor-dashboard.html">Tutor dashboard</a><a href="tutor-onboarding.html">Profile & availability</a><a href="messages.html">Messages</a><a href="tutor-dashboard.html#private-ledger-section">Earnings & payouts</a></div>
            <div><h3>Support</h3><a href="tutor-terms.html">Tutor guidelines</a><a href="profile.html">Account profile</a><a href="privacy.html">Privacy notice</a><a href="terms.html">Terms of use</a></div>
          </div>
          <div class="container footer-bottom"><span>© <span data-year></span> TutoDemy Learning PH.</span><span>Tutor workspace.</span></div>
        </footer>`;
    }
    if (context.view === "learner") {
      return `
        <footer class="site-footer role-footer learner-role-footer">
          <div class="container role-footer-grid">
            <div class="footer-brand"><img src="assets/images/wordmark.png" alt="TutoDemy Learning PH"><p>Practice for major examinations, use academic reviewers, and connect with admin-approved tutors.</p></div>
            <div><h3>Learn</h3><a href="dashboard.html">Learner dashboard</a><a href="practice.html">UPCAT & CET practice</a><a href="dost-sei.html">DOST-SEI practice</a><a href="reviewers.html">Reviewers</a></div>
            <div><h3>Tutoring</h3><a href="tutoring.html">Find a tutor</a><a href="bookings.html?role=learner">My bookings</a><a href="messages.html">Messages</a><a href="profile.html">My profile</a></div>
          </div>
          <div class="container footer-bottom"><span>© <span data-year></span> TutoDemy Learning PH.</span><span>Learner workspace.</span></div>
        </footer>`;
    }
    return `
      <footer class="site-footer">
        <div class="container footer-grid">
          <div class="footer-brand">
            <img src="assets/images/wordmark.png" alt="TutoDemy Learning PH">
            <p>Original exam preparation, academic reviewers, and an admin-approved tutor marketplace for Filipino learners.</p>
            <div class="footer-badges"><span>Reviewed content</span><span>Supabase accounts</span><span>Approved tutors only</span></div>
          </div>
          <div><h3>Practice</h3><a href="exams.html">CET exam hub</a><a href="practice.html">CET set builder</a><a href="dost-sei.html">DOST-SEI preparation</a><a href="dashboard.html">Dashboard</a></div>
          <div><h3>Tutoring</h3><a href="tutoring.html">Find a tutor</a><a href="for-tutors.html">Become a tutor</a><a href="bookings.html">My bookings</a><a href="messages.html">Booking messages</a><a href="tutor-terms.html">Tutor guidelines</a></div>
          <div><h3>Account</h3><a href="auth.html">Log in or sign up</a><a href="profile.html">My profile</a><a href="privacy.html">Privacy notice</a><a href="terms.html">Terms of use</a></div>
          <div><h3>Project</h3><a href="reviewers.html">Reviewers</a><a href="resources.html">Source policy</a><a href="pricing.html">Access</a><a href="about.html">About</a></div>
        </div>
        <div class="container footer-bottom"><span>© <span data-year></span> TutoDemy Learning PH.</span><span>Study smarter. Grow with guidance.</span></div>
      </footer>`;
  }

  function renderShell(context) {
    const presentation = rolePresentation(context);
    document.body.classList.remove("role-public", "role-learner", "role-tutor", "role-admin", "role-dual-account", "role-admin-preview");
    presentation.bodyClass.split(/\s+/).filter(Boolean).forEach(name => document.body.classList.add(name));

    const header = document.querySelector("#site-header");
    if (header) {
      header.innerHTML = `
        ${context.publicPreview ? `<div class="admin-preview-bar"><span>Administrator previewing the public website</span><a href="admin.html">Return to Admin Console</a></div>` : ""}
        <div class="site-note">${presentation.note}</div>
        <header class="site-header">
          <div class="container nav-wrap">
            <a class="brand" href="${context.view === "admin" ? "admin.html" : context.view === "tutor" ? "tutor-dashboard.html" : context.view === "learner" ? "dashboard.html" : "index.html"}" aria-label="TutoDemy home">
              <img src="assets/images/wordmark.png" alt="TutoDemy Learning PH">
              ${presentation.badge ? `<span class="workspace-badge">${presentation.badge}</span>` : ""}
            </a>
            <button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button>
            <nav class="main-nav" aria-label="${presentation.badge || "Primary"} navigation">${presentation.navigation}</nav>
            <div class="nav-actions">
              ${presentation.switchLabel ? `<button class="role-view-switch" id="role-view-switch" type="button" data-switch-kind="${presentation.switchKind}">${presentation.switchLabel}</button>` : ""}
              ${presentation.planVisible ? `<a class="plan-chip" id="plan-chip" href="pricing.html"><i></i><span>Access</span></a>` : ""}
              <div class="notification-center" id="notification-center" hidden>
                <button class="notification-bell" id="notification-bell" type="button" aria-label="Notifications" aria-haspopup="true" aria-expanded="false" aria-controls="notification-popover">
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span class="notification-badge" id="notification-badge" hidden>0</span>
                </button>
                <section class="notification-popover" id="notification-popover" aria-label="Notifications" hidden>
                  <header class="notification-popover-head">
                    <div><span>ACCOUNT UPDATES</span><h2>Notifications</h2></div>
                    <button class="notification-mark-all" id="notification-mark-all" type="button">Mark all as read</button>
                  </header>
                  <p class="notification-status" id="notification-status" role="status" aria-live="polite">Loading notifications…</p>
                  <div class="notification-list" id="notification-list"></div>
                  <footer class="notification-popover-foot">${notificationFooter(context)}</footer>
                </section>
              </div>
              <a class="auth-chip" id="auth-chip" href="auth.html"><span class="auth-avatar">?</span><span class="auth-label">Log in</span></a>
            </div>
          </div>
        </header>`;
    }

    const footer = document.querySelector("#site-footer");
    if (footer) footer.innerHTML = footerMarkup(context);
    if (context.publicPreview) {
      document.querySelectorAll("#site-header .main-nav a").forEach(link => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("admin.html")) return;
        const url = new URL(href, location.href);
        if (url.origin !== location.origin) return;
        url.searchParams.set("public", "1");
        link.href = `${url.pathname.split("/").pop()}${url.search}${url.hash}`;
      });
    }
    bindHeaderEvents();
    refreshAuthChip(context);
    document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
  }

  function bindHeaderEvents() {
    window.__tutodemyHeaderController?.abort?.();
    const controller = new AbortController();
    window.__tutodemyHeaderController = controller;
    const signal = controller.signal;

    const toggle = document.querySelector(".menu-toggle");
    const nav = document.querySelector(".main-nav");
    toggle?.addEventListener("click", () => {
      const opened = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(opened));
    }, { signal });

    const closeMenus = (except = null) => {
      document.querySelectorAll(".nav-dropdown.open").forEach(dropdown => {
        if (dropdown === except) return;
        dropdown.classList.remove("open");
        dropdown.querySelector(".nav-dropdown-toggle")?.setAttribute("aria-expanded", "false");
      });
    };

    document.querySelectorAll(".nav-dropdown-toggle").forEach(button => {
      button.addEventListener("click", event => {
        event.stopPropagation();
        const dropdown = button.closest(".nav-dropdown");
        const willOpen = !dropdown.classList.contains("open");
        closeMenus(dropdown);
        dropdown.classList.toggle("open", willOpen);
        button.setAttribute("aria-expanded", String(willOpen));
      }, { signal });
    });

    document.addEventListener("click", event => {
      if (!event.target.closest(".nav-dropdown")) closeMenus();
    }, { signal });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMenus();
    }, { signal });

    document.querySelector("#role-view-switch")?.addEventListener("click", handleRoleSwitch, { signal });
  }

  window.Tuto = {
    storage: {
      scopedKey(key) {
        const userId = window.TutoAuth?.getUser?.()?.id;
        return userId ? `tutodemyUser:${userId}:${key}` : key;
      },
      get(key, fallback) {
        try {
          const value = localStorage.getItem(this.scopedKey(key));
          return value === null ? fallback : JSON.parse(value);
        } catch {
          return fallback;
        }
      },
      set(key, value) {
        localStorage.setItem(this.scopedKey(key), JSON.stringify(value));
      },
      remove(key) {
        localStorage.removeItem(this.scopedKey(key));
      }
    },
    getPlan() { return "pro"; },
    setPlan() {
      localStorage.removeItem("tutodemyPlan");
      this.applyPlan();
      window.dispatchEvent(new CustomEvent("tutodemy-plan-change", { detail: { plan: "pro" } }));
    },
    applyPlan() {
      document.body.classList.add("plan-pro");
      document.querySelectorAll("[data-plan-label]").forEach(el => el.textContent = "Open access");
    },
    toast(message) {
      const toast = document.querySelector(".toast");
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(window.__tutoToast);
      window.__tutoToast = setTimeout(() => toast.classList.remove("show"), 3400);
    },
    shuffle(array) {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    escape(text) {
      const div = document.createElement("div");
      div.textContent = String(text ?? "");
      return div.innerHTML;
    },
    money(value) {
      return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value || 0));
    },
    formatTime(seconds) {
      seconds = Math.max(0, Math.floor(seconds));
      const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
      return h ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    },
    getSavedReviewers() { return this.storage.get("tutodemySavedReviewers", []); },
    toggleReviewer(id) {
      const current = this.getSavedReviewers();
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      this.storage.set("tutodemySavedReviewers", next);
      window.TutoCloud?.syncSavedReviewers?.(next).catch(error => console.error("Reviewer sync failed:", error));
      window.dispatchEvent(new CustomEvent("tutodemy-reviewer-change", { detail: { ids: next } }));
      return next.includes(id);
    }
  };

  function initialsFor(user) {
    const name = user?.user_metadata?.full_name || user?.email || "User";
    return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "U";
  }

  function refreshAuthChip(context = roleContext) {
    const chip = document.querySelector("#auth-chip");
    if (!chip) return;
    const configured = window.TutoAuth?.isConfigured?.();
    const user = window.TutoAuth?.getUser?.();
    const avatar = chip.querySelector(".auth-avatar");
    const label = chip.querySelector(".auth-label");

    if (!configured) {
      chip.href = "auth.html";
      avatar.textContent = "⚙";
      label.textContent = "Set up login";
      chip.classList.add("setup");
      return;
    }
    chip.classList.remove("setup");
    if (user) {
      chip.href = context.view === "admin" && !context.publicPreview ? "admin.html" : "profile.html";
      avatar.textContent = initialsFor(user);
      const firstName = user.user_metadata?.full_name?.split(" ")[0] || "Account";
      label.textContent = context.view === "admin" && !context.publicPreview ? "Admin" : firstName;
    } else {
      chip.href = "auth.html";
      avatar.textContent = "↗";
      label.textContent = "Log in";
    }
  }

  function getStoredView(userId) {
    try {
      return localStorage.getItem(`${ROLE_VIEW_KEY}:${userId}`) || "";
    } catch {
      return "";
    }
  }

  function setStoredView(userId, view) {
    try {
      localStorage.setItem(`${ROLE_VIEW_KEY}:${userId}`, view);
    } catch {}
  }

  async function resolveRoleContext() {
    const user = window.TutoAuth?.getUser?.();
    if (!user || !window.TutoMarketplace) {
      return { ...roleContext, accountRole: user ? "learner" : "guest", view: user ? "learner" : "public" };
    }

    const isAdmin = Boolean(window.TutoMarketplace.isAdmin?.() || await window.TutoMarketplace.checkAdmin?.());
    let profile = null;
    let tutorProfile = null;
    try { profile = await window.TutoMarketplace.getMyAccountProfile?.(true); } catch {}
    const isTutorAccount = profile?.role === "tutor";
    if (isTutorAccount) {
      try { tutorProfile = await window.TutoMarketplace.getMyTutorProfile?.(); } catch {}
    }

    const publicPreview = isAdmin && params.get("public") === "1" && active !== "admin";
    let view = "learner";
    if (isAdmin && !publicPreview) view = "admin";
    else if (publicPreview) view = "public";
    else if (isTutorAccount) {
      const requestedView = params.get("view");
      if (["learner", "tutor"].includes(requestedView)) setStoredView(user.id, requestedView);
      if (["tutor-dashboard", "tutor-onboarding"].includes(active)) setStoredView(user.id, "tutor");
      if (active === "dashboard") setStoredView(user.id, "learner");
      view = getStoredView(user.id) || "tutor";
      if (!["learner", "tutor"].includes(view)) view = "tutor";
    }

    return {
      accountRole: isAdmin ? "admin" : isTutorAccount ? "tutor" : "learner",
      view,
      isAdmin,
      isTutorAccount,
      tutorStatus: tutorProfile?.status || null,
      publicPreview,
      profile,
      tutorProfile
    };
  }

  async function handleRoleSwitch(event) {
    const kind = event.currentTarget.dataset.switchKind;
    const user = window.TutoAuth?.getUser?.();
    if (kind === "admin-preview") {
      location.href = "index.html?public=1";
      return;
    }
    if (kind === "admin-return") {
      location.href = "admin.html";
      return;
    }
    if (!user || !roleContext.isTutorAccount) return;
    if (kind === "learner") {
      setStoredView(user.id, "learner");
      location.href = "dashboard.html";
      return;
    }
    if (kind === "tutor") {
      setStoredView(user.id, "tutor");
      location.href = "tutor-dashboard.html";
    }
  }

  function enforceWorkspaceAccess(context) {
    const user = window.TutoAuth?.getUser?.();
    if (active === "admin" && !context.isAdmin) {
      const destination = user ? (context.isTutorAccount ? "tutor-dashboard.html" : "dashboard.html") : `auth.html?next=${encodeURIComponent("admin.html")}`;
      location.replace(destination);
      return false;
    }
    if (active === "tutor-dashboard" && user && !context.isTutorAccount && !context.isAdmin) {
      location.replace("tutor-onboarding.html");
      return false;
    }
    return true;
  }

  async function loadNotifications() {
    if (roleContext.publicPreview || !window.TutoAuth?.getUser?.()) return;
    if (window.TutoNotifications?.init) {
      await window.TutoNotifications.init();
      return;
    }
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-tutodemy-notifications]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "js/notifications.js?v=20260809-role1";
      script.async = true;
      script.dataset.tutodemyNotifications = "true";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.append(script);
    });
    await window.TutoNotifications?.init?.();
  }

  window.Tuto.applyPlan();
  renderShell(roleContext);

  await window.TutoAuth?.ready;
  if (window.TutoMarketplace) await window.TutoMarketplace.ready;
  roleContext = await resolveRoleContext();
  window.TutoRoleUI = {
    getContext: () => ({ ...roleContext }),
    refresh: async () => {
      roleContext = await resolveRoleContext();
      renderShell(roleContext);
      return { ...roleContext };
    },
    switchToLearner: () => handleRoleSwitch({ currentTarget: { dataset: { switchKind: "learner" } } }),
    switchToTutor: () => handleRoleSwitch({ currentTarget: { dataset: { switchKind: "tutor" } } })
  };

  if (!enforceWorkspaceAccess(roleContext)) return;
  renderShell(roleContext);
  loadNotifications().catch(error => console.warn("Notification bell could not be loaded:", error));
  window.dispatchEvent(new CustomEvent("tutodemy-role-ready", { detail: { ...roleContext } }));

  window.addEventListener("tutodemy-auth-change", async () => {
    roleContext = await resolveRoleContext();
    if (!enforceWorkspaceAccess(roleContext)) return;
    renderShell(roleContext);
    loadNotifications().catch(error => console.warn("Notification bell could not be loaded:", error));
    window.dispatchEvent(new CustomEvent("tutodemy-role-ready", { detail: { ...roleContext } }));
  });
});
