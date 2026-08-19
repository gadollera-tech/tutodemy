document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoMarketplace?.ready;
  const api = window.TutoMarketplace;
  const grid = document.querySelector("#tutor-grid");
  const count = document.querySelector("#tutor-count");
  const alert = document.querySelector("#marketplace-alert");
  const search = document.querySelector("#tutor-search");
  const subject = document.querySelector("#tutor-subject");
  const mode = document.querySelector("#tutor-mode");
  const province = document.querySelector("#tutor-province");

  const commonSubjects = ["Mathematics","Physics","Chemistry","Biology","Science","English","Filipino","Reading Comprehension","Abstract Reasoning","UPCAT","DCAT","DOST-SEI","General Academic Support"];
  commonSubjects.forEach(item => subject.insertAdjacentHTML("beforeend", `<option>${item}</option>`));

  const esc = value => window.Tuto?.escape?.(value) || String(value || "");
  const money = value => window.Tuto?.money?.(value) || `₱${Number(value || 0).toFixed(2)}`;

  function card(tutor) {
    const photo = api.publicAvatarUrl(tutor.profile_photo_path);
    const rating = Number(tutor.average_rating || 0);
    const location = [tutor.city, tutor.province].filter(Boolean).join(", ") || "Location available on request";
    const modes = (tutor.teaching_modes || []).join(" • ");
    const subjects = (tutor.subjects || []).slice(0, 4);
    return `<article class="tutor-card marketplace-card">
      <div class="tutor-photo-wrap"><img src="${esc(photo)}" alt="${esc(tutor.display_name)} profile photo"><span class="verified-badge">✓ Admin approved</span></div>
      <div class="tutor-card-body">
        <div class="tutor-rating"><b>${rating ? rating.toFixed(1) : "New"}</b><span>${rating ? "★" : "No reviews yet"} ${tutor.review_count ? `(${tutor.review_count})` : ""}</span></div>
        <h3>${esc(tutor.display_name)}</h3>
        <p class="tutor-headline">${esc(tutor.headline || "Academic tutor")}</p>
        <div class="tutor-tags">${subjects.map(x => `<span>${esc(x)}</span>`).join("")}</div>
        <dl class="tutor-facts"><div><dt>Mode</dt><dd>${esc(modes || "Contact tutor")}</dd></div><div><dt>Location</dt><dd>${esc(location)}</dd></div><div><dt>Rate</dt><dd>${money(tutor.hourly_rate)}/hour</dd></div></dl>
        <div class="tutor-card-actions">
          <a class="button full" href="tutor-profile.html?id=${encodeURIComponent(tutor.user_id)}#inquiry">Send Inquiry</a>
          <a class="text-button" href="tutor-profile.html?id=${encodeURIComponent(tutor.user_id)}">View profile</a>
        </div>
      </div>
    </article>`;
  }

  async function render() {
    grid.innerHTML = `<div class="loading-state">Loading approved tutors…</div>`;
    count.textContent = "Loading approved tutors…";
    try {
      if (!api?.isReady?.()) {
        alert.hidden = false;
        alert.innerHTML = `<b>The tutor directory is temporarily unavailable.</b><span>Please try again later.</span>`;
        grid.innerHTML = `<div class="empty-state"><h3>Tutor profiles cannot be loaded right now.</h3><p>Please return later or use TutoDemy's official contact channel for assistance.</p></div>`;
        count.textContent = "Unable to load tutors";
        return;
      }
      alert.hidden = true;
      const tutors = await api.publicTutors({ subject: subject.value, mode: mode.value, province: province.value.trim() });
      const term = search.value.trim().toLowerCase();
      const filtered = term ? tutors.filter(t => [t.display_name,t.headline,t.city,t.province,...(t.subjects||[]),...(t.exam_specializations||[])].join(" ").toLowerCase().includes(term)) : tutors;
      count.textContent = `${filtered.length} approved tutor${filtered.length === 1 ? "" : "s"} found`;
      grid.innerHTML = filtered.map(card).join("") || `<div class="empty-state"><h3>No approved tutors match these filters yet.</h3><p>Try a broader subject, mode, or location search.</p></div>`;
    } catch (error) {
      alert.hidden = false;
      alert.textContent = error.message || "The tutor directory could not be loaded.";
      grid.innerHTML = "";
      count.textContent = "Unable to load tutors";
    }
  }

  document.querySelector("#tutor-filter")?.addEventListener("click", render);
  search?.addEventListener("input", () => clearTimeout(window.__tutorSearch) || (window.__tutorSearch = setTimeout(render, 250)));
  [subject,mode].forEach(field => field?.addEventListener("change", render));
  await render();
});
