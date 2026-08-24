(() => {
  const init = () => {
    const header = document.querySelector(".public-static-header");
    if (!header) return;

    const toggle = header.querySelector(".menu-toggle");
    const nav = header.querySelector(".public-static-nav");
    if (!toggle || !nav) return;

    const setOpen = open => {
      const mobile = window.matchMedia("(max-width: 1100px)").matches;
      const shouldOpen = Boolean(open && mobile);

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
          .forEach(details => details.removeAttribute("open"));
      }
    };

    toggle.addEventListener("click", event => {
      event.stopPropagation();
      setOpen(!nav.classList.contains("open"));
    });

    nav.addEventListener("click", event => {
      if (event.target.closest("a[href]")) setOpen(false);
    });

    document.addEventListener("click", event => {
      if (
        nav.classList.contains("open") &&
        !event.target.closest(".public-static-header")
      ) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1100) setOpen(false);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();