(function () {
  "use strict";

  var LOGIN_PATH = "/admin/login/";
  var ADMIN_PATH = "/admin/";
  var STATUS_OPTIONS = ["new", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled"];

  function client() {
    var api = window.PommySupabase;
    if (!api) throw new Error("Pommy Supabase is not configured.");
    if (typeof api.getClient === "function") return api.getClient();
    return api.client || api.supabase || api;
  }

  function message(error, fallback) {
    if (!error) return fallback || "Something went wrong.";
    if (/failed to fetch/i.test(error.message || "")) return "Cannot reach the server. Check your connection and try again.";
    return error.message || fallback || "Something went wrong.";
  }

  function adminResult(value) {
    if (value === true) return true;
    if (Array.isArray(value)) return Boolean(value[0] && (value[0].is_admin === true || value[0].allowed === true));
    return Boolean(value && (value.is_admin === true || value.allowed === true));
  }

  async function verifiedAccess() {
    var supabase = client();
    var sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    if (!sessionResult.data.session) return { state: "logged-out", supabase: supabase };

    var userResult = await supabase.auth.getUser();
    if (userResult.error || !userResult.data.user) {
      await supabase.auth.signOut({ scope: "local" });
      return { state: "logged-out", supabase: supabase };
    }

    var accessResult = await supabase.rpc("is_admin");
    if (accessResult.error) throw accessResult.error;
    return {
      state: adminResult(accessResult.data) ? "admin" : "forbidden",
      supabase: supabase,
      user: userResult.data.user
    };
  }

  async function requireAdmin() {
    try {
      var access = await verifiedAccess();
      if (access.state === "logged-out") {
        location.replace(LOGIN_PATH + "?next=" + encodeURIComponent(location.pathname + location.search));
        return null;
      }
      if (access.state === "forbidden") {
        showGate("Access denied", "This account is signed in but does not have Pommy admin access.", true);
        return null;
      }
      var gate = document.querySelector("[data-admin-gate]");
      var app = document.querySelector("[data-admin-app]");
      if (gate) gate.hidden = true;
      if (app) app.hidden = false;
      document.body.classList.add("admin-ready");
      var email = document.querySelector("[data-admin-email]");
      if (email) email.textContent = access.user.email || "Admin";
      bindSignOut(access.supabase);
      return access;
    } catch (error) {
      showGate("Admin unavailable", message(error), false);
      return null;
    }
  }

  function showGate(title, detail, canSignOut) {
    var gate = document.querySelector("[data-admin-gate]");
    var app = document.querySelector("[data-admin-app]");
    if (app) app.hidden = true;
    if (!gate) return;
    gate.hidden = false;
    gate.querySelector("h1").textContent = title;
    gate.querySelector("p").textContent = detail;
    var button = gate.querySelector("button");
    if (button) {
      button.hidden = !canSignOut;
      button.addEventListener("click", async function () {
        try { await client().auth.signOut(); } finally { location.replace(LOGIN_PATH); }
      });
    }
  }

  function bindSignOut(supabase) {
    var button = document.querySelector("[data-sign-out]");
    if (!button) return;
    button.addEventListener("click", async function () {
      button.disabled = true;
      try { await supabase.auth.signOut(); } finally { location.replace(LOGIN_PATH); }
    });
  }

  function setNotice(text, type) {
    var notice = document.querySelector("[data-notice]");
    if (!notice) return;
    notice.textContent = text || "";
    notice.className = "admin-notice" + (type ? " is-" + type : "");
    notice.hidden = !text;
  }

  function setBusy(element, busy, busyText) {
    if (!element) return;
    if (busy) {
      element.dataset.label = element.textContent;
      element.textContent = busyText || "Working...";
    } else if (element.dataset.label) {
      element.textContent = element.dataset.label;
    }
    element.disabled = busy;
  }

  function formatEtb(value) {
    return new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB", maximumFractionDigits: 2 }).format(Number(value) || 0);
  }

  function formatDate(value, includeTime) {
    if (!value) return "-";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-ET", includeTime ? {
      dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi"
    } : { dateStyle: "medium", timeZone: "Africa/Nairobi" }).format(date);
  }

  function field(record, names, fallback) {
    for (var i = 0; i < names.length; i += 1) {
      if (record && record[names[i]] !== undefined && record[names[i]] !== null) return record[names[i]];
    }
    return fallback;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function statusLabel(status) {
    return String(status || "new").replace(/_/g, " ").replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  window.PommyAdmin = {
    ADMIN_PATH: ADMIN_PATH,
    LOGIN_PATH: LOGIN_PATH,
    STATUS_OPTIONS: STATUS_OPTIONS,
    client: client,
    el: el,
    field: field,
    formatDate: formatDate,
    formatEtb: formatEtb,
    message: message,
    requireAdmin: requireAdmin,
    setBusy: setBusy,
    setNotice: setNotice,
    statusLabel: statusLabel,
    verifiedAccess: verifiedAccess
  };
})();
