(() => {
  "use strict";

  const script = document.currentScript;
  const scriptUrl = new URL(script?.src || "js/pwa.js", window.location.href);
  const appRoot = new URL("../", scriptUrl);
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  let dismissedUntil = 0;
  try { dismissedUntil = Number(localStorage.getItem("tutodemyInstallDismissedUntil") || 0); } catch {}
  let deferredPrompt = null;
  let installCard = null;

  function createInstallCard(mode) {
    if (installCard || isStandalone() || Date.now() < dismissedUntil) return;

    const card = document.createElement("aside");
    card.className = "pwa-install-card";
    card.setAttribute("role", "region");
    card.setAttribute("aria-label", "Install TutoDemy app");
    card.innerHTML = `
      <img src="${new URL("assets/images/icon-192.png", appRoot)}" alt="" width="48" height="48">
      <div class="pwa-install-copy">
        <strong>Install TutoDemy</strong>
        <span>${mode === "ios" ? "Add it to your Home Screen for quick access." : "Use TutoDemy like an app on this device."}</span>
      </div>
      <button class="pwa-install-action" type="button">${mode === "ios" ? "How" : "Install"}</button>
      <button class="pwa-install-close" type="button" aria-label="Dismiss install suggestion">×</button>`;

    document.body.append(card);
    document.body.classList.add("pwa-install-visible");
    installCard = card;

    card.querySelector(".pwa-install-close")?.addEventListener("click", () => dismissInstallCard(7));
    card.querySelector(".pwa-install-action")?.addEventListener("click", async () => {
      if (mode === "ios") {
        showIosGuide();
        return;
      }
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch {}
      deferredPrompt = null;
      removeInstallCard();
    });
  }

  function removeInstallCard() {
    installCard?.remove();
    installCard = null;
    document.body.classList.remove("pwa-install-visible");
  }

  function dismissInstallCard(days) {
    try { localStorage.setItem("tutodemyInstallDismissedUntil", String(Date.now() + days * 86400000)); } catch {}
    removeInstallCard();
  }

  function showIosGuide() {
    let dialog = document.querySelector("#pwa-ios-guide");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "pwa-ios-guide";
      dialog.className = "pwa-install-dialog";
      dialog.innerHTML = `
        <form method="dialog">
          <button class="pwa-dialog-close" value="close" aria-label="Close">×</button>
          <img src="${new URL("assets/images/icon-192.png", appRoot)}" alt="TutoDemy owl icon" width="72" height="72">
          <h2>Install TutoDemy on iPhone or iPad</h2>
          <ol>
            <li>Open this page in a browser that shows the <b>Share</b> menu.</li>
            <li>Tap <b>Share</b>, then choose <b>Add to Home Screen</b>.</li>
            <li>Turn on <b>Open as Web App</b>, then tap <b>Add</b>.</li>
          </ol>
          <button class="button" value="close">Got it</button>
        </form>`;
      document.body.append(dialog);
    }
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      const workerUrl = new URL("service-worker.js", appRoot);
      navigator.serviceWorker.register(workerUrl, { scope: appRoot.pathname }).catch(error => {
        console.warn("TutoDemy service worker registration failed:", error);
      });
    }, { once: true });
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    createInstallCard("prompt");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    try { localStorage.removeItem("tutodemyInstallDismissedUntil"); } catch {}
    removeInstallCard();
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.classList.toggle("pwa-standalone", isStandalone());
    if (isIos && !isStandalone()) window.setTimeout(() => createInstallCard("ios"), 1400);
  });
})();
