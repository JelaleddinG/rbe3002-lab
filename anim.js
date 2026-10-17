/* Exercise animations: original side/front-view figures drawn on canvas.
   Logical canvas 260 x 200, floor at y = 188. Figure faces right. Red = working muscles. */
(function(){
"use strict";
const W = 260, H = 200, F = 188;
const L = { torso:52, neck:6, headR:11, ua:30, fa:28, th:44, sh:42, foot:13 };
const rad = d => d * Math.PI / 180;
const dir = a => [Math.cos(rad(a)), Math.sin(rad(a))];
const add = (p, v, k) => [p[0] + v[0] * (k == null ? 1 : k), p[1] + v[1] * (k == null ? 1 : k)];
const lerp = (a, b, s) => a + (b - a) * s;
function mix(A, B, s){
  if (typeof A === "number") return lerp(A, B, s);
  if (Array.isArray(A)) return A.map((v, i) => mix(v, B[i], s));
  if (A && typeof A === "object"){ const o = {}; for (const k in A) o[k] = (B && k in B) ? mix(A[k], B[k], s) : A[k]; return o; }
  return A;
}
const ease = s => s * s * (3 - 2 * s);
function ik(A, T, l1, l2, pref){
  const th = Math.atan2(T[1] - A[1], T[0] - A[0]);
  const d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, Math.hypot(T[0] - A[0], T[1] - A[1])));
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const j1 = [A[0] + l1 * Math.cos(th + a), A[1] + l1 * Math.sin(th + a)];
  const j2 = [A[0] + l1 * Math.cos(th - a), A[1] + l1 * Math.sin(th - a)];
  const m = [(A[0] + T[0]) / 2, (A[1] + T[1]) / 2];
  const sc = j => (j[0] - m[0]) * pref[0] + (j[1] - m[1]) * pref[1];
  const J = sc(j1) >= sc(j2) ? j1 : j2;
  const e = Math.atan2(T[1] - J[1], T[0] - J[0]);
  return [J, [J[0] + l2 * Math.cos(e), J[1] + l2 * Math.sin(e)]];
}

/* ---------- side-view skeleton ---------- */
function solve(p){
  const u = dir(p.torso), n = [-u[1], u[0]];
  const hip = p.hip, sh = add(hip, u, L.torso);
  const hu = dir(p.torso + (p.head || 0));
  const head = add(sh, hu, L.neck + L.headR);
  const frame = o => add(add(sh, u, o[0]), n, o[1]);
  const limb = (root, sp, l1, l2) => {
    if (sp.ang){ const j = add(root, dir(sp.ang[0]), l1); return [j, add(j, dir(sp.ang[1]), l2)]; }
    const T = sp.t ? sp.t : frame(sp.s);
    return ik(root, T, l1, l2, sp.pref || [1, 0]);
  };
  const legs = p.legs.map(sp => { const r = limb(hip, sp, L.th, L.sh); return { k:r[0], a:r[1], toe:add(r[1], dir(sp.fa == null ? 15 : sp.fa), L.foot) }; });
  const arms = p.arms.map(sp => { const r = limb(sh, sp, L.ua, L.fa); return { e:r[0], h:r[1] }; });
  return { u, n, hu, hip, sh, head, legs, arms, noEye:p.noEye };
}

let C = {};
function colors(){
  const cs = getComputedStyle(document.documentElement), g = (k, d) => (cs.getPropertyValue(k) || "").trim() || d;
  C = { fig:g("--ink","#121821"), far:g("--fig-far","#8b95a3"), hot:g("--red","#c42f28"), eq:g("--muted","#566273"),
        fill:g("--surface-2","#f5f7fa"), floor:g("--line","#d4dbe3"), bg:g("--surface","#ffffff"), plate:g("--black","#2b313a") };
}

function seg(ctx, a, b, w, col){ ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
function dot(ctx, c, r, fill){ ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, Math.PI * 2); ctx.fill(); }
function ring(ctx, c, r, col, w){ ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, Math.PI * 2); ctx.stroke(); }
function box(ctx, x, y, w, h, fill, stroke){ ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h); } }
function poly(ctx, pts, fill, stroke, w){ ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); if (fill){ ctx.fillStyle = fill; ctx.fill(); } if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = w || 1.5; ctx.stroke(); } }

