document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoAuth?.ready;

  const service = window.TutoSupabase;
  const client = service?.client;
  const setup = document.querySelector("#auth-setup");
  const forms = document.querySelector("#auth-forms");
  const status = document.querySelector("#auth-status");
  const googleButton = document.querySelector("#google-login");
  const googleHelper = document.querySelector("#google-helper");
  const tabs = [...document.querySelectorAll("[data-auth-tab]")];
  const panels = [...document.querySelectorAll(".auth-panel")];

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle("error", isError);
  };

  const showPanel = name => {
    panels.forEach(panel => panel.classList.toggle("active", panel.id === `${name}-panel`));
    tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.authTab === name));
    setStatus("");
  };

  if (!window.TutoAuth?.isConfigured?.()) {
    setup.hidden = false;
    forms.hidden = true;
    return;
  }

  setup.hidden = true;
  forms.hidden = false;

  tabs.forEach(tab => tab.addEventListener("click", () => showPanel(tab.dataset.authTab)));
  document.querySelector("#show-forgot").addEventListener("click", () => showPanel("forgot"));
  document.querySelector("#back-signin").addEventListener("click", () => showPanel("signin"));

  const isResetMode = new URLSearchParams(location.search).get("mode") === "reset";
  if (isResetMode) showPanel("reset");

  if (window.TutoAuth.getUser() && !isResetMode) {
    setStatus("You are already logged in. Redirecting to your profile…");
    setTimeout(() => location.replace("profile.html"), 500);
  }

  document.querySelector("#signin-form").addEventListener("submit", async event => {
    event.preventDefault();
    setStatus("Logging in…");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const { error } = await client.auth.signInWithPassword({ email: values.email, password: values.password });
    if (error) {
      setStatus(error.message, true);
      return;
    }
    setStatus("Login successful. Syncing your progress…");
    await window.TutoAuth.refresh();
    await window.TutoCloud?.syncAll?.({ silent: true });
    location.replace("dashboard.html");
  });

  document.querySelector("#signup-form").addEventListener("submit", async event => {
    event.preventDefault();
    setStatus("Creating your account…");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const redirectTo = new URL("profile.html", location.href).href;
    const { data, error } = await client.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: values.full_name,
          student_level: values.student_level,
          target_exam: values.target_exam
        }
      }
    });
    if (error) {
      setStatus(error.message, true);
      return;
    }
    event.currentTarget.reset();
    if (data.session) {
      await window.TutoAuth.refresh();
      await window.TutoCloud?.syncAll?.({ silent: true });
      setStatus("Account created. Opening your profile…");
      location.replace("profile.html");
    } else {
      setStatus("Account created. Check your email and open the confirmation link before logging in.");
    }
  });

  document.querySelector("#forgot-form").addEventListener("submit", async event => {
    event.preventDefault();
    setStatus("Sending recovery email…");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const redirectTo = new URL("auth.html?mode=reset", location.href).href;
    const { error } = await client.auth.resetPasswordForEmail(values.email, { redirectTo });
    if (error) {
      setStatus(error.message, true);
      return;
    }
    setStatus("Recovery email sent. Open its link on this website to choose a new password.");
  });

  document.querySelector("#reset-form").addEventListener("submit", async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (values.password !== values.confirm_password) {
      setStatus("The passwords do not match.", true);
      return;
    }
    setStatus("Updating password…");
    const { error } = await client.auth.updateUser({ password: values.password });
    if (error) {
      setStatus(error.message, true);
      return;
    }
    setStatus("Password updated. Opening your profile…");
    setTimeout(() => location.replace("profile.html"), 700);
  });

  if (window.TUTODEMY_CONFIG.googleOAuthEnabled) {
    googleButton.disabled = false;
    googleHelper.textContent = "Google login is enabled for this site.";
    googleButton.addEventListener("click", async () => {
      setStatus("Opening Google login…");
      const redirectTo = new URL("profile.html", location.href).href;
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) setStatus(error.message, true);
    });
  } else {
    googleButton.disabled = true;
  }

  window.addEventListener("tutodemy-auth-change", event => {
    if (event.detail?.event === "PASSWORD_RECOVERY") showPanel("reset");
  });
});
