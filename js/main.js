document.addEventListener("DOMContentLoaded", async () => {
  const active = document.body.dataset.page || "";
  const practiceActive = ["exams", "practice", "dost"].includes(active);
  const tutorActive = ["tutoring", "for-tutors", "tutor-profile", "tutor-onboarding", "tutor-dashboard", "bookings", "messages", "tutor-terms", "admin"].includes(active);

  const practiceDropdown = `
    <div class="nav-dropdown ${practiceActive ? "active" : ""}">
      <button class="nav-dropdown-toggle ${practiceActive ? "active" : ""}" type="button" aria-expanded="false" aria-haspopup="true">
        Practice Hubs <span aria-hidden="true">⌄</span>
      </button>
      <div class="nav-submenu" aria-label="Practice Hubs submenu">
        <a href="exams.html" class="${active === "exams" ? "active" : ""}">All Practice Hubs</a>
        <a href="practice.html" class="${active === "practice" ? "active" : ""}">UPCAT & CET Practice</a>
        <a href="dost-sei.html" class="${active === "dost" ? "active" : ""}">DOST-SEI Practice</a>
      </div>
    </div>`;

  const tutorDropdown = `
    <div class="nav-dropdown ${tutorActive ? "active" : ""}">
      <button class="nav-dropdown-toggle ${tutorActive ? "active" : ""}" type="button" aria-expanded="false" aria-haspopup="true">
        Tutor Connect <span aria-hidden="true">⌄</span>
      </button>
      <div class="nav-submenu tutor-submenu" aria-label="Tutor Connect submenu">
        <a href="tutoring.html" class="${active === "tutoring" ? "active" : ""}">Find a Tutor</a>
        <a href="for-tutors.html" class="${active === "for-tutors" ? "active" : ""}">Become a Tutor</a>
        <a href="bookings.html" class="${active === "bookings" ? "active" : ""}">My Bookings</a>
        <a href="messages.html" class="${active === "messages" ? "active" : ""}">Messages</a>
        <a href="tutor-dashboard.html" class="tutor-only ${active === "tutor-dashboard" ? "active" : ""}" hidden>Tutor Dashboard</a>
        <a href="tutor-terms.html" class="${active === "tutor-terms" ? "active" : ""}">Tutor Guidelines</a>
        <a href="admin.html" class="admin-only ${active === "admin" ? "active" : ""}" hidden>Admin Console</a>
      </div>
    </div>`;

  const links = [
    `<a href="index.html" class="${active === "home" ? "active" : ""}">Home</a>`,
    `<a href="dashboard.html" class="${active === "dashboard" ? "active" : ""}">Dashboard</a>`,
    practiceDropdown,
    `<a href="reviewers.html" class="${active === "reviewers" ? "active" : ""}">Reviewers</a>`,
    tutorDropdown,
    `<a href="pricing.html" class="${active === "pricing" ? "active" : ""}">Access</a>`,
    `<a href="resources.html" class="${active === "resources" ? "active" : ""}">Source Policy</a>`,
    `<a href="about.html" class="${active === "about" ? "active" : ""}">About</a>`
  ].join("");

  const header = document.querySelector("#site-header");
  if (header) {
    header.innerHTML = `
      <div class="site-note">UPCAT & CET preparation • DOST-SEI preparation • Admin-approved tutor marketplace</div>
      <header class="site-header">
        <div class="container nav-wrap">
          <a class="brand" href="index.html" aria-label="TutoDemy home"><img src="assets/images/wordmark.png" alt="TutoDemy Learning PH"></a>
          <button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button>
          <nav class="main-nav" aria-label="Primary navigation">${links}</nav>
          <div class="nav-actions">
            <a class="plan-chip" id="plan-chip" href="pricing.html"><i></i><span>Access</span></a>
            <a class="auth-chip" id="auth-chip" href="auth.html"><span class="auth-avatar">?</span><span class="auth-label">Log in</span></a>
          </div>
        </div>
      </header>`;
  }

  const footer = document.querySelector("#site-footer");
  if (footer) {
    footer.innerHTML = `
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

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  toggle?.addEventListener("click", () => {
    const opened = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(opened));
  });

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
    });
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".nav-dropdown")) closeMenus();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenus();
  });

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

  function refreshAuthChip() {
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
      chip.href = "profile.html";
      avatar.textContent = initialsFor(user);
      label.textContent = user.user_metadata?.full_name?.split(" ")[0] || "My profile";
    } else {
      chip.href = "auth.html";
      avatar.textContent = "↗";
      label.textContent = "Log in";
    }
  }

  function refreshAdminLinks() {
    const admin = window.TutoMarketplace?.isAdmin?.();
    document.querySelectorAll(".admin-only").forEach(link => {
      link.hidden = !admin;
    });
  }

  async function refreshTutorLinks() {
    let isTutor = false;
    try {
      const account = await window.TutoMarketplace?.getMyAccountProfile?.();
      isTutor = account?.role === "tutor";
    } catch {}
    document.querySelectorAll(".tutor-only").forEach(link => {
      link.hidden = !isTutor;
    });
  }

  window.Tuto.applyPlan();
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

  await window.TutoAuth?.ready;
  refreshAuthChip();
  if (window.TutoMarketplace) {
    await window.TutoMarketplace.ready;
    refreshAdminLinks();
    await refreshTutorLinks();
  }
  window.addEventListener("tutodemy-auth-change", async () => { refreshAuthChip(); await refreshTutorLinks(); });
  window.addEventListener("tutodemy-admin-change", refreshAdminLinks);
});