function drawSide(ctx, k, hi){
  const has = x => hi.indexOf(x) >= 0;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const limbArm = (a, col, alpha) => {
    ctx.globalAlpha = alpha;
    seg(ctx, k.sh, a.e, 8, has("ua") ? C.hot : col);
    seg(ctx, a.e, a.h, 7, has("fa") ? C.hot : col);
    dot(ctx, a.h, 4, col);
    ctx.globalAlpha = 1;
  };
  const limbLeg = (l, col, alpha) => {
    ctx.globalAlpha = alpha;
    seg(ctx, k.hip, l.k, 11, has("th") ? C.hot : col);
    seg(ctx, l.k, l.a, 9, has("sh") ? C.hot : col);
    seg(ctx, l.a, l.toe, 6, col);
    ctx.globalAlpha = 1;
  };
  // far side
  limbArm(k.arms[1], C.far, 1);
  limbLeg(k.legs[1], C.far, 1);
  // torso + head
  seg(ctx, k.hip, k.sh, 16, C.fig);
  seg(ctx, k.sh, add(k.sh, k.hu, L.neck), 7, C.fig);
  dot(ctx, k.head, L.headR, C.fig);
  if (!k.noEye) dot(ctx, add(add(k.head, [-k.hu[1], k.hu[0]], 5), k.hu, 1.5), 1.7, C.bg);
  const band = (f0, f1, side) => { const off = [k.n[0] * 4.2 * side, k.n[1] * 4.2 * side]; seg(ctx, add(add(k.hip, k.u, L.torso * f0), off), add(add(k.hip, k.u, L.torso * f1), off), 6.5, C.hot); };
  if (has("chest")) band(0.6, 0.9, 1);
  if (has("abs")) band(0.14, 0.56, 1);
  if (has("back")) band(0.45, 0.9, -1);
  if (has("lowback")) band(0.1, 0.42, -1);
  if (has("glute")) dot(ctx, add(k.hip, k.n, -4.5), 6.5, C.hot);
  // near side
  limbLeg(k.legs[0], C.fig, 1);
  if (has("delt")) dot(ctx, k.sh, 6.5, C.hot);
  limbArm(k.arms[0], C.fig, 1);
}

/* ---------- front-view figure (lateral raise, pec deck) ---------- */
function drawFront(ctx, P, hi){
  const has = x => hi.indexOf(x) >= 0;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const cx = P.cx, sy = P.shY, hy = P.hipY;
  P.legs.forEach((l, i) => { const hp = [cx + (i ? -8 : 8), hy]; seg(ctx, hp, l.k, 11, C.fig); seg(ctx, l.k, l.a, 9, C.fig); seg(ctx, l.a, [l.a[0] + (i ? -8 : 8), l.a[1] + 2], 6, C.fig); });
  poly(ctx, [[cx - 19, sy], [cx + 19, sy], [cx + 11, hy + 4], [cx - 11, hy + 4]], C.fig);
  seg(ctx, [cx - 15, sy], [cx + 15, sy], 9, C.fig);
  seg(ctx, [cx, sy], [cx, sy - 8], 8, C.fig);
  dot(ctx, [cx, sy - 18], L.headR, C.fig);
  dot(ctx, [cx - 4, sy - 19], 1.6, C.bg); dot(ctx, [cx + 4, sy - 19], 1.6, C.bg);
  if (has("chest")){ ctx.fillStyle = C.hot; [[-8], [8]].forEach(([dx]) => { ctx.beginPath(); ctx.ellipse(cx + dx, sy + 11, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); }); }
  P.arms.forEach((a, i) => { const s = [cx + (i ? -17 : 17), sy + 2]; seg(ctx, s, a.e, 8, C.fig); seg(ctx, a.e, a.h, 7, C.fig); dot(ctx, a.h, 4, C.fig); if (has("delt")) dot(ctx, s, 6.5, C.hot); });
}

/* ---------- equipment ---------- */
const eqLine = (ctx, a, b, w) => seg(ctx, a, b, w || 3, C.eq);
function dbEnd(ctx, h){ dot(ctx, h, 7.5, C.plate); dot(ctx, h, 2.5, C.bg); }
function dbBar(ctx, h, ang, len){ const v = dir(ang), L2 = (len || 20) / 2; const a = add(h, v, -L2), b = add(h, v, L2); seg(ctx, a, b, 3, C.plate); seg(ctx, add(a, v, -1), add(a, v, 4), 9, C.plate); seg(ctx, add(b, v, -4), add(b, v, 1), 9, C.plate); }
function floor(ctx){ seg(ctx, [6, F], [W - 6, F], 2, C.floor); }
function seat(ctx, x0, x1, y){ box(ctx, x0, y, x1 - x0, 7, C.fill, C.eq); eqLine(ctx, [(x0 + x1) / 2, y + 7], [(x0 + x1) / 2, F], 4); eqLine(ctx, [(x0 + x1) / 2 - 14, F], [(x0 + x1) / 2 + 14, F], 4); }
function pad(ctx, a, b, w){ seg(ctx, a, b, w || 8, C.eq); seg(ctx, a, b, (w || 8) - 4, C.fill); }
function cable(ctx, a, b){ ctx.setLineDash([1, 0]); seg(ctx, a, b, 1.5, C.eq); dot(ctx, b, 4.5, C.eq); dot(ctx, b, 1.8, C.bg); }

