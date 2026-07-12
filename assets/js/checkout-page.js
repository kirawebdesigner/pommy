(function () {
  "use strict";

  var app = document.getElementById("pommy-checkout-app");
  if (!app || !window.Pommy || !window.PommyOrderService) return;

  function summaryMarkup(cart) {
    if (!cart.length) return '<div class="pommy-cart-empty"><p>Your cart is empty.</p><a href="/menu/" class="button-secondary small">Browse the menu</a></div>';
    return cart.map(function (item) {
      return '<div class="pommy-order-line"><span>' + item.quantity + ' × ' + window.Pommy.escapeHtml(item.name) + '</span><strong>' + window.Pommy.formatEtb(item.unitPrice * item.quantity) + '</strong></div>';
    }).join("") + '<div class="pommy-cart-total" style="margin-top:20px"><span>Subtotal</span><span>' + window.Pommy.formatEtb(window.Pommy.cartSubtotal(cart)) + '</span></div><p><strong>Payment method:</strong> Cash on Delivery</p>';
  }

  app.innerHTML = '<div class="pommy-checkout-grid"><form id="pommy-checkout-form" class="pommy-checkout-panel" novalidate><div id="pommy-checkout-errors" class="pommy-errors" role="alert" hidden></div><div class="pommy-field-grid"><div class="pommy-field"><label for="customer-name">Full Name</label><input class="input w-input" id="customer-name" name="customerName" type="text" autocomplete="name" required></div><div class="pommy-field"><label for="customer-phone">Phone Number</label><input class="input w-input" id="customer-phone" name="phone" type="tel" autocomplete="tel" placeholder="09... or +2519..." required></div></div><fieldset class="pommy-field"><legend>Order Type</legend><div class="pommy-radio-row"><label class="pommy-radio-option"><input type="radio" name="orderType" value="delivery" required> Delivery</label><label class="pommy-radio-option"><input type="radio" name="orderType" value="pickup" required> Takeaway / Pickup</label></div></fieldset><div id="pommy-delivery-fields" hidden><div class="pommy-field-grid"><div class="pommy-field"><label for="delivery-area">Delivery Area</label><input class="input w-input" id="delivery-area" name="deliveryArea" type="text" autocomplete="address-level2"></div><div class="pommy-field"><label for="delivery-landmark">Nearby Landmark</label><input class="input w-input" id="delivery-landmark" name="landmark" type="text"></div></div><div class="pommy-field"><label for="delivery-address">Location / Address</label><textarea class="input w-input" id="delivery-address" name="address" rows="3" autocomplete="street-address"></textarea></div></div><div class="pommy-field"><label for="order-notes">Optional order notes</label><textarea class="input w-input" id="order-notes" name="notes" rows="4" placeholder="No onion, extra cheese, call when you arrive..."></textarea></div><div class="pommy-info-card" style="margin-bottom:20px"><strong>Payment method</strong><p style="margin:8px 0 0">Cash on Delivery</p></div><button class="button-primary w-button" type="submit">Place Order</button><p class="pommy-disclosure">This demo prepares and stores the order locally. It does not claim the restaurant has received it.</p></form><aside class="pommy-checkout-panel" aria-labelledby="order-summary-heading"><h2 id="order-summary-heading">Order summary</h2><div id="pommy-checkout-summary"></div></aside></div><div id="pommy-order-result" style="margin-top:32px" aria-live="polite"></div>';

  var form = document.getElementById("pommy-checkout-form");
  var deliveryFields = document.getElementById("pommy-delivery-fields");
  var summary = document.getElementById("pommy-checkout-summary");
  var errors = document.getElementById("pommy-checkout-errors");
  var result = document.getElementById("pommy-order-result");

  function renderSummary() { summary.innerHTML = summaryMarkup(window.Pommy.readCart()); }
  function isValidPhone(value) {
    var phone = value.replace(/[\s()-]/g, "");
    return /^09\d{8}$/.test(phone) || /^\+2519\d{8}$/.test(phone) || /^2519\d{8}$/.test(phone);
  }

  form.addEventListener("change", function (event) {
    if (event.target.name !== "orderType") return;
    var delivery = event.target.value === "delivery";
    deliveryFields.hidden = !delivery;
    ["deliveryArea", "address"].forEach(function (name) { form.elements[name].required = delivery; });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data = new FormData(form);
    var cart = window.Pommy.readCart();
    var messages = [];
    var name = String(data.get("customerName") || "").trim();
    var phone = String(data.get("phone") || "").trim();
    var orderType = String(data.get("orderType") || "");
    var deliveryArea = String(data.get("deliveryArea") || "").trim();
    var address = String(data.get("address") || "").trim();
    if (!name) messages.push("Enter your full name.");
    if (!isValidPhone(phone)) messages.push("Enter a valid Ethiopian-style phone number, such as 09... or +2519....");
    if (!orderType) messages.push("Select delivery or takeaway / pickup.");
    if (orderType === "delivery" && !deliveryArea) messages.push("Enter the delivery area.");
    if (orderType === "delivery" && !address) messages.push("Enter the delivery location or address.");
    if (!cart.length) messages.push("Add at least one menu item to the cart.");

    if (messages.length) {
      errors.hidden = false;
      errors.innerHTML = '<strong>Please check the following:</strong><ul>' + messages.map(function (message) { return '<li>' + window.Pommy.escapeHtml(message) + '</li>'; }).join("") + '</ul>';
      errors.focus();
      return;
    }

    errors.hidden = true;
    var order = window.PommyOrderService.prepare({
      customerName: name,
      phone: phone,
      orderType: orderType,
      deliveryArea: deliveryArea,
      address: address,
      landmark: String(data.get("landmark") || "").trim(),
      notes: String(data.get("notes") || "").trim(),
      items: cart,
      subtotal: window.Pommy.cartSubtotal(cart)
    });
    window.Pommy.saveCart([]);
    form.hidden = true;
    result.innerHTML = '<div class="pommy-order-success"><h2>Order prepared</h2><p>Your order details are ready. Pommy has not automatically received this order; call the restaurant to confirm it.</p><p><strong>Order ID:</strong> ' + window.Pommy.escapeHtml(order.orderId) + '</p><div class="pommy-actions"><a class="button-primary w-button" href="tel:' + window.Pommy.escapeHtml(window.POMMY_ORDER_CONFIG.phoneInternational) + '">Call Pommy</a><button class="button-secondary w-button" type="button" id="copy-order-details">Copy Order Details</button></div><p id="copy-order-status" class="pommy-disclosure" aria-live="polite"></p></div>';
    summary.innerHTML = summaryMarkup(order.items);
    var copyButton = document.getElementById("copy-order-details");
    copyButton.addEventListener("click", function () {
      var text = window.PommyOrderService.format(order);
      navigator.clipboard.writeText(text).then(function () {
        document.getElementById("copy-order-status").textContent = "Order details copied.";
      }).catch(function () {
        var area = document.createElement("textarea");
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
        document.getElementById("copy-order-status").textContent = "Order details copied.";
      });
    });
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.addEventListener("pommy:cart-changed", renderSummary);
  renderSummary();
})();
