(function () {
  "use strict";
  var form = document.querySelector("[data-login-form]");
  var submit = form && form.querySelector("button[type=submit]");
  var errorBox = document.querySelector("[data-login-error]");

  function safeNext() {
    var next = new URLSearchParams(location.search).get("next") || PommyAdmin.ADMIN_PATH;
    return next.indexOf("/admin/") === 0 && next.indexOf("//") !== 0 ? next : PommyAdmin.ADMIN_PATH;
  }

  async function initialize() {
    try {
      var access = await PommyAdmin.verifiedAccess();
      if (access.state === "admin") location.replace(safeNext());
      if (access.state === "forbidden") {
        await access.supabase.auth.signOut({ scope: "local" });
        errorBox.textContent = "This account does not have Pommy admin access.";
        errorBox.hidden = false;
      }
    } catch (error) {
      errorBox.textContent = PommyAdmin.message(error, "Admin sign in is unavailable.");
      errorBox.hidden = false;
    } finally {
      document.body.classList.add("admin-ready");
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    errorBox.hidden = true;
    PommyAdmin.setBusy(submit, true, "Signing in...");
    try {
      var data = new FormData(form);
      var supabase = PommyAdmin.client();
      var result = await supabase.auth.signInWithPassword({
        email: String(data.get("email") || "").trim(),
        password: String(data.get("password") || "")
      });
      if (result.error) throw result.error;
      var access = await PommyAdmin.verifiedAccess();
      if (access.state !== "admin") {
        await supabase.auth.signOut();
        throw new Error("This account does not have Pommy admin access.");
      }
      location.replace(safeNext());
    } catch (error) {
      errorBox.textContent = PommyAdmin.message(error, "Sign in failed.");
      errorBox.hidden = false;
      form.querySelector("input").focus();
    } finally {
      PommyAdmin.setBusy(submit, false);
    }
  });

  submit.disabled = false;
  initialize();
})();
