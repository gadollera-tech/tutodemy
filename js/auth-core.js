(() => {
  "use strict";

  let session = null;
  let subscription = null;

  const dispatch = (event = "INITIAL_SESSION") => {
    window.dispatchEvent(new CustomEvent("tutodemy-auth-change", {
      detail: { event, session, user: session?.user || null }
    }));
  };

  const ready = (async () => {
    const service = window.TutoSupabase;
    if (!service?.configured || !service.client) {
      dispatch("NOT_CONFIGURED");
      return null;
    }

    try {
      const { data, error } = await service.client.auth.getSession();
      if (error) throw error;
      session = data.session || null;

      const listener = service.client.auth.onAuthStateChange((event, nextSession) => {
        session = nextSession || null;
        dispatch(event);
      });
      subscription = listener.data.subscription;
      dispatch("INITIAL_SESSION");
      return session;
    } catch (error) {
      console.error("TutoDemy authentication initialization failed:", error);
      dispatch("AUTH_ERROR");
      return null;
    }
  })();

  window.TutoAuth = {
    ready,
    isConfigured() {
      return Boolean(window.TutoSupabase?.configured && window.TutoSupabase?.client);
    },
    getSession() {
      return session;
    },
    getUser() {
      return session?.user || null;
    },
    async refresh() {
      if (!this.isConfigured()) return null;
      const { data, error } = await window.TutoSupabase.client.auth.getSession();
      if (error) throw error;
      session = data.session || null;
      dispatch("REFRESHED");
      return session;
    },
    async signOut() {
      if (!this.isConfigured()) return;
      const { error } = await window.TutoSupabase.client.auth.signOut();
      if (error) throw error;
      session = null;
      dispatch("SIGNED_OUT");
    },
    destroy() {
      subscription?.unsubscribe?.();
      subscription = null;
    }
  };
})();
