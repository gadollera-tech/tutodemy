document.addEventListener("DOMContentLoaded", async () => {
  const api = window.TutoMarketplace;
  const ph = window.TutoPH;
  const tutorHolder = document.querySelector("#home-tutors");
  const markerHolder = document.querySelector("#location-map-markers");
  const summary = document.querySelector("#location-summary");
  const regionList = document.querySelector("#location-region-list");
  const modeFilter = document.querySelector("#location-mode-filter");
  const layerButtons = [...document.querySelectorAll("[data-location-layer]")];
  const modeButtons = [...document.querySelectorAll("[data-location-mode]")];

  let layer = "tutors";
  let mode = "all";
  let tutors = [];
  let learnerRows = [];

  const esc = value => window.Tuto?.escape?.(String(value ?? "")) ?? String(value ?? "");
  const regionById = new Map((ph?.regions || []).map(item => [item.id, item]));

  function tutorMatchesMode(tutor) {
    const modes = tutor.teaching_modes || [];
    if (mode === "all") return true;
    if (mode === "in-person") return modes.includes("In-person") || modes.includes("Either");
    if (mode === "online") return modes.includes("Online") || modes.includes("Either");
    return true;
  }

  function tutorCounts() {
    const counts = new Map();
    tutors.filter(tutorMatchesMode).forEach(tutor => {
      const region = ph?.regionForProvince?.(tutor.province);
      if (!region) return;
      counts.set(region, (counts.get(region) || 0) + 1);
    });
    return counts;
  }

  function learnerCounts() {
    const counts = new Map();
    learnerRows.forEach(row => {
      const region = ph?.regionForProvince?.(row.province);
      if (!region) return;
      counts.set(region, (counts.get(region) || 0) + Number(row.learner_count || 0));
    });
    return counts;
  }

  const project = (lat, lon) => {
    const x = 45 + ((lon - 116) / 11) * 335;
    const y = 42 + ((21.5 - lat) / 17) * 555;
    return { x, y };
  };

  function renderMap() {
    if (!markerHolder || !ph) return;
    const counts = layer === "tutors" ? tutorCounts() : learnerCounts();
    const max = Math.max(1, ...counts.values());
    markerHolder.innerHTML = "";

    ph.regions.forEach(region => {
      const count = counts.get(region.id) || 0;
      const { x, y } = project(region.lat, region.lon);
      const radius = count ? 7 + Math.sqrt(count / max) * 13 : 4.5;
      const opacity = count ? 0.45 + (count / max) * 0.55 : 0.18;
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.classList.add("map-marker");
      if (count) group.classList.add("has-data");
      group.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      group.setAttribute("tabindex", "0");
      group.setAttribute("role", "button");
      group.setAttribute("aria-label", `${region.name}: ${count} ${layer === "tutors" ? "approved tutor" : "learner"}${count === 1 ? "" : "s"}`);
      group.innerHTML = `<circle r="${radius.toFixed(1)}" style="--marker-opacity:${opacity.toFixed(2)}"></circle>${count ? `<text y="4">${count}</text>` : ""}`;
      const select = () => showRegion(region.id, counts);
      group.addEventListener("click", select);
      group.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } });
      markerHolder.appendChild(group);
    });

    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (!ranked.length) {
      summary.innerHTML = layer === "tutors"
        ? `<b>No approved tutor locations yet.</b><span>Approved profiles with a province will appear automatically.</span>`
        : `<b>No public learner-demand totals yet.</b><span>For privacy, a province appears only after enough learners opt in.</span>`;
      regionList.innerHTML = "";
      return;
    }

    const total = ranked.reduce((sum, [, count]) => sum + count, 0);
    summary.innerHTML = layer === "tutors"
      ? `<b>${total} approved tutor${total === 1 ? "" : "s"} represented</b><span>${mode === "all" ? "Across all teaching modes" : mode === "in-person" ? "Available for face-to-face support" : "Available for online support"}</span>`
      : `<b>${total} learner${total === 1 ? "" : "s"} represented</b><span>Anonymous, opt-in province totals only</span>`;

    regionList.innerHTML = ranked.slice(0, 5).map(([id, count]) => {
      const region = regionById.get(id);
      return `<button type="button" data-region-id="${id}"><span>${esc(region?.name || id)}</span><b>${count}</b></button>`;
    }).join("");
    regionList.querySelectorAll("[data-region-id]").forEach(button => button.addEventListener("click", () => showRegion(button.dataset.regionId, counts)));
  }

  function showRegion(regionId, counts) {
    const region = regionById.get(regionId);
    const count = counts.get(regionId) || 0;
    if (!region) return;
    summary.innerHTML = `<b>${esc(region.name)}</b><span>${count} ${layer === "tutors" ? "approved tutor" : "opt-in learner"}${count === 1 ? "" : "s"} in this regional overview</span>`;
  }

  layerButtons.forEach(button => button.addEventListener("click", () => {
    layer = button.dataset.locationLayer;
    layerButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    modeFilter.hidden = layer !== "tutors";
    renderMap();
  }));

  modeButtons.forEach(button => button.addEventListener("click", () => {
    mode = button.dataset.locationMode;
    modeButtons.forEach(item => item.classList.toggle("active", item === button));
    renderMap();
  }));

  await api?.ready;
  try {
    if (api?.isReady?.()) {
      [tutors, learnerRows] = await Promise.all([
        api.publicTutors({ acceptingOnly: false }),
        api.publicLearnerLocationInsights?.().catch(() => []) || []
      ]);
    }
  } catch (error) {
    console.warn("Location insights could not load:", error);
  }

  renderMap();

  try {
    const featured = tutors.filter(tutor => tutor.is_accepting_bookings).slice(0, 3);
    tutorHolder.innerHTML = featured.map(tutor => `
      <a class="mini-tutor refined-mini-tutor" href="tutor-profile.html?id=${encodeURIComponent(tutor.user_id)}">
        <img src="${api.publicAvatarUrl(tutor.profile_photo_path)}" alt="${esc(tutor.display_name)} profile photo">
        <div><b>${esc(tutor.display_name)}</b><small>${esc((tutor.subjects || []).slice(0, 2).join(" • ") || "Academic tutor")}</small><span>${esc([tutor.city, tutor.province].filter(Boolean).join(", ") || "Location available on request")}</span></div>
      </a>`).join("") || `<div class="tutor-launch-empty"><b>Approved tutor profiles will appear here.</b><p>New tutors can create an account and submit a profile for review.</p><a href="auth.html?tab=signup&role=tutor">Become a tutor →</a></div>`;
  } catch (error) {
    tutorHolder.innerHTML = `<div class="tutor-launch-empty"><b>Tutor directory is temporarily unavailable.</b><p>Please try again shortly.</p></div>`;
  }
});
