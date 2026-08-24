document.addEventListener("DOMContentLoaded", async () => {
  const card = document.querySelector("#home-auth-card");
  if (!card) return;

  await window.TutoAuth?.ready;
  await window.TutoMarketplace?.ready;

  const client = window.TutoSupabase?.client;
  const forms = document.querySelector("#home-auth-forms");
  const unavailable = document.querySelector("#home-auth-unavailable");
  const signedIn = document.querySelector("#home-auth-signed-in");
  const dashboardLink = document.querySelector("#home-dashboard-link");
  const status = document.querySelector("#home-auth-status");
  const tabs = [...document.querySelectorAll("[data-home-auth-tab]")];
  const panels = [...document.querySelectorAll("[data-home-auth-panel]")];
  const signupForm = document.querySelector("#home-signup-form");
  const signinForm = document.querySelector("#home-signin-form");
  const signupButton = document.querySelector("#home-create-account-button");
  const signupPassword = signupForm?.querySelector('input[name="password"]');
  const signupConfirm = signupForm?.querySelector('input[name="confirm_password"]');
  const passwordMatchHint = document.querySelector("#home-password-match");
  const loginButton = document.querySelector("#home-login-button");
  const success = document.querySelector("#home-signup-success");
  const successEmail = document.querySelector("#home-signup-success-email");
  const googleWrap = document.querySelector("#home-google-wrap");
  const googleButton = document.querySelector("#home-google-login");

  // ------------------------------------------------------------
  // Homepage account type choice
  // ------------------------------------------------------------
  const ROLE_STYLE_ID = "tutodemy-home-role-choice-style";

  const injectRoleStyles = () => {
    if (document.getElementById(ROLE_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = ROLE_STYLE_ID;
    style.textContent = `
      .home-role-choice {
        display: grid;
        gap: 8px;
        margin: 2px 0 4px;
      }

      .home-role-choice-title {
        margin: 0 0 2px;
        color: #4F4D4E;
        font-size: .78rem;
        font-weight: 850;
      }

      .home-role-choice-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .home-role-card {
        position: relative;
        display: block;
        cursor: pointer;
      }

      .home-role-card input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .home-role-card-body {
        min-height: 86px;
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 12px;
        border: 1px solid rgba(79,77,78,.18);
        border-radius: 13px;
        background: #fff;
        transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
      }

      .home-role-card input:checked + .home-role-card-body {
        border-color: #0C046D;
        background: rgba(116,132,194,.08);
        box-shadow: 0 0 0 2px rgba(12,4,109,.07);
      }

      .home-role-card input:focus-visible + .home-role-card-body {
        outline: 2px solid #0C046D;
        outline-offset: 2px;
      }

      .home-role-icon {
        width: 32px;
        height: 32px;
        flex: 0 0 32px;
        display: grid;
        place-items: center;
        border-radius: 9px;
        background: #FCF9F2;
        color: #0C046D;
        font-size: 1rem;
      }

      .home-role-copy {
        min-width: 0;
      }

      .home-role-copy b,
      .home-role-copy small {
        display: block;
      }

      .home-role-copy b {
        color: #0C046D;
        font-size: .83rem;
        line-height: 1.2;
      }

      .home-role-copy small {
        margin-top: 4px;
        color: #6B686A;
        font-size: .68rem;
        line-height: 1.3;
      }

      .home-role-note {
        margin: 2px 0 0;
        color: #6B686A;
        font-size: .69rem;
        line-height: 1.35;
      }

      @media (max-width: 520px) {
        .home-role-choice-grid {
          grid-template-columns: 1fr;
        }

        .home-role-card-body {
          min-height: 70px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const ensureRoleChoice = () => {
    if (!signupForm || signupForm.querySelector(".home-role-choice")) return;

    injectRoleStyles();

    const firstLabel = signupForm.querySelector("label");
    const roleWrap = document.createElement("div");
    roleWrap.className = "home-role-choice";
    roleWrap.innerHTML = `
      <p class="home-role-choice-title">I'm joining TutoDemy as:</p>
      <div class="home-role-choice-grid" role="radiogroup" aria-label="Account type">
        <label class="home-role-card">
          <input type="radio" name="role" value="learner" checked>
          <span class="home-role-card-body">
            <span class="home-role-icon" aria-hidden="true">🎓</span>
            <span class="home-role-copy">
              <b>Student</b>
              <small>Practice, track progress, and find tutors</small>
            </span>
          </span>
        </label>

        <label class="home-role-card">
          <input type="radio" name="role" value="tutor">
          <span class="home-role-card-body">
            <span class="home-role-icon" aria-hidden="true">👩‍🏫</span>
            <span class="home-role-copy">
              <b>Tutor</b>
              <small>Create a tutor profile and offer lessons</small>
            </span>
          </span>
        </label>
      </div>
      <p class="home-role-note" id="home-role-note">
        Student accounts can use practice tools and book tutors.
      </p>
    `;

    signupForm.insertBefore(roleWrap, firstLabel || signupForm.firstChild);
  };

  ensureRoleChoice();

  const roleInputs = [...(signupForm?.querySelectorAll('input[name="role"]') || [])];
  const roleNote = document.querySelector("#home-role-note");
  const signupSmall = document.querySelector("#home-signup-panel .lp4-auth-small");

  const selectedRole = () =>
    signupForm?.querySelector('input[name="role"]:checked')?.value === "tutor"
      ? "tutor"
      : "learner";

  const syncRoleUI = () => {
    const role = selectedRole();

    if (signupButton && !signupButton.disabled) {
      signupButton.textContent =
        role === "tutor"
          ? "Create Tutor Account"
          : "Create Student Account";
    }

    if (roleNote) {
      roleNote.textContent =
        role === "tutor"
          ? "Tutor accounts continue to profile setup and verification before appearing publicly."
          : "Student accounts can use practice tools, track progress, and book tutors.";
    }

    if (signupSmall) {
      signupSmall.textContent =
        role === "tutor"
          ? "You'll complete your tutor profile after confirming your email."
          : "This creates a student account.";
    }
  };

  roleInputs.forEach(input => input.addEventListener("change", syncRoleUI));
  syncRoleUI();

  const setStatus = (message = "", isError = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", Boolean(isError));
  };

  const showPanel = name => {
    tabs.forEach(tab => {
      const active = tab.dataset.homeAuthTab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach(panel => {
      const active = panel.dataset.homeAuthPanel === name;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
    setStatus("");
  };

  async function destinationAfterLogin() {
    try {
      const isAdmin = await window.TutoMarketplace?.checkAdmin?.();
      if (isAdmin) return "admin.html";
      const profile = await window.TutoMarketplace?.getMyAccountProfile?.(true);
      if (profile?.role === "tutor") {
        const userId = window.TutoAuth?.getUser?.()?.id;
        if (userId) {
          localStorage.setItem(
            `tutodemyPreferredWorkspace:${userId}`,
            "tutor"
          );
        }
        return "tutor-dashboard.html";
      }
    } catch {}
    return "dashboard.html";
  }

  if (!window.TutoAuth?.isConfigured?.() || !client) {
    if (forms) forms.hidden = true;
    if (unavailable) unavailable.hidden = false;
    return;
  }

  await window.TutoCaptcha?.mount?.(
    "home-signup",
    document.querySelector("#home-signup-captcha-shell")
  );
  await window.TutoCaptcha?.mount?.(
    "home-signin",
    document.querySelector("#home-signin-captcha-shell")
  );

  const syncPasswordMatch = () => {
    if (!signupPassword || !signupConfirm) return true;
    const hasConfirm = Boolean(signupConfirm.value);
    const matches =
      !hasConfirm || signupPassword.value === signupConfirm.value;

    signupConfirm.setCustomValidity(
      matches ? "" : "Passwords do not match."
    );

    if (passwordMatchHint) {
      passwordMatchHint.textContent = !hasConfirm
        ? "Type the same password again."
        : matches
          ? "Passwords match."
          : "Passwords do not match.";

      passwordMatchHint.classList.toggle(
        "match",
        hasConfirm && matches
      );
      passwordMatchHint.classList.toggle(
        "mismatch",
        hasConfirm && !matches
      );
    }

    return hasConfirm && matches;
  };

  signupPassword?.addEventListener("input", syncPasswordMatch);
  signupConfirm?.addEventListener("input", syncPasswordMatch);

  const currentUser = window.TutoAuth?.getUser?.();
  if (currentUser) {
    if (forms) forms.hidden = true;
    if (signedIn) signedIn.hidden = false;
    if (dashboardLink) {
      dashboardLink.href = await destinationAfterLogin();
    }
    return;
  }

  tabs.forEach(tab =>
    tab.addEventListener("click", () =>
      showPanel(tab.dataset.homeAuthTab)
    )
  );

  document
    .querySelectorAll('a[href="#home-auth-card"]')
    .forEach(link => {
      link.addEventListener("click", () => showPanel("signup"));
    });

  showPanel("signin");

  signupForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!signupButton) return;

    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries()
    );

    if (
      values.password !== values.confirm_password ||
      !syncPasswordMatch()
    ) {
      setStatus(
        "Passwords do not match. Please type the same password twice.",
        true
      );
      signupConfirm?.focus();
      return;
    }

    if (!window.TutoCaptcha?.requireToken?.("home-signup")) {
      setStatus(
        "Please complete the human verification first.",
        true
      );
      return;
    }

    const captchaToken =
      window.TutoCaptcha?.getToken?.("home-signup") || "";

    const role =
      values.role === "tutor" ? "tutor" : "learner";

    const redirectPage =
      role === "tutor"
        ? "tutor-onboarding.html"
        : "profile.html";

    const redirectTo =
      new URL(redirectPage, location.href).href;

    signupButton.disabled = true;
    signupButton.textContent = "Creating account…";
    setStatus(
      role === "tutor"
        ? "Creating your tutor account…"
        : "Creating your student account…"
    );

    const { data, error } = await client.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        captchaToken,
        emailRedirectTo: redirectTo,
        data: {
          full_name: values.full_name,
          role,
          student_level: "",
          target_exam: "",
          city: "",
          province: "",
          share_location_insights: false
        }
      }
    });

    window.TutoCaptcha?.reset?.("home-signup");
    signupButton.disabled = false;
    syncRoleUI();

    if (error) {
      setStatus(error.message, true);
      return;
    }

    if (data?.session) {
      await window.TutoAuth?.refresh?.();
      await window.TutoCloud?.syncAll?.({ silent: true });

      if (role === "tutor" && data?.user?.id) {
        localStorage.setItem(
          `tutodemyPreferredWorkspace:${data.user.id}`,
          "tutor"
        );
      }

      location.assign(redirectPage);
      return;
    }

    if (successEmail) successEmail.textContent = values.email;

    if (success) {
      const heading = success.querySelector("h3");
      const paragraph = success.querySelector("p");

      if (heading) heading.textContent = "Check your email.";

      if (paragraph) {
        paragraph.innerHTML =
          role === "tutor"
            ? `We sent a confirmation link to <b id="home-signup-success-email-inline"></b>. Confirm it, then you'll continue to tutor profile setup and verification.`
            : `We sent a confirmation link to <b id="home-signup-success-email-inline"></b>. Confirm it to activate your account and keep your learning progress synced.`;

        const inlineEmail = paragraph.querySelector(
          "#home-signup-success-email-inline"
        );
        if (inlineEmail) inlineEmail.textContent = values.email;
      }
    }

    signupForm.hidden = true;
    if (success) success.hidden = false;

    setStatus(
      role === "tutor"
        ? "Confirmation email sent. Confirm it to continue your tutor application."
        : "Confirmation email sent. Open it to activate your account."
    );
  });

  signinForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!loginButton) return;

    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries()
    );

    if (!window.TutoCaptcha?.requireToken?.("home-signin")) {
      setStatus(
        "Please complete the human verification first.",
        true
      );
      return;
    }

    const captchaToken =
      window.TutoCaptcha?.getToken?.("home-signin") || "";

    loginButton.disabled = true;
    loginButton.textContent = "Logging in…";
    setStatus("Logging in…");

    const { error } = await client.auth.signInWithPassword({
      email: values.email,
      password: values.password,
      options: { captchaToken }
    });

    window.TutoCaptcha?.reset?.("home-signin");
    loginButton.disabled = false;
    loginButton.textContent = "Log in";

    if (error) {
      setStatus(error.message, true);
      return;
    }

    await window.TutoAuth?.refresh?.();
    await window.TutoCloud?.syncAll?.({ silent: true });
    location.assign(await destinationAfterLogin());
  });

  if (
    window.TUTODEMY_CONFIG?.googleOAuthEnabled &&
    googleWrap &&
    googleButton
  ) {
    googleWrap.hidden = false;

    googleButton.addEventListener("click", async () => {
      googleButton.disabled = true;
      setStatus("Opening Google login…");

      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            new URL("dashboard.html", location.href).href
        }
      });

      if (error) {
        googleButton.disabled = false;
        setStatus(error.message, true);
      }
    });
  }

  window.addEventListener(
    "tutodemy-auth-change",
    async event => {
      if (
        event.detail?.session?.user ||
        window.TutoAuth?.getUser?.()
      ) {
        if (forms) forms.hidden = true;
        if (signedIn) signedIn.hidden = false;
        if (dashboardLink) {
          dashboardLink.href =
            await destinationAfterLogin();
        }
      }
    }
  );
});
