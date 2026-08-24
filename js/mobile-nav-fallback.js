(() => {
  const STYLE_ID = "tutodemy-mobile-nav-v4";

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* MOBILEMENU4
         Important: js/main.js replaces the static header after page load.
         These selectors intentionally target BOTH the initial static header
         and the dynamically-rendered public header. */
      @media (max-width: 1100px) {
        body.role-public .site-header,
        .public-static-header {
          overflow: visible !important;
        }

        body.role-public .site-header .nav-wrap,
        .public-static-header .nav-wrap {
          position: relative !important;
          min-height: 64px !important;
          height: 64px !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          overflow: visible !important;
        }

        body.role-public .site-header .brand,
        .public-static-header .brand {
          width: 150px !important;
          max-width: 150px !important;
          flex: 0 1 150px !important;
          margin-right: auto !important;
        }

        body.role-public .site-header .brand img,
        .public-static-header .brand img {
          width: 100% !important;
          height: auto !important;
          max-height: 48px !important;
          object-fit: contain !important;
          object-position: left center !important;
        }

        body.role-public .site-header .workspace-topbar-title {
          display: none !important;
        }

        body.role-public .site-header .nav-actions,
        .public-static-header .public-static-actions {
          display: none !important;
        }

        body.role-public .site-header .menu-toggle,
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

        body.role-public .site-header .menu-toggle span,
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

        body.role-public .site-header .menu-toggle[aria-expanded="true"] span:nth-child(1),
        .public-static-header .menu-toggle[aria-expanded="true"] span:nth-child(1) {
          transform: translateY(8px) rotate(45deg) !important;
        }

        body.role-public .site-header .menu-toggle[aria-expanded="true"] span:nth-child(2),
        .public-static-header .menu-toggle[aria-expanded="true"] span:nth-child(2) {
          opacity: 0 !important;
        }

        body.role-public .site-header .menu-toggle[aria-expanded="true"] span:nth-child(3),
        .public-static-header .menu-toggle[aria-expanded="true"] span:nth-child(3) {
          transform: translateY(-8px) rotate(-45deg) !important;
        }

        /* Hide public nav until hamburger is opened. */
        body.role-public .site-header .main-nav,
        .public-static-header .public-static-nav {
          display: none !important;
          margin: 0 !important;
        }

        /* Critical fix: main.js creates .main-nav.open, NOT .public-static-nav.open. */
        body.role-public .site-header .main-nav.open,
        .public-static-header .public-static-nav.open {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          justify-content: flex-start !important;
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
          border: 1px solid rgba(12,4,109,.10) !important;
          border-radius: 18px !important;
          background: #fff !important;
          box-shadow: 0 24px 60px rgba(12,4,109,.18) !important;
          white-space: normal !important;
          z-index: 1001 !important;
        }

        /* Main rows */
        body.role-public .site-header .main-nav > a,
        body.role-public .site-header .main-nav > .nav-dropdown,
        body.role-public .site-header .main-nav > .nav-dropdown > .nav-dropdown-toggle,
        .public-static-header .public-static-nav > a,
        .public-static-header .public-static-practice,
        .public-static-header .public-static-practice > summary {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        body.role-public .site-header .main-nav > a,
        body.role-public .site-header .nav-dropdown-toggle,
        .public-static-header .public-static-nav > a,
        .public-static-header .public-static-practice > summary {
          min-height: 50px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 12px !important;
          padding: 11px 12px !important;
          margin: 0 !important;
          border: 0 !important;
          border-bottom: 0 !important;
          border-radius: 12px !important;
          text-decoration: none !important;
          color: #4F4D4E !important;
          background: transparent !important;
          font-size: .94rem !important;
          font-weight: 800 !important;
          line-height: 1.2 !important;
          white-space: normal !important;
        }

        body.role-public .site-header .main-nav > a:hover,
        body.role-public .site-header .main-nav > a:focus-visible,
        body.role-public .site-header .nav-dropdown-toggle:hover,
        body.role-public .site-header .nav-dropdown-toggle:focus-visible,
        .public-static-header .public-static-nav > a:hover,
        .public-static-header .public-static-practice > summary:hover {
          background: rgba(116,132,194,.10) !important;
          color: var(--navy, #0C046D) !important;
        }

        body.role-public .site-header .public-nav-icon,
        .public-static-header .public-nav-icon {
          display: grid !important;
          place-items: center !important;
          flex: 0 0 22px !important;
          width: 22px !important;
          height: 22px !important;
          color: var(--navy, #0C046D) !important;
        }

        body.role-public .site-header .public-nav-icon svg,
        .public-static-header .public-nav-icon svg {
          width: 21px !important;
          height: 21px !important;
          display: block !important;
        }

        body.role-public .site-header .public-nav-chevron,
        .public-static-header .public-nav-chevron {
          margin-left: auto !important;
        }

        body.role-public .site-header .nav-dropdown.open .public-nav-chevron,
        .public-static-header .public-static-practice[open] .public-nav-chevron {
          transform: rotate(180deg) !important;
        }

        /* Dynamic Practice dropdown made by main.js */
        body.role-public .site-header .nav-dropdown {
          position: static !important;
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
        }

        body.role-public .site-header .nav-dropdown .nav-submenu {
          display: none !important;
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

        body.role-public .site-header .nav-dropdown.open .nav-submenu {
          display: grid !important;
          gap: 2px !important;
        }

        /* Initial static Practice dropdown */
        .public-static-header .public-static-submenu {
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
        }

        .public-static-header .public-static-practice:not([open]) .public-static-submenu {
          display: none !important;
        }

        .public-static-header .public-static-practice[open] .public-static-submenu {
          display: grid !important;
          gap: 2px !important;
        }

        body.role-public .site-header .nav-submenu a,
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
          background: transparent !important;
        }

        body.role-public .site-header .nav-submenu a:hover,
        .public-static-header .public-static-submenu a:hover {
          background: #fff !important;
        }

        body.role-public .site-header .public-submenu-icon,
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

        body.role-public .site-header .public-submenu-icon svg,
        .public-static-header .public-submenu-icon svg {
          width: 17px !important;
          height: 17px !important;
        }

        body.role-public .site-header .nav-submenu b,
        body.role-public .site-header .nav-submenu small,
        .public-static-header .public-static-submenu b,
        .public-static-header .public-static-submenu small {
          display: block !important;
          white-space: normal !important;
        }

        body.role-public .site-header .nav-submenu b,
        .public-static-header .public-static-submenu b {
          color: var(--navy, #0C046D) !important;
          font-size: .84rem !important;
        }

        body.role-public .site-header .nav-submenu small,
        .public-static-header .public-static-submenu small {
          margin-top: 2px !important;
          color: #6B686A !important;
          font-size: .72rem !important;
        }

        body.role-public .site-header .mobile-public-nav-actions,
        .public-static-header .mobile-public-nav-actions {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
          width: 100% !important;
          margin-top: 4px !important;
          padding-top: 10px !important;
          border-top: 1px solid rgba(79,77,78,.12) !important;
        }

        body.role-public .site-header .mobile-public-nav-actions .mobile-nav-action,
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

        body.role-public .site-header .mobile-nav-access,
        .public-static-header .mobile-nav-access {
          background: #FCF9F2 !important;
          color: var(--navy, #0C046D) !important;
        }

        body.role-public .site-header .mobile-nav-login,
        .public-static-header .mobile-nav-login {
          background: var(--navy, #0C046D) !important;
          color: #fff !important;
        }

        body.mobile-nav-open {
          overflow-x: hidden !important;
        }
      }

      @media (max-width: 520px) {
        body.role-public .site-header .nav-wrap,
        .public-static-header .nav-wrap {
          min-height: 60px !important;
          height: 60px !important;
        }

        body.role-public .site-header .brand,
        .public-static-header .brand {
          width: 136px !important;
          max-width: 136px !important;
          flex-basis: 136px !important;
        }

        body.role-public .site-header .main-nav.open,
        .public-static-header .public-static-nav.open {
          top: calc(100% + 6px) !important;
          left: max(8px, env(safe-area-inset-left)) !important;
          right: max(8px, env(safe-area-inset-right)) !important;
          max-height: calc(100dvh - 78px) !important;
          padding: 8px !important;
          border-radius: 16px !important;
        }
      }
    `;

    document.head.appendChild(style);
  };

  injectStyles();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectStyles, { once: true });
  }
})();
