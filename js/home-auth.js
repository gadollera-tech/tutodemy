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
        if (userId) localStorage.setItem(`tutodemyPreferredWorkspace:${userId}`, "tutor");
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


  await window.TutoCaptcha?.mount?.("home-signup", document.querySelector("#home-signup-captcha-shell"));
  await window.TutoCaptcha?.mount?.("home-signin", document.querySelector("#home-signin-captcha-shell"));

  const syncPasswordMatch = () => {
    if (!signupPassword || !signupConfirm) return true;
    const hasConfirm = Boolean(signupConfirm.value);
    const matches = !hasConfirm || signupPassword.value === signupConfirm.value;
    signupConfirm.setCustomValidity(matches ? "" : "Passwords do not match.");
    if (passwordMatchHint) {
      passwordMatchHint.textContent = !hasConfirm
        ? "Type the same password again."
        : matches
          ? "Passwords match."
          : "Passwords do not match.";
      passwordMatchHint.classList.toggle("match", hasConfirm && matches);
      passwordMatchHint.classList.toggle("mismatch", hasConfirm && !matches);
    }
    return hasConfirm && matches;
  };

  signupPassword?.addEventListener("input", syncPasswordMatch);
  signupConfirm?.addEventListener("input", syncPasswordMatch);

  const currentUser = window.TutoAuth?.getUser?.();
  if (currentUser) {
    if (forms) forms.hidden = true;
    if (signedIn) signedIn.hidden = false;
    if (dashboardLink) dashboardLink.href = await destinationAfterLogin();
    return;
  }

  tabs.forEach(tab => tab.addEventListener("click", () => showPanel(tab.dataset.homeAuthTab)));

  // Homepage defaults to Log in. Any "Create Free Account" CTA that points to
  // #home-auth-card opens the signup tab before scrolling to the form.
  document.querySelectorAll('a[href="#home-auth-card"]').forEach(link => {
    link.addEventListener("click", () => showPanel("signup"));
  });

  // Keep Log in as the default state on a normal homepage visit.
  showPanel("signin");

  signupForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!signupButton) return;

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (values.password !== values.confirm_password || !syncPasswordMatch()) {
      setStatus("Passwords do not match. Please type the same password twice.", true);
      signupConfirm?.focus();
      return;
    }
    if (!window.TutoCaptcha?.requireToken?.("home-signup")) {
      setStatus("Please complete the human verification first.", true);
      return;
    }
    const captchaToken = window.TutoCaptcha?.getToken?.("home-signup") || "";
    signupButton.disabled = true;
    signupButton.textContent = "Creating account…";
    setStatus("Creating your account…");

    const redirectTo = new URL("profile.html", location.href).href;
    const { data, error } = await client.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        captchaToken,
        emailRedirectTo: redirectTo,
        data: {
          full_name: values.full_name,
          role: "learner",
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
    signupButton.textContent = "Create free account";

    if (error) {
      setStatus(error.message, true);
      return;
    }

    if (data?.session) {
      await window.TutoAuth?.refresh?.();
      await window.TutoCloud?.syncAll?.({ silent: true });
      location.assign("profile.html");
      return;
    }

    if (successEmail) successEmail.textContent = values.email;
    signupForm.hidden = true;
    if (success) success.hidden = false;
    setStatus("Confirmation email sent. Open it to activate your account.");
  });

  signinForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!loginButton) return;

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!window.TutoCaptcha?.requireToken?.("home-signin")) {
      setStatus("Please complete the human verification first.", true);
      return;
    }
    const captchaToken = window.TutoCaptcha?.getToken?.("home-signin") || "";
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

  if (window.TUTODEMY_CONFIG?.googleOAuthEnabled && googleWrap && googleButton) {
    googleWrap.hidden = false;
    googleButton.addEventListener("click", async () => {
      googleButton.disabled = true;
      setStatus("Opening Google login…");
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: new URL("dashboard.html", location.href).href }
      });
      if (error) {
        googleButton.disabled = false;
        setStatus(error.message, true);
      }
    });
  }

  window.addEventListener("tutodemy-auth-change", async event => {
    if (event.detail?.session?.user || window.TutoAuth?.getUser?.()) {
      if (forms) forms.hidden = true;
      if (signedIn) signedIn.hidden = false;
      if (dashboardLink) dashboardLink.href = await destinationAfterLogin();
    }
  });
});