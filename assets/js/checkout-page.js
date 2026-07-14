(function () {
  "use strict";

  var PENDING_ORDER_KEY = "pommy.pending-order.v1";

  function requestFingerprint(input) {
    var normalized = {
      customerName: input.customerName.trim(),
      phone: input.phone.replace(/[\s()-]/g, ""),
      orderType: input.orderType,
      deliveryArea: input.deliveryArea.trim(),
      address: input.address.trim(),
      landmark: input.landmark.trim(),
      notes: input.notes.trim(),
      items: input.items.map(function (item) {
        return { slug: String(item.slug || item.productId), quantity: Number(item.quantity) };
      }).sort(function (left, right) { return left.slug.localeCompare(right.slug); })
    };
    var value = JSON.stringify(normalized);
    var first = 2166136261;
    var second = 5381;
    for (var index = 0; index < value.length; index += 1) {
      first = Math.imul(first ^ value.charCodeAt(index), 16777619);
      second = Math.imul(second, 33) ^ value.charCodeAt(index);
    }
    return "v1-" + (first >>> 0).toString(16) + "-" + (second >>> 0).toString(16) + "-" + value.length;
  }

  function readPendingOrder() {
    try { return JSON.parse(localStorage.getItem(PENDING_ORDER_KEY) || "null"); }
    catch (error) { return null; }
  }

  function savePendingOrder(fingerprint, token) {
    try { localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify({ fingerprint: fingerprint, token: token })); }
    catch (error) { /* The in-memory token still protects duplicate clicks in this page. */ }
  }

  function clearPendingOrder() {
    try { localStorage.removeItem(PENDING_ORDER_KEY); }
    catch (error) { /* Storage may be unavailable in private browsing modes. */ }
  }

  function init() {
    var app = document.getElementById("pommy-checkout-app");
    if (!app || !window.Pommy || !window.PommyOrderService) return;

    function summaryMarkup(cart, trustedSubtotal) {
      if (!cart.length) return '<div class="pommy-cart-empty"><p>Your cart is empty.</p><a href="/menu/" class="button-secondary small">Browse the menu</a></div>';
      return cart.map(function (item) {
        var lineTotal = Number.isFinite(item.lineTotal) ? item.lineTotal : item.unitPrice * item.quantity;
        return '<div class="pommy-order-line"><span>' + item.quantity + ' × ' + window.Pommy.escapeHtml(item.name) + '</span><strong>' + window.Pommy.formatEtb(lineTotal) + '</strong></div>';
      }).join("") + '<div class="pommy-cart-total" style="margin-top:20px"><span>Subtotal</span><span>' + window.Pommy.formatEtb(Number.isFinite(trustedSubtotal) ? trustedSubtotal : window.Pommy.cartSubtotal(cart)) + '</span></div><p><strong>Payment method:</strong> Cash on Delivery</p>';
    }

    app.innerHTML = '<div class="pommy-checkout-grid"><form id="pommy-checkout-form" class="pommy-checkout-panel" novalidate><div id="pommy-checkout-errors" class="pommy-errors" role="alert" tabindex="-1" hidden></div><div class="pommy-field-grid"><div class="pommy-field"><label for="customer-name">Full Name</label><input class="input w-input" id="customer-name" name="customerName" type="text" autocomplete="name" required></div><div class="pommy-field"><label for="customer-phone">Phone Number</label><input class="input w-input" id="customer-phone" name="phone" type="tel" autocomplete="tel" placeholder="09... or +2519..." required></div></div><fieldset class="pommy-field"><legend>Order Type</legend><div class="pommy-radio-row"><label class="pommy-radio-option"><input type="radio" name="orderType" value="delivery" required> Delivery</label><label class="pommy-radio-option"><input type="radio" name="orderType" value="pickup" required> Takeaway / Pickup</label></div></fieldset><div id="pommy-delivery-fields" hidden><div class="pommy-field-grid"><div class="pommy-field"><label for="delivery-area">Delivery Area</label><input class="input w-input" id="delivery-area" name="deliveryArea" type="text" autocomplete="address-level2"></div><div class="pommy-field"><label for="delivery-landmark">Nearby Landmark</label><input class="input w-input" id="delivery-landmark" name="landmark" type="text"></div></div><div class="pommy-field"><label for="delivery-address">Location / Address</label><textarea class="input w-input" id="delivery-address" name="address" rows="3" autocomplete="street-address"></textarea></div></div><div class="pommy-field"><label for="order-notes">Optional order notes</label><textarea class="input w-input" id="order-notes" name="notes" rows="4" placeholder="No onion, extra cheese, call when you arrive..."></textarea></div><div class="pommy-info-card" style="margin-bottom:20px"><strong>Payment method</strong><p style="margin:8px 0 0">Cash on Delivery</p></div><button class="button-primary w-button" type="submit">Place Order</button><p class="pommy-disclosure">Your order is confirmed only after it is received by Pommy. Payment is due on delivery or pickup.</p></form><aside class="pommy-checkout-panel" aria-labelledby="order-summary-heading"><h2 id="order-summary-heading">Order summary</h2><div id="pommy-checkout-summary"></div></aside></div><div id="pommy-order-result" style="margin-top:32px" aria-live="polite"></div>';

    var form = document.getElementById("pommy-checkout-form");
    var deliveryFields = document.getElementById("pommy-delivery-fields");
    var summary = document.getElementById("pommy-checkout-summary");
    var errors = document.getElementById("pommy-checkout-errors");
    var result = document.getElementById("pommy-order-result");
    var submitButton = form.querySelector('button[type="submit"]');
    var submitting = false;
    var submissionToken = null;
    var submissionFingerprint = null;

    function renderSummary() { summary.innerHTML = summaryMarkup(window.Pommy.readCart()); }
    function resetSubmissionToken() {
      if (!submitting) {
        submissionToken = null;
        submissionFingerprint = null;
      }
    }
    function tokenFor(fingerprint) {
      if (submissionToken && submissionFingerprint === fingerprint) return submissionToken;
      var pending = readPendingOrder();
      submissionToken = pending && pending.fingerprint === fingerprint && pending.token
        ? pending.token
        : window.PommyOrderService.createSubmissionToken();
      submissionFingerprint = fingerprint;
      savePendingOrder(fingerprint, submissionToken);
      return submissionToken;
    }
    function isValidPhone(value) {
      var phone = value.replace(/[\s()-]/g, "");
      return /^09\d{8}$/.test(phone) || /^\+2519\d{8}$/.test(phone) || /^2519\d{8}$/.test(phone);
    }
    function failureMessage(kind) {
      if (kind === "unavailable_items") return "One or more items are no longer available. Your cart is still saved; review the current menu and try again.";
      if (kind === "invalid_cart") return "The cart could not be validated. Review the item quantities and try again.";
      if (kind === "invalid_customer") return "The order details could not be validated. Review the form and try again.";
      if (kind === "idempotency_conflict") return "The order details changed during submission. Review them and try again.";
      if (kind === "not_configured") return "Online ordering is temporarily unavailable. Your cart is still saved; please call Pommy or try again later.";
      return "We couldn't submit your order right now. Your cart is still saved. Please try again.";
    }

    form.addEventListener("input", resetSubmissionToken);
    form.addEventListener("change", function (event) {
      resetSubmissionToken();
      if (event.target.name !== "orderType") return;
      var delivery = event.target.value === "delivery";
      deliveryFields.hidden = !delivery;
      ["deliveryArea", "address"].forEach(function (name) { form.elements[name].required = delivery; });
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (submitting) return;
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
      var orderInput = {
        customerName: name,
        phone: phone,
        orderType: orderType,
        deliveryArea: deliveryArea,
        address: address,
        landmark: String(data.get("landmark") || "").trim(),
        notes: String(data.get("notes") || "").trim(),
        items: cart,
        subtotal: window.Pommy.cartSubtotal(cart)
      };
      var fingerprint = requestFingerprint(orderInput);
      submitting = true;
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
      var order;
      try {
        order = await window.PommyOrderService.submit(orderInput, tokenFor(fingerprint));
      } catch (error) {
        submitting = false;
        submitButton.disabled = false;
        submitButton.textContent = "Place Order";
        errors.hidden = false;
        errors.textContent = failureMessage(error.kind);
        errors.focus();
        return;
      }

      clearPendingOrder();
      window.Pommy.saveCart([]);
      form.hidden = true;
      var priceNotice = order.priceChanged
        ? '<p><strong>The menu changed while your order was being prepared.</strong> The confirmed Cash on Delivery total is ' + window.Pommy.formatEtb(order.subtotal) + '.</p>'
        : '';
      result.innerHTML = '<div class="pommy-order-success"><h2>Order received</h2><p>Pommy has received your Cash on Delivery order. The restaurant may call you to confirm delivery or pickup details.</p>' + priceNotice + '<p><strong>Order number:</strong> ' + window.Pommy.escapeHtml(order.orderNumber) + '</p><p><strong>Confirmed total:</strong> ' + window.Pommy.formatEtb(order.subtotal) + '</p><div class="pommy-actions"><a class="button-primary w-button" href="tel:' + window.Pommy.escapeHtml(window.POMMY_ORDER_CONFIG.phoneInternational) + '">Call Pommy</a><button class="button-secondary w-button" type="button" id="copy-order-details">Copy Order Details</button></div><p id="copy-order-status" class="pommy-disclosure" aria-live="polite"></p></div>';
      summary.innerHTML = summaryMarkup(order.items, order.subtotal);
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

    document.addEventListener("pommy:cart-changed", function () {
      resetSubmissionToken();
      renderSummary();
    });
    renderSummary();
  }

  if (!window.Pommy) return;
  Promise.resolve(window.Pommy.ready).then(init);
})();
