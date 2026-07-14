#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrationDir = path.join(root, "supabase", "migrations");
const migrationFiles = fs.readdirSync(migrationDir).filter((file) => file.endsWith(".sql")).sort();
const sql = migrationFiles.map((file) => fs.readFileSync(path.join(migrationDir, file), "utf8")).join("\n");

assert.deepEqual(migrationFiles, [
  "20260714000100_core_schema.sql",
  "20260714000200_create_order_rpc.sql",
  "20260714000300_admin_rpcs.sql",
  "20260714000400_security.sql"
]);

childProcess.execFileSync(process.execPath, [path.join(__dirname, "generate-supabase-seed.cjs"), "--check"], {
  cwd: root,
  stdio: "inherit"
});

[
  "create table public.categories",
  "create table public.menu_items",
  "create table public.orders",
  "create table public.order_items",
  "create table private.admin_users",
  "generated always as (unit_price * quantity) stored",
  "create function public.create_order",
  "for share of m, c",
  "extensions.digest",
  "create function public.admin_update_order_status",
  "p_search text default null",
  "position(lower(btrim(p_search))",
  "create function public.admin_update_menu_item",
  "enable row level security",
  "grant execute on function public.create_order",
  "revoke all on table public.categories, public.menu_items, public.orders, public.order_items"
].forEach((pattern) => assert.ok(sql.toLowerCase().includes(pattern), `Missing SQL invariant: ${pattern}`));

assert.equal(/grant\s+insert\s+on\s+(?:table\s+)?public\.(orders|order_items)[^;]*\b(?:anon|authenticated)\b/i.test(sql), false,
  "Browser roles must not receive direct order INSERT grants");
assert.equal(/grant\s+(?:all|update|delete)\s+on\s+(?:table\s+)?public\.menu_items[^;]*\banon\b/i.test(sql), false,
  "Anon must not receive menu mutation grants");
assert.equal(/select\s+count\s*\(\s*\*\s*\)\s*\+\s*1/i.test(sql), false,
  "Order numbers must not use count + 1");
assert.equal(/service[_-]?role/i.test(fs.readFileSync(path.join(root, "supabase", "config.toml"), "utf8")), false,
  "Committed Supabase config must not contain service-role credentials");

const seed = fs.readFileSync(path.join(root, "supabase", "seed.sql"), "utf8");
assert.match(seed, /expected exactly 101 menu items/);
assert.match(seed, /on conflict \(slug\) do update/g);

console.log(`Static Supabase validation passed across ${migrationFiles.length} migrations.`);
