import { b as e, r as t, t as n, v as r } from "./useTooltip-Bfg706nn.mjs";
//#region node_modules/@astryxdesign/core/dist/hooks/useIsomorphicLayoutEffect.js
var i = /* @__PURE__ */ e(r(), 1), a = typeof window < "u" ? i.useLayoutEffect : i.useEffect, o = t();
function s(e) {
	return typeof e == "string" || typeof e == "number";
}
function c(...e) {
	let t = e.filter(Boolean);
	return t.length > 0 ? t.join(" ") : void 0;
}
function l({ children: e, anchorRef: t, content: r, placement: l = "above", alignment: u = "center", delay: d = 200, hideDelay: f = 0, focusTrigger: p = "auto", isEnabled: m = !0, onOpenChange: h, hasHoverIndication: g = "auto", isOpen: _, isDefaultOpen: v }) {
	let y = (0, i.useRef)(null), b = e != null && s(e), x = g === !0 || g === "auto" && b, S = n({
		placement: l,
		alignment: u,
		delay: d,
		hideDelay: f,
		focusTrigger: p,
		isEnabled: m,
		isOpen: _,
		isDefaultOpen: v,
		onShow: (0, i.useCallback)(() => {
			h?.(!0);
		}, [h]),
		onHide: (0, i.useCallback)(() => {
			h?.(!1);
		}, [h])
	});
	return a(() => {
		if (!t) return;
		let e = t.current;
		if (!e) return;
		S.ref(e);
		let n = e.getAttribute("aria-describedby");
		return e.setAttribute("aria-describedby", c(n, S.describedBy) ?? ""), () => {
			S.ref(null), n ? e.setAttribute("aria-describedby", n) : e.removeAttribute("aria-describedby");
		};
	}, [
		t,
		S.ref,
		S.describedBy
	]), a(() => {
		if (t || b) return;
		let e = y.current;
		if (!e) return;
		let n = e.firstElementChild;
		if (!n) return;
		S.ref(n);
		let r = n.getAttribute("aria-describedby");
		return n.setAttribute("aria-describedby", c(r, S.describedBy) ?? ""), () => {
			S.ref(null), r ? n.setAttribute("aria-describedby", r) : n.removeAttribute("aria-describedby");
		};
	}, [
		t,
		b,
		S.ref,
		S.describedBy
	]), t && e == null ? /*#__PURE__*/ (0, o.jsx)(o.Fragment, { children: S.renderTooltip(r) }) : b ? /*#__PURE__*/ (0, o.jsxs)(o.Fragment, { children: [/*#__PURE__*/ (0, o.jsx)("span", {
		ref: S.ref,
		tabIndex: 0,
		"aria-describedby": S.describedBy,
		...{
			0: { className: "xt0psk2" },
			1: { className: "xt0psk2 xujl8zx xev0dqp xycaml9 xrys4gj" }
		}[!!x << 0],
		children: e
	}), S.renderTooltip(r)] }) : /*#__PURE__*/ (0, o.jsxs)(o.Fragment, { children: [/*#__PURE__*/ (0, o.jsx)("div", {
		ref: y,
		className: "xjp7ctv",
		children: e
	}), S.renderTooltip(r)] });
}
l.displayName = "Tooltip";
//#endregion
export { l as Tooltip };
