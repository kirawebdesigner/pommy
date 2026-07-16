(function () {
  "use strict";
  var A = window.PommyAdmin;
  var PAGE_SIZE = 10;
  var state = { page: 1, count: 0, access: null, orders: [] };
  var form = document.querySelector("[data-order-filters]");
  var list = document.querySelector("[data-order-list]");
  var summary = document.querySelector("[data-page-summary]");

  function values() {
    var data = new FormData(form);
    return { status: String(data.get("status") || ""), search: String(data.get("search") || "").trim() };
  }

  function appendPair(parent, label, value) {
    var wrap = A.el("div", "order-detail-pair");
    wrap.appendChild(A.el("dt", "", label));
    wrap.appendChild(A.el("dd", "", value || "-"));
    parent.appendChild(wrap);
  }

  function renderItems(parent, order) {
    var items = order.items || [];
    var section = A.el("div", "order-items");
    section.appendChild(A.el("h3", "", "Items"));
    if (!Array.isArray(items) || !items.length) section.appendChild(A.el("p", "admin-muted", "No item details available."));
    (items || []).forEach(function (item) {
      var line = A.el("div", "order-item-line");
      var quantity = Number(A.field(item, ["quantity"], 1));
      line.appendChild(A.el("span", "", quantity + " x " + (item.product_name || "Menu item")));
      line.appendChild(A.el("strong", "", A.formatEtb(Number(A.field(item, ["unit_price", "price"], 0)) * quantity)));
      section.appendChild(line);
    });
    parent.appendChild(section);
  }

  function orderCard(order) {
    var card = A.el("article", "order-card");
    var top = A.el("div", "order-card-top");
    var heading = A.el("div");
    heading.appendChild(A.el("p", "order-number", order.order_number || order.id || "Order"));
    heading.appendChild(A.el("p", "admin-muted", A.formatDate(order.created_at, true)));
    top.appendChild(heading);
    top.appendChild(A.el("strong", "order-total", A.formatEtb(order.subtotal)));
    card.appendChild(top);

    var details = A.el("dl", "order-details");
    appendPair(details, "Customer", order.customer_name || "Guest");
    appendPair(details, "Phone", order.phone);
    appendPair(details, "Order type", A.statusLabel(order.order_type || "-"));
    if (order.order_type === "delivery") {
      appendPair(details, "Delivery area", order.delivery_area);
      appendPair(details, "Address", order.address);
      appendPair(details, "Landmark", order.landmark);
    }
    appendPair(details, "Payment", A.statusLabel(order.payment_method || "cash_on_delivery"));
    appendPair(details, "Notes", order.notes);
    card.appendChild(details);
    renderItems(card, order);

    var controls = A.el("div", "order-status-controls");
    var label = A.el("label", "", "Status");
    var select = A.el("select");
    A.STATUS_OPTIONS.forEach(function (status) {
      var option = A.el("option", "", A.statusLabel(status));
      option.value = status;
      option.selected = status === (order.status || "new");
      select.appendChild(option);
    });
    label.appendChild(select);
    var save = A.el("button", "admin-button admin-button-small", "Save status");
    save.type = "button";
    save.addEventListener("click", async function () {
      A.setBusy(save, true, "Saving...");
      var id = order.id;
      var result = await state.access.supabase.rpc("admin_update_order_status", { p_order_id: id, p_status: select.value });
      A.setBusy(save, false);
      if (result.error) return A.setNotice(A.message(result.error, "Status was not saved."), "error");
      order.status = select.value;
      A.setNotice("Order status saved.", "success");
    });
    controls.appendChild(label);
    controls.appendChild(save);
    card.appendChild(controls);
    return card;
  }

  async function load(options) {
    options = options || {};
    if (!options.silent) {
      list.setAttribute("aria-busy", "true");
      list.textContent = "";
      list.appendChild(A.el("p", "admin-loading", "Loading orders..."));
    }
    var filters = values();
    var term = filters.search;
    var limit = PAGE_SIZE + 1;
    var offset = (state.page - 1) * PAGE_SIZE;
    var result = await state.access.supabase.rpc("admin_list_orders", {
      p_status: filters.status || null,
      p_limit: limit,
      p_offset: offset,
      p_search: term || null
    });
    if (result.error) throw result.error;
    var rows = result.data || [];
    var hasNext = rows.length > PAGE_SIZE;
    state.count = ((state.page - 1) * PAGE_SIZE) + Math.min(rows.length, PAGE_SIZE) + (hasNext ? 1 : 0);
    state.orders = rows.slice(0, PAGE_SIZE);
    list.textContent = "";
    if (!state.orders.length) list.appendChild(A.el("div", "admin-empty", "No orders match these filters."));
    state.orders.forEach(function (order) { list.appendChild(orderCard(order)); });
    list.setAttribute("aria-busy", "false");
    summary.textContent = term ? "Search results - page " + state.page : "Page " + state.page;
    document.querySelector("[data-prev]").disabled = state.page <= 1;
    document.querySelector("[data-next]").disabled = !hasNext;
  }

  function reload() { A.setNotice(""); load().catch(function (error) { list.textContent = ""; A.setNotice(A.message(error), "error"); }); }
  function canAutoRefresh() {
    return !list.contains(document.activeElement) && !list.querySelector("button:disabled");
  }
  form.addEventListener("submit", function (event) { event.preventDefault(); state.page = 1; reload(); });
  form.addEventListener("reset", function () { setTimeout(function () { state.page = 1; reload(); }, 0); });
  document.querySelector("[data-prev]").addEventListener("click", function () { state.page -= 1; reload(); });
  document.querySelector("[data-next]").addEventListener("click", function () { state.page += 1; reload(); });

  var requestedOrder = new URLSearchParams(location.search).get("order");
  if (requestedOrder) form.elements.search.value = requestedOrder;

  A.requireAdmin().then(function (access) {
    if (!access) return;
    state.access = access;
    load().then(function () {
      A.startAutoRefresh(function () { return load({ silent: true }); }, { canRefresh: canAutoRefresh });
    }).catch(function (error) {
      list.textContent = "";
      A.setNotice(A.message(error), "error");
    });
  });
})();
