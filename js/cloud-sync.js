(() => {
  "use strict";

  const syncedKeys = [
    "tutodemyHistory",
    "tutodemySavedReviewers",
    "tutodemyActiveSession",
    "tutodemyTutorInquiries"
  ];

  const rawGet = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const rawSet = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const userKey = (userId, key) => `tutodemyUser:${userId}:${key}`;

  const getUser = () => window.TutoAuth?.getUser?.() || null;
  const getClient = () => window.TutoSupabase?.client || null;

  let syncing = false;
  let lastSyncAt = null;
  let lastError = "";

  function localGet(key, fallback) {
    const user = getUser();
    return rawGet(user ? userKey(user.id, key) : key, fallback);
  }

  function localSet(key, value) {
    const user = getUser();
    rawSet(user ? userKey(user.id, key) : key, value);
  }

  function migrateAnonymousData(userId) {
    const marker = `tutodemyMigratedAnonymousData:${userId}`;
    if (localStorage.getItem(marker) === "1") return;

    syncedKeys.forEach(key => {
      const source = localStorage.getItem(key);
      const destination = userKey(userId, key);
      if (source !== null && localStorage.getItem(destination) === null) {
        localStorage.setItem(destination, source);
      }
      if (source !== null) localStorage.removeItem(key);
    });
    localStorage.setItem(marker, "1");
  }

  function mergeBy(items, keyFn) {
    const map = new Map();
    items.forEach(item => {
      if (!item) return;
      map.set(keyFn(item), item);
    });
    return [...map.values()];
  }

  async function uploadHistory(user) {
    const history = localGet("tutodemyHistory", []);
    if (!history.length) return;
    const rows = history.map(item => ({
      user_id: user.id,
      attempt_id: item.attemptId || item.attempt_id || `legacy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      completed_at: item.completedAt || new Date().toISOString(),
      payload: item
    }));
    const { error } = await getClient().from("exam_attempts").upsert(rows, { onConflict: "user_id,attempt_id" });
    if (error) throw error;
  }

  async function pullHistory(user) {
    const { data, error } = await getClient()
      .from("exam_attempts")
      .select("attempt_id,completed_at,payload")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const cloud = (data || []).map(row => {
      const payload = row.payload || {};
      const { details, ...summary } = payload;
      return { ...summary, attemptId: payload.attemptId || row.attempt_id, completedAt: payload.completedAt || row.completed_at };
    });
    const local = localGet("tutodemyHistory", []);
    const merged = mergeBy([...cloud, ...local], item => item.attemptId || item.attempt_id)
      .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
      .slice(0, 100);
    localSet("tutodemyHistory", merged);
  }

  async function uploadSavedReviewers(user) {
    const ids = localGet("tutodemySavedReviewers", []);
    if (!ids.length) return;
    const rows = ids.map(reviewerId => ({ user_id: user.id, reviewer_id: reviewerId }));
    const { error } = await getClient().from("saved_reviewers").upsert(rows, { onConflict: "user_id,reviewer_id" });
    if (error) throw error;
  }

  async function pullSavedReviewers(user) {
    const { data, error } = await getClient().from("saved_reviewers").select("reviewer_id").eq("user_id", user.id);
    if (error) throw error;
    const cloud = (data || []).map(row => row.reviewer_id);
    const local = localGet("tutodemySavedReviewers", []);
    localSet("tutodemySavedReviewers", [...new Set([...cloud, ...local])]);
  }

  async function syncActiveSession(user) {
    const local = localGet("tutodemyActiveSession", null);
    const { data, error } = await getClient().from("active_sessions").select("session,updated_at").eq("user_id", user.id).maybeSingle();
    if (error) throw error;

    const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;
    const cloudTime = data?.updated_at ? new Date(data.updated_at).getTime() : 0;

    if (local && localTime >= cloudTime) {
      await api.saveActiveSession(local);
    } else if (data?.session) {
      localSet("tutodemyActiveSession", data.session);
    }
  }

  async function uploadInquiries(user) {
    const inquiries = localGet("tutodemyTutorInquiries", []);
    if (!inquiries.length) return;
    const rows = inquiries.map(item => ({
      user_id: user.id,
      inquiry_id: item.id || `inq-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      submitted_at: item.submittedAt || new Date().toISOString(),
      payload: item
    }));
    const { error } = await getClient().from("tutor_inquiries").upsert(rows, { onConflict: "user_id,inquiry_id" });
    if (error) throw error;
  }

  async function pullInquiries(user) {
    const { data, error } = await getClient()
      .from("tutor_inquiries")
      .select("inquiry_id,submitted_at,payload")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const cloud = (data || []).map(row => ({ ...row.payload, id: row.payload?.id || row.inquiry_id, submittedAt: row.payload?.submittedAt || row.submitted_at }));
    const local = localGet("tutodemyTutorInquiries", []);
    const merged = mergeBy([...cloud, ...local], item => item.id)
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
      .slice(0, 50);
    localSet("tutodemyTutorInquiries", merged);
  }

  async function syncAll(options = {}) {
    const user = getUser();
    if (!user || !getClient() || syncing) return false;
    syncing = true;
    lastError = "";
    window.dispatchEvent(new CustomEvent("tutodemy-sync-change", { detail: { status: "syncing" } }));
    try {
      migrateAnonymousData(user.id);
      await uploadHistory(user);
      await uploadSavedReviewers(user);
      await uploadInquiries(user);
      await syncActiveSession(user);
      await pullHistory(user);
      await pullSavedReviewers(user);
      await pullInquiries(user);
      lastSyncAt = new Date().toISOString();
      window.dispatchEvent(new CustomEvent("tutodemy-sync-change", { detail: { status: "synced", at: lastSyncAt } }));
      return true;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error("TutoDemy cloud sync failed:", error);
      window.dispatchEvent(new CustomEvent("tutodemy-sync-change", { detail: { status: "error", error: lastError } }));
      if (!options.silent) window.Tuto?.toast?.("Cloud sync could not finish. Local data is still saved.");
      return false;
    } finally {
      syncing = false;
    }
  }

  const ready = (async () => {
    await window.TutoAuth?.ready;
    const user = getUser();
    if (user) {
      migrateAnonymousData(user.id);
      await syncAll({ silent: true });
    }
    return user;
  })();

  const api = {
    ready,
    isAvailable() {
      return Boolean(getUser() && getClient());
    },
    getStatus() {
      return { syncing, lastSyncAt, lastError, available: this.isAvailable() };
    },
    syncAll,
    async getProfile() {
      const user = getUser();
      if (!user || !getClient()) return null;
      const { data, error } = await getClient().from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async upsertProfile(profile) {
      const user = getUser();
      if (!user || !getClient()) throw new Error("You must be logged in to save a profile.");
      const payload = {
        id: user.id,
        full_name: String(profile.full_name || "").trim(),
        student_level: String(profile.student_level || "").trim(),
        target_exam: String(profile.target_exam || "").trim(),
        school: String(profile.school || "").trim(),
        avatar_url: String(profile.avatar_url || "").trim() || null,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await getClient().from("profiles").upsert(payload, { onConflict: "id" }).select().single();
      if (error) throw error;
      return data;
    },
    async clearAttemptHistory() {
      const user = getUser();
      if (!user || !getClient()) return;
      const { error } = await getClient().from("exam_attempts").delete().eq("user_id", user.id);
      if (error) throw error;
      localSet("tutodemyHistory", []);
    },
    async saveAttempt(result) {
      const user = getUser();
      if (!user || !getClient() || !result) return;
      const row = {
        user_id: user.id,
        attempt_id: result.attemptId || result.attempt_id,
        completed_at: result.completedAt || new Date().toISOString(),
        payload: result
      };
      const { error } = await getClient().from("exam_attempts").upsert(row, { onConflict: "user_id,attempt_id" });
      if (error) throw error;
    },
    async saveActiveSession(session) {
      const user = getUser();
      if (!user || !getClient() || !session) return;
      session.updatedAt = new Date().toISOString();
      localSet("tutodemyActiveSession", session);
      const { error } = await getClient().from("active_sessions").upsert({ user_id: user.id, session, updated_at: session.updatedAt }, { onConflict: "user_id" });
      if (error) throw error;
    },
    async clearActiveSession() {
      const user = getUser();
      if (!user || !getClient()) return;
      const { error } = await getClient().from("active_sessions").delete().eq("user_id", user.id);
      if (error) throw error;
    },
    async syncSavedReviewers(ids) {
      const user = getUser();
      if (!user || !getClient()) return;
      const values = [...new Set(ids || [])];
      const { error: deleteError } = await getClient().from("saved_reviewers").delete().eq("user_id", user.id);
      if (deleteError) throw deleteError;
      if (values.length) {
        const { error } = await getClient().from("saved_reviewers").insert(values.map(reviewerId => ({ user_id: user.id, reviewer_id: reviewerId })));
        if (error) throw error;
      }
    },
    async saveTutorInquiry(inquiry) {
      const user = getUser();
      if (!user || !getClient() || !inquiry) return;
      const { error } = await getClient().from("tutor_inquiries").upsert({
        user_id: user.id,
        inquiry_id: inquiry.id,
        submitted_at: inquiry.submittedAt || new Date().toISOString(),
        payload: inquiry
      }, { onConflict: "user_id,inquiry_id" });
      if (error) throw error;
    }
  };

  window.TutoCloud = api;

  window.addEventListener("tutodemy-auth-change", event => {
    if (event.detail?.user) {
      migrateAnonymousData(event.detail.user.id);
      syncAll({ silent: true });
    }
  });
})();