/* ---------- gait ---------- */
function gait(p, cx, len, lift, gy, stance){
  const foot = q => {
    q = ((q % 1) + 1) % 1;
    if (q < stance){ const x = cx + len / 2 - len * (q / stance); return { t:[x, gy(x) - 5], fa:15 }; }
    const r = (q - stance) / (1 - stance), x = cx - len / 2 + len * r;
    return { t:[x, gy(x) - 5 - lift * Math.sin(Math.PI * r)], fa:15 + 25 * Math.sin(Math.PI * r) };
  };
  return [foot(p), foot(p + 0.5)];
}

/* ---------- shared poses ---------- */
const STAND = { hip:[120, 99], torso:-90, head:0, legs:[{ t:[124, 183], pref:[1, 0] }, { t:[117, 183], pref:[1, 0] }], arms:[{ ang:[92, 92] }, { ang:[89, 89] }] };
const st = o => Object.assign({}, STAND, o);
const seated = (hip, torso, ank) => ({ hip, torso, head:0, legs:[{ t:ank, pref:[1, -1] }, { t:[ank[0] - 6, ank[1]], pref:[1, -1] }] });
const pp = (A, B) => s => mix(A, B, s);

/* ---------- exercises ---------- */
const X = {};

X["goblet-squat"] = { hi:["th", "glute"],
  pose: pp(st({ hip:[118, 99], torso:-88, head:0, arms:[{ s:[-16, 15], pref:[0, 1] }, { s:[-16, 13], pref:[0, 1] }] }),
           st({ hip:[99, 139], torso:-57, head:-26, arms:[{ s:[-16, 15], pref:[0, 1] }, { s:[-16, 13], pref:[0, 1] }] })),
  front:(ctx, k) => { const h = k.arms[0].h; seg(ctx, [h[0], h[1] - 9], [h[0], h[1] + 9], 3, C.plate); seg(ctx, [h[0] - 6, h[1] - 10], [h[0] + 6, h[1] - 10], 6, C.plate); seg(ctx, [h[0] - 6, h[1] + 10], [h[0] + 6, h[1] + 10], 6, C.plate); } };

X["chest-press"] = { hi:["chest", "ua"],
  pose: pp(Object.assign(seated([96, 140], -98, [140, 183]), { arms:[{ s:[-12, 16], pref:[-1, 0.3] }, { s:[-12, 13], pref:[-1, 0.3] }] }),
           Object.assign(seated([96, 140], -98, [140, 183]), { arms:[{ s:[-12, 55], pref:[-0.2, 1] }, { s:[-12, 52], pref:[-0.2, 1] }] })),
  back:(ctx, k) => { seat(ctx, 66, 116, 147); pad(ctx, add(add(k.hip, k.n, -10), k.u, -4), add(add(k.sh, k.n, -10), k.u, 14), 10); const piv = [k.sh[0] - 18, k.sh[1] - 50]; eqLine(ctx, piv, [piv[0], F], 4); eqLine(ctx, piv, k.arms[0].h, 3); },
  front:(ctx, k) => { const h = k.arms[0].h; seg(ctx, [h[0], h[1] - 8], [h[0], h[1] + 8], 5, C.eq); } };

X["lat-pulldown"] = { hi:["back"],
  pose: pp(Object.assign(seated([104, 142], -98, [146, 183]), { arms:[{ s:[55, 6], pref:[0.4, 1] }, { s:[55, 3], pref:[0.4, 1] }] }),
           Object.assign(seated([104, 142], -102, [146, 183]), { head:-6, arms:[{ s:[3, 14], pref:[-0.4, 1] }, { s:[3, 11], pref:[-0.4, 1] }] })),
  back:(ctx, k) => { seat(ctx, 82, 124, 149); cable(ctx, k.arms[0].h, [100, 10]); eqLine(ctx, [100, 10], [30, 10], 4); eqLine(ctx, [30, 10], [30, F], 4); const top = 96 + (k.arms[0].h[1] - 36) * 0.5; box(ctx, 22, top, 16, F - top, C.fill, C.eq); },
  front:(ctx, k) => { const kn = k.legs[0].k; pad(ctx, [kn[0] - 7, kn[1] - 10], [kn[0] + 9, kn[1] - 10], 9); seg(ctx, [k.arms[0].h[0] - 10, k.arms[0].h[1]], [k.arms[0].h[0] + 10, k.arms[0].h[1]], 4, C.plate); } };

X["db-shoulder-press"] = { hi:["delt", "ua"],
  pose: pp(Object.assign(seated([108, 142], -92, [148, 183]), { arms:[{ s:[8, 9], pref:[0.3, 1] }, { s:[8, 6], pref:[0.3, 1] }] }),
           Object.assign(seated([108, 142], -92, [148, 183]), { arms:[{ s:[55, 4], pref:[0.3, 1] }, { s:[55, 1], pref:[0.3, 1] }] })),
  back:(ctx, k) => { seat(ctx, 84, 126, 149); pad(ctx, add(add(k.hip, k.n, -10), k.u, -6), add(add(k.sh, k.n, -10), k.u, 12), 10); },
  front:(ctx, k) => { dbEnd(ctx, k.arms[0].h); } };

