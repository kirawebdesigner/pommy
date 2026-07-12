(function () {
  "use strict";

  var ORDER_KEY = "pommy_prepared_orders_v1";

  function readOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
    } catch (error) {
      return [];
    }
  }

  function createId() {
    var now = new Date();
    return "POM-" + now.toISOString().slice(0, 10).replace(/-/g, "") + "-" + String(now.getTime()).slice(-6);
  }

  function prepare(input) {
    var order = {
      orderId: createId(),
      createdAt: new Date().toISOString(),
      customerName: input.customerName,
      phone: input.phone,
      orderType: input.orderType,
      deliveryArea: input.deliveryArea || "",
      address: input.address || "",
      landmark: input.landmark || "",
      notes: input.notes || "",
      items: input.items.map(function (item) {
        return {
          productId: item.productId,
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity
        };
      }),
      subtotal: input.subtotal,
      paymentMethod: "cash_on_delivery",
      status: "prepared"
    };

    var orders = readOrders();
    orders.unshift(order);
    localStorage.setItem(ORDER_KEY, JSON.stringify(orders.slice(0, 20)));
    return order;
  }

  function format(order) {
    var lines = [
      "Pommy Burger and Pizza",
      "Order: " + order.orderId,
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
      lines.push(item.quantity + " x " + item.name + " - " + window.Pommy.formatEtb(item.unitPrice * item.quantity));
    });
    lines.push("");
    lines.push("Subtotal: " + window.Pommy.formatEtb(order.subtotal));
    lines.push("Payment: Cash on Delivery");
    if (order.notes) lines.push("Notes: " + order.notes);
    lines.push("Status: Order prepared locally; call Pommy to confirm.");
    return lines.join("\n");
  }

  window.PommyOrderService = { prepare: prepare, format: format, readOrders: readOrders };
})();
