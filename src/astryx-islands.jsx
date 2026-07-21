import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import "./astryx-islands.css";

function cartCount() {
  const cart = window.Pommy?.readCart?.() || [];
  return cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
}

function CartControl() {
  const [count, setCount] = useState(cartCount);

  useEffect(() => {
    const update = () => setCount(cartCount());
    document.addEventListener("pommy:cart-changed", update);
    window.addEventListener("storage", update);
    update();
    return () => {
      document.removeEventListener("pommy:cart-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <Button
      className="pommy-astryx-cart-button pommy-cart-open"
      label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
      variant="secondary"
      size="sm"
      onClick={() => window.Pommy?.openCart?.()}
      endContent={
        <Badge
          className="pommy-astryx-cart-count"
          data-cart-count=""
          label={count}
        />
      }
    >
      Cart
    </Button>
  );
}

function mountCartControls() {
  document.querySelectorAll("[data-astryx-cart-root]").forEach((node) => {
    if (node.dataset.astryxMounted === "true") return;
    node.dataset.astryxMounted = "true";
    createRoot(node).render(<CartControl />);
  });
}

mountCartControls();
window.Pommy?.motionReady?.then(mountCartControls);