X["cable-row"] = { hi:["back", "delt"],
  pose: pp({ hip:[86, 160], torso:-74, head:-14, legs:[{ t:[168, 158], pref:[0, -1], fa:-80 }, { t:[164, 160], pref:[0, -1], fa:-80 }], arms:[{ s:[-14, 54], pref:[0, 1] }, { s:[-14, 51], pref:[0, 1] }] },
           { hip:[86, 160], torso:-96, head:0, legs:[{ t:[168, 158], pref:[0, -1], fa:-80 }, { t:[164, 160], pref:[0, -1], fa:-80 }], arms:[{ s:[-30, 16], pref:[-1, 0] }, { s:[-30, 13], pref:[-1, 0] }] }),
  back:(ctx) => { box(ctx, 40, 168, 80, 7, C.fill, C.eq); eqLine(ctx, [60, 175], [60, F], 4); eqLine(ctx, [100, 175], [100, F], 4); box(ctx, 176, 128, 8, 60, C.fill, C.eq); },
  front:(ctx, k) => { cable(ctx, k.arms[0].h, [190, 140]); dot(ctx, k.arms[0].h, 4.5, C.plate); } };

X["triceps-pushdown"] = { hi:["ua"],
  pose: pp(st({ hip:[110, 99], torso:-80, head:-8, arms:[{ ang:[84, -35] }, { ang:[82, -37] }] }),
           st({ hip:[110, 99], torso:-80, head:-8, arms:[{ ang:[86, 86] }, { ang:[84, 84] }] })),
  front:(ctx, k) => { cable(ctx, k.arms[0].h, [150, 8]); seg(ctx, [148, 2], [180, 2], 4, C.eq); } };

X["db-curl"] = { hi:["ua"],
  pose: pp(st({ arms:[{ ang:[92, 92] }, { ang:[89, 89] }] }), st({ arms:[{ ang:[95, -72] }, { ang:[93, -75] }] })),
  front:(ctx, k) => dbEnd(ctx, k.arms[0].h) };

X["hammer-curl"] = { hi:["ua", "fa"],
  pose: X["db-curl"].pose,
  front:(ctx, k) => { const a = k.arms[0]; const fa = Math.atan2(a.h[1] - a.e[1], a.h[0] - a.e[0]) * 180 / Math.PI; dbBar(ctx, a.h, fa + 90, 22); } };

X["db-rdl"] = { hi:["th", "glute", "lowback"],
  pose: pp(st({ hip:[118, 99], torso:-88, arms:[{ ang:[92, 92] }, { ang:[89, 89] }] }),
           st({ hip:[93, 105], torso:-24, head:-30, arms:[{ ang:[90, 90] }, { ang:[88, 88] }] })),
  front:(ctx, k) => dbEnd(ctx, k.arms[0].h) };

const LPR = dir(-42);
X["leg-press"] = { hi:["th", "glute"],
  pose: s => { const hip = [72, 152], d = lerp(80, 44, s), a = add(hip, LPR, d);
    return { hip, torso:-152, head:24, legs:[{ t:a, pref:[-0.67, -0.74], fa:-128 }, { t:add(a, [-4, 3]), pref:[-0.67, -0.74], fa:-128 }], arms:[{ ang:[30, 12] }, { ang:[28, 10] }] }; },
  back:(ctx, k) => { pad(ctx, add(add(k.hip, k.n, -10), k.u, -6), add(add(k.sh, k.n, -10), k.u, 16), 11); box(ctx, 52, 160, 44, 7, C.fill, C.eq); eqLine(ctx, [74, 167], [74, F], 4); const P = dir(48), r0 = add(add(k.hip, LPR, 22), P, 18), r1 = add(add(k.hip, LPR, 124), P, 18); eqLine(ctx, r0, r1, 4); eqLine(ctx, r0, [r0[0], F], 4); eqLine(ctx, add(r0, LPR, 70), [add(r0, LPR, 70)[0], F], 4); },
  front:(ctx, k) => { const a = k.legs[0].a, c = add(a, LPR, 7), v = dir(-132); pad(ctx, add(c, v, -10), add(c, v, 26), 7); eqLine(ctx, add(c, v, 4), add(add(c, v, 4), dir(48), 12), 3); } };

const curlSeat = (shin, ext) => ({ hip:[92, 138], torso:-100, head:4,
  legs:[{ ang:[0, shin], fa:shin - 80 }, { ang:[-2, shin - 2], fa:shin - 82 }], arms:[{ ang:[72, 20] }, { ang:[70, 18] }] });
