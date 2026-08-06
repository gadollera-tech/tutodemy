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
  updateRoleFields();

  if (!window.TutoAuth?.isConfigured?.()) {
    setup.hidden = false;
    forms.hidden = true;
    return;
  }
  setup.hidden = true;
  forms.hidden = false;

  tabs.forEach(tab => tab.addEventListener("click", () => showPanel(tab.dataset.authTab)));
  document.querySelector("#show-forgot")?.addEventListener("click", () => showPanel("forgot"));
  document.querySelector("#back-signin")?.addEventListener("click", () => showPanel("signin"));

  const isResetMode = new URLSearchParams(location.search).get("mode") === "reset";
  if (isResetMode) showPanel("reset");

  async function destinationAfterLogin() {
    const queryNext = new URLSearchParams(location.search).get("next");
    const storedNext = sessionStorage.getItem("tutodemyPostLoginUrl");
    if (storedNext) sessionStorage.removeItem("tutodemyPostLoginUrl");
    if (queryNext) return queryNext;
    if (storedNext) return storedNext;
    try {
      const profile = await window.TutoMarketplace?.getMyAccountProfile(true);
      return profile?.role === "tutor" ? "tutor-dashboard.html" : "dashboard.html";
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
    const { error } = await client.auth.signInWithPassword({ email: values.email, password: values.password });
    if (error) return setStatus(error.message, true);
    await window.TutoAuth.refresh();
    await window.TutoCloud?.syncAll?.({ silent: true });
    location.replace(await destinationAfterLogin());
  });

  signupForm.addEventListener("submit", async event => {
    event.preventDefault();
    setStatus("Creating your account…");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const role = values.role === "tutor" ? "tutor" : "learner";
    const redirectPage = role === "tutor" ? "tutor-onboarding.html" : "profile.html";
    const redirectTo = new URL(redirectPage, location.href).href;
    const { data, error } = await client.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: values.full_name,
          student_level: role === "learner" ? values.student_level : "",
          target_exam: role === "learner" ? values.target_exam : "",
          role
        }
      }
    });
    if (error) return setStatus(error.message, true);
    event.currentTarget.reset();
    updateRoleFields();
    if (data.session) {
      await window.TutoAuth.refresh();
      location.replace(redirectPage);
    } else {
      setStatus(`Account created. Check your email, confirm the account, then continue to ${role === "tutor" ? "the tutor application" : "your profile"}.`);
    }
  });

  document.querySelector("#forgot-form").addEventListener("submit", async event => {
    event.preventDefault();
    setStatus("Sending recovery email…");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const { error } = await client.auth.resetPasswordForEmail(values.email, { redirectTo: new URL("auth.html?mode=reset", location.href).href });
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
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: new URL("profile.html", location.href).href } });
      if (error) setStatus(error.message, true);
    });
  } else {
    googleButton.disabled = true;
  }

  window.addEventListener("tutodemy-auth-change", event => {
    if (event.detail?.event === "PASSWORD_RECOVERY") showPanel("reset");
  });
});
