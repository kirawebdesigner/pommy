const { chromium } = require("playwright");

const base = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const userId = "11111111-1111-4111-8111-111111111111";
const user = { id: userId, email: "admin@pommy.test", role: "authenticated", aud: "authenticated" };
const order = {
  id: "22222222-2222-4222-8222-222222222222",
  order_number: "POM-2026-00001",
  customer_name: "Test Customer",
  phone: "0956905484",
  order_type: "delivery",
  delivery_area: "Addis Ababa",
  address: "XRRH+5Q area",
  landmark: "Pommy",
  notes: "No onion",
  subtotal: 1640,
  payment_method: "cash_on_delivery",
  status: "new",
  created_at: "2026-07-14T08:00:00Z",
  items: [{ product_name: "Beef Burger", unit_price: 820, quantity: 2, line_total: 1640 }]
};
const category = { id: "33333333-3333-4333-8333-333333333333", name: "Burger", slug: "burger", sort_order: 1, is_active: true };
const secondCategory = { id: "55555555-5555-4555-8555-555555555555", name: "Pizza", slug: "pizza", sort_order: 2, is_active: true };
const menuItem = {
  id: "44444444-4444-4444-8444-444444444444",
  category_id: category.id,
  category_name: "Burger",
  name: "Beef Burger",
  slug: "beef-burger",
  description: "Meat, onion, tomato, salad and mayonnaise.",
  price: 820,
  image_url: "/assets/images/menu/burger.jpg",
  is_available: true,
  is_featured: false,
  sort_order: 17
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function token() {
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, email: user.email, role: "authenticated", exp: 4102444800 })}.test`;
}

async function authorize(page, writes, isAdmin = true) {
  const accessToken = token();
  await page.addInitScript(({ accessToken, user }) => {
    localStorage.setItem("sb-cruvatqjbignywiwoszh-auth-token", JSON.stringify({
      access_token: accessToken,
      refresh_token: "test-refresh-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: 4102444800,
      user
    }));
  }, { accessToken, user });

  await page.route("**/auth/v1/user", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) }));
  await page.route("**/rest/v1/rpc/**", async route => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    const payload = route.request().postDataJSON() || {};
    let body;
    if (name === "is_admin") body = isAdmin;
    else if (name === "admin_dashboard") body = { metrics: { new_orders: 1, preparing: 2, ready: 3, today_orders: 4 }, recent_orders: [order] };
    else if (name === "admin_list_orders") {
      writes.orderList = payload;
      body = [order];
    }
    else if (name === "admin_update_order_status") {
      writes.status = payload;
      body = { ...order, status: payload.p_status };
    } else if (name === "admin_list_categories") body = [category, secondCategory];
    else if (name === "admin_list_menu_items") body = [menuItem];
    else if (name === "admin_update_menu_item") {
      writes.menu = payload;
      body = { ...menuItem, ...payload.p_patch };
    } else return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: `Unexpected RPC ${name}` }) });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });

  const guest = await browser.newPage();
  await guest.goto(`${base}/admin/`, { waitUntil: "domcontentloaded" });
  await guest.waitForURL(/\/admin\/login\/\?next=/);
  assert(new URL(guest.url()).searchParams.get("next") === "/admin/", "Logged-out admin did not preserve the return path");
  assert(await guest.getByRole("heading", { name: "Sign in" }).isVisible(), "Admin login form did not render");
  assert(await guest.locator("[data-login-form]").getAttribute("method") === "post", "Admin login form has an unsafe GET fallback");
  await guest.close();

  const forbidden = await browser.newPage();
  await authorize(forbidden, {}, false);
  await forbidden.goto(`${base}/admin/`, { waitUntil: "domcontentloaded" });
  await forbidden.getByRole("heading", { name: "Access denied" }).waitFor();
  assert(await forbidden.locator("[data-admin-app]").isHidden(), "Authenticated non-admin could see the admin application");
  await forbidden.close();

  const writes = {};
  const dashboard = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await authorize(dashboard, writes);
  await dashboard.goto(`${base}/admin/`, { waitUntil: "domcontentloaded" });
  await dashboard.waitForFunction(() => document.body.classList.contains("admin-ready"));
  assert(await dashboard.locator('[data-metric="new"]').innerText() === "1", "Dashboard new-order metric is wrong");
  assert(await dashboard.locator('[data-metric="preparing"]').innerText() === "2", "Dashboard preparing metric is wrong");
  assert(await dashboard.locator("[data-recent-orders] tr").count() === 1, "Dashboard recent orders did not render");
  await dashboard.close();

  const orders = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await authorize(orders, writes);
  await orders.goto(`${base}/admin/orders/`, { waitUntil: "domcontentloaded" });
  await orders.locator(".order-card").waitFor();
  const orderDetails = await orders.locator(".order-details").innerText();
  assert(orderDetails.includes(order.delivery_area) && orderDetails.includes(order.address) && orderDetails.includes(order.landmark), "Admin order card omitted delivery fulfilment details");
  await orders.getByLabel("Search").fill(order.order_number);
  await orders.getByRole("button", { name: "Apply filters" }).click();
  await orders.locator(".order-card").waitFor();
  assert(writes.orderList.p_search === order.order_number && writes.orderList.p_limit === 11, "Order search was not sent to the paginated server RPC");
  await orders.locator(".order-status-controls select").selectOption("preparing");
  await orders.getByRole("button", { name: "Save status" }).click();
  await orders.getByText("Order status saved.").waitFor();
  assert(writes.status.p_order_id === order.id && writes.status.p_status === "preparing", "Order status RPC payload is incorrect");
  await orders.close();

  const menu = await browser.newPage({ viewport: { width: 768, height: 900 } });
  await authorize(menu, writes);
  await menu.goto(`${base}/admin/menu/`, { waitUntil: "domcontentloaded" });
  await menu.locator(".menu-editor").waitFor();
  await menu.getByLabel("Price (ETB)").fill("900");
  await menu.getByRole("checkbox", { name: "Available", exact: true }).uncheck();
  await menu.getByRole("checkbox", { name: "Featured", exact: true }).check();
  await menu.locator('.menu-editor select[name="category"]').selectOption(secondCategory.id);
  await menu.getByLabel("Description").fill("Updated test description.");
  await menu.getByLabel("Image path or URL").fill("/assets/images/menu/pizza.jpg");
  await menu.getByRole("button", { name: "Save changes" }).click();
  await menu.getByText(/saved\. Its slug was preserved/).waitFor();
  assert(writes.menu.p_menu_item_id === menuItem.id, "Menu update targeted the wrong item");
  assert(writes.menu.p_patch.price === 900 && writes.menu.p_patch.is_available === false, "Menu update payload lost price or availability");
  assert(writes.menu.p_patch.is_featured === true && writes.menu.p_patch.category_id === secondCategory.id, "Menu update payload lost featured or category changes");
  assert(writes.menu.p_patch.description === "Updated test description." && writes.menu.p_patch.image_url === "/assets/images/menu/pizza.jpg", "Menu update payload lost description or image changes");
  assert(!Object.prototype.hasOwnProperty.call(writes.menu.p_patch, "slug"), "Menu update attempted to mutate the stable slug");
  await menu.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await authorize(mobile, writes);
  await mobile.goto(`${base}/admin/orders/`, { waitUntil: "domcontentloaded" });
  await mobile.locator(".order-card").waitFor();
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Admin orders overflow at 390px");
  await mobile.close();

  await browser.close();
  console.log(JSON.stringify({ authGuard: true, nonAdminDenied: true, dashboard: true, orderStatus: true, menuUpdate: true, mobileOverflow: false, status: "passed" }));
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