X["leg-curl"] = { hi:["th"],
  pose: pp(curlSeat(8), curlSeat(104)),
  back:(ctx, k) => { box(ctx, 60, 146, 82, 7, C.fill, C.eq); eqLine(ctx, [100, 153], [100, F], 4); pad(ctx, add(add(k.hip, k.n, -10), k.u, -4), add(add(k.sh, k.n, -10), k.u, 12), 10); },
  front:(ctx, k) => { const l = k.legs[0], d = [l.a[0] - l.k[0], l.a[1] - l.k[1]], m = Math.hypot(d[0], d[1]), v = [d[0] / m, d[1] / m], nrm = [-v[1], v[0]]; const c = add(add(l.a, v, -6), nrm, 8); eqLine(ctx, l.k, c, 3); dot(ctx, c, 6.5, C.eq); dot(ctx, c, 3.5, C.fill); pad(ctx, [l.k[0] - 16, l.k[1] - 11], [l.k[0] + 2, l.k[1] - 11], 9); } };

X["leg-extension"] = { hi:["th"],
  pose: pp(curlSeat(96), curlSeat(4)),
  back: X["leg-curl"].back,
  front:(ctx, k) => { const l = k.legs[0], d = [l.a[0] - l.k[0], l.a[1] - l.k[1]], m = Math.hypot(d[0], d[1]), v = [d[0] / m, d[1] / m], nrm = [v[1], -v[0]]; const c = add(add(l.a, v, -6), nrm, 8); eqLine(ctx, l.k, c, 3); dot(ctx, c, 6.5, C.eq); dot(ctx, c, 3.5, C.fill); } };

X["calf-raise"] = { hi:["sh"],
  pose: s => { const fa = lerp(-20, 52, s), T = [134, 178], a = add(T, dir(fa), -L.foot), T2 = [128, 178], a2 = add(T2, dir(fa), -L.foot);
    return { hip:[a[0] - 3, a[1] - 85], torso:-90, head:0, legs:[{ t:a, pref:[1, 0], fa }, { t:a2, pref:[1, 0], fa }], arms:[{ ang:[86, 80] }, { ang:[88, 86] }] }; },
  back:(ctx) => { box(ctx, 70, 178, 66, 10, C.fill, C.eq); } };

X["plank"] = { hi:["abs"], dur:3.4,
  pose: s => { const S = [188, 152 - s * 1.2], b = -9 + s * 0.6, u = dir(b), hip = add(S, u, -L.torso), an = add(hip, u, -86);
    return { hip, torso:b, head:12, legs:[{ t:an, pref:[0, 1], fa:96 }, { t:add(an, [-4, 1]), pref:[0, 1], fa:96 }], arms:[{ ang:[90, 0] }, { ang:[90, -2] }] }; } };

X["side-plank"] = { hi:["abs"],
  pose: s => { const S = [180, 150], b = lerp(-26, -13.4, s), u = dir(b), hip = add(S, u, -L.torso);
    return { hip, torso:b, head:0, noEye:true, legs:[{ t:[46, 182], pref:[0, 1], fa:80 }, { t:[40, 180], pref:[0, 1], fa:80 }], arms:[{ ang:[90, 0] }, { ang:[-88, -90] }] }; } };

X["incline-db-press"] = { hi:["chest", "delt"],
  pose: pp({ hip:[152, 142], torso:-150, head:-4, legs:[{ t:[188, 183], pref:[0.3, -1] }, { t:[182, 183], pref:[0.3, -1] }], arms:[{ s:[-6, 14], pref:[-0.5, 0.87] }, { s:[-6, 11], pref:[-0.5, 0.87] }] },
           { hip:[152, 142], torso:-150, head:-4, legs:[{ t:[188, 183], pref:[0.3, -1] }, { t:[182, 183], pref:[0.3, -1] }], arms:[{ s:[0, 55], pref:[-0.5, 0.87] }, { s:[0, 52], pref:[-0.5, 0.87] }] }),
  back:(ctx, k) => { pad(ctx, add(add(k.hip, k.n, -10), k.u, -6), add(add(k.sh, k.n, -10), k.u, 22), 11); box(ctx, 140, 151, 34, 7, C.fill, C.eq); eqLine(ctx, [150, 158], [150, F], 4); eqLine(ctx, add(add(k.sh, k.n, -14), k.u, 4), [104, F], 4); },
  front:(ctx, k) => dbEnd(ctx, k.arms[0].h) };

const HB = [130, 22];
X["assisted-pullup"] = { hi:["back", "ua"],
  pose: s => { const hy = lerp(134, 88, s);
    return { hip:[118, hy], torso:-92, head:lerp(0, -6, s), legs:[{ ang:[95, 174], fa:178 }, { ang:[93, 172], fa:176 }], arms:[{ t:HB, pref:[0.5, 1] }, { t:[HB[0] - 4, HB[1]], pref:[0.5, 1] }] }; },
  back:(ctx, k) => { eqLine(ctx, [176, 10], [176, F], 5); eqLine(ctx, [110, 14], [176, 14], 5); eqLine(ctx, [HB[0], 14], HB, 3); const kn = k.legs[0].k; box(ctx, 72, kn[1] + 5, 60, 6, C.fill, C.eq); eqLine(ctx, [132, kn[1] + 8], [176, kn[1] + 8], 3); },
  front:(ctx) => { seg(ctx, [HB[0] - 2, HB[1] - 6], [HB[0] - 2, HB[1] + 6], 5, C.eq); } };

