(() => {
  "use strict";

  const config = window.TUTODEMY_CONFIG || {};
  const url = String(config.supabaseUrl || "").trim();
  const key = String(config.supabaseAnonKey || "").trim();
  const looksConfigured = /^https:\/\/.+\.supabase\.co\/?$/i.test(url) && key.length > 20;

  const state = {
    configured: false,
    client: null,
    error: "",
    url
  };

  if (!looksConfigured) {
    state.error = "Supabase Project URL and public key have not been added to js/config.js.";
    window.TutoSupabase = state;
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    state.error = "The Supabase browser library could not be loaded. Check the internet connection or CDN access.";
    window.TutoSupabase = state;
    return;
  }

  try {
    state.client = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    state.configured = true;
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  }

  window.TutoSupabase = state;
})();
