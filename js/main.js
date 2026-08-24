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

  function practiceDropdown(label = "Practice") {
    const practiceActive = ["exams", "practice", "dost", "reviewers", "reviewer"].includes(active);
    return `
      <div class="nav-dropdown ${practiceActive ? "active" : ""}">
        <button class="nav-dropdown-toggle ${practiceActive ? "active" : ""}" type="button" aria-expanded="false" aria-haspopup="true">
          ${label} <span aria-hidden="true">⌄</span>
        </button>
        <div class="nav-submenu" aria-label="${label} submenu">
          <a href="exams.html" class="${isActive("exams")}">Practice Hub</a>
          <a href="practice.html" class="${isActive("practice")}">CET Practice</a>
          <a href="dost-sei.html" class="${isActive("dost")}">DOST-SEI</a>
          <a href="reviewers.html" class="${isActive("reviewers", "reviewer")}">Reviewers</a>
        </div>
      </div>`;
  }

  function publicNavIcon(name) {
    const common =
      `viewBox="0 0 24 24" aria-hidden="true" fill="none" ` +
      `stroke="currentColor" stroke-width="1.9" ` +
      `stroke-linecap="round" stroke-linejoin="round"`;

    const icons = {
      home:
        `<svg ${common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
      practice:
        `<svg ${common}><path d="M4 19.5V6.8A2.8 2.8 0 0 1 6.8 4H11v15.5H6.8A2.8 2.8 0 0 0 4 22"/><path d="M20 19.5V6.8A2.8 2.8 0 0 0 17.2 4H13v15.5h4.2A2.8 2.8 0 0 1 20 22"/></svg>`,
      tutors:
        `<svg ${common}><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.1 2.5-5 5.5-5s4.9 1.9 5.5 5"/><path d="M16 5.5a3 3 0 0 1 0 5.8"/><path d="M16.5 14c2.2.4 3.6 2 4 4.2"/></svg>`,
      teach:
        `<svg ${common}><path d="M3 8.5 12 4l9 4.5-9 4.5z"/><path d="M7 11v5.5c3 2 7 2 10 0V11"/><path d="M21 9v6"/></svg>`,
      about:
        `<svg ${common}><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/></svg>`,
      hub:
        `<svg ${common}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>`,
      cet:
        `<svg ${common}><path d="M7 3h10v18H7z"/><path d="M9.5 7h5M9.5 11h5M9.5 15h3"/></svg>`,
      dost:
        `<svg ${common}><path d="M9 3h6"/><path d="M10 3v5l-5 9a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 17l-5-9V3"/><path d="M8 15h8"/></svg>`,
      reviewers:
        `<svg ${common}><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`
    };

    return icons[name] || icons.home;
  }

  function publicNavigation() {
    const practiceActive =
      ["exams", "practice", "dost", "reviewers", "reviewer"]
        .includes(active);

    return [
      `<a href="index.html"
          class="public-nav-item ${isActive("home")}">
        <span class="public-nav-icon">${publicNavIcon("home")}</span>
        <span>Home</span>
      </a>`,

      `<div class="nav-dropdown public-nav-dropdown ${
        practiceActive ? "active" : ""
      }">
        <button
          class="nav-dropdown-toggle public-nav-item ${
            practiceActive ? "active" : ""
          }"
          type="button"
          aria-expanded="false"
          aria-haspopup="true">
          <span class="public-nav-icon">${publicNavIcon("practice")}</span>
          <span>Practice</span>
          <span class="public-nav-chevron" aria-hidden="true">⌄</span>
        </button>

        <div class="nav-submenu public-nav-submenu"
             aria-label="Practice submenu">
          <a href="exams.html" class="${isActive("exams")}">
            <span class="public-submenu-icon">${publicNavIcon("hub")}</span>
            <span><b>Practice Hub</b><small>Build a practice set</small></span>
          </a>

          <a href="practice.html" class="${isActive("practice")}">
            <span class="public-submenu-icon">${publicNavIcon("cet")}</span>
            <span><b>CET Practice</b><small>UPCAT and entrance exam practice</small></span>
          </a>

          <a href="dost-sei.html" class="${isActive("dost")}">
            <span class="public-submenu-icon">${publicNavIcon("dost")}</span>
            <span><b>DOST-SEI</b><small>Scholarship exam preparation</small></span>
          </a>

          <a href="reviewers.html"
             class="${isActive("reviewers", "reviewer")}">
            <span class="public-submenu-icon">${publicNavIcon("reviewers")}</span>
            <span><b>Reviewers</b><small>Browse study materials</small></span>
          </a>
        </div>
      </div>`,

      `<a href="tutoring.html"
          class="public-nav-item ${isActive("tutoring", "tutor-profile")}">
        <span class="public-nav-icon">${publicNavIcon("tutors")}</span>
        <span>Tutors</span>
      </a>`,

      `<a href="for-tutors.html"
          class="public-nav-item ${isActive("for-tutors")}">
        <span class="public-nav-icon">${publicNavIcon("teach")}</span>
        <span>For Tutors</span>
      </a>`,

      `<a href="about.html"
          class="public-nav-item ${isActive("about")}">
        <span class="public-nav-icon">${publicNavIcon("about")}</span>
        <span>About</span>
      </a>`,

      `<div class="mobile-public-nav-actions" aria-label="Account and access">
        <a class="mobile-nav-action mobile-nav-access" href="pricing.html">Access</a>
        <a class="mobile-nav-action mobile-nav-login" href="auth.html">Log in</a>
      </div>`
    ].join("");
  }

  function learnerNavigation() {
    return [
      `<a href="dashboard.html" class="workspace-nav-home ${isActive("dashboard")}">Student Dashboard</a>`,
      practiceDropdown("Practice"),
      `<a href="tutoring.html" class="${isActive("tutoring", "tutor-profile")}">Tutors</a>`,
      `<a href="bookings.html?role=learner" class="${isActive("bookings")}">Bookings</a>`,
      `<a href="messages.html" class="${isActive("messages")}">Messages</a>`
    ].join("");
  }

  function tutorNavigation(context = roleContext) {
    const approved = context.tutorStatus === "approved";

    if (!approved) {
      return [
        `<a href="tutor-dashboard.html" class="workspace-nav-home ${isActive("tutor-dashboard")}">Tutor Dashboard</a>`,
        `<a href="tutor-onboarding.html" class="${isActive("tutor-onboarding")}">Profile</a>`,
        `<a href="tutor-terms.html" class="${isActive("tutor-terms")}">Guidelines</a>`
      ].join("");
    }

    return [
      `<a href="tutor-dashboard.html" class="workspace-nav-home ${isActive("tutor-dashboard")}">Tutor Dashboard</a>`,
      `<a href="tutor-onboarding.html" class="${isActive("tutor-onboarding")}">Profile</a>`,
      `<a href="tutor-dashboard.html#booking-requests">Bookings</a>`,
      `<a href="messages.html" class="${isActive("messages")}">Messages</a>`,
      `<a href="tutor-dashboard.html#private-ledger-section">Payouts</a>`
    ].join("");
  }

  function adminNavigation() {
    const tab = currentAdminTab();

    return [
      `<a href="admin.html" class="workspace-nav-home ${active === "admin" && tab === "overview" ? "active" : ""}">Admin Dashboard</a>`,
      `<a href="admin.html?tab=users" class="${active === "admin" && tab === "users" ? "active" : ""}">Users</a>`,
      `<a href="admin.html?tab=tutors" class="${active === "admin" && tab === "tutors" ? "active" : ""}">Tutors</a>`,
      `<a href="admin.html?tab=bookings" class="${active === "admin" && tab === "bookings" ? "active" : ""}">Payments</a>`,
      `<a href="admin.html?tab=finance" class="${active === "admin" && tab === "finance" ? "active" : ""}">Finance</a>`,
      `<a href="admin.html?tab=payouts" class="${active === "admin" && tab === "payouts" ? "active" : ""}">Payouts</a>`,
      `<a href="admin.html?tab=reports" class="${active === "admin" && tab === "reports" ? "active" : ""}">Reports</a>`
    ].join("");
  }

  function rolePresentation(context) {
    if (context.publicPreview) {
      return {
        bodyClass: "role-public role-admin-preview",
        badge: "PREVIEW",
        note: "Public site preview",
        navigation: publicNavigation(),
        planVisible: true,
        switchLabel: "Admin Dashboard",
        switchKind: "admin-return"
      };
    }
    if (context.view === "admin") {
      return {
        bodyClass: "role-admin",
        badge: "ADMIN",
        note: "Admin workspace",
        navigation: adminNavigation(),
        planVisible: false,
        switchLabel: "Public Site",
        switchKind: "admin-preview"
      };
    }
    if (context.view === "tutor") {
      const approved = context.tutorStatus === "approved";
      return {
        bodyClass: approved ? "role-tutor" : "role-tutor role-tutor-applicant",
        badge: "TUTOR",
        note: approved ? "Tutor workspace" : "Tutor application",
        navigation: tutorNavigation(context),
        planVisible: false,
        switchLabel: "Student View",
        switchKind: "learner"
      };
    }
    if (context.view === "learner") {
      return {
        bodyClass: context.isTutorAccount ? "role-learner role-dual-account" : "role-learner",
        badge: "STUDENT",
        note: "Student workspace",
        navigation: learnerNavigation(),
        planVisible: true,
        switchLabel: context.isTutorAccount ? "Tutor View" : "",
        switchKind: context.isTutorAccount ? "tutor" : ""
      };
    }
    return {
      bodyClass: "role-public",
      badge: "",
      note: "Practice and tutoring",
      navigation: publicNavigation(),
      planVisible: true,
      switchLabel: "",
      switchKind: ""
    };
  }


  const workspacePages = new Set([
    "dashboard",
    "exams",
    "practice",
    "dost",
    "reviewers",
    "reviewer",
    "tutoring",
    "tutor-profile",
    "bookings",
    "messages",
    "profile",
    "tutor-dashboard",
    "tutor-onboarding",
    "admin"
  ]);

  function workspaceSidebarEligible(context) {
    return (
      !context.publicPreview &&
      ["learner", "tutor", "admin"].includes(context.view) &&
      workspacePages.has(active)
    );
  }

  function sidebarIcon(name) {
    const common =
      `viewBox="0 0 24 24" aria-hidden="true" fill="none" ` +
      `stroke="currentColor" stroke-width="1.9" ` +
      `stroke-linecap="round" stroke-linejoin="round"`;

    const icons = {
      dashboard:
        `<svg ${common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
      practice:
        `<svg ${common}><path d="M4 19.5V6.8A2.8 2.8 0 0 1 6.8 4H11v15.5H6.8A2.8 2.8 0 0 0 4 22"/><path d="M20 19.5V6.8A2.8 2.8 0 0 0 17.2 4H13v15.5h4.2A2.8 2.8 0 0 1 20 22"/></svg>`,
      tutors:
        `<svg ${common}><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.1 2.5-5 5.5-5s4.9 1.9 5.5 5"/><path d="M16 5.5a3 3 0 0 1 0 5.8"/><path d="M16.5 14c2.2.4 3.6 2 4 4.2"/></svg>`,
      bookings:
        `<svg ${common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m8 15 2 2 5-5"/></svg>`,
      messages:
        `<svg ${common}><path d="M21 15a4 4 0 0 1-4 4H9l-5 3v-5.5A6.5 6.5 0 0 1 3 13V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>`,
      profile:
        `<svg ${common}><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-4 3.3-6 7.5-6s6.7 2 7.5 6"/></svg>`,
      payouts:
        `<svg ${common}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>`,
      users:
        `<svg ${common}><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.5-3.4 2.4-5.2 5.5-5.2 3.2 0 5.1 1.8 5.5 5.2"/><path d="M14 15c3.5-.4 5.8 1.3 6.5 4.5"/></svg>`,
      payments:
        `<svg ${common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/><path d="M7 15h4"/></svg>`,
      finance:
        `<svg ${common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`,
      reports:
        `<svg ${common}><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5"/><path d="M8 13h8M8 17h6"/></svg>`
    };

    return icons[name] || icons.dashboard;
  }

  function sidebarLink(href, label, icon, selected) {
    return `
      <a href="${href}"
         class="workspace-side-link ${selected ? "active" : ""}">
        <span class="workspace-side-icon">${sidebarIcon(icon)}</span>
        <span>${label}</span>
      </a>`;
  }

  function workspaceSidebarNavigation(context) {
    const hash = location.hash || "";
    const practiceActive =
      ["exams", "practice", "dost", "reviewers", "reviewer"]
        .includes(active);

    if (context.view === "admin") {
      const tab = currentAdminTab();

      return [
        sidebarLink(
          "admin.html",
          "Dashboard",
          "dashboard",
          active === "admin" && tab === "overview"
        ),
        sidebarLink(
          "admin.html?tab=users",
          "Users",
          "users",
          active === "admin" && tab === "users"
        ),
        sidebarLink(
          "admin.html?tab=tutors",
          "Tutors",
          "tutors",
          active === "admin" && tab === "tutors"
        ),
        sidebarLink(
          "admin.html?tab=bookings",
          "Payments",
          "payments",
          active === "admin" && tab === "bookings"
        ),
        sidebarLink(
          "admin.html?tab=finance",
          "Finance",
          "finance",
          active === "admin" && tab === "finance"
        ),
        sidebarLink(
          "admin.html?tab=payouts",
          "Payouts",
          "payouts",
          active === "admin" && tab === "payouts"
        ),
        sidebarLink(
          "admin.html?tab=reports",
          "Reports",
          "reports",
          active === "admin" && tab === "reports"
        )
      ].join("");
    }

    if (context.view === "tutor") {
      const dashboardSelected =
        active === "tutor-dashboard" &&
        !["#booking-requests", "#private-ledger-section"]
          .includes(hash);

      return [
        sidebarLink(
          "tutor-dashboard.html",
          "Dashboard",
          "dashboard",
          dashboardSelected
        ),
        sidebarLink(
          "tutor-onboarding.html",
          "Profile",
          "profile",
          active === "tutor-onboarding"
        ),
        sidebarLink(
          "tutor-dashboard.html#booking-requests",
          "Bookings",
          "bookings",
          active === "tutor-dashboard" &&
          hash === "#booking-requests"
        ),
        sidebarLink(
          "messages.html",
          "Messages",
          "messages",
          active === "messages"
        ),
        sidebarLink(
          "tutor-dashboard.html#private-ledger-section",
          "Payouts",
          "payouts",
          active === "tutor-dashboard" &&
          hash === "#private-ledger-section"
        )
      ].join("");
    }

    return [
      sidebarLink(
        "dashboard.html",
        "Dashboard",
        "dashboard",
        active === "dashboard"
      ),
      sidebarLink(
        "exams.html",
        "Practice",
        "practice",
        practiceActive
      ),
      sidebarLink(
        "tutoring.html",
        "Tutors",
        "tutors",
        ["tutoring", "tutor-profile"].includes(active)
      ),
      sidebarLink(
        "bookings.html?role=learner",
        "Bookings",
        "bookings",
        active === "bookings"
      ),
      sidebarLink(
        "messages.html",
        "Messages",
        "messages",
        active === "messages"
      ),
      sidebarLink(
        "profile.html",
        "Profile",
        "profile",
        active === "profile"
      )
    ].join("");
  }

  function workspaceTopbarTitle(context) {
    if (context.view === "admin") {
      const labels = {
        overview: "Admin Dashboard",
        users: "Users",
        tutors: "Tutors",
        bookings: "Payments",
        finance: "Finance",
        payouts: "Payouts",
        reports: "Reports"
      };
      return labels[currentAdminTab()] || "Admin";
    }

    if (context.view === "tutor") {
      if (active === "tutor-onboarding") return "Tutor Profile";
      if (active === "messages") return "Messages";
      if (
        active === "tutor-dashboard" &&
        location.hash === "#booking-requests"
      ) return "Bookings";
      if (
        active === "tutor-dashboard" &&
        location.hash === "#private-ledger-section"
      ) return "Payouts";
      return "Tutor Dashboard";
    }

    const labels = {
      dashboard: "Student Dashboard",
      exams: "Practice",
      practice: "Practice",
      dost: "DOST-SEI",
      reviewers: "Reviewers",
      reviewer: "Reviewer",
      tutoring: "Tutors",
      "tutor-profile": "Tutor Profile",
      bookings: "Bookings",
      messages: "Messages",
      profile: "Profile"
    };

    return labels[active] || "Student";
  }

  function workspaceSidebarMarkup(context, presentation) {
    if (!workspaceSidebarEligible(context)) return "";

    const home =
      context.view === "admin"
        ? "admin.html"
        : context.view === "tutor"
          ? "tutor-dashboard.html"
          : "dashboard.html";

    const label =
      context.view === "admin"
        ? "ADMIN"
        : context.view === "tutor"
          ? "TUTOR"
          : "STUDENT";

    return `
      <aside class="workspace-sidebar"
             aria-label="${label} workspace navigation">
        <a class="workspace-sidebar-brand"
           href="${home}"
           aria-label="TutoDemy ${label.toLowerCase()} home">
          <img src="assets/images/wordmark.png"
               alt="TutoDemy Learning PH">
          <span>${label}</span>
        </a>

        <nav class="workspace-side-nav">
          ${workspaceSidebarNavigation(context)}
        </nav>

        <div class="workspace-sidebar-bottom">
          ${
            context.view === "learner"
              ? `<p>Prepare. Practice. Progress.</p>`
              : context.view === "tutor"
                ? `<p>Tutor workspace</p>`
                : `<p>Admin workspace</p>`
          }
          <a href="profile.html"
             class="workspace-sidebar-account">
            ${sidebarIcon("profile")}
            <span>Account</span>
          </a>
        </div>
      </aside>`;
  }

  function notificationFooter(context) {
    if (context.view === "admin") return `<a href="admin.html?tab=bookings">Admin bookings</a><a href="admin.html?tab=reports">Reports</a>`;
    if (context.view === "tutor") return `<a href="tutor-dashboard.html#booking-requests">Booking requests</a><a href="messages.html">Messages</a>`;
    return `<a href="bookings.html?role=learner">Bookings</a><a href="messages.html">Messages</a>`;
  }

  function footerMarkup(context) {
    if (context.view === "admin" && !context.publicPreview) {
      return `
        <footer class="site-footer role-footer admin-role-footer">
          <div class="container role-footer-grid">
            <div class="footer-brand"><img src="assets/images/wordmark.png" alt="TutoDemy Learning PH"><p>Users, tutors, payments, payouts, and reports.</p></div>
            <div><h3>Admin</h3><a href="admin.html?tab=tutors">Tutors</a><a href="admin.html?tab=bookings">Payments</a><a href="admin.html?tab=payouts">Payouts</a><a href="admin.html?tab=reports">Reports</a></div>
            <div><h3>Account</h3><a href="profile.html">Profile</a><a href="index.html?public=1">View public site</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></div>
          </div>
          <div class="container footer-bottom"><span>© <span data-year></span> TutoDemy Learning PH.</span><span>Admin workspace.</span></div>
        </footer>`;
    }
    if (context.view === "tutor") {
      return `
        <footer class="site-footer role-footer tutor-role-footer">
          <div class="container role-footer-grid">
            <div class="footer-brand"><img src="assets/images/wordmark.png" alt="TutoDemy Learning PH"><p>Profile, bookings, messages, and payouts.</p></div>
            <div><h3>Tutor</h3><a href="tutor-dashboard.html">Dashboard</a><a href="tutor-onboarding.html">Profile</a><a href="messages.html">Messages</a><a href="tutor-dashboard.html#private-ledger-section">Payouts</a></div>
            <div><h3>Support</h3><a href="tutor-terms.html">Tutor guidelines</a><a href="profile.html">Account profile</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></div>
          </div>
          <div class="container footer-bottom"><span>© <span data-year></span> TutoDemy Learning PH.</span><span>Tutor account.</span></div>
        </footer>`;
    }
    if (context.view === "learner") {
      return `
        <footer class="site-footer role-footer learner-role-footer">
          <div class="container role-footer-grid">
            <div class="footer-brand"><img src="assets/images/wordmark.png" alt="TutoDemy Learning PH"><p>Practice, reviewers, tutors, and bookings.</p></div>
            <div><h3>Student</h3><a href="dashboard.html">Dashboard</a><a href="practice.html">CET Practice</a><a href="dost-sei.html">DOST-SEI</a><a href="reviewers.html">Reviewers</a></div>
            <div><h3>Tutoring</h3><a href="tutoring.html">Tutors</a><a href="bookings.html?role=learner">Bookings</a><a href="messages.html">Messages</a><a href="profile.html">Profile</a></div>
          </div>
          <div class="container footer-bottom"><span>© <span data-year></span> TutoDemy Learning PH.</span><span>Student account.</span></div>
        </footer>`;
    }
    return `
      <footer class="site-footer">
        <div class="container footer-grid">
          <div class="footer-brand">
            <img src="assets/images/wordmark.png" alt="TutoDemy Learning PH">
            <p>Exam practice, reviewers, and tutor booking.</p>
            <div class="footer-badges"><span>Practice</span><span>Accounts</span><span>Approved tutors</span></div>
          </div>
          <div><h3>Practice</h3><a href="exams.html">Practice Hub</a><a href="practice.html">CET Practice</a><a href="dost-sei.html">DOST-SEI</a><a href="dashboard.html">Dashboard</a></div>
          <div><h3>Tutoring</h3><a href="tutoring.html">Tutors</a><a href="for-tutors.html">For Tutors</a><a href="bookings.html">Bookings</a><a href="messages.html">Messages</a><a href="tutor-terms.html">Tutor guidelines</a></div>
          <div><h3>Account</h3><a href="auth.html">Log in</a><a href="profile.html">Profile</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></div>
          <div><h3>Project</h3><a href="reviewers.html">Reviewers</a><a href="resources.html">Sources</a><a href="pricing.html">Access</a><a href="about.html">About</a></div>
        </div>
        <div class="container footer-bottom"><span>© <span data-year></span> TutoDemy Learning PH.</span><span>TutoDemy Learning PH.</span></div>
      </footer>`;
  }

  function renderShell(context) {
    const presentation = rolePresentation(context);
    document.body.classList.remove(
      "role-public",
      "role-learner",
      "role-tutor",
      "role-admin",
      "role-dual-account",
      "role-admin-preview",
      "workspace-sidebar-mode"
    );

    presentation.bodyClass
      .split(/\s+/)
      .filter(Boolean)
      .forEach(name => document.body.classList.add(name));

    if (workspaceSidebarEligible(context)) {
      document.body.classList.add("workspace-sidebar-mode");
    }

    const header = document.querySelector("#site-header");
    if (header) {
      header.innerHTML = `
        ${workspaceSidebarMarkup(context, presentation)}
        ${context.publicPreview ? `<div class="admin-preview-bar"><span>Administrator previewing the public website</span><a href="admin.html">Return to Admin Console</a></div>` : ""}
        <header class="site-header">
          <div class="container nav-wrap">
            <a class="brand" href="${context.view === "admin" ? "admin.html" : context.view === "tutor" ? "tutor-dashboard.html" : context.view === "learner" ? "dashboard.html" : "index.html"}" aria-label="TutoDemy home">
              <img src="assets/images/wordmark.png" alt="TutoDemy Learning PH">
              ${presentation.badge ? `<span class="workspace-badge">${presentation.badge}</span>` : ""}
            </a>
            <div class="workspace-topbar-title">
              ${workspaceTopbarTitle(context)}
            </div>
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
                    <div><h2>Notifications</h2></div>
                    <button class="notification-mark-all" id="notification-mark-all" type="button">Mark all read</button>
                  </header>
                  <p class="notification-status" id="notification-status" role="status" aria-live="polite">Loading…</p>
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

    const setMobileNavOpen = open => {
      if (!toggle || !nav) return;

      const mobile = window.matchMedia("(max-width: 1100px)").matches;
      const shouldOpen = Boolean(open && mobile);

      nav.classList.toggle("open", shouldOpen);
      toggle.setAttribute("aria-expanded", String(shouldOpen));
      toggle.setAttribute(
        "aria-label",
        shouldOpen ? "Close navigation" : "Open navigation"
      );
      document.body.classList.toggle("mobile-nav-open", shouldOpen);

      if (!shouldOpen) {
        document.querySelectorAll(".nav-dropdown.open").forEach(dropdown => {
          dropdown.classList.remove("open");
          dropdown
            .querySelector(".nav-dropdown-toggle")
            ?.setAttribute("aria-expanded", "false");
        });
      }
    };

    toggle?.addEventListener("click", event => {
      event.stopPropagation();
      setMobileNavOpen(!nav?.classList.contains("open"));
    }, { signal });

    nav?.addEventListener("click", event => {
      const link = event.target.closest("a[href]");
      if (link) setMobileNavOpen(false);
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

      if (
        nav?.classList.contains("open") &&
        !event.target.closest(".site-header")
      ) {
        setMobileNavOpen(false);
      }
    }, { signal });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeMenus();
        setMobileNavOpen(false);
      }
    }, { signal });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1100) {
        setMobileNavOpen(false);
      }
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

    let profile = null;
    let isAdmin = false;
    let tutorProfile = null;

    const [adminResult, profileResult] = await Promise.allSettled([
      window.TutoMarketplace.checkAdmin?.(),
      window.TutoMarketplace.getMyAccountProfile?.()
    ]);

    if (adminResult.status === "fulfilled") {
      isAdmin = Boolean(adminResult.value);
    }
    if (profileResult.status === "fulfilled") {
      profile = profileResult.value || null;
    }

    const isTutorAccount = profile?.role === "tutor";
    if (isTutorAccount) {
      try {
        tutorProfile = await window.TutoMarketplace.getMyTutorProfile?.();
      } catch {}
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
      script.src = "js/notifications.js?v=20260816-booknotif1";
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
