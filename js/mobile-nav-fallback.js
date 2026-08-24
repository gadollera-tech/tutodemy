(() => {
  const STYLE_ID = "tutodemy-mobile-nav-v2";

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @media (max-width: 1100px) {
        .public-static-header {
          overflow: visible !important;
        }

        .public-static-header .nav-wrap {
          position: relative !important;
          min-height: 64px !important;
          height: 64px !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          overflow: visible !important;
        }

        .public-static-header .brand {
          width: 150px !important;
          max-width: 150px !important;
          flex: 0 1 150px !important;
          margin-right: auto !important;
        }

        .public-static-header .brand img {
          width: 100% !important;
          height: auto !important;
          max-height: 48px !important;
          object-fit: contain !important;
          object-position: left center !important;
        }

        .public-static-header .public-static-actions {
          display: none !important;
        }

        .public-static-header .menu-toggle {
          display: inline-grid !important;
          place-content: center !important;
          flex: 0 0 44px !important;
          width: 44px !important;
          height: 44px !important;
          margin-left: auto !important;
          padding: 8px !important;
          border: 0 !important;
          border-radius: 12px !important;
          background: transparent !important;
          color: var(--navy, #0C046D) !important;
          position: relative !important;
          z-index: 1002 !important;
        }

        .public-static-header .menu-toggle span {
          display: block !important;
          width: 24px !important;
          height: 2px !important;
          margin: 3px auto !important;
          border-radius: 99px !important;
          background: currentColor !important;
          transform-origin: center !important;
          transition: transform .18s ease, opacity .18s ease !important;
        }

        .public-static-header .menu-toggle[aria-expanded="true"] span:nth-child(1) {
          transform: translateY(8px) rotate(45deg) !important;
        }

        .public-static-header .menu-toggle[aria-expanded="true"] span:nth-child(2) {
          opacity: 0 !important;
        }

        .public-static-header .menu-toggle[aria-expanded="true"] span:nth-child(3) {
          transform: translateY(-8px) rotate(-45deg) !important;
        }

        .public-static-header .public-static-nav {
          display: none !important;
          margin: 0 !important;
        }

        .public-static-header .public-static-nav.open {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 4px !important;

          position: absolute !important;
          top: calc(100% + 8px) !important;
          left: max(12px, env(safe-area-inset-left)) !important;
          right: max(12px, env(safe-area-inset-right)) !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;

          max-height: calc(100dvh - 92px) !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          -webkit-overflow-scrolling: touch !important;

          padding: 10px !important;
          border: 1px solid rgba(12, 4, 109, .10) !important;
          border-radius: 18px !important;
          background: #fff !important;
          box-shadow: 0 24px 60px rgba(12, 4, 109, .18) !important;

          white-space: normal !important;
          z-index: 1001 !important;
        }

        .public-static-header .public-static-nav > a,
        .public-static-header .public-static-practice,
        .public-static-header .public-static-practice > summary {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        .public-static-header .public-static-nav > a,
        .public-static-header .public-static-practice > summary {
          min-height: 50px !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 11px 12px !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 12px !important;
          text-decoration: none !important;
          color: #4F4D4E !important;
          font-size: .94rem !important;
          font-weight: 800 !important;
          line-height: 1.2 !important;
          white-space: normal !important;
        }

        .public-static-header .public-static-nav > a:hover,
        .public-static-header .public-static-nav > a:focus-visible,
        .public-static-header .public-static-practice > summary:hover,
        .public-static-header .public-static-practice > summary:focus-visible {
          background: rgba(116, 132, 194, .10) !important;
          color: var(--navy, #0C046D) !important;
        }

        .public-static-header .public-nav-icon {
          display: grid !important;
          place-items: center !important;
          flex: 0 0 22px !important;
          width: 22px !important;
          height: 22px !important;
          color: var(--navy, #0C046D) !important;
        }

        .public-static-header .public-nav-icon svg {
          width: 21px !important;
          height: 21px !important;
          display: block !important;
        }

        .public-static-header .public-nav-chevron {
          margin-left: auto !important;
          font-size: 1rem !important;
          transition: transform .18s ease !important;
        }

        .public-static-header .public-static-practice[open] .public-nav-chevron {
          transform: rotate(180deg) !important;
        }

        .public-static-header .public-static-practice > summary {
          list-style: none !important;
          cursor: pointer !important;
        }

        .public-static-header .public-static-practice > summary::-webkit-details-marker {
          display: none !important;
        }

        .public-static-header .public-static-submenu,
        .public-static-header .public-nav-submenu {
          position: static !important;
          inset: auto !important;
          transform: none !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          margin: 4px 0 6px !important;
          padding: 6px !important;
          border: 0 !important;
          border-radius: 12px !important;
          background: #FCF9F2 !important;
          box-shadow: none !important;
          overflow: hidden !important;
        }

        .public-static-header .public-static-practice:not([open]) .public-static-submenu {
          display: none !important;
        }

        .public-static-header .public-static-practice[open] .public-static-submenu {
          display: grid !important;
          gap: 2px !important;
        }

        .public-static-header .public-static-submenu a {
          width: 100% !important;
          min-width: 0 !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          padding: 10px !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 10px !important;
          text-decoration: none !important;
          white-space: normal !important;
        }

        .public-static-header .public-static-submenu a:hover,
        .public-static-header .public-static-submenu a:focus-visible {
          background: #fff !important;
        }

        .public-static-header .public-submenu-icon {
          display: grid !important;
          place-items: center !important;
          flex: 0 0 30px !important;
          width: 30px !important;
          height: 30px !important;
          border-radius: 9px !important;
          background: #fff !important;
          color: var(--navy, #0C046D) !important;
        }

        .public-static-header .public-submenu-icon svg {
          width: 17px !important;
          height: 17px !important;
        }

        .public-static-header .public-static-submenu a > span:last-child {
          min-width: 0 !important;
        }

        .public-static-header .public-static-submenu b,
        .public-static-header .public-static-submenu small {
          display: block !important;
          white-space: normal !important;
        }

        .public-static-header .public-static-submenu b {
          color: var(--navy, #0C046D) !important;
          font-size: .84rem !important;
          line-height: 1.25 !important;
        }

        .public-static-header .public-static-submenu small {
          margin-top: 2px !important;
          color: #6B686A !important;
          font-size: .72rem !important;
          line-height: 1.3 !important;
        }

        .public-static-header .mobile-public-nav-actions {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
          margin-top: 4px !important;
          padding-top: 10px !important;
          border-top: 1px solid rgba(79, 77, 78, .12) !important;
        }

        .public-static-header .mobile-public-nav-actions .mobile-nav-action {
          min-height: 44px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 10px 12px !important;
          border-radius: 11px !important;
          border: 1px solid var(--navy, #0C046D) !important;
          font-size: .86rem !important;
          font-weight: 900 !important;
          text-decoration: none !important;
        }

        .public-static-header .mobile-nav-access {
          background: #FCF9F2 !important;
          color: var(--navy, #0C046D) !important;
        }

        .public-static-header .mobile-nav-login {
          background: var(--navy, #0C046D) !important;
          color: #fff !important;
        }

        body.mobile-nav-open {
          overflow-x: hidden !important;
        }
      }

      @media (max-width: 520px) {
        .public-static-header .nav-wrap {
          min-height: 60px !important;
          height: 60px !important;
        }

        .public-static-header .brand {
          width: 136px !important;
          max-width: 136px !important;
          flex-basis: 136px !important;
        }

        .public-static-header .public-static-nav.open {
          top: calc(100% + 6px) !important;
          left: max(8px, env(safe-area-inset-left)) !important;
          right: max(8px, env(safe-area-inset-right)) !important;
          max-height: calc(100dvh - 78px) !important;
          border-radius: 16px !important;
          padding: 8px !important;
        }

        .public-static-header .public-static-nav > a,
        .public-static-header .public-static-practice > summary {
          min-height: 48px !important;
          padding: 10px !important;
          font-size: .91rem !important;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const init = () => {
    const header = document.querySelector(".public-static-header");
    if (!header) return;

    injectStyles();

    const toggle = header.querySelector(".menu-toggle");
    const nav = header.querySelector(".public-static-nav");
    if (!toggle || !nav) return;

    const mobileQuery = window.matchMedia("(max-width: 1100px)");

    const setOpen = (open) => {
      const shouldOpen = Boolean(open && mobileQuery.matches);

      nav.classList.toggle("open", shouldOpen);
      toggle.setAttribute("aria-expanded", String(shouldOpen));
      toggle.setAttribute(
        "aria-label",
        shouldOpen ? "Close navigation" : "Open navigation"
      );
      document.body.classList.toggle("mobile-nav-open", shouldOpen);

      if (!shouldOpen) {
        header
          .querySelectorAll(".public-static-practice[open]")
          .forEach((details) => details.removeAttribute("open"));
      }
    };

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!nav.classList.contains("open"));
    });

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (link) setOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (
        nav.classList.contains("open") &&
        !event.target.closest(".public-static-header")
      ) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });

    const handleViewportChange = () => {
      if (!mobileQuery.matches) setOpen(false);
    };

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", handleViewportChange);
    } else if (typeof mobileQuery.addListener === "function") {
      mobileQuery.addListener(handleViewportChange);
    }

    setOpen(false);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