X["chest-row"] = { hi:["back", "delt"],
  pose: pp({ hip:[96, 128], torso:-38, head:-16, legs:[{ t:[34, 183], pref:[1, 0.4] }, { t:[40, 183], pref:[1, 0.4] }], arms:[{ t:[137, 154], pref:[-0.6, -1] }, { t:[134, 154], pref:[-0.6, -1] }] },
           { hip:[96, 128], torso:-38, head:-16, legs:[{ t:[34, 183], pref:[1, 0.4] }, { t:[40, 183], pref:[1, 0.4] }], arms:[{ s:[-22, 14], pref:[-0.6, -1] }, { s:[-22, 11], pref:[-0.6, -1] }] }),
  back:(ctx, k) => { const a = add(add(k.hip, k.n, 10), k.u, -6), b = add(add(k.sh, k.n, 10), k.u, 10); pad(ctx, a, b, 11); eqLine(ctx, add(a, [b[0] - a[0], b[1] - a[1]], 0.5), [126, F], 4); eqLine(ctx, [100, F], [150, F], 4); },
  front:(ctx, k) => dbEnd(ctx, k.arms[0].h) };

X["face-pull"] = { hi:["delt", "back"],
  pose: pp(st({ hip:[110, 99], torso:-88, arms:[{ s:[10, 55], pref:[0, 1] }, { s:[10, 52], pref:[0, 1] }] }),
           st({ hip:[110, 99], torso:-90, arms:[{ s:[14, 6], pref:[-1, -0.6] }, { s:[14, 3], pref:[-1, -0.6] }] })),
  front:(ctx, k) => { cable(ctx, k.arms[0].h, [236, 34]); eqLine(ctx, [242, 10], [242, F], 4); } };

X["hip-thrust"] = { hi:["glute"],
  pose: s => { const S = [72, 124], al = lerp(42, 2, s), hip = add(S, dir(al), L.torso);
    return { hip, torso:al + 180, head:16, legs:[{ t:[166, 183], pref:[0.2, -1] }, { t:[160, 183], pref:[0.2, -1] }], arms:[{ t:add(hip, [2, -13]), pref:[0, 1] }, { t:add(hip, [-1, -13]), pref:[0, 1] }] }; },
  back:(ctx) => { box(ctx, 16, 130, 60, 10, C.fill, C.eq); eqLine(ctx, [30, 140], [30, F], 4); eqLine(ctx, [62, 140], [62, F], 4); },
  front:(ctx, k) => { const c = add(k.hip, [2, -13]); ring(ctx, c, 19, C.plate, 4); dot(ctx, c, 3, C.plate); } };

X["split-squat"] = { hi:["th", "glute"],
  pose: pp({ hip:[118, 102], torso:-90, head:0, legs:[{ t:[144, 183], pref:[1, 0] }, { t:[84, 177], pref:[0.2, 1], fa:62 }], arms:[{ ang:[92, 92] }, { ang:[89, 89] }] },
           { hip:[114, 140], torso:-88, head:0, legs:[{ t:[144, 183], pref:[1, 0] }, { t:[84, 177], pref:[0.2, 1], fa:62 }], arms:[{ ang:[92, 92] }, { ang:[89, 89] }] }),
  front:(ctx, k) => dbEnd(ctx, k.arms[0].h) };

X["seated-calf"] = { hi:["sh"],
  pose: s => { const fa = lerp(-16, 38, s), T = [148, 172], a = add(T, dir(fa), -L.foot), a2 = add([143, 172], dir(fa), -L.foot);
    return { hip:[92, 140], torso:-92, head:0, legs:[{ t:a, pref:[0, -1], fa }, { t:a2, pref:[0, -1], fa }], arms:[{ ang:[60, 0] }, { ang:[58, -2] }] }; },
  back:(ctx) => { box(ctx, 62, 147, 50, 7, C.fill, C.eq); eqLine(ctx, [86, 154], [86, F], 4); box(ctx, 132, 172, 30, 16, C.fill, C.eq); },
  front:(ctx, k) => { const kn = k.legs[0].k; pad(ctx, [kn[0] - 12, kn[1] - 10], [kn[0] + 8, kn[1] - 10], 9); eqLine(ctx, [kn[0] + 8, kn[1] - 10], [176, F], 3); } };

