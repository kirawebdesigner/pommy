(function () {
  "use strict";

  function createSubmissionToken() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.from(bytes, function (value) { return value.toString(16).padStart(2, "0"); }).join("");
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
  }

  function errorKind(error) {
    var message = String(error && error.message || "").toLowerCase();
    if (/failed to fetch|network|load failed|abort|timeout/.test(message)) return "network";
    if (message.indexOf("cart_contains_missing_or_unavailable_items") !== -1) return "unavailable_items";
    if (message.indexOf("idempotency_token_reused") !== -1) return "idempotency_conflict";
    if (/invalid_cart|invalid_cart_item|invalid_cart_quantity/.test(message)) return "invalid_cart";
    if (/invalid_customer|invalid_phone|invalid_order_type|missing_delivery|customer_field_too_long/.test(message)) return "invalid_customer";
    return "submission_failed";
  }

  function OrderSubmissionError(kind) {
    this.name = "OrderSubmissionError";
    this.kind = kind;
    this.message = kind;
  }
  OrderSubmissionError.prototype = Object.create(Error.prototype);
  OrderSubmissionError.prototype.constructor = OrderSubmissionError;

  function normalizeItem(item) {
    return {
      productId: String(item.menu_item_id || ""),
      name: String(item.product_name || ""),
      unitPrice: Number(item.unit_price),
      quantity: Number(item.quantity),
      lineTotal: Number(item.line_total)
    };
  }

  function normalizeOrder(data, input, displayedSubtotal) {
    if (!data || !data.id || !data.order_number || !Array.isArray(data.items)) {
      throw new OrderSubmissionError("invalid_response");
    }
    var subtotal = Number(data.subtotal);
    if (!Number.isFinite(subtotal)) throw new OrderSubmissionError("invalid_response");
    return {
      orderId: String(data.id),
      orderNumber: String(data.order_number),
      createdAt: String(data.created_at || ""),
      customerName: input.customerName,
      phone: input.phone,
      orderType: String(data.order_type || input.orderType),
      deliveryArea: input.deliveryArea || "",
      address: input.address || "",
      landmark: input.landmark || "",
      notes: input.notes || "",
      items: data.items.map(normalizeItem),
      subtotal: subtotal,
      displayedSubtotal: Number(displayedSubtotal),
      priceChanged: Math.abs(subtotal - Number(displayedSubtotal)) >= 0.005,
      paymentMethod: String(data.payment_method || "cash_on_delivery"),
      status: String(data.status || "new")
    };
  }

  async function submit(input, submissionToken) {
    if (window.POMMY_SEO_CONFIG && window.POMMY_SEO_CONFIG.demoMode) {
      throw new OrderSubmissionError("demo_mode");
    }
    var api = window.PommySupabase;
    if (!api || !api.configured) throw new OrderSubmissionError("not_configured");

    var items = input.items.map(function (item) {
      return { slug: String(item.slug || item.productId), quantity: Number(item.quantity) };
    });
    var displayedSubtotal = Number(input.subtotal);
    var result;
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeoutId;
    try {
      var request = api.getClient().rpc("create_order", {
        p_customer_name: input.customerName,
        p_phone: input.phone,
        p_order_type: input.orderType === "pickup" ? "takeaway" : input.orderType,
        p_items: items,
        p_client_order_token: submissionToken,
        p_delivery_area: input.deliveryArea || null,
        p_address: input.address || null,
        p_landmark: input.landmark || null,
        p_notes: input.notes || null
      });
      if (controller && request && typeof request.abortSignal === "function") request = request.abortSignal(controller.signal);
      result = await Promise.race([
        request,
        new Promise(function (_, reject) {
          timeoutId = setTimeout(function () {
            if (controller) controller.abort();
            reject(new Error("order_request_timeout"));
          }, 20000);
        })
      ]);
    } catch (error) {
      throw new OrderSubmissionError(errorKind(error));
    } finally {
      clearTimeout(timeoutId);
    }
    if (result.error) throw new OrderSubmissionError(errorKind(result.error));
    return normalizeOrder(result.data, input, displayedSubtotal);
  }

  function format(order) {
    var lines = [
      "Pommy Burger and Pizza",
      "Order: " + order.orderNumber,
      "Customer: " + order.customerName,
      "Phone: " + order.phone,
      "Order type: " + (order.orderType === "delivery" ? "Delivery" : "Takeaway / Pickup")
    ];

    if (order.orderType === "delivery") {
      lines.push("Delivery area: " + order.deliveryArea);
      lines.push("Location / address: " + order.address);
      if (order.landmark) lines.push("Nearby landmark: " + order.landmark);
    }

    lines.push("");
    order.items.forEach(function (item) {
      lines.push(item.quantity + " x " + item.name + " - " + window.Pommy.formatEtb(item.lineTotal));
    });
    lines.push("");
    lines.push("Confirmed total: " + window.Pommy.formatEtb(order.subtotal));
    lines.push("Payment: Cash on Delivery");
    if (order.notes) lines.push("Notes: " + order.notes);
    lines.push("Status: Order received.");
    return lines.join("\n");
  }

  window.PommyOrderService = Object.freeze({
    createSubmissionToken: createSubmissionToken,
    submit: submit,
    format: format
  });
})();
