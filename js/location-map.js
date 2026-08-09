(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const esc = value => window.Tuto?.escape?.(String(value ?? "")) ?? String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function drawOutline(svg) {
    const shapeHolder = svg?.querySelector("[data-map-shapes]");
    if (!shapeHolder || shapeHolder.childElementCount || !window.TutoPHMap?.paths) return;
    const fallbackFills = ["#ffefbd", "#ffe39a", "#f9d56b", "#f4bd42"];
    shapeHolder.innerHTML = window.TutoPHMap.paths.map((path, index) => `<path class="ph-island ph-island-${(index % 4) + 1}" d="${path}" fill="${fallbackFills[index % fallbackFills.length]}" stroke="#8a5a00" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>`).join("");
  }

  function tutorMatchesMode(tutor, mode) {
    const modes = Array.isArray(tutor?.teaching_modes) ? tutor.teaching_modes : [];
    if (mode === "all") return true;
    if (mode === "in-person") return modes.includes("In-person") || modes.includes("Either");
    if (mode === "online") return modes.includes("Online") || modes.includes("Either");
    return true;
  }

  function countTutorRegions(tutors, mode) {
    const counts = new Map();
    (tutors || []).filter(tutor => tutorMatchesMode(tutor, mode)).forEach(tutor => {
      const regionId = window.TutoPH?.regionForProvince?.(tutor.province);
      if (!regionId) return;
      counts.set(regionId, (counts.get(regionId) || 0) + 1);
    });
    return counts;
  }

  function countLearnerRegions(rows) {
    const counts = new Map();
    (rows || []).forEach(row => {
      const regionId = window.TutoPH?.regionForProvince?.(row.province);
      const value = Number(row.learner_count || 0);
      if (!regionId || value <= 0) return;
      counts.set(regionId, (counts.get(regionId) || 0) + value);
    });
    return counts;
  }

  async function loadRows(layer) {
    const api = window.TutoMarketplace;
    await api?.ready;
    if (!api?.isReady?.()) return [];
    if (layer === "learners") {
      const request = api.publicLearnerLocationInsights?.();
      return request ? request.catch(() => []) : [];
    }
    return api.publicTutors({ acceptingOnly: false }).catch(() => []);
  }

  async function mount(options = {}) {
    const svg = document.querySelector(options.svg || "");
    const markerHolder = svg?.querySelector("[data-map-markers]");
    const summary = document.querySelector(options.summary || "");
    const list = document.querySelector(options.list || "");
    const modeFilter = document.querySelector(options.modeFilter || "");
    const modeButtons = modeFilter ? [...modeFilter.querySelectorAll("[data-location-mode]")] : [];
    const layer = options.layer === "learners" ? "learners" : "tutors";
    let mode = "all";
    let rows = [];

    if (!svg || !markerHolder || !window.TutoPH || !window.TutoPHMap) return null;
    drawOutline(svg);
    const regionById = new Map(window.TutoPH.regions.map(item => [item.id, item]));

    function countsForCurrentView() {
      return layer === "learners" ? countLearnerRegions(rows) : countTutorRegions(rows, mode);
    }

    function showRegion(regionId, counts) {
      const region = regionById.get(regionId);
      if (!region || !summary) return;
      const count = counts.get(regionId) || 0;
      if (layer === "learners") {
        summary.innerHTML = `<b>${esc(region.name)}</b><span>${count ? `${count} anonymous learner signal${count === 1 ? "" : "s"}` : "No public learner-demand total yet"}</span>`;
      } else {
        summary.innerHTML = `<b>${esc(region.name)}</b><span>${count ? `${count} approved tutor${count === 1 ? "" : "s"} in this regional overview` : "No approved tutor location shown yet"}</span>`;
      }
    }

    function render() {
      const counts = countsForCurrentView();
      const ranked = [...counts.entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
      const max = Math.max(1, ...ranked.map(([, count]) => count));
      markerHolder.innerHTML = "";

      ranked.forEach(([regionId, count]) => {
        const region = regionById.get(regionId);
        if (!region) return;
        const { x, y } = window.TutoPHMap.project(region.lat, region.lon);
        const radius = 10 + Math.sqrt(count / max) * 15;
        const group = document.createElementNS(SVG_NS, "g");
        group.classList.add("map-marker", "has-data");
        group.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        group.setAttribute("tabindex", "0");
        group.setAttribute("role", "button");
        group.setAttribute("aria-label", `${region.name}: ${count} ${layer === "learners" ? "learner demand signal" : "approved tutor"}${count === 1 ? "" : "s"}`);
        group.innerHTML = `<circle r="${radius.toFixed(1)}"></circle><text y="4">${count}</text><title>${esc(region.name)}: ${count}</title>`;
        const select = () => showRegion(regionId, counts);
        group.addEventListener("click", select);
        group.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            select();
          }
        });
        markerHolder.appendChild(group);
      });

      if (!ranked.length) {
        if (summary) {
          summary.innerHTML = layer === "learners"
            ? `<b>No public learner-demand totals yet.</b><span>Only anonymous, opt-in province totals that meet the privacy threshold are displayed.</span>`
            : `<b>No approved tutor locations yet.</b><span>Approved profiles with a province will appear automatically.</span>`;
        }
        if (list) list.innerHTML = "";
        return;
      }

      const total = ranked.reduce((sum, [, count]) => sum + count, 0);
      if (summary) {
        summary.innerHTML = layer === "learners"
          ? `<b>Where learners are asking for support</b><span>${total} anonymous, opt-in learner signal${total === 1 ? "" : "s"} represented</span>`
          : `<b>Where approved tutors are available</b><span>${mode === "all" ? "All teaching modes" : mode === "in-person" ? "Face-to-face availability" : "Online availability"}</span>`;
      }

      if (list) {
        list.innerHTML = ranked.slice(0, 5).map(([regionId, count]) => {
          const region = regionById.get(regionId);
          return `<button type="button" data-region-id="${esc(regionId)}"><span>${esc(region?.name || regionId)}</span><b>${count}</b></button>`;
        }).join("");
        list.querySelectorAll("[data-region-id]").forEach(button => {
          button.addEventListener("click", () => showRegion(button.dataset.regionId, counts));
        });
      }
    }

    modeButtons.forEach(button => {
      button.addEventListener("click", () => {
        mode = button.dataset.locationMode || "all";
        modeButtons.forEach(item => item.classList.toggle("active", item === button));
        render();
      });
    });

    try {
      rows = await loadRows(layer);
    } catch (error) {
      console.warn("Location map data could not load:", error);
      rows = [];
    }
    render();
    return { render, rows };
  }

  window.TutoLocationMap = { mount, drawOutline };
})();