X["knee-raise"] = { hi:["abs"],
  pose: pp({ hip:[118, 94], torso:-92, head:0, legs:[{ ang:[92, 90], fa:30 }, { ang:[90, 88], fa:28 }], arms:[{ ang:[90, 0] }, { ang:[90, -2] }] },
           { hip:[120, 92], torso:-86, head:-4, legs:[{ ang:[-28, 62], fa:20 }, { ang:[-30, 60], fa:18 }], arms:[{ ang:[90, 0] }, { ang:[90, -2] }] }),
  back:(ctx, k) => { eqLine(ctx, [98, 26], [98, F], 5); pad(ctx, [104, 38], [104, 102], 10); const e = k.arms[0].e; pad(ctx, [e[0] - 6, e[1] + 6], [e[0] + 26, e[1] + 6], 8); eqLine(ctx, [98, e[1] + 6], [e[0] - 6, e[1] + 6], 3); } };

X["dead-bug"] = { hi:["abs"],
  pose: pp({ hip:[148, 180], torso:180, head:0, legs:[{ ang:[-90, 0], fa:-80 }, { ang:[-88, 2], fa:-78 }], arms:[{ ang:[-90, -90] }, { ang:[-92, -92] }] },
           { hip:[148, 180], torso:180, head:0, legs:[{ ang:[-90, 0], fa:-80 }, { ang:[-14, -6], fa:-50 }], arms:[{ ang:[-168, -172] }, { ang:[-92, -92] }] }) };

const DB_IN = { hip:[120, 99] };
X["farmer-carry"] = { hi:["fa", "delt"], loop:"cycle", dur:1.15,
  pose: (s, p) => { const ft = gait(p, 122, 30, 7, () => F, 0.6), bob = 1.5 * Math.cos(4 * Math.PI * p), sw = 4 * Math.cos(2 * Math.PI * p);
    return { hip:[120, 100 + bob], torso:-90, head:0, legs:[{ t:ft[0].t, pref:[1, 0], fa:ft[0].fa }, { t:ft[1].t, pref:[1, 0], fa:ft[1].fa }], arms:[{ ang:[90 + sw, 90 + sw] }, { ang:[90 - sw, 90 - sw] }] }; },
  back:(ctx, k, s, p) => { for (let i = 0; i < 9; i++){ const x = ((i * 32 - p * 30 * 2) % 288 + 288) % 288 - 14; seg(ctx, [x, F + 5], [x + 10, F + 5], 2, C.floor); } },
  front:(ctx, k) => dbBar(ctx, k.arms[0].h, 0, 24) };

const deckY = x => 178 - (x - 40) * 0.1;
X["incline-walk"] = { hi:["th", "sh"], loop:"cycle", dur:1.25,
  pose: (s, p) => { const ft = gait(p, 116, 34, 9, deckY, 0.6), bob = 1.8 * Math.cos(4 * Math.PI * p), sw = 22 * Math.cos(2 * Math.PI * p);
    return { hip:[114, deckY(114) - 82 + bob], torso:-84, head:-4, legs:[{ t:ft[0].t, pref:[1, 0], fa:ft[0].fa - 6 }, { t:ft[1].t, pref:[1, 0], fa:ft[1].fa - 6 }], arms:[{ ang:[90 + sw, 75 + sw] }, { ang:[90 - sw, 75 - sw] }] }; },
  back:(ctx, k, s, p) => { poly(ctx, [[34, deckY(34) + 1], [214, deckY(214) + 1], [214, deckY(214) + 9], [34, deckY(34) + 9]], C.fill, C.eq); eqLine(ctx, [214, deckY(214)], [222, 70], 4); box(ctx, 210, 58, 22, 12, C.fill, C.eq); eqLine(ctx, [214, 82], [170, 88], 3);
    for (let i = 0; i < 7; i++){ const x = 40 + (((i * 28 - p * 34 * 1.6) % 196) + 196) % 196 * 0.88; seg(ctx, [x, deckY(x) + 5], [x + 6, deckY(x + 6) + 5], 1.5, C.eq); } eqLine(ctx, [40, deckY(40) + 9], [40, F], 4); eqLine(ctx, [200, deckY(200) + 9], [200, F], 4); } };

X["intervals"] = { hi:["th", "sh"], loop:"cycle", dur:0.72,
  pose: (s, p) => { const ft = gait(p, 116, 54, 20, () => 176, 0.42), bob = 3 * Math.cos(4 * Math.PI * p), sw = 38 * Math.cos(2 * Math.PI * p);
    return { hip:[116, 94 + bob], torso:-80, head:-6, legs:[{ t:ft[0].t, pref:[1, 0], fa:ft[0].fa }, { t:ft[1].t, pref:[1, 0], fa:ft[1].fa }], arms:[{ ang:[90 + sw, 2 + sw] }, { ang:[90 - sw, 2 - sw] }] }; },
  back:(ctx, k, s, p) => { box(ctx, 34, 177, 180, 8, C.fill, C.eq); eqLine(ctx, [214, 177], [222, 70], 4); box(ctx, 210, 58, 22, 12, C.fill, C.eq);
    for (let i = 0; i < 7; i++){ const x = 38 + ((((i * 28) - p * 54 * 2.4) % 196) + 196) % 196 * 0.88; seg(ctx, [x, 181], [x + 7, 181], 1.5, C.eq); } eqLine(ctx, [44, 185], [44, F], 4); eqLine(ctx, [204, 185], [204, F], 4); } };

