document.addEventListener("DOMContentLoaded", () => {
  const api = window.TutoMarketplace;
  let user = null;
  let initialized = false;

  const form = document.querySelector("#tutor-application-form");
  const status = document.querySelector("#application-form-status");
  const alert = document.querySelector("#marketplace-alert");
  const builder = document.querySelector("#availability-builder");
  let profile = null;

  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle("error", error);
  };
  setStatus("Loading your tutor application…");
  const valuesForGroup = name => [...document.querySelectorAll(`[data-checkbox-group="${name}"] input:checked`)].map(x => x.value);
  const setGroup = (name, values = []) => document.querySelectorAll(`[data-checkbox-group="${name}"] input`).forEach(input => input.checked = values.includes(input.value));

  function availabilityRow(row = {}) {
    const wrap = document.createElement("div");
    wrap.className = "availability-row";
    wrap.innerHTML = `<label>Day<select data-field="day_of_week">${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d,i)=>`<option value="${i}" ${Number(row.day_of_week)===i?"selected":""}>${d}</option>`).join("")}</select></label><label>Start<input data-field="start_time" type="time" value="${row.start_time?.slice(0,5)||""}"></label><label>End<input data-field="end_time" type="time" value="${row.end_time?.slice(0,5)||""}"></label><label>Mode<select data-field="mode"><option ${row.mode==="Online"?"selected":""}>Online</option><option ${row.mode==="In-person"?"selected":""}>In-person</option><option ${row.mode==="Either"?"selected":""}>Either</option></select></label><label>Note<input data-field="notes" value="${window.Tuto.escape(row.notes||"")}" placeholder="Optional"></label><button class="icon-button remove-availability" type="button" aria-label="Remove schedule">×</button>`;
    wrap.querySelector(".remove-availability").addEventListener("click", () => wrap.remove());
    builder.appendChild(wrap);
  }

  function collectAvailability() {
    return [...builder.querySelectorAll(".availability-row")].map(row => Object.fromEntries([...row.querySelectorAll("[data-field]")].map(field => [field.dataset.field, field.value]))).filter(x => x.start_time && x.end_time);
  }

  function collectForm() {
    const data = Object.fromEntries(new FormData(form).entries());
    ["subjects","exam_specializations","grade_levels","teaching_modes"].forEach(name => data[name] = valuesForGroup(name));
    return data;
  }

  function showProfileStatus(current) {
    const heading = document.querySelector("#application-status");
    const message = document.querySelector("#application-message");
    const statusLabels = { draft:"Draft",pending:"Pending admin review",approved:"Approved and public",rejected:"Needs revision",suspended:"Suspended" };
    heading.textContent = current ? statusLabels[current.status] || current.status : "Not started";
    if (!current) message.textContent = "Complete the form and save your first draft.";
    else if (current.status === "pending") message.textContent = "Your profile is locked to the current application status while admin review is ongoing. You may still save factual corrections.";
    else if (current.status === "approved") message.innerHTML = `Your public tutor profile is active. <a href="tutor-profile.html?id=${encodeURIComponent(current.user_id)}">View profile</a>`;
    else if (current.status === "rejected") message.textContent = current.rejection_reason || "Review the application and submit again.";
    else if (current.status === "suspended") message.textContent = "Contact TutoDemy administration for next steps.";
    else message.textContent = "Save changes anytime, then submit when complete.";
  }

  async function load() {
    if (!api?.isReady?.()) {
      alert.hidden = false;
      alert.innerHTML = `<b>Tutor applications are temporarily unavailable.</b><span>Please try again later or use TutoDemy's official contact channel for assistance.</span>`;
      form.querySelectorAll("input,select,textarea,button").forEach(x => x.disabled = true);
      showProfileStatus(null);
      return;
    }
    profile = await api.getMyTutorProfile();
    showProfileStatus(profile);
    if (profile) {
      ["display_name","contact_email","headline","bio","city","province","service_area","hourly_rate","session_duration_minutes","availability_summary","education","credentials_summary","years_experience","languages","payout_method","payout_account_name","payout_account_number"].forEach(name => {
        const field = form.elements[name];
        if (!field) return;
        field.value = Array.isArray(profile[name]) ? profile[name].join(", ") : (profile[name] ?? "");
      });
      ["subjects","exam_specializations","grade_levels","teaching_modes"].forEach(name => setGroup(name, profile[name] || []));
      if (profile.profile_photo_path) {
        document.querySelector("#photo-preview img").src = api.publicAvatarUrl(profile.profile_photo_path);
        document.querySelector("#photo-preview span").textContent = "Current uploaded profile photo";
      }
      if (profile.payout_qr_path) {
        document.querySelector("#payout-qr-preview span").textContent = "Private payout QR uploaded.";
        document.querySelector("#view-payout-qr").hidden = false;
      }
    } else {
      form.elements.contact_email.value = user.email || "";
      form.elements.display_name.value = user.user_metadata?.full_name || "";
    }
    const rows = await api.getMyAvailability().catch(() => []);
    (rows.length ? rows : [{day_of_week:6,start_time:"09:00",end_time:"12:00",mode:"Online"}]).forEach(availabilityRow);
    await renderDocuments();
  }

  async function renderDocuments() {
    const list = document.querySelector("#document-list");
    const docs = await api.getMyDocuments().catch(() => []);
    list.innerHTML = docs.map(doc => `<div class="document-item"><div><b>${window.Tuto.escape(doc.document_type)}</b><span>${window.Tuto.escape(doc.original_name)}</span></div><em class="status-pill status-${doc.verification_status}">${doc.verification_status}</em></div>`).join("") || `<p class="muted">No private verification documents uploaded yet.</p>`;
  }

  async function saveDraft() {
    if (!initialized) throw new Error("Your tutor application is still loading. Please wait a moment.");
    setStatus("Saving tutor profile…");
    const avatar = document.querySelector("#profile-photo-file").files[0];
    const payoutQr = document.querySelector("#payout-qr-file").files[0];
    let avatarPath = profile?.profile_photo_path || null;
    let payoutQrPath = profile?.payout_qr_path || null;
    if (avatar) avatarPath = await api.uploadAvatar(avatar);
    if (payoutQr) payoutQrPath = await api.uploadPayoutQr(payoutQr);
    const data = collectForm();
    data.profile_photo_path = avatarPath;
    data.payout_qr_path = payoutQrPath;
    profile = await api.saveTutorDraft(data);
    if (profile.payout_qr_path) {
      document.querySelector("#payout-qr-preview span").textContent = "Private payout QR uploaded.";
      document.querySelector("#view-payout-qr").hidden = false;
      document.querySelector("#payout-qr-file").value = "";
    }
    await api.replaceAvailability(collectAvailability());
    showProfileStatus(profile);
    setStatus("Draft saved to your account.");
    window.Tuto.toast("Tutor profile saved.");
    return profile;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    try { await saveDraft(); } catch (error) { setStatus(error.message || "Could not save the tutor profile.", true); }
  });

  document.querySelector("#add-availability").addEventListener("click", () => availabilityRow({day_of_week:1,mode:"Online"}));
  document.querySelector("#upload-document").addEventListener("click", async () => {
    const file = document.querySelector("#verification-file").files[0];
    if (!file) return setStatus("Choose a verification file first.", true);
    try {
      setStatus("Uploading private document…");
      if (!profile) await saveDraft();
      await api.uploadDocument(file, document.querySelector("#document-type").value);
      document.querySelector("#verification-file").value = "";
      await renderDocuments();
      setStatus("Private verification document uploaded.");
    } catch (error) { setStatus(error.message || "Upload failed.", true); }
  });

  document.querySelector("#submit-application").addEventListener("click", async () => {
    if (!document.querySelector("#tutor-declaration").checked) return setStatus("Confirm the tutor declaration before submitting.", true);
    const payoutName = form.elements.payout_account_name.value.trim();
    const payoutNumber = form.elements.payout_account_number.value.replace(/[^0-9]/g, "");
    if (!payoutName) return setStatus("Enter the name registered to your GCash account.", true);
    if (!/^09\d{9}$/.test(payoutNumber)) return setStatus("Enter a valid 11-digit GCash number beginning with 09.", true);
    form.elements.payout_account_number.value = payoutNumber;
    try {
      await saveDraft();
      setStatus("Submitting application for admin review…");
      profile = await api.submitApplication();
      showProfileStatus(profile);
      setStatus("Application submitted. You will appear publicly only after admin approval.");
      window.Tuto.toast("Tutor application submitted.");
    } catch (error) { setStatus(error.message || "Application could not be submitted.", true); }
  });

  document.querySelector("#profile-photo-file").addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    document.querySelector("#photo-preview img").src = url;
    document.querySelector("#photo-preview span").textContent = file.name;
  });

  document.querySelector("#payout-qr-file").addEventListener("change", event => {
    const file = event.target.files[0];
    document.querySelector("#payout-qr-preview span").textContent = file ? file.name : "No private payout QR uploaded yet.";
  });

  document.querySelector("#view-payout-qr").addEventListener("click", async () => {
    if (!profile?.payout_qr_path) return;
    try {
      const url = await api.signedPayoutQrUrl(profile.payout_qr_path);
      window.open(url, "_blank", "noopener");
    } catch (error) {
      setStatus(error.message || "The private payout QR could not be opened.", true);
    }
  });

  async function initialize() {
    try {
      await window.TutoAuth?.ready;
      await window.TutoMarketplace?.ready;
      user = window.TutoAuth?.getUser?.();
      if (!user) {
        const next = encodeURIComponent("tutor-onboarding.html");
        location.replace(`auth.html?next=${next}`);
        return;
      }
      initialized = true;
      await load();
      if (api?.isReady?.() && !status.classList.contains("error")) setStatus("Your tutor application is ready.");
    } catch (error) {
      alert.hidden = false;
      alert.textContent = error.message || "Application could not be loaded.";
      setStatus("Application could not be loaded.", true);
    }
  }

  initialize();
});
