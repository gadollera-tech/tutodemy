(() => {
  "use strict";

  let runtimePromise = null;
  let runtimeReady = false;

  const scripts = [
    "js/config.js",
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    "js/supabase-client.js",
    "js/auth-core.js",
    "js/cloud-sync.js",
    "js/marketplace-api.js?v=20260819-performance1",
    "js/captcha.js?v=20260816-ui12",
    "js/home-auth.js?v=20260816-ui12"
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(
        script => script.src === new URL(src, location.href).href
      );

      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }

        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.homeRuntime = "true";
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => {
        reject(new Error(`Could not load ${src}`));
      }, { once: true });
      document.head.append(script);
    });
  }

  async function ensureRuntime() {
    if (runtimeReady) return true;
    if (runtimePromise) return runtimePromise;

    runtimePromise = (async () => {
      for (const src of scripts) {
        await loadScript(src);
      }

      runtimeReady = true;
      document.documentElement.classList.add("home-runtime-ready");
      return true;
    })().catch(error => {
      console.warn("Home account runtime could not be loaded:", error);

      const unavailable = document.querySelector("#home-auth-unavailable");
      const forms = document.querySelector("#home-auth-forms");

      if (unavailable) unavailable.hidden = false;
      if (forms) forms.hidden = true;

      runtimePromise = null;
      return false;
    });

    return runtimePromise;
  }

  function scheduleAfterPaint() {
    const start = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(
          () => ensureRuntime(),
          { timeout: 1200 }
        );
      } else {
        setTimeout(() => ensureRuntime(), 500);
      }
    };

    requestAnimationFrame(() => requestAnimationFrame(start));
  }

  const authCard = document.querySelector("#home-auth-card");

  if (authCard) {
    // Focusing/tapping the account card starts loading immediately.
    authCard.addEventListener("pointerdown", () => {
      ensureRuntime();
    }, { once: true, passive: true });

    authCard.addEventListener("focusin", () => {
      ensureRuntime();
    }, { once: true });

    // If a form is submitted before the runtime finishes, hold the
    // submission, finish loading, then submit once the listeners exist.
    authCard.addEventListener("submit", async event => {
      if (runtimeReady) return;

      event.preventDefault();
      const form = event.target;
      const submitter = event.submitter || null;
      const ok = await ensureRuntime();

      if (!ok || !form?.isConnected) return;

      if (typeof form.requestSubmit === "function") {
        form.requestSubmit(submitter || undefined);
      }
    }, true);

    const googleButton = document.querySelector("#home-google-login");
    googleButton?.addEventListener("click", async event => {
      if (runtimeReady) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const ok = await ensureRuntime();
      if (ok && googleButton.isConnected) googleButton.click();
    }, true);
  }

  scheduleAfterPaint();

  // Useful for diagnostics without exposing any secret.
  window.TutoHomeRuntime = {
    ensure: ensureRuntime,
    isReady: () => runtimeReady
  };
})();