/* front-view exercises */
function frontPose(armFn, seatedLegs){
  return s => { const cx = 130, shY = seatedLegs ? 74 : 48, hipY = seatedLegs ? 126 : 100;
    const legs = seatedLegs ? [0, 1].map(i => { const sg = i ? -1 : 1; return { k:[cx + sg * 15, hipY + 10], a:[cx + sg * 16, 183] }; })
                            : [0, 1].map(i => { const sg = i ? -1 : 1; return { k:[cx + sg * 11, 141], a:[cx + sg * 12, 183] }; });
    return { front:true, cx, shY, hipY, legs, arms:[0, 1].map(i => armFn(s, i ? -1 : 1, [cx + (i ? -17 : 17), shY + 2])) }; };
}
X["lateral-raise"] = { hi:["delt"], view:"front",
  pose: frontPose((s, sg, S) => { const a = lerp(80, -3, s), e = add(S, [Math.cos(rad(a)) * sg, Math.sin(rad(a))], L.ua), b = a + lerp(6, 8, s); return { e, h:add(e, [Math.cos(rad(b)) * sg, Math.sin(rad(b))], L.fa) }; }),
  front:(ctx, k) => k.arms.forEach(a => dbEnd(ctx, a.h)) };
X["pec-deck"] = { hi:["chest"], view:"front",
  pose: frontPose((s, sg, S) => { const ph = lerp(12, 104, s), c = Math.cos(rad(ph)); const e = [S[0] + sg * L.ua * c, S[1] + 4], h = [S[0] + sg * (L.ua + L.fa) * c * 0.98, S[1] + 6]; return { e, h }; }, true),
  back:(ctx) => { box(ctx, 106, 40, 48, 92, C.fill, C.eq); box(ctx, 98, 126, 64, 8, C.fill, C.eq); eqLine(ctx, [130, 134], [130, F], 4); eqLine(ctx, [72, 30], [188, 30], 4); },
  front:(ctx, k) => k.arms.forEach(a => seg(ctx, [a.h[0], a.h[1] - 10], [a.h[0], a.h[1] + 10], 6, C.eq)) };

/* ---------- driver ---------- */
function phaseOf(t, ex){
  if (ex.loop === "cycle") return { s:t, p:t };
  let s;
  if (t < 0.1) s = 0; else if (t < 0.45) s = ease((t - 0.1) / 0.35); else if (t < 0.55) s = 1; else if (t < 0.9) s = 1 - ease((t - 0.55) / 0.35); else s = 0;
  return { s, p:t };
}
function render(ctx, id, s, p, keep){
  const ex = X[id]; if (!ex) return;
  if (!keep){ ctx.clearRect(0, 0, W, H); floor(ctx); }
  const pose = ex.pose(s, p);
  if (ex.view === "front"){
    if (ex.back) ex.back(ctx, pose, s, p);
    drawFront(ctx, pose, ex.hi);
    if (ex.front) ex.front(ctx, pose, s, p);
    return;
  }
  const k = solve(pose);
  if (ex.back) ex.back(ctx, k, s, p);
  drawSide(ctx, k, ex.hi);
  if (ex.front) ex.front(ctx, k, s, p);
}
function fit(cv){
  const r = cv.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.width * H / W * dpr));
  if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  const ctx = cv.getContext("2d"); ctx.setTransform(w / W, 0, 0, w / W, 0, 0); return ctx;
}
const reduce = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function drawAt(cv, id, s, p){ colors(); const ctx = fit(cv); render(ctx, id, s, p == null ? s : p); }
function frame(now){
  const list = document.querySelectorAll("canvas[data-anim]");
  if (list.length){
    colors();
    list.forEach(cv => {
      const id = cv.dataset.anim, ex = X[id]; if (!ex) return;
      const r = cv.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight || r.width === 0) return;
      const ctx = fit(cv);
      if (reduce()){ ctx.globalAlpha = 0.25; render(ctx, id, 0, 0); ctx.globalAlpha = 1; render(ctx, id, 1, 0.25, true); return; }
      const dur = (ex.dur || 3.0) * 1000, t = (now % dur) / dur, ph = phaseOf(t, ex);
      render(ctx, id, ph.s, ph.p);
    });
  }
  requestAnimationFrame(frame);
}
window.ANIM = { has:id => !!X[id], drawAt, start:() => requestAnimationFrame(frame), ids:() => Object.keys(X) };
})();
