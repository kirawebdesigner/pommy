(function () {
  "use strict";

  var config = window.POMMY_SUPABASE_CONFIG || {};
  var client = null;
  var configurationError = null;

  if (!config.url || !config.anonKey) {
    configurationError = new Error("Pommy Supabase is not configured.");
  } else if (!window.supabase || typeof window.supabase.createClient !== "function") {
    configurationError = new Error("The Supabase browser client could not be loaded.");
  } else {
    client = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    });
  }

  window.PommySupabase = Object.freeze({
    client: client,
    configured: Boolean(client),
    error: configurationError,
    getClient: function () {
      if (!client) throw configurationError;
      return client;
    }
  });
})();
