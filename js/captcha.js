(() => {
  "use strict";

  const widgets = new Map();
  const tokens = new Map();
  let loaderPromise = null;

  const siteKey = () => String(window.TUTODEMY_CONFIG?.hcaptchaSiteKey || "").trim();
  const enabled = () => Boolean(siteKey());

  const loadScript = () => {
    if (!enabled()) return Promise.resolve(null);
    if (window.hcaptcha?.render) return Promise.resolve(window.hcaptcha);
    if (loaderPromise) return loaderPromise;

    loaderPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-tutodemy-hcaptcha]');
      if (existing) {
        const timer = setInterval(() => {
          if (window.hcaptcha?.render) {
            clearInterval(timer);
            resolve(window.hcaptcha);
          }
        }, 80);
        setTimeout(() => {
          clearInterval(timer);
          if (window.hcaptcha?.render) resolve(window.hcaptcha);
          else reject(new Error("hCaptcha did not finish loading."));
        }, 10000);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.tutodemyHcaptcha = "true";
      script.onload = () => {
        const wait = setInterval(() => {
          if (window.hcaptcha?.render) {
            clearInterval(wait);
            resolve(window.hcaptcha);
          }
        }, 50);
        setTimeout(() => {
          clearInterval(wait);
          if (window.hcaptcha?.render) resolve(window.hcaptcha);
          else reject(new Error("hCaptcha API is unavailable."));
        }, 8000);
      };
      script.onerror = () => reject(new Error("Unable to load hCaptcha."));
      document.head.appendChild(script);
    });

    return loaderPromise;
  };

  const dispatch = (name, event, token = "") => {
    window.dispatchEvent(new CustomEvent("tutodemy-captcha-change", {
      detail: { name, event, token }
    }));
  };

  async function mount(name, container) {
    if (!container) return null;

    if (!enabled()) {
      container.hidden = true;
      container.dataset.captchaState = "disabled";
      return null;
    }

    container.hidden = false;
    container.dataset.captchaState = "loading";
    container.innerHTML = '<p class="tuto-captcha-loading">Loading human verification…</p>';

    try {
      const api = await loadScript();
      if (!api?.render) throw new Error("hCaptcha API is unavailable.");

      container.innerHTML = "";
      const widgetId = api.render(container, {
        sitekey: siteKey(),
        theme: "light",
        callback(token) {
          tokens.set(name, token || "");
          container.dataset.captchaState = token ? "verified" : "waiting";
          dispatch(name, "verified", token || "");
        },
        "expired-callback"() {
          tokens.delete(name);
          container.dataset.captchaState = "expired";
          dispatch(name, "expired");
        },
        "error-callback"() {
          tokens.delete(name);
          container.dataset.captchaState = "error";
          dispatch(name, "error");
        }
      });

      widgets.set(name, widgetId);
      container.dataset.captchaState = "waiting";
      return widgetId;
    } catch (error) {
      container.dataset.captchaState = "error";
      container.innerHTML = '<p class="tuto-captcha-error">Human verification could not load. Please refresh and try again.</p>';
      console.error("TutoDemy hCaptcha initialization failed:", error);
      dispatch(name, "error");
      return null;
    }
  }

  function getToken(name) {
    return tokens.get(name) || "";
  }

  function requireToken(name) {
    return !enabled() || Boolean(getToken(name));
  }

  function reset(name) {
    tokens.delete(name);
    const widgetId = widgets.get(name);
    if (window.hcaptcha?.reset && widgetId !== undefined) {
      try { window.hcaptcha.reset(widgetId); } catch {}
    }
    dispatch(name, "reset");
  }

  window.TutoCaptcha = {
    enabled,
    mount,
    getToken,
    requireToken,
    reset
  };
})();