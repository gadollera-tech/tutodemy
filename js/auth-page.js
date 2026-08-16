document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoAuth?.ready;
  await window.TutoMarketplace?.ready;

  const client = window.TutoSupabase?.client;
  const setup = document.querySelector("#auth-setup");
  const forms = document.querySelector("#auth-forms");
  const status = document.querySelector("#auth-status");
  const googleButton = document.querySelector("#google-login");
  const googleHelper = document.querySelector("#google-helper");
  const tabs = [...document.querySelectorAll("[data-auth-tab]")];
  const panels = [...document.querySelectorAll(".auth-panel")];
  const signupForm = document.querySelector("#signup-form");
  const learnerFields = document.querySelector("#learner-signup-fields");
  const createAccountButton = document.querySelector("#create-account-button");
  const signupSuccess = document.querySelector("#signup-success");
  const signupSuccessEmail = document.querySelector("#signup-success-email");
  const provinceSelect = document.querySelector("#signup-province");
  const signupPassword = signupForm?.querySelector('input[name="password"]');
  const signupConfirm = signupForm?.querySelector('input[name="confirm_password"]');
  const signupPasswordHint = document.querySelector("#signup-password-match");

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle("error", isError);
  };
  const showPanel = name => {
    panels.forEach(panel => panel.classList.toggle("active", panel.id === `${name}-panel`));
    tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.authTab === name));
    setStatus("");
  };
  const selectedRole = () => signupForm?.querySelector('input[name="role"]:checked')?.value || "learner";
  const updateRoleFields = () => learnerFields.hidden = selectedRole() === "tutor";
  signupForm?.querySelectorAll('input[name="role"]').forEach(radio => radio.addEventListener("change", updateRoleFields));
  window.TutoPH?.populateProvinceSelect?.(provinceSelect);
  updateRoleFields();

  if (!window.TutoAuth?.isConfigured?.()) {
    setup.hidden = false;
    forms.hidden = true;
    return;
  }
  setup.hidden = true;
  forms.hidden = false;


  await window.TutoCaptcha?.mount?.("signin", document.querySelector("#signin-captcha-shell"));
  await window.TutoCaptcha?.mount?.("signup", document.querySelector("#signup-captcha-shell"));
  await window.TutoCaptcha?.mount?.("forgot", document.querySelector("#forgot-captcha-shell"));

  const syncSignupPasswordMatch = () => {
    if (!signupPassword || !signupConfirm) return true;
    const hasConfirm = Boolean(signupConfirm.value);
    const matches = !hasConfirm || signupPassword.value === signupConfirm.value;
    signupConfirm.setCustomValidity(matches ? "" : "Passwords do not match.");
    if (signupPasswordHint) {
      signupPasswordHint.textContent = !hasConfirm
        ? "Type the same password again."
        : matches
          ? "Passwords match."
          : "Passwords do not match.";
      signupPasswordHint.classList.toggle("match", hasConfirm && matches);
      signupPasswordHint.classList.toggle("mismatch", hasConfirm && !matches);
    }
    return hasConfirm && matches;
  };
  signupPassword?.addEventListener("input", syncSignupPasswordMatch);
  signupConfirm?.addEventListener("input", syncSignupPasswordMatch);

  tabs.forEach(tab => tab.addEventListener("click", () => showPanel(tab.dataset.authTab)));
  document.querySelector("#show-forgot")?.addEventListener("click", () => showPanel("forgot"));
  document.querySelector("#back-signin")?.addEventListener("click", () => showPanel("signin"));
  document.querySelector("#signup-back-to-login")?.addEventListener("click", () => {
    signupSuccess.hidden = true;
    signupForm.hidden = false;
    showPanel("signin");
  });

  const query = new URLSearchParams(location.search);
  const isResetMode = query.get("mode") === "reset";
  if (isResetMode) showPanel("reset");
  else if (query.get("tab") === "signup") showPanel("signup");
  else if (query.get("tab") === "signin") showPanel("signin");
  if (query.get("role") === "tutor") {
    const tutorRadio = signupForm?.querySelector('input[name="role"][value="tutor"]');
    if (tutorRadio) tutorRadio.checked = true;
    updateRoleFields();
  }

  async function destinationAfterLogin() {
    const queryNext = new URLSearchParams(location.search).get("next");
    const storedNext = sessionStorage.getItem("tutodemyPostLoginUrl");
    if (storedNext) sessionStorage.removeItem("tutodemyPostLoginUrl");
    if (queryNext) return queryNext;
    if (storedNext) return storedNext;
    try {
      const isAdmin = await window.TutoMarketplace?.checkAdmin?.();
      if (isAdmin) return "admin.html";
      const profile = await window.TutoMarketplace?.getMyAccountProfile(true);
      if (profile?.role === "tutor") {
        const userId = window.TutoAuth?.getUser?.()?.id;
        if (userId) localStorage.setItem(`tutodemyPreferredWorkspace:${userId}`, "tutor");
        return "tutor-dashboard.html";
      }
      return "dashboard.html";
    } catch {
      return "dashboard.html";
    }
  }

  if (window.TutoAuth.getUser() && !isResetMode) {
    setStatus("You are already logged in. Redirecting…");
    setTimeout(async () => location.replace(await destinationAfterLogin()), 350);
  }

  document.querySelector("#signin-form").addEventListener("submit", async event => {
    event.preventDefault();
    setStatus("Logging in…");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!window.TutoCaptcha?.requireToken?.("signin")) return setStatus("Please complete the human verification first.", true);
    const captchaToken = window.TutoCaptcha?.getToken?.("signin") || "";
    const { error } = await client.auth.signInWithPassword({
      email: values.email,
      password: values.password,
      options: { captchaToken }
    });
    window.TutoCaptcha?.reset?.("signin");
    if (error) return setStatus(error.message, true);
    await window.TutoAuth.refresh();
    await window.TutoCloud?.syncAll?.({ silent: true });
    location.replace(await destinationAfterLogin());
  });

  signupForm.addEventListener("submit", async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (values.password !== values.confirm_password || !syncSignupPasswordMatch()) {
      setStatus("Passwords do not match. Please type the same password twice.", true);
      signupConfirm?.focus();
      return;
    }
    if (!window.TutoCaptcha?.requireToken?.("signup")) return setStatus("Please complete the human verification first.", true);
    const captchaToken = window.TutoCaptcha?.getToken?.("signup") || "";
    const role = values.role === "tutor" ? "tutor" : "learner";
    const redirectPage = role === "tutor" ? "tutor-onboarding.html" : "profile.html";
    const redirectTo = new URL(redirectPage, location.href).href;
    createAccountButton.disabled = true;
    createAccountButton.textContent = "Creating account…";
    setStatus("Creating your account… Keep this page open. When it is ready, check your email to confirm your account.");

    const { data, error } = await client.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        captchaToken,
        emailRedirectTo: redirectTo,
        data: {
          full_name: values.full_name,
          student_level: role === "learner" ? values.student_level : "",
          target_exam: role === "learner" ? values.target_exam : "",
          city: role === "learner" ? values.city || "" : "",
          province: role === "learner" ? values.province || "" : "",
          share_location_insights: role === "learner" && Boolean(values.share_location_insights),
          role
        }
      }
    });

    window.TutoCaptcha?.reset?.("signup");
    createAccountButton.disabled = false;
    createAccountButton.textContent = "Create account";
    if (error) return setStatus(error.message, true);
    if (data.session) {
      await window.TutoAuth.refresh();
      location.replace(redirectPage);
      return;
    }

    signupSuccessEmail.textContent = values.email;
    signupForm.hidden = true;
    signupSuccess.hidden = false;
    setStatus("Confirmation email sent. Open it to activate your TutoDemy account.");
    event.currentTarget.reset();
    window.TutoPH?.populateProvinceSelect?.(provinceSelect);
    updateRoleFields();
  });

  document.querySelector("#forgot-form").addEventListener("submit", async event => {
    event.preventDefault();
    setStatus("Sending recovery email…");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!window.TutoCaptcha?.requireToken?.("forgot")) return setStatus("Please complete the human verification first.", true);
    const captchaToken = window.TutoCaptcha?.getToken?.("forgot") || "";
    const { error } = await client.auth.resetPasswordForEmail(values.email, {
      redirectTo: new URL("auth.html?mode=reset", location.href).href,
      captchaToken
    });
    window.TutoCaptcha?.reset?.("forgot");
    if (error) return setStatus(error.message, true);
    setStatus("Recovery email sent. Open its link on this website to choose a new password.");
  });

  document.querySelector("#reset-form").addEventListener("submit", async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (values.password !== values.confirm_password) return setStatus("The passwords do not match.", true);
    setStatus("Updating password…");
    const { error } = await client.auth.updateUser({ password: values.password });
    if (error) return setStatus(error.message, true);
    setStatus("Password updated. Redirecting…");
    setTimeout(async () => location.replace(await destinationAfterLogin()), 500);
  });

  if (window.TUTODEMY_CONFIG.googleOAuthEnabled) {
    googleButton.disabled = false;
    googleHelper.textContent = "Google login is enabled. It starts as a learner account; tutor applications can be opened after login.";
    googleButton.addEventListener("click", async () => {
      setStatus("Opening Google login…");
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: new URL("dashboard.html", location.href).href } });
      if (error) setStatus(error.message, true);
    });
  } else {
    googleButton.disabled = true;
  }

  window.addEventListener("tutodemy-auth-change", event => {
    if (event.detail?.event === "PASSWORD_RECOVERY") showPanel("reset");
  });
});
