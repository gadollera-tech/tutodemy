(() => {
  "use strict";

  const state = {
    schemaReady: null,
    schemaError: "",
    admin: false,
    profile: null
  };

  const client = () => window.TutoSupabase?.client || null;
  const user = () => window.TutoAuth?.getUser?.() || null;
  const requireUser = () => {
    const current = user();
    if (!current) throw new Error("Please log in first.");
    if (!client()) throw new Error("The Supabase connection is not available.");
    return current;
  };

  const cleanArray = value => {
    if (Array.isArray(value)) return [...new Set(value.map(x => String(x).trim()).filter(Boolean))];
    return [...new Set(String(value || "").split(",").map(x => x.trim()).filter(Boolean))];
  };

  const safeName = name => String(name || "file")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-100);

  function friendlyError(error) {
    const message = error?.message || String(error || "Unknown error");
    if (/relation .* does not exist|schema cache|could not find the table/i.test(message)) {
      state.schemaReady = false;
      state.schemaError = "The Tutor Marketplace database upgrade has not been run yet.";
      return new Error(`${state.schemaError} Run docs/TUTOR-MARKETPLACE-UPGRADE.sql in Supabase.`);
    }
    return error instanceof Error ? error : new Error(message);
  }

  async function testSchema() {
    if (!client()) {
      state.schemaReady = false;
      state.schemaError = "Supabase is not configured.";
      return false;
    }
    try {
      const { error } = await client().from("public_tutor_profiles").select("user_id").limit(1);
      if (error) throw error;
      state.schemaReady = true;
      state.schemaError = "";
      return true;
    } catch (error) {
      friendlyError(error);
      return false;
    }
  }

  async function getMyAccountProfile(force = false) {
    const current = user();
    if (!current || !client()) return null;
    if (state.profile && !force) return state.profile;
    const { data, error } = await client().from("profiles").select("*").eq("id", current.id).maybeSingle();
    if (error) throw friendlyError(error);
    state.profile = data || null;
    return state.profile;
  }

  async function checkAdmin() {
    const current = user();
    if (!current || !client()) {
      state.admin = false;
      return false;
    }
    const { data, error } = await client().rpc("is_tutodemy_admin");
    if (error) {
      const handled = friendlyError(error);
      console.warn(handled.message);
      state.admin = false;
      return false;
    }
    state.admin = Boolean(data);
    window.dispatchEvent(new CustomEvent("tutodemy-admin-change", { detail: { admin: state.admin } }));
    return state.admin;
  }

  const ready = (async () => {
    await window.TutoAuth?.ready;
    await testSchema();
    if (user() && state.schemaReady) {
      await Promise.allSettled([getMyAccountProfile(true), checkAdmin()]);
    }
    return state;
  })();

  async function publicTutors(filters = {}) {
    if (!client()) return [];
    let query = client().from("public_tutor_profiles").select("*")
      .order("average_rating", { ascending: false })
      .order("completed_sessions", { ascending: false });

    if (filters.subject) query = query.contains("subjects", [filters.subject]);
    if (filters.province) query = query.ilike("province", `%${filters.province}%`);
    if (filters.acceptingOnly !== false) query = query.eq("is_accepting_bookings", true);

    const { data, error } = await query.limit(100);
    if (error) throw friendlyError(error);
    let rows = data || [];
    if (filters.mode) rows = rows.filter(t => (t.teaching_modes || []).includes(filters.mode) || (t.teaching_modes || []).includes("Either"));
    return rows;
  }

  async function getPublicTutor(tutorId) {
    if (!client()) return null;
    const [{ data: tutor, error }, { data: availability, error: availabilityError }, { data: reviews, error: reviewError }] = await Promise.all([
      client().from("public_tutor_profiles").select("*").eq("user_id", tutorId).maybeSingle(),
      client().from("tutor_availability").select("*").eq("tutor_id", tutorId).eq("active", true).order("day_of_week").order("start_time"),
      client().from("public_tutor_reviews").select("id,rating,review_text,created_at").eq("tutor_id", tutorId).order("created_at", { ascending: false }).limit(20)
    ]);
    if (error) throw friendlyError(error);
    if (availabilityError) throw friendlyError(availabilityError);
    if (reviewError) throw friendlyError(reviewError);
    return tutor ? { tutor, availability: availability || [], reviews: reviews || [] } : null;
  }

  async function getMyTutorProfile() {
    const current = requireUser();
    const { data, error } = await client().from("tutor_profiles").select("*").eq("user_id", current.id).maybeSingle();
    if (error) throw friendlyError(error);
    return data || null;
  }

  async function saveTutorDraft(values) {
    const current = requireUser();
    const existing = await getMyTutorProfile();
    const payload = {
      user_id: current.id,
      display_name: String(values.display_name || "").trim(),
      contact_email: String(values.contact_email || current.email || "").trim(),
      headline: String(values.headline || "").trim(),
      bio: String(values.bio || "").trim(),
      subjects: cleanArray(values.subjects),
      exam_specializations: cleanArray(values.exam_specializations),
      grade_levels: cleanArray(values.grade_levels),
      teaching_modes: cleanArray(values.teaching_modes),
      city: String(values.city || "").trim(),
      province: String(values.province || "").trim(),
      service_area: String(values.service_area || "").trim(),
      hourly_rate: Number(values.hourly_rate || 0),
      session_duration_minutes: Number(values.session_duration_minutes || 60),
      availability_summary: String(values.availability_summary || "").trim(),
      timezone: "Asia/Manila",
      profile_photo_path: values.profile_photo_path || existing?.profile_photo_path || null,
      education: String(values.education || "").trim(),
      credentials_summary: String(values.credentials_summary || "").trim(),
      years_experience: Number(values.years_experience || 0),
      languages: cleanArray(values.languages),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await client().from("tutor_profiles")
      .upsert(payload, { onConflict: "user_id" }).select().single();
    if (error) throw friendlyError(error);
    await client().from("profiles").update({ role: "tutor", updated_at: new Date().toISOString() }).eq("id", current.id);
    state.profile = null;
    return data;
  }

  async function replaceAvailability(rows) {
    const current = requireUser();
    const { error: deleteError } = await client().from("tutor_availability").delete().eq("tutor_id", current.id);
    if (deleteError) throw friendlyError(deleteError);
    const normalized = (rows || []).filter(row => row.start_time && row.end_time).map(row => ({
      tutor_id: current.id,
      day_of_week: Number(row.day_of_week),
      start_time: row.start_time,
      end_time: row.end_time,
      mode: row.mode || "Online",
      notes: String(row.notes || "").trim(),
      active: true
    }));
    if (!normalized.length) return [];
    const { data, error } = await client().from("tutor_availability").insert(normalized).select();
    if (error) throw friendlyError(error);
    return data || [];
  }

  async function getMyAvailability() {
    const current = requireUser();
    const { data, error } = await client().from("tutor_availability").select("*").eq("tutor_id", current.id).order("day_of_week").order("start_time");
    if (error) throw friendlyError(error);
    return data || [];
  }

  async function uploadAvatar(file) {
    const current = requireUser();
    if (!file) return null;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("Use a JPG, PNG, or WebP profile photo.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Profile photo must be 5 MB or smaller.");
    const path = `${current.id}/${Date.now()}-${safeName(file.name)}`;
    const { error } = await client().storage.from("tutor-avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw friendlyError(error);
    return path;
  }

  function publicAvatarUrl(path) {
    if (!path || !client()) return "assets/images/owl-mark.png";
    const { data } = client().storage.from("tutor-avatars").getPublicUrl(path);
    return data?.publicUrl || "assets/images/owl-mark.png";
  }

  async function uploadDocument(file, documentType) {
    const current = requireUser();
    if (!file) return null;
    if (!/^(application\/pdf|image\/jpeg|image\/png)$/i.test(file.type)) throw new Error("Verification files must be PDF, JPG, or PNG.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Verification file must be 10 MB or smaller.");
    const path = `${current.id}/${crypto.randomUUID?.() || Date.now()}-${safeName(file.name)}`;
    const { error: uploadError } = await client().storage.from("tutor-documents").upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) throw friendlyError(uploadError);
    const { data, error } = await client().from("tutor_documents").insert({
      tutor_id: current.id,
      document_type: documentType,
      storage_path: path,
      original_name: file.name
    }).select().single();
    if (error) throw friendlyError(error);
    return data;
  }

  async function getMyDocuments() {
    const current = requireUser();
    const { data, error } = await client().from("tutor_documents").select("*").eq("tutor_id", current.id).order("uploaded_at", { ascending: false });
    if (error) throw friendlyError(error);
    return data || [];
  }

  async function submitApplication() {
    requireUser();
    const { data, error } = await client().rpc("submit_tutor_application");
    if (error) throw friendlyError(error);
    return data;
  }

  async function setAcceptingBookings(accepting) {
    requireUser();
    const { data, error } = await client().rpc("tutor_set_accepting_bookings", { p_accepting: Boolean(accepting) });
    if (error) throw friendlyError(error);
    return data;
  }

  async function createBooking(values) {
    requireUser();
    const { data, error } = await client().rpc("create_booking_request", {
      p_tutor_id: values.tutor_id,
      p_requested_start: values.requested_start,
      p_duration_minutes: Number(values.duration_minutes),
      p_mode: values.mode,
      p_subject: values.subject,
      p_learning_goal: values.learning_goal || "",
      p_location_details: values.location_details || ""
    });
    if (error) throw friendlyError(error);
    return data;
  }

  async function getMyBookings(role = "learner") {
    const current = requireUser();
    const column = role === "tutor" ? "tutor_id" : "learner_id";
    const { data, error } = await client().from("bookings").select("*").eq(column, current.id).order("requested_start", { ascending: false });
    if (error) throw friendlyError(error);
    return data || [];
  }

  async function tutorRespond(bookingId, accept, note = "") {
    const { data, error } = await client().rpc("tutor_respond_booking", { p_booking_id: bookingId, p_accept: Boolean(accept), p_note: note });
    if (error) throw friendlyError(error);
    return data;
  }

  async function cancelBooking(bookingId, note = "") {
    const { data, error } = await client().rpc("learner_cancel_booking", { p_booking_id: bookingId, p_note: note });
    if (error) throw friendlyError(error);
    return data;
  }

  async function markDelivered(bookingId) {
    const { data, error } = await client().rpc("tutor_mark_session_delivered", { p_booking_id: bookingId });
    if (error) throw friendlyError(error);
    return data;
  }

  async function submitReview(bookingId, rating, reviewText) {
    const { data, error } = await client().rpc("submit_tutor_review", {
      p_booking_id: bookingId,
      p_rating: Number(rating),
      p_review_text: reviewText || ""
    });
    if (error) throw friendlyError(error);
    return data;
  }

  async function getMyReviews() {
    const current = requireUser();
    const { data, error } = await client().from("tutor_reviews").select("*").eq("learner_id", current.id);
    if (error) throw friendlyError(error);
    return data || [];
  }

  async function getMyLedger() {
    const current = requireUser();
    const { data, error } = await client().from("commission_ledger").select("*").eq("tutor_id", current.id).order("created_at", { ascending: false });
    if (error) throw friendlyError(error);
    return data || [];
  }

  async function adminPendingTutors() {
    if (!await checkAdmin()) throw new Error("Administrator access required.");
    const { data, error } = await client().from("tutor_profiles").select("*").in("status", ["pending","approved","rejected","suspended"]).order("submitted_at", { ascending: false, nullsFirst: false });
    if (error) throw friendlyError(error);
    return data || [];
  }

  async function adminTutorDocuments(tutorId) {
    if (!state.admin && !await checkAdmin()) throw new Error("Administrator access required.");
    const { data, error } = await client().from("tutor_documents").select("*").eq("tutor_id", tutorId).order("uploaded_at", { ascending: false });
    if (error) throw friendlyError(error);
    return data || [];
  }

  async function signedDocumentUrl(path) {
    if (!state.admin && !await checkAdmin()) throw new Error("Administrator access required.");
    const { data, error } = await client().storage.from("tutor-documents").createSignedUrl(path, 900);
    if (error) throw friendlyError(error);
    return data?.signedUrl || "";
  }

  async function adminSetTutorStatus(tutorId, status, reason = "", foundingEligible = false) {
    const { data, error } = await client().rpc("admin_set_tutor_status", {
      p_tutor_id: tutorId,
      p_status: status,
      p_reason: reason,
      p_founding_eligible: Boolean(foundingEligible)
    });
    if (error) throw friendlyError(error);
    return data;
  }

  async function adminBookings() {
    if (!await checkAdmin()) throw new Error("Administrator access required.");
    const { data, error } = await client().from("bookings").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) throw friendlyError(error);
    return data || [];
  }

  async function adminConfirmPayment(bookingId, method, reference) {
    const { data, error } = await client().rpc("admin_confirm_payment", {
      p_booking_id: bookingId,
      p_payment_method: method || "Manual confirmation",
      p_payment_reference: reference || ""
    });
    if (error) throw friendlyError(error);
    return data;
  }

  async function adminCompleteBooking(bookingId, note = "") {
    const { data, error } = await client().rpc("admin_complete_booking", { p_booking_id: bookingId, p_admin_note: note });
    if (error) throw friendlyError(error);
    return data;
  }

  function estimateCommission(profile, gross) {
    const completed = Number(profile?.completed_sessions || 0);
    const average = Number(profile?.average_rating || 0);
    const reviews = Number(profile?.review_count || 0);
    const cancellation = Number(profile?.cancellation_rate || 0);
    const good = profile?.account_standing === "good";
    let rate = 15;
    let tier = "Regular Tutor";
    if (profile?.founding_eligible && completed < 20) {
      rate = 10; tier = "Founding Tutor";
    } else if (completed >= 100 && average >= 4.5 && good) {
      rate = 12; tier = "High-Volume Tutor";
    } else if (completed >= 50 && average >= 4.8 && reviews >= 20 && cancellation <= 5 && good) {
      rate = 12; tier = "Top-Rated Tutor";
    }
    const amount = Number(gross || 0);
    return {
      tier, rate,
      commission: Math.round(amount * rate) / 100,
      net: Math.round(amount * (100 - rate)) / 100
    };
  }

  window.TutoMarketplace = {
    ready,
    state,
    testSchema,
    isReady: () => state.schemaReady === true,
    getSchemaMessage: () => state.schemaError,
    isAdmin: () => state.admin,
    checkAdmin,
    getMyAccountProfile,
    publicTutors,
    getPublicTutor,
    getMyTutorProfile,
    saveTutorDraft,
    replaceAvailability,
    getMyAvailability,
    uploadAvatar,
    publicAvatarUrl,
    uploadDocument,
    getMyDocuments,
    submitApplication,
    setAcceptingBookings,
    createBooking,
    getMyBookings,
    tutorRespond,
    cancelBooking,
    markDelivered,
    submitReview,
    getMyReviews,
    getMyLedger,
    adminPendingTutors,
    adminTutorDocuments,
    signedDocumentUrl,
    adminSetTutorStatus,
    adminBookings,
    adminConfirmPayment,
    adminCompleteBooking,
    estimateCommission,
    cleanArray
  };
})();
