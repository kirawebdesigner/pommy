(function () {
  "use strict";
  var A = window.PommyAdmin;

  function metric(name, value) {
    var target = document.querySelector('[data-metric="' + name + '"]');
    if (target) target.textContent = value;
  }

  function orderRow(order) {
    var row = A.el("tr");
    var id = order.order_number || order.id || "-";
    var customer = order.customer_name || "Guest";
    var status = order.status || "new";
    [String(id), String(customer), A.formatEtb(order.subtotal), A.statusLabel(status), A.formatDate(order.created_at, true)].forEach(function (value, index) {
      var cell = A.el("td", index === 3 ? "admin-status status-" + status : "", value);
      row.appendChild(cell);
    });
    row.addEventListener("click", function () { location.href = "/admin/orders/?order=" + encodeURIComponent(order.id || ""); });
    row.tabIndex = 0;
    row.addEventListener("keydown", function (event) { if (event.key === "Enter") row.click(); });
    return row;
  }

  async function load(access) {
    var result = await access.supabase.rpc("admin_dashboard");
    if (result.error) throw result.error;
    var dashboard = result.data || {};
    var metrics = dashboard.metrics || {};
    metric("new", String(metrics.new_orders || 0));
    metric("preparing", String(metrics.preparing || 0));
    metric("ready", String(metrics.ready || 0));
    metric("today", String(metrics.today_orders || 0));

    var body = document.querySelector("[data-recent-orders]");
    body.textContent = "";
    var recent = dashboard.recent_orders || [];
    if (!recent.length) {
      var row = A.el("tr");
      var cell = A.el("td", "admin-empty", "No orders yet.");
      cell.colSpan = 5;
      row.appendChild(cell);
      body.appendChild(row);
    } else {
      recent.slice(0, 6).forEach(function (order) { body.appendChild(orderRow(order)); });
    }
  }

  A.requireAdmin().then(function (access) {
    if (!access) return;
    load(access).then(function () {
      A.startAutoRefresh(function () { return load(access); });
    }).catch(function (error) { A.setNotice(A.message(error, "Dashboard data could not be loaded."), "error"); });
  });
})();
