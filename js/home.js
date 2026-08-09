document.addEventListener("DOMContentLoaded", async () => {
  const api = window.TutoMarketplace;
  const tutorHolder = document.querySelector("#home-tutors");
  const esc = value => window.Tuto?.escape?.(String(value ?? "")) ?? String(value ?? "");

  window.TutoLocationMap?.mount({
    svg: "#home-philippines-map",
    summary: "#location-summary",
    list: "#location-region-list",
    modeFilter: "#location-mode-filter",
    layer: "tutors"
  });

  if (!tutorHolder) return;
  await api?.ready;

  try {
    const tutors = api?.isReady?.() ? await api.publicTutors({ acceptingOnly: false }) : [];
    const featured = tutors.filter(tutor => tutor.is_accepting_bookings).slice(0, 3);
    tutorHolder.innerHTML = featured.map(tutor => `
      <a class="mini-tutor refined-mini-tutor" href="tutor-profile.html?id=${encodeURIComponent(tutor.user_id)}">
        <img src="${api.publicAvatarUrl(tutor.profile_photo_path)}" alt="${esc(tutor.display_name)} profile photo">
        <div><b>${esc(tutor.display_name)}</b><small>${esc((tutor.subjects || []).slice(0, 2).join(" • ") || "Academic tutor")}</small><span>${esc([tutor.city, tutor.province].filter(Boolean).join(", ") || "Location available on request")}</span></div>
      </a>`).join("") || `<div class="tutor-launch-empty"><b>Approved tutor profiles will appear here.</b><p>Browse the directory or create a tutor account to submit a profile for review.</p><a href="for-tutors.html">Teach with TutoDemy →</a></div>`;
  } catch (error) {
    tutorHolder.innerHTML = `<div class="tutor-launch-empty"><b>Tutor directory is temporarily unavailable.</b><p>Please try again shortly.</p></div>`;
  }
});
