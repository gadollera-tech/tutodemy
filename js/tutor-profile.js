document.addEventListener("DOMContentLoaded", async () => {
  await window.TutoAuth?.ready;
  await window.TutoMarketplace?.ready;
  const api = window.TutoMarketplace;
  const tutorId = new URLSearchParams(location.search).get("id");
  const alert = document.querySelector("#profile-alert");
  const form = document.querySelector("#booking-form");
  const status = document.querySelector("#booking-status");
  const inquiryForm = document.querySelector("#inquiry-form");
  const inquiryStatus = document.querySelector("#inquiry-status");
  const inquirySubject = document.querySelector("#inquiry-subject");
  const inquiryIdFromUrl = new URLSearchParams(location.search).get("inquiry");
  const inquirySubjectFromUrl = new URLSearchParams(location.search).get("subject");
  let tutor = null;

  const esc = value => window.Tuto.escape(value);
  const money = value => window.Tuto.money(value);
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  const BOOKING_LEAD_MS = 60 * 60 * 1000;

  function nextBookingMinimum() {
    return new Date(Math.ceil((Date.now() + BOOKING_LEAD_MS) / 60000) * 60000);
  }

  function toLocalDateTimeInput(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function refreshBookingMinimum() {
    const minimum = nextBookingMinimum();
    if (form?.elements?.requested_start) {
      form.elements.requested_start.min = toLocalDateTimeInput(minimum);
    }
    return minimum;
  }


  function formatTime(value) {
    if (!value) return "";
    const [h,m] = value.split(":");
    const date = new Date(2000,0,1,Number(h),Number(m));
    return date.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
  }

  function updateEstimate() {
    if (!tutor) return;
    const duration = Number(form.elements.duration_minutes.value || 60);
    document.querySelector("#booking-estimate").textContent = money(Number(tutor.hourly_rate || 0) * duration / 60);
  }

  async function load() {
    if (!tutorId) throw new Error("No tutor profile was selected.");
    if (!api?.isReady?.()) throw new Error("The Tutor Marketplace database has not been installed yet.");
    const result = await api.getPublicTutor(tutorId);
    if (!result) throw new Error("This tutor profile is unavailable or is no longer public.");
    tutor = result.tutor;
    document.title = `${tutor.display_name} | TutoDemy Tutor`;
    document.querySelector("#profile-photo").src = api.publicAvatarUrl(tutor.profile_photo_path);
    document.querySelector("#profile-photo").alt = `${tutor.display_name} profile photo`;
    document.querySelector("#profile-name").textContent = tutor.display_name;
    document.querySelector("#profile-headline").textContent = tutor.headline || "Academic tutor";
    document.querySelector("#profile-bio").textContent = tutor.bio;
    document.querySelector("#profile-tags").innerHTML = [...(tutor.subjects||[]),...(tutor.exam_specializations||[])].slice(0,8).map(x=>`<span>${esc(x)}</span>`).join("");
    document.querySelector("#profile-rate").textContent = money(tutor.hourly_rate);
    const rating = Number(tutor.average_rating||0);
    document.querySelector("#profile-rating").textContent = rating ? `${rating.toFixed(1)} ★` : "New tutor";
    document.querySelector("#profile-review-count").textContent = `${tutor.review_count||0} verified review${Number(tutor.review_count)===1?"":"s"}`;
    document.querySelector("#profile-highlights").innerHTML = [
      ["Learner levels",(tutor.grade_levels||[]).join(", ")],
      ["Teaching modes",(tutor.teaching_modes||[]).join(", ")],
      ["Location",[tutor.city,tutor.province].filter(Boolean).join(", ")||"Available on request"],
      ["Experience",`${Number(tutor.years_experience||0)} year${Number(tutor.years_experience)===1?"":"s"}`],
      ["Education",tutor.education||"Shared during profile review"],
      ["Credentials",tutor.credentials_summary||"Reviewed privately by TutoDemy"]
    ].map(([k,v])=>`<span><b>${esc(k)}</b>${esc(v)}</span>`).join("");

    document.querySelector("#availability-summary").textContent = tutor.availability_summary || "Send a booking request for a preferred schedule.";
    document.querySelector("#availability-list").innerHTML = result.availability.map(row=>`<div><b>${days[row.day_of_week]}</b><span>${formatTime(row.start_time)}–${formatTime(row.end_time)}</span><small>${esc(row.mode)}${row.notes?` • ${esc(row.notes)}`:""}</small></div>`).join("") || `<p class="muted">No regular schedule rows have been published. Request a schedule directly.</p>`;
    document.querySelector("#review-list").innerHTML = result.reviews.map(review=>`<article><div><b>${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)}</b><time>${new Date(review.created_at).toLocaleDateString()}</time></div><p>${esc(review.review_text||"Verified completed-session rating")}</p></article>`).join("") || `<p class="muted">No verified reviews yet.</p>`;

    const subjects = [...new Set([...(tutor.subjects||[]),...(tutor.exam_specializations||[])])];
    const subjectOptions = subjects.map(x=>`<option>${esc(x)}</option>`).join("") || `<option>General Academic Support</option>`;
    document.querySelector("#booking-subject").innerHTML = subjectOptions;
    if (inquirySubject) inquirySubject.innerHTML = subjectOptions;

    if (inquirySubjectFromUrl) {
      const bookingSubject = document.querySelector("#booking-subject");
      const matching = [...bookingSubject.options].find(
        option => option.value === inquirySubjectFromUrl
      );
      if (matching) bookingSubject.value = matching.value;
    }
    const modes = (tutor.teaching_modes||[]).flatMap(x=>x==="Either"?["Online","In-person"]:[x]);
    document.querySelector("#booking-mode").innerHTML = [...new Set(modes)].map(x=>`<option>${esc(x)}</option>`).join("");
    form.elements.duration_minutes.value = String(tutor.session_duration_minutes || 60);
    refreshBookingMinimum();
    updateEstimate();
  }

  inquiryForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!window.TutoAuth.getUser()) {
      sessionStorage.setItem("tutodemyPostLoginUrl", location.href);
      location.href = "auth.html";
      return;
    }

    try {
      const values = Object.fromEntries(
        new FormData(inquiryForm).entries()
      );

      inquiryStatus.textContent = "Sending inquiry…";
      inquiryStatus.classList.remove("error");

      const result = await api.createTutorInquiry(
        tutorId,
        values.subject,
        values.message
      );

      const inquiryId =
        result?.inquiry_id ||
        result?.id ||
        null;

      if (!inquiryId) {
        throw new Error("Inquiry was created but could not be opened.");
      }

      inquiryForm.reset();
      inquiryStatus.textContent = "Inquiry sent. Opening messages…";
      window.Tuto.toast("Inquiry sent to the tutor.");

      location.href =
        `messages.html?inquiry=${encodeURIComponent(inquiryId)}`;
    } catch (error) {
      inquiryStatus.textContent =
        error.message || "Inquiry could not be sent.";
      inquiryStatus.classList.add("error");
    }
  });

  form.elements.duration_minutes.addEventListener("change", updateEstimate);
  form.elements.mode.addEventListener("change", () => document.querySelector("#location-field").hidden = form.elements.mode.value !== "In-person");
  form.elements.requested_start.addEventListener("focus", refreshBookingMinimum);
  form.elements.requested_start.addEventListener("click", refreshBookingMinimum);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!window.TutoAuth.getUser()) {
      sessionStorage.setItem("tutodemyPostLoginUrl", location.href);
      location.href = "auth.html";
      return;
    }
    try {
      status.textContent = "Sending booking request…";
      status.classList.remove("error");
      const values = Object.fromEntries(new FormData(form).entries());
      const minimum = refreshBookingMinimum();
      const local = new Date(values.requested_start);

      if (!values.requested_start || Number.isNaN(local.getTime())) {
        status.textContent = "Choose a valid session date and time.";
        status.classList.add("error");
        form.elements.requested_start.focus();
        return;
      }

      if (local.getTime() < minimum.getTime()) {
        status.textContent = "Please choose a future schedule at least 1 hour from now.";
        status.classList.add("error");
        form.elements.requested_start.value = "";
        form.elements.requested_start.focus();
        return;
      }

      const created = await api.createBooking({
        ...values,
        tutor_id: tutorId,
        requested_start: local.toISOString()
      });

      let bookingId =
        typeof created === "string"
          ? created
          : created?.id ||
            created?.booking_id ||
            (Array.isArray(created)
              ? created[0]?.id || created[0]?.booking_id
              : null);

      if (!bookingId && inquiryIdFromUrl) {
        try {
          const learnerBookings =
            await api.getMyBookings("learner");

          const expectedStart = local.toISOString();

          const match = learnerBookings
            .filter(item =>
              item.tutor_id === tutorId &&
              item.status === "requested"
            )
            .sort((a, b) =>
              new Date(b.created_at || b.requested_start) -
              new Date(a.created_at || a.requested_start)
            )
            .find(item =>
              Math.abs(
                new Date(item.requested_start).getTime() -
                new Date(expectedStart).getTime()
              ) < 60000
            );

          bookingId = match?.id || null;
        } catch {}
      }

      if (inquiryIdFromUrl && bookingId) {
        try {
          await api.linkInquiryToBooking(
            inquiryIdFromUrl,
            bookingId
          );
        } catch (linkError) {
          console.warn(
            "Inquiry could not be linked to the booking:",
            linkError
          );
        }
      }

      form.reset();
      refreshBookingMinimum();
      form.elements.duration_minutes.value = String(tutor.session_duration_minutes||60);
      updateEstimate();
      status.innerHTML = inquiryIdFromUrl
        ? `Booking requested. You can continue the discussion in <a href="messages.html?inquiry=${encodeURIComponent(inquiryIdFromUrl)}">Messages</a> or track it in <a href="bookings.html">My Bookings</a>.`
        : `Booking requested. Track it in <a href="bookings.html">My Bookings</a>.`;
      window.Tuto.toast("Booking request sent to the tutor.");
    } catch (error) {
      status.textContent = error.message || "Booking request could not be sent.";
      status.classList.add("error");
    }
  });

  try { await load(); } catch (error) {
    alert.hidden = false; alert.textContent = error.message || "Tutor profile could not be loaded.";
    form.querySelectorAll("input,select,textarea,button").forEach(x=>x.disabled=true);
    document.querySelector("#profile-name").textContent = "Tutor profile unavailable";
  }
});
