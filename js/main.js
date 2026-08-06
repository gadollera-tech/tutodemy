document.addEventListener("DOMContentLoaded", async () => {
  const active = document.body.dataset.page || "";
  const regularNavItems = [
    ["index.html","Home","home"],
    ["dashboard.html","Dashboard","dashboard"],
    ["reviewers.html","Reviewers","reviewers"],
    ["tutoring.html","Tutor Connect","tutoring"],
    ["pricing.html","Premium","pricing"],
    ["resources.html","Source Policy","resources"],
    ["about.html","About","about"]
  ];

  const practiceActive = ["exams", "dost"].includes(active);
  const practiceDropdown = `
    <div class="nav-dropdown ${practiceActive ? "active" : ""}">
      <button class="nav-dropdown-toggle ${practiceActive ? "active" : ""}" type="button" aria-expanded="false" aria-haspopup="true">
        Practice Hubs <span aria-hidden="true">⌄</span>
      </button>
      <div class="nav-submenu" aria-label="Practice Hubs submenu">
        <a href="exams.html" class="${active === "exams" ? "active" : ""}">All Practice Hubs</a>
        <a href="practice.html">UPCAT & CET Practice</a>
        <a href="dost-sei.html" class="${active === "dost" ? "active" : ""}">DOST-SEI Practice</a>
      </div>
    </div>`;

  const regularLinks = regularNavItems.map(([href,label,key]) =>
    `<a href="${href}" class="${active===key?"active":""}">${label}</a>`);
  const links = [regularLinks[0], regularLinks[1], practiceDropdown, ...regularLinks.slice(2)].join("");

  document.querySelector("#site-header").innerHTML = `
    <div class="site-note">Original reviewed learning materials • Account sync works after Supabase is configured • Uploaded commercial sources are not redistributed.</div>
    <header class="site-header">
      <div class="container nav-wrap">
        <a class="brand" href="index.html" aria-label="TutoDemy home"><img src="assets/images/wordmark.png" alt="TutoDemy Learning PH"></a>
        <button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button>
        <nav class="main-nav" aria-label="Primary navigation">${links}</nav>
        <div class="nav-actions">
          <button class="plan-chip" type="button" id="plan-chip"><i></i><span data-plan-label>Free</span></button>
          <a class="auth-chip" id="auth-chip" href="auth.html"><span class="auth-avatar">?</span><span class="auth-label">Log in</span></a>
        </div>
      </div>
    </header>`;

  document.querySelector("#site-footer").innerHTML = `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <img src="assets/images/wordmark.png" alt="TutoDemy Learning PH">
          <p>A tutoring, academic-support, and entrance-exam preparation platform for Filipino learners.</p>
          <div class="footer-badges"><span>Original questions</span><span>Optional cloud sync</span><span>Approved content</span></div>
        </div>
        <div><h3>Practice</h3><a href="exams.html">CET exam hub</a><a href="practice.html">CET set builder</a><a href="dost-sei.html">DOST-SEI preparation</a><a href="dashboard.html">Dashboard</a></div>
        <div><h3>Account</h3><a href="auth.html">Log in or sign up</a><a href="profile.html">Learner profile</a><a href="docs/SUPABASE-SETUP-GUIDE.md">Account setup guide</a><a href="privacy.html">Privacy notice</a></div>
        <div><h3>Learn</h3><a href="reviewers.html">Reviewers</a><a href="tutoring.html">Tutor Connect</a><a href="resources.html">Source policy</a></div>
        <div><h3>Project</h3><a href="pricing.html">Premium preview</a><a href="about.html">About</a><a href="docs/GITHUB-UPLOAD-GUIDE.md">GitHub guide</a></div>
      </div>
      <div class="container footer-bottom"><span>© <span data-year></span> TutoDemy Learning PH.</span><span>Study smarter. Grow with guidance.</span></div>
    </footer>`;

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  toggle?.addEventListener("click", () => {
    const opened = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(opened));
  });

  const closePracticeMenus = (except = null) => {
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
      closePracticeMenus(dropdown);
      dropdown.classList.toggle("open", willOpen);
      button.setAttribute("aria-expanded", String(willOpen));
    });
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".nav-dropdown")) closePracticeMenus();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePracticeMenus();
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
    getPlan() { return localStorage.getItem("tutodemyPlan") || "free"; },
    setPlan(plan) {
      localStorage.setItem("tutodemyPlan", plan === "pro" ? "pro" : "free");
      this.applyPlan();
      window.dispatchEvent(new CustomEvent("tutodemy-plan-change", {detail:{plan:this.getPlan()}}));
    },
    applyPlan() {
      const plan = this.getPlan();
      document.body.classList.toggle("plan-pro", plan === "pro");
      document.querySelectorAll("[data-plan-label]").forEach(el => el.textContent = plan === "pro" ? "Pro Preview" : "Free");
    },
    toast(message) {
      const toast = document.querySelector(".toast");
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(window.__tutoToast);
      window.__tutoToast = setTimeout(() => toast.classList.remove("show"), 3200);
    },
    shuffle(array) {
      const copy = [...array];
      for (let i=copy.length-1;i>0;i--) {
        const j=Math.floor(Math.random()*(i+1));
        [copy[i],copy[j]]=[copy[j],copy[i]];
      }
      return copy;
    },
    escape(text) {
      const div=document.createElement("div");
      div.textContent=String(text ?? "");
      return div.innerHTML;
    },
    formatTime(seconds) {
      seconds=Math.max(0,Math.floor(seconds));
      const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;
      return h ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    },
    getSavedReviewers() { return this.storage.get("tutodemySavedReviewers", []); },
    toggleReviewer(id) {
      const current=this.getSavedReviewers();
      const next=current.includes(id)?current.filter(x=>x!==id):[...current,id];
      this.storage.set("tutodemySavedReviewers",next);
      window.TutoCloud?.syncSavedReviewers?.(next).catch(error => console.error("Reviewer sync failed:", error));
      window.dispatchEvent(new CustomEvent("tutodemy-reviewer-change",{detail:{ids:next}}));
      return next.includes(id);
    }
  };

  function initialsFor(user) {
    const name = user?.user_metadata?.full_name || user?.email || "User";
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return parts.slice(0,2).map(part => part[0]?.toUpperCase()).join("") || "U";
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

  window.Tuto.applyPlan();
  document.querySelector("#plan-chip")?.addEventListener("click",()=>location.href="pricing.html");
  document.querySelectorAll("[data-year]").forEach(el=>el.textContent=new Date().getFullYear());

  await window.TutoAuth?.ready;
  refreshAuthChip();
  window.addEventListener("tutodemy-auth-change", refreshAuthChip);
});
