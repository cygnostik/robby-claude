// Robby the Robot, Fig 1: the machine on a service riser beside the MGM control console.
// node robby/build.mjs [--light] [--audit]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../vendor/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg, crossingsOf } from "../vendor/anatomy/kit/tube.mjs";
import * as A from "../vendor/anatomy/kit/audit.mjs";
import * as S from "./shape.mjs";
import { convexPaths, rollTop } from "./hexa.mjs";
import { bundle } from "./inline.mjs";
import { pageOf } from "./page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const THEME = ARGS.includes("--light") ? "light" : ARGS.includes("--dark") ? "dark" : "auto";
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- world and camera
const W = 960;
const H = 1180;
const AZIMUTH = 62;
const ELEVATION = 20;

const PLATE = { x: -98, y: -58, w: 232, d: 116, r: 8 };
const PLATE_TOP = -6;
const PLATE_H = 4;
const PLATE_FOOT = 6;
const FLOOR = PLATE_TOP - PLATE_H - PLATE_FOOT;
const DAIS_R = 44;
const POST = { x: -73, y: -33, w: 6, d: 6, r: 1 };
const POST_TOP = 232;
const CONSOLE = { x: 64, y: -22, w: 60.3, d: 43.2, r: 2.5 };
const CASTER = { r: 3.2 };
const CAB_Z0 = PLATE_TOP + 9;
const CAB_TOP = PLATE_TOP + 88;
const CAB_HIGH = PLATE_TOP + 99;

const PIECES = {
  dome: { name: "Clear shell", say: "clear shell · Plexiglas cap and front window · 3 weeks in the model shop", move: [0, 0, 88] },
  head: { name: "Head: hood, voice tubes, keys and ears", say: "head · black hood · voice tubes · 6 relay keys · 2 rotating rings", move: [0, 0, 56] },
  brain: { name: "Gyro tower and pilot lamp", say: "gyro tower · brass bell · 3 wire gyros in planetary orbit", move: null },
  armR: { name: "Arms and hands", say: "arm · ball socket · rubber rolls · half ball and lip ring · rubber mitten", move: [18.9, 14.8, 38] },
  armL: { name: "Left arm and hand", say: "arm · ball socket · rubber rolls · half ball and lip ring · rubber mitten", move: [-18.9, 14.8, 38] },
  chest: { name: "Chest barrel and indicator panel", say: "chest · analyzing hopper · star · quad light · 4 keys", move: [0, 0, 38] },
  core: { name: "Laboratory core (speculative)", say: "lab core · analyzer drum · relays D-12,000–18,500", move: [0, 0, 0] },
  pelvis: { name: "Pelvis and hip hinges", say: "pelvis · hip plates and crank levers · hides the operator's knees", move: [0, 0, 0] },
  legs: { name: "Legs and feet", say: "legs · 3 globes a side on an oval shoe · cable in the right shoe", move: [0, 0, 0] },
  stand: { name: "Riser, gauge and console", say: "console · mic to voice relay to neon", move: [0, 0, 0] },
};
PIECES.brain.move = PIECES.head.move;
const STAGGER = ["dome", "head", "armR", "armL", "chest"];
const SPRING = { stagger: 0.035, stiffness: 64, damping: 14.2, substeps: 4 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, FLOOR, PLATE_TOP),
    [POST.x, POST.y, POST_TOP + 2],
    [POST.x + POST.w, POST.y + POST.d, POST_TOP + 2],
    [0, 0, S.HEIGHT + PIECES.dome.move[2] + 1],
    [CONSOLE.x + CONSOLE.w, CONSOLE.y, CAB_HIGH],
    [CONSOLE.x + CONSOLE.w, CONSOLE.y + CONSOLE.d, PLATE_TOP],
    [-17, 0, 211 + PIECES.dome.move[2]],
    [17, 0, 211 + PIECES.dome.move[2]],
    [-60, 0, 170],
    [60, 0, 170],
  ],
  W,
  H,
  { pad: 30, azimuth: AZIMUTH, elevation: ELEVATION },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (point) => k.iso(point, P);
const Sv = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const Faded = (list, style) => k.fadedSvg(list, style);
const FADE = [0.04, 0.42];
const Fz = (x = 0, y = 0) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const path = (points, closed = false) => k.pathOf(points.map(at), closed);

// ---------------------------------------------------------------- gloss
// Robby is lacquered plastic: every curved body carries the airbrushed highlight of a 1950s
// publicity still. The highlight follows the drawing's own light: a streak down the meridian
// that faces the half-vector between light and eye, widest where it faces it most, and a
// spot where it faces it squarely. Closed fills only, so they are not texture lines.
const HV = G.unit3(G.add3(G.lightOf(P), V));
function glossOn(F, radius, slope, s0, s1, { width = 0.14, rows = 36, floor = 0.3, spot = true, spotTol = 0.02, kind = "" } = {}) {
  const local = (w) => [G.dot3(w, F.u), G.dot3(w, F.v), G.dot3(w, F.a)];
  const [hu, hv, ha] = local(HV);
  const [vu, vv, va] = local(V);
  const phi = Math.atan2(hv, hu);
  const facing = (s, a, x, y, z) => {
    const k = slope(s);
    return (x * Math.cos(a) + y * Math.sin(a) - z * k) / Math.sqrt(1 + k * k);
  };
  const point = (s, a) => at(G.add3(G.add3(F.o, G.mul3(F.a, s)), G.add3(G.mul3(F.u, radius(s) * Math.cos(a)), G.mul3(F.v, radius(s) * Math.sin(a)))));
  const rowsOf = [];
  for (let i = 0; i <= rows; i++) {
    const s = s0 + ((s1 - s0) * (i + 0.5)) / (rows + 1);
    if (radius(s) < 0.3) continue;
    rowsOf.push({ s, m: facing(s, phi, hu, hv, ha), seen: facing(s, phi, vu, vv, va) });
  }
  let best = [];
  let run = [];
  for (const row of rowsOf) {
    if (row.m > floor && row.seen > 0.12) run.push(row);
    else run = [];
    if (run.length > best.length) best = [...run];
  }
  if (best.length < 3) return "";
  const band = (scale) => {
    const left = [];
    const right = [];
    for (const row of best) {
      let w = width * scale * Math.pow((row.m - floor) / (1 - floor), 0.8);
      while (w > 0.01 && (facing(row.s, phi - w, vu, vv, va) < 0.05 || facing(row.s, phi + w, vu, vv, va) < 0.05)) w *= 0.7;
      left.push(point(row.s, phi - w));
      right.push(point(row.s, phi + w));
    }
    return k.pathOf([...left, ...right.reverse()], true);
  };
  const big = Math.max(...best.map((row) => radius(row.s))) >= 12;
  let out = (big ? `<path class="rb-gloss" data-g="halo"${kind} d="${band(2.8)}"/>` : "") + `<path class="rb-gloss" data-g="streak"${kind} d="${band(1)}"/>`;
  if (spot) {
    const peak = Math.max(...best.map((row) => row.m));
    const near = [];
    for (const row of best) {
      if (row.m < peak - spotTol) continue;
      for (let j = -24; j <= 24; j++) {
        const a = phi + (j / 24) * 0.5;
        if (facing(row.s, a, hu, hv, ha) > peak - spotTol) near.push(point(row.s, a));
      }
    }
    if (near.length > 2) out += `<path class="rb-gloss" data-g="spot"${kind} d="${k.pathOf(ellipseOf(near), true)}"/>`;
  }
  return out;
}
// The ellipse that fits a cloud of screen points: their principal axes, reaching the farthest.
function ellipseOf(points) {
  const n = points.length;
  const mx = points.reduce((sum, p) => sum + p[0], 0) / n;
  const my = points.reduce((sum, p) => sum + p[1], 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of points) {
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
    sxy += (x - mx) * (y - my);
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const [ux, uy] = [Math.cos(angle), Math.sin(angle)];
  let a = 0.1;
  let b = 0.1;
  for (const [x, y] of points) {
    a = Math.max(a, Math.abs((x - mx) * ux + (y - my) * uy));
    b = Math.max(b, Math.abs(-(x - mx) * uy + (y - my) * ux));
  }
  return Array.from({ length: 24 }, (_, j) => {
    const t = (j / 24) * Math.PI * 2;
    return [mx + a * Math.cos(t) * ux - b * Math.sin(t) * uy, my + a * Math.cos(t) * uy + b * Math.sin(t) * ux];
  });
}
// The highlight on a ball: a soft disc where the surface faces the half-vector.
function glossBall(centre, r) {
  const e1 = G.unit3(G.cross3(HV, Math.abs(HV[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]));
  const e2 = G.cross3(HV, e1);
  const cap = (angle) => {
    const pts = [];
    for (let j = 0; j < 20; j++) {
      const t = (j / 20) * Math.PI * 2;
      const n = G.add3(G.mul3(HV, Math.cos(angle)), G.mul3(G.add3(G.mul3(e1, Math.cos(t)), G.mul3(e2, Math.sin(t))), Math.sin(angle)));
      pts.push(at(G.add3(centre, G.mul3(n, r))));
    }
    return k.pathOf(pts, true);
  };
  // Big balls get a tighter spot, as a bigger mirror shows a smaller image of the light.
  return `<path class="rb-gloss" data-g="halo" d="${cap(Math.min(0.62, 7 / r))}"/><path class="rb-gloss" data-g="spot" d="${cap(Math.min(0.22, 1.4 / r))}"/>`;
}
// A rim light from behind his upper right, where the planet hangs: a thin band along the
// silhouette edge that faces it, as on the poster's lacquer. Closed fills only.
const RIM = G.unit3([0.45, -0.74, 0.5]);
function rimOn(F, radius, slope, s0, s1, { rows = 40 } = {}) {
  const local = (w) => [G.dot3(w, F.u), G.dot3(w, F.v), G.dot3(w, F.a)];
  const [ru, rv, ra] = local(RIM);
  const [vu, vv, va] = local(V);
  const facing = (s, a, x, y, z) => {
    const k2 = slope(s);
    return (x * Math.cos(a) + y * Math.sin(a) - z * k2) / Math.sqrt(1 + k2 * k2);
  };
  const point = (s, a) => at(G.add3(G.add3(F.o, G.mul3(F.a, s)), G.add3(G.mul3(F.u, radius(s) * Math.cos(a)), G.mul3(F.v, radius(s) * Math.sin(a)))));
  const arcs = [];
  for (let i = 0; i <= rows; i++) {
    const s = s0 + ((s1 - s0) * (i + 0.5)) / (rows + 1);
    if (radius(s) < 0.5) { arcs.push(null); continue; }
    let best = null;
    let run = null;
    for (let j = 0; j <= 240; j++) {
      const a = (j / 240) * Math.PI * 2;
      const seen = facing(s, a, vu, vv, va);
      const lit = facing(s, a, ru, rv, ra);
      if (seen > 0.03 && seen < 0.3 && lit > 0.25) {
        if (!run) run = { a0: a, a1: a, lit: 0, n: 0 };
        run.a1 = a;
        run.lit += lit;
        run.n++;
      } else if (run) {
        if (!best || run.lit > best.lit) best = run;
        run = null;
      }
    }
    if (run && (!best || run.lit > best.lit)) best = run;
    arcs.push(best && best.n > 1 ? { s, ...best } : null);
  }
  let longest = [];
  let current = [];
  for (const arc of arcs) {
    if (arc) current.push(arc);
    else current = [];
    if (current.length > longest.length) longest = [...current];
  }
  if (longest.length < 3) return "";
  const left = longest.map((arc) => point(arc.s, arc.a0));
  const right = longest.map((arc) => point(arc.s, arc.a1)).reverse();
  return `<path class="rb-rim" d="${k.pathOf([...left, ...right], true)}"/>`;
}
const sphereBody = (r) => ({ radius: (s) => Math.sqrt(Math.max(0, r * r - s * s)), slope: (s) => -s / Math.sqrt(Math.max(1e-6, r * r - s * s)) });
// A four-point glint, as airbrushed on chrome and glass.
function sparkle([x, y], size, className = "rb-sparkle") {
  const thin = size * 0.13;
  const pts = [[x, y - size], [x + thin, y - thin], [x + size * 0.62, y], [x + thin, y + thin], [x, y + size], [x - thin, y + thin], [x - size * 0.62, y], [x - thin, y - thin]];
  return `<path class="${className}" d="${k.pathOf(pts, true)}"/>`;
}

// ---------------------------------------------------------------- recorder
const R = A.recorder(P, { order: STAGGER, spring: SPRING });
const { items, nameFor } = R;
const record = R.solid;
const rideOf = (piece, move) => (move ? Object.keys(PIECES).find((id) => PIECES[id].move === move) ?? piece : piece);
function put(piece, ref, svg, { bias = 0, move, ride, shapes = [], name, route, chunk, live } = {}) {
  const m = move ?? PIECES[piece].move;
  return R.put({ piece, ride: ride ?? rideOf(piece, m), at: ref, bias, svg, move: m, shapes, name: name ?? nameFor(`${piece}.item`), route, chunk, live });
}
function tubeItems(piece, route, r, { name, tone = "hi", bias = 0, maxLength = 14, spacing, closed = false, owner, touch, bundle: group, limp = false, breaks = [], gaps = [], caps = true, ends = [true, true], rims, free = [false, false], rings } = {}) {
  const id = nameFor(name ?? `${piece}.tube`);
  R.route(id, route, r, { owner: owner ?? id, touch, bundle: group, limp, gaps, closed, ends, rims, free, piece, move: PIECES[piece].move, ride: rideOf(piece, PIECES[piece].move) });
  tubePieces(route, r, P, { maxLength, spacing, closed, breaks, gaps, caps, rings }).forEach((part, index) =>
    put(piece, part.mid, tubeSvg(part, { tone }), { bias, name: `${id}:${index}`, route: id, chunk: index, shapes: [A.tube(part.points, part.radii)] }),
  );
  return id;
}

// A body of revolution about a vertical axis through (x, y), from an analytic profile.
function bodyZ(piece, x, y, body, z0, z1, options = {}) {
  return bodyOn(piece, Fz(x, y), body, z0, z1, options);
}
// The same about any axis: F.a is the axis, s runs along it.
function bodyOn(piece, F, body, z0, z1, options = {}) {
  const part = bodyParts(piece, F, body, z0, z1, options);
  put(piece, part.ref, part.svg, { bias: options.bias ?? 0, name: part.id, shapes: part.shapes });
  return part.shape;
}
// The drawing and recorded shapes of a turned body, for an item that holds several.
function bodyParts(piece, F, body, z0, z1, { tone = "hi", seams = [], extra = "", name, count = 28, rims, hollow = 0, cut, seated = true, owner, gloss, rim = false } = {}) {
  const extraShapes = [];
  const profile = S.sampled(body, z0, z1, count);
  const paths = G.solidOf(profile, F, P, { smooth: { slope: body.slope, radius: body.radius }, ...(rims ? { rims } : {}) });
  const inner = seams.map((z) => G.arcOf(F, z, body.radius(z), P, { slope: body.slope(z) })).join("");
  const id = nameFor(name ?? `${piece}.body`);
  let shape;
  if (hollow) {
    const outer = profile.map(([s, r]) => [s, r]);
    const innerWall = [...outer].reverse().map(([s, r]) => [s, Math.max(0, r - hollow.wall)]);
    shape = record(A.body(F, [...outer, ...innerWall], { name: id }));
    if (hollow.floor) extraShapes.push(record(A.ring(F, z0, z0 + hollow.floor[2], hollow.floor[0], hollow.floor[1], { name: id, owner: id })));
    if (hollow.roof) extraShapes.push(record(A.disc(F, z1 - hollow.roof, z1, body.radius(z1), { name: id, owner: id })));
  } else {
    shape = record(A.solid(F, profile, { radius: body.radius, name: id, owner, ...(cut ? { cut, seated } : {}) }));
  }
  const shine = (piece === "stand" || gloss === false ? "" : glossOn(F, body.radius, body.slope, z0, z1, gloss || {})) + (rim ? rimOn(F, body.radius, body.slope, z0, z1) : "");
  const ref = G.add3(F.o, G.mul3(F.a, (z0 + z1) / 2));
  return { id, shape, shapes: [shape, ...extraShapes], ref, svg: Sv(paths, { tone, inner: inner ? Ln(inner, { tone: "faint" }) : "" }) + shine + extra };
}

function discOn(piece, F, s0, s1, r, { tone = "hi", extra = "", inner = "", bias = 0, name, lit = false, cut, seated, owner } = {}) {
  const id = nameFor(name ?? `${piece}.disc`);
  const shape = record(A.disc(F, s0, s1, r, { name: id, owner, ...(cut ? { cut, seated: seated ?? true } : {}) }));
  const shine = piece !== "stand" && s1 - s0 > 2.5 && r > 1 ? glossOn(F, () => r, () => 0, s0, s1, { spot: false, rows: 12 }) : "";
  put(piece, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), Sv(G.disc(s0, s1, r, F, P), { tone, lit, inner }) + shine + extra, { bias, name: id, shapes: [shape] });
  return shape;
}

function turnedOn(piece, F, profile, { tone = "hi", extra = "", inner = "", bias = 0, name, smooth, owner, steps } = {}) {
  const id = nameFor(name ?? `${piece}.turned`);
  const soft = smooth ?? profile.some((point) => point[2]);
  const paths = G.solidOf(profile, F, P, { smooth: soft === true ? { rows: 3 } : soft, ...(steps ? { steps } : {}) });
  const shape = record(A.solid(F, profile, { name: id, owner, curve: soft && !soft.slope ? profile : undefined }));
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  put(piece, G.add3(F.o, G.mul3(F.a, mid)), Sv(paths, { tone, inner }) + extra, { bias, name: id, shapes: [shape] });
  return shape;
}

function ballAt(piece, centre, r, { tone = "hi", bias = 0, name, owner, extra = "" } = {}) {
  const id = nameFor(name ?? `${piece}.ball`);
  const shape = record(A.ball(centre, r, { name: id, owner }));
  put(piece, centre, Sv(G.sphereOf(centre, r, P), { tone }) + (piece === "stand" ? "" : glossBall(centre, r)) + extra, { bias, name: id, shapes: [shape] });
  return shape;
}

function slab(piece, plan, z, h, { tone = "mid", steps = 4, bevel = 0.5, extra = "", inner = "", bias = 0, name, lit = false } = {}) {
  const id = nameFor(name ?? `${piece}.slab`);
  const shape = record(A.slab(plan, z, h, { name: id }, steps));
  put(piece, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], Sv(k.slabOf(plan, z, h, P, steps, bevel), { tone, inner, lit }) + extra, { bias, name: id, shapes: [shape] });
  return shape;
}

function prism(piece, F, polygon, s0, s1, { tone = "mid", extra = "", inner = "", bias = 0, name, cut } = {}) {
  const id = nameFor(name ?? `${piece}.prism`);
  const shape = record(A.prism(F, polygon, s0, s1, { name: id, ...(cut ? { cut, seated: true } : {}) }));
  const cx = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
  const cy = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;
  const centre = G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.add3(G.mul3(F.u, cx), G.mul3(F.v, cy)));
  put(piece, centre, Sv(G.prismOf(F, polygon, s0, s1, P), { tone, inner }) + extra, { bias, name: id, shapes: [shape] });
  return shape;
}

const roundRect = (x0, y0, x1, y1, r, steps = 4) => {
  const out = [];
  const corner = (cx, cy, from) => {
    for (let index = 0; index <= steps; index++) {
      const a = from + (index / steps) * (Math.PI / 2);
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  corner(x1 - r, y0 + r, -Math.PI / 2);
  corner(x1 - r, y1 - r, 0);
  corner(x0 + r, y1 - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  return out;
};

// A thin recorded layer for markings drawn on a face (ticks, lenses, dials), so the
// audit knows what each line-only item covers.
const film = (name, centre, axes, half) => record(A.orientedBox(centre, axes, half, { name }));

// Saddle pad on a host, recorded as a disc cut by its host.
function saddle(piece, F, a, start, s1, host, { tone = "mid", name, bias = 0 } = {}) {
  const id = nameFor(name ?? `${piece}.pad`);
  const from = typeof start === "function" ? start : (t) => G.saddleStart(start, a, t);
  let least = Infinity;
  for (let index = 0; index < 48; index++) least = Math.min(least, from((index / 48) * Math.PI * 2));
  const shape = record(A.disc(F, least - 0.6, s1, a, { name: id, cut: [host], seated: true }));
  put(piece, G.add3(F.o, G.mul3(F.a, (least + s1) / 2)), Sv(G.saddleOf(F, a, start, s1, P), { tone }), { bias, name: id, shapes: [shape] });
  return shape;
}

// ---------------------------------------------------------------- stand: riser, dais, gauge
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, FLOOR, PLATE_H + PLATE_FOOT, P)}"/>`);

const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
  slab("stand", { x: x - 8, y: y - 8, w: 16, d: 16, r: 7.6 }, FLOOR, 1.6, { tone: "lo", steps: 6, bevel: 0, name: "stand.foot-flange" });
  slab("stand", { x: x - 6.2, y: y - 6.2, w: 12.4, d: 12.4, r: 6 }, FLOOR + 1.6, PLATE_FOOT - 1.6, { tone: "mid", steps: 6, bevel: 0, name: "stand.foot" });
}
{
  const screws = k.corners(PLATE, 11);
  const groove = k.planOutline(k.insetPlan(PLATE, 5), PLATE_TOP, P);
  const rings = screws.map(([x, y]) => k.ring(x, y, 2.2, PLATE_TOP, P, 16)).join("");
  const extra = Ln(rings, { tone: "lo" }) + Dots(screws.map(([x, y]) => at([x, y, PLATE_TOP])), { size: 0.5 });
  slab("stand", PLATE, PLATE_TOP - PLATE_H, PLATE_H, { tone: "mid", steps: 8, bevel: 1.6, extra: Ln(groove, { tone: "lo" }) + extra, name: "stand.plate", bias: -2 });
}
{
  const strip = { x: -84, y: PLATE.y + PLATE.d - 13, w: 200, d: 7, r: 1 };
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, PLATE_TOP + 0.6, [2, 3.6], P);
  slab("stand", strip, PLATE_TOP, 0.6, { tone: "lo", steps: 3, bevel: 0, extra: Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }) + Dots([at([strip.x + 2, strip.y + 3.5, PLATE_TOP + 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, PLATE_TOP + 0.6])], { size: 0.45 }), name: "stand.ruler" });
  const label = { x: -92, y: 16, w: 34, d: 14, r: 1.4 };
  const lz = PLATE_TOP + 0.8;
  const rules = [k.lineOnTop([label.x + 4, label.y + 4.5], [label.x + 24, label.y + 4.5], lz, P), k.lineOnTop([label.x + 4, label.y + 7.5], [label.x + 30, label.y + 7.5], lz, P), k.lineOnTop([label.x + 4, label.y + 10.5], [label.x + 18, label.y + 10.5], lz, P)].join("");
  slab("stand", label, PLATE_TOP, 0.8, { tone: "lo", steps: 3, bevel: 0, extra: Ln(k.planOutline(k.insetPlan(label, 1.6), lz, P, 3), { tone: "faint" }) + Ln(rules, { tone: "lo", free: true }) + Dots([at([label.x + 2, label.y + 2, lz]), at([label.x + label.w - 2, label.y + label.d - 2, lz])], { size: 0.45 }), name: "stand.label" });
}
// The turntable dais Robby stands on: a dial face with a degree ring.
{
  const F = Fz(0, 0);
  const ticks = k.radialTicks(0, 0, DAIS_R, 72, 6, 0, [1.4, 5.6], P);
  const extra =
    Ln(k.ring(0, 0, DAIS_R - 5.6, 0, P, 120), { tone: "lo" }) +
    Ln(ticks.minor, { tone: "lo" }) +
    Ln(ticks.major, { tone: "mid" }) +
    Dots(G.dotsOf(F, 0, DAIS_R - 9, 16, P, { all: true }), { size: 0.45, tone: "mid" });
  const shape = record(A.cylinder(0, 0, DAIS_R, PLATE_TOP, -PLATE_TOP, { name: "stand.dais" }));
  put("stand", [0, 0, PLATE_TOP / 2], Sv(k.cylinder(0, 0, DAIS_R, PLATE_TOP, -PLATE_TOP, P, 120, 0.9), { tone: "mid", inner: Ln(k.sideArc(0, 0, DAIS_R, PLATE_TOP + 2, P, 80), { tone: "faint" }) }) + extra, { name: "stand.dais", shapes: [shape], bias: -1 });
}
// Height gauge: a post with a ruler strip in centimetres from the dais top, and a rider at 214.
{
  slab("stand", { x: POST.x - 7, y: POST.y - 7, w: POST.w + 14, d: POST.d + 14, r: 2 }, PLATE_TOP, 4, { tone: "mid", steps: 4, bevel: 0.6, extra: Dots(k.corners({ x: POST.x - 7, y: POST.y - 7, w: POST.w + 14, d: POST.d + 14 }, 2.6).map(([x, y]) => at([x, y, PLATE_TOP + 4])), { size: 0.45 }), name: "stand.gauge-base" });
  slab("stand", POST, PLATE_TOP + 4, POST_TOP - PLATE_TOP - 4, { tone: "mid", steps: 3, bevel: 0.4, name: "stand.gauge-post" });
  slab("stand", { x: POST.x + 0.6, y: POST.y + POST.d + 1.4, w: 4.8, d: 0.6, r: 0.2 }, PLATE_TOP + 4, POST_TOP - PLATE_TOP - 6, { tone: "lo", steps: 2, bevel: 0, name: "stand.gauge-strip", bias: 0.2 });
  // Ticks on the strip's front face (y = face), rooted on its left edge.
  const face = POST.y + POST.d + 2;
  const minor = [];
  const major = [];
  for (let z = 0; z <= 225; z += 5) {
    const long = z % 25 === 0;
    (long ? major : minor).push(k.segment([POST.x + 0.6, face, z], [POST.x + 0.6 + (long ? 4.8 : 1.8), face, z], P));
  }
  const span = (POST_TOP - 2 - PLATE_TOP - 4) / 2;
  put("stand", [POST.x + 3, face, 110], Ln(minor.join(""), { tone: "lo" }) + Ln(major.join(""), { tone: "mid" }), { name: "stand.gauge-ticks", bias: 0.3, shapes: [film("stand.gauge-ticks", [POST.x + 3, face + 0.03, PLATE_TOP + 4 + span], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [2.4, 0.03, span])] });
  // The rider: a cursor block on the strip's face, with an index at 214 cm.
  const rider = { x: POST.x - 0.6, y: face, w: POST.w + 1.2, d: 2.4, r: 0.6 };
  const index = k.segment([rider.x + rider.w, rider.y + rider.d, S.HEIGHT], [rider.x + rider.w + 6, rider.y + rider.d, S.HEIGHT], P);
  slab("stand", rider, S.HEIGHT - 3, 6, { tone: "hi", steps: 3, bevel: 0.5, extra: Ln(k.segment([rider.x, rider.y + rider.d, S.HEIGHT], [rider.x + rider.w, rider.y + rider.d, S.HEIGHT], P), { tone: "lit" }), name: "stand.gauge-rider" });
  slab("stand", { x: rider.x + rider.w, y: rider.y + rider.d - 1.2, w: 6, d: 1.2, r: 0.3 }, S.HEIGHT - 0.3, 0.6, { tone: "hi", steps: 2, bevel: 0, extra: Ln(index, { tone: "lit" }), name: "stand.gauge-pointer" });
  slab("stand", { x: rider.x + rider.w / 2 - 1, y: rider.y + rider.d, w: 2, d: 1.4, r: 0.4 }, S.HEIGHT + 0.6, 2, { tone: "mid", steps: 2, bevel: 0, name: "stand.gauge-screw" });
}

// ---------------------------------------------------------------- legs: oval shoes on soles, squat globes
// Everything on the far side of a plane from its normal: used to cut parts that end on a slope.
function beyond(point, normal) {
  const n = G.unit3(normal);
  const F = G.frameAlong(point, n);
  return A.orientedBox(G.sub3(point, G.mul3(n, 400)), [F.u, F.v, n], [400, 400, 400], { name: "cut" });
}
const LEG_SHAPES = {};
for (const side of [-1, 1]) {
  const x = side * S.LEG_X;
  const tag = side > 0 ? "R" : "L";
  // Sole: the shoe's footprint plus a 0.7 cm welt.
  const knots = S.SHOE.profile(40);
  const ring = [[x, S.SHOE.s0 - 0.7]];
  for (const [s, r] of knots) ring.push([x + r + 0.7, s]);
  ring.push([x, S.SHOE.s1 + 0.7]);
  for (const [s, r] of [...knots].reverse()) ring.push([x - r - 0.7, s]);
  const soleId = `legs.sole${tag}`;
  put("legs", [x, S.SHOE.mid, 0.5], Sv(k.extrude(ring, S.SOLE.z, S.SOLE.h, P, { convex: false, bevel: 0.3 }), { tone: "mid" }), { name: soleId, shapes: [record(A.extruded(ring, S.SOLE.z, S.SOLE.h, { name: soleId }))] });
  // Shoe: turned about a heel-to-toe axis on the sole, so only its upper half shows.
  const F = G.frameOf([x, 0, S.SHOE.axisZ], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const profile = knots;
  const paths = G.solidOf(profile, F, P, { smooth: { slope: S.SHOE.slope, radius: S.SHOE.radius } });
  const upper = [];
  for (const [s, r] of knots) for (let j = 0; j <= 24; j++) upper.push(at(G.pointOf(F, s, r, (j / 24) * Math.PI)));
  const clip = k.pathOf(G.hullOf(upper), true);
  const shoeId = `legs.shoe${tag}`;
  const shoe = record(A.solid(F, profile, { radius: S.SHOE.radius, name: shoeId, cut: [beyond([0, 0, S.SHOE.axisZ], [0, 0, 1])] }));
  const shine = glossOn(F, S.SHOE.radius, S.SHOE.slope, S.SHOE.s0 + 0.5, S.SHOE.s1 - 0.5, { width: 0.12 });
  put("legs", [x, S.SHOE.mid, 6], `<clipPath id="rb-shoe${tag}"><path d="${clip}"/></clipPath><g clip-path="url(#rb-shoe${tag})">${Sv(paths, { tone: "hi" })}${shine}</g>`, { name: shoeId, shapes: [shoe] });
  LEG_SHAPES[side] = { shoe, F };
  // An ankle pad shaped to the shoe's back, carrying the bottom globe.
  const a = S.NECK.r;
  const start = (t) => {
    const dx = a * Math.cos(t);
    const r = S.SHOE.radius(a * Math.sin(t));
    return S.SHOE.axisZ + Math.sqrt(Math.max(0, r * r - dx * dx));
  };
  saddle("legs", Fz(x, 0), a, start, S.PAD_TOP, shoe, { name: `legs.ankle${tag}` });
  for (const part of S.LEG_STACK.parts) {
    if (part.neck) discOn("legs", Fz(x, 0), part.neck[0], part.neck[1], S.NECK.r, { tone: "mid", name: "legs.neck" });
    else {
      const g = part.globe;
      LEG_SHAPES[side].top = bodyZ("legs", x, 0, g.body, g.z0, g.z1, { seams: [(g.z0 + g.z1) / 2], name: "legs.globe", rim: true });
    }
  }
}

// ---------------------------------------------------------------- pelvis and hip hinges
// A seam on a body turned about z, through points on its surface: drawn where the surface
// faces us, fading toward the silhouette.
function seamOn(body, points, { tone = "lo" } = {}) {
  const list = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const [x, y, z] = points[i];
    const r = Math.hypot(x, y);
    const f = G.dot3(G.unit3([x / r, y / r, -body.slope(z)]), V);
    if (f > 0.03) list.push([k.pathOf([at(points[i]), at(points[i + 1])]), Math.min(1, f * 3)]);
  }
  return Faded(list, { tone, free: true });
}
// The pelvis seams: a waist line that dips at the front, a V "briefs" line from each hip down
// to the crotch, and a short centre seam under it.
function pelvisSeams() {
  const body = S.PELVIS.body;
  const onBody = (theta, z) => [body.radius(z) * Math.sin(theta), body.radius(z) * Math.cos(theta), z];
  const front = (x, z) => [x, Math.sqrt(Math.max(0, body.radius(z) ** 2 - x * x)), z];
  const waist = Array.from({ length: 121 }, (_, i) => {
    const theta = -Math.PI + (i / 120) * Math.PI * 2;
    return onBody(theta, 102.5 - 6.5 * Math.max(0, Math.cos(theta)) ** 2);
  });
  const legs = [-1, 1].map((side) => Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return front(27 * side * (1 - t), 92 - 8 * t - 1.5 * Math.sin(Math.PI * t));
  }));
  const fly = Array.from({ length: 6 }, (_, i) => front(0, 84 - (i / 5) * 2));
  return [waist, ...legs, fly].map((points) => seamOn(body, points)).join("");
}
const pelvis = bodyZ("pelvis", 0, 0, S.PELVIS.body, S.PELVIS.z0, S.PELVIS.z1, { name: "pelvis.body", count: 30, gloss: { spotTol: 0.006, width: 0.11 }, rim: true, extra: pelvisSeams() });
// The hip mechanism on each side (CAD side view R3.50 in): a flat plate facing out, round on
// top and narrowing to a tongue over the top leg globe, held off the pelvis by a hub. On it
// pivots a crank lever, a round head on a bolt with a bar running down onto the globe: the
// joint the legs swing about.
const HIP = {
  y: 0.5,
  z: 93.5,
  hub: { r: 6, from: 27.5 },
  plate: { from: 30.8, to: 32, R: 9, tip: [-1.5, 79], tipR: 1.5 },
  crank: { to: 33.4, head: 3.6, bar: [1.7, 1.3], tip: [-2.8, 76.8] },
  bolt: { washer: 1.3, r: 0.8, at: 33.7, to: 34.3 },
};
const circle2 = (cx, cy, r, n = 32) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)]);
for (const side of [-1, 1]) {
  // s runs out along ±x; (u, v) are (y, z).
  const F = G.frameOf([0, 0, 0], [side, 0, 0], [0, 1, 0], [0, 0, 1]);
  const H = G.frameOf([0, HIP.y, HIP.z], [side, 0, 0], [0, 1, 0], [0, 0, 1]);
  discOn("pelvis", H, HIP.hub.from, HIP.plate.from, HIP.hub.r, { tone: "mid", name: "pelvis.hip-hub", cut: [pelvis] });
  const plate = G.hullOf([...circle2(HIP.y, HIP.z, HIP.plate.R, 48), ...circle2(...HIP.plate.tip, HIP.plate.tipR, 16)]);
  prism("pelvis", F, plate, HIP.plate.from, HIP.plate.to, { tone: "hi", name: "pelvis.hip-plate" });
  const head = discOn("pelvis", H, HIP.plate.to, HIP.crank.to, HIP.crank.head, { tone: "hi", name: "pelvis.hip-crank" });
  const bar = G.hullOf([...circle2(HIP.y, HIP.z, HIP.crank.bar[0], 16), ...circle2(...HIP.crank.tip, HIP.crank.bar[1], 16)]);
  prism("pelvis", F, bar, HIP.plate.to, HIP.crank.to - 0.25, { tone: "hi", name: "pelvis.hip-lever", cut: [head] });
  discOn("pelvis", H, HIP.crank.to, HIP.bolt.at, HIP.bolt.washer, { tone: "mid", name: "pelvis.hip-washer" });
  const hex = Array.from({ length: 6 }, (_, i) => [HIP.bolt.r * Math.cos(((i + 0.5) / 6) * Math.PI * 2), HIP.bolt.r * Math.sin(((i + 0.5) / 6) * Math.PI * 2)]);
  prism("pelvis", H, hex, HIP.bolt.at, HIP.bolt.to, { tone: "hi", name: "pelvis.hip-bolt" });
}

// ---------------------------------------------------------------- laboratory core (speculative)
// Sits on the pelvis top inside the chest barrel; seen when the chest is lifted away.
const CORE_TOP = 108;
{
  const F = Fz(0, 0);
  discOn("core", F, CORE_TOP, CORE_TOP + 2, 17.6, { tone: "mid", name: "core.deck", extra: Dots(G.dotsOf(F, CORE_TOP + 2, 15.6, 18, P, { all: true }), { size: 0.42 }) });
}
const DECK = CORE_TOP + 2;
const DRUM = { y: 9.6, z: 122, r: 6.3, cap: 6.8, half: 8.4 };
{
  for (const x of [-6.5, 3.5]) slab("core", { x, y: DRUM.y - 4, w: 3, d: 8, r: 0.5 }, DECK, DRUM.z - DRUM.r - DECK, { tone: "mid", steps: 2, bevel: 0.3, name: "core.cradle" });
  const F = G.frameOf([0, DRUM.y, DRUM.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const ribs = G.ribsOf(F, -DRUM.half + 1.2, DRUM.half - 1.2, DRUM.r, 28, P, { fade: [0.1, 0.55], seams: true });
  const id = "core.analyzer";
  const shape = record(A.disc(F, -DRUM.half, DRUM.half, DRUM.r, { name: id }));
  put("core", F.o, Sv(G.disc(-DRUM.half, DRUM.half, DRUM.r, F, P), { tone: "hi" }) + `<g data-live="drum">${Faded(ribs, { tone: "lo" })}</g>`, { name: id, shapes: [shape] });
  for (const [s0, s1] of [[-DRUM.half - 1, -DRUM.half], [DRUM.half, DRUM.half + 1]]) discOn("core", F, s0, s1, DRUM.cap, { tone: "mid", name: "core.analyzer-cap", extra: s1 > 0 && G.dot3(F.a, V) > 0.12 ? Dots(G.dotsOf(F, s1, 5, 8, P, { all: true }), { size: 0.4 }) : "" });
  const top = DRUM.z + DRUM.r;
  slab("core", { x: -3.5, y: DRUM.y - 3, w: 7, d: 6, r: 0.4 }, top, 131.4 - top, { tone: "mid", steps: 2, bevel: 0.3, name: "core.chute" });
  slab("core", { x: -3.5, y: DRUM.y - 3, w: 7, d: 18.6 - DRUM.y + 3, r: 0.4 }, 131.4, 4.6, { tone: "mid", steps: 2, bevel: 0.4, name: "core.throat", extra: Ln(k.pathOf(roundRect(-2.6, 132.2, 2.6, 135.2, 0.4).map(([x, z]) => at([x, 18.6, z])), true), { tone: "lo" }) });
}
// Inhibition relay cage: the bank the 1954 script calls D-12,000 to D-18,500.
const CAGE = { x: -8, y: -18.4, w: 16, d: 12 };
const CARDS = [-5, -3.33, -1.67, 0, 1.67, 3.33, 5];
{
  slab("core", { ...CAGE, r: 0.6 }, DECK, 1, { tone: "mid", steps: 2, bevel: 0.3, name: "core.cage-base" });
  for (const x of [CAGE.x, CAGE.x + CAGE.w - 1]) slab("core", { x, y: CAGE.y, w: 1, d: CAGE.d, r: 0.2 }, DECK + 1, 25, { tone: "mid", steps: 2, bevel: 0.2, name: "core.cage-end" });
  CARDS.forEach((x, index) => {
    const plan = { x: x - 0.35, y: CAGE.y + 1, w: 0.7, d: CAGE.d - 2, r: 0.1 };
    const tab = { x: x - 0.6, y: CAGE.y + CAGE.d - 3.2, w: 1.2, d: 2.2, r: 0.2 };
    const led = at([x, CAGE.y + CAGE.d - 2.1, DECK + 23.4]);
    slab("core", plan, DECK + 1, 21, { tone: "hi", steps: 2, bevel: 0, name: "core.card", extra: "" });
    slab("core", tab, DECK + 22, 1.4, { tone: "mid", steps: 2, bevel: 0, name: "core.card-tab", extra: `<circle class="rb-led" data-led="${index}" cx="${led[0].toFixed(1)}" cy="${led[1].toFixed(1)}" r="0.9"/>` });
  });
  const rail = { x: CAGE.x, y: CAGE.y, w: CAGE.w, d: 2, r: 0.3 };
  const engraving = k.faceTextSvg(k.topMatrix([0, CAGE.y + 1], DECK + 27, P, "x"), "D-12,000–18,500", { size: 1.05, tone: "lo", anchor: "middle" });
  slab("core", rail, DECK + 26, 1, { tone: "mid", steps: 2, bevel: 0.2, name: "core.cage-rail", extra: engraving });
}
for (const [x, kind] of [[-13.6, "reflex"], [13.6, "pattern"]]) {
  const F = Fz(x, 1);
  const top = kind === "reflex" ? 131 : 128;
  const seams = [DECK + 4, top - 4];
  discOn("core", F, DECK, top, 4, { tone: "hi", name: `core.${kind}`, inner: Ln(seams.map((z) => G.arcOf(F, z, 4, P)).join(""), { tone: "faint" }), extra: kind === "pattern" ? Faded(G.ribsOf(F, DECK + 4, top - 4, 4, 22, P, { fade: [0.1, 0.55] }), { tone: "lo" }) : "" });
  discOn("core", F, top, top + 1.2, 3, { tone: "mid", name: `core.${kind}-cap`, extra: Dots([at([x, 1, top + 1.2])], { size: 0.5, tone: "hi" }) });
}

// ---------------------------------------------------------------- chest barrel, bearing, analyzing hopper and indicator panel
function ringOn(piece, F, s0, s1, rIn, rOut, { tone = "mid", name, extra = "", bias = 0 } = {}) {
  const id = nameFor(name ?? `${piece}.ring`);
  const shape = record(A.ring(F, s0, s1, rIn, rOut, { name: id }));
  put(piece, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), Sv(G.ringBand(s0, s1, rIn, rOut, F, P), { tone }) + extra, { name: id, shapes: [shape], bias });
  return shape;
}
// The shoulder balls (R6.50 in on the CAD) sit in sockets at the barrel's front corners.
const SHOULDER = { z: 127, az: 48 * DEG, R: 16, centre: S.CHEST.R - 3 };
const shoulderDir = (side) => [side * Math.sin(SHOULDER.az), Math.cos(SHOULDER.az), 0];
// Where a shoulder ball leaves the barrel: a dark socket gap with a lit rim, which shows as an
// empty socket when the arm is lifted away.
function socketSvg(side) {
  const d = shoulderDir(side);
  const c = G.add3([0, 0, SHOULDER.z], G.mul3(d, SHOULDER.centre));
  const az = Math.atan2(d[0], d[1]);
  const onBarrel = (t, psi) => {
    const phi = az + (t * Math.cos(psi)) / S.CHEST.R;
    const z = SHOULDER.z + t * Math.sin(psi);
    const r = S.CHEST.body.radius(z);
    return [r * Math.sin(phi), r * Math.cos(phi), z];
  };
  const edge = Array.from({ length: 72 }, (_, j) => {
    const psi = (j / 72) * Math.PI * 2;
    let lo = 0;
    let hi = 30;
    for (let i = 0; i < 40; i++) {
      const t = (lo + hi) / 2;
      if (Math.hypot(...G.sub3(onBarrel(t, psi), c)) < SHOULDER.R) lo = t;
      else hi = t;
    }
    return onBarrel(hi + 0.6, psi);
  });
  const d2 = path(edge, true);
  return `<path class="rb-socket" d="${d2}"/><path class="rb-socket-rim" d="${d2}"/>`;
}
const chest = bodyZ("chest", 0, 0, S.CHEST.body, S.CHEST.z0, S.CHEST.z1, { seams: [116, 140], name: "chest.barrel", count: 36, gloss: { spotTol: 0.004, rows: 60 }, rim: true, extra: socketSvg(1) + socketSvg(-1), hollow: { wall: 1.6, floor: [25, 28.4, 1.6], roof: 1.6 } });
// The barrel as a solid, used only to cut the pads seated on it.
const chestSolid = Object.assign(A.solid(Fz(0, 0), S.sampled(S.CHEST.body, S.CHEST.z0, S.CHEST.z1, 36), { radius: S.CHEST.body.radius, name: "chest.barrel" }), { piece: "chest", ride: "chest", move: PIECES.chest.move });
{
  const F = Fz(0, 0);
  const id = "chest.bearing";
  const shape = record(A.disc(F, S.BEARING.z0, S.BEARING.z1, S.BEARING.rOut, { name: id }));
  put("chest", [0, 0, S.BEARING.z0 + 0.5], Sv(G.disc(S.BEARING.z0, S.BEARING.z1, S.BEARING.rOut, F, P), { tone: "mid" }) + Dots(G.dotsOf(F, S.BEARING.z1, 22.3, 24, P, { all: true }), { size: 0.35 }), { name: id, shapes: [shape] });
}
// MGM's sheet calls the panel the "analyzing hopper & indicator panel": a box standing 2 cm
// proud of the barrel in the body's own lacquer, its frame set with a chain of beads. Inside,
// recessed, from the top: the hopper mouth, a convex roll-top door, a ledge, the two lamps in
// chrome bezels, and four narrow keys in slots.
const HB = { x0: -13, x1: 13, z0: 111, z1: 143, face: S.CHEST.R + 2, frame: 2.2 };
const IN = { x0: HB.x0 + HB.frame, x1: HB.x1 - HB.frame, z0: HB.z0 + HB.frame, z1: HB.z1 - HB.frame };
const MOUTH = { z0: 138.6, z1: IN.z1 - 0.4, notch: [2, 0.7] };
const DOOR = { x0: IN.x0, x1: IN.x1, z0: 133.5, z1: 138.6, bulge: 1.2 };
const LEDGE = 128.8;
const LIGHTS = { z: 122.8, r: 3.75, glass: 3.1, xs: [-5.2, 5.2] };
const KEYS = { xs: [-7.8, -2.6, 2.6, 7.8], w: 2, z0: 112.9, h: 3.8, d: 0.6, slot: [2.4, 4.2], band: [112.3, 117.4] };
let heartbox;
// The points of a closed outline, evenly spaced along it.
function evenly(points, pitch) {
  const out = [];
  let carry = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    const length = Math.hypot(...G.sub3(q, p));
    let t = carry;
    while (t < length) {
      out.push(G.add3(p, G.mul3(G.sub3(q, p), t / length)));
      t += pitch;
    }
    carry = t - length;
  }
  return out;
}
{
  const ring = [];
  ring.push([HB.x1, HB.face], [HB.x0, HB.face]);
  for (let index = 0; index <= 24; index++) {
    const x = HB.x0 + ((HB.x1 - HB.x0) * index) / 24;
    ring.push([x, Math.sqrt(S.CHEST.R ** 2 - x * x)]);
  }
  const on = (x, z) => [x, HB.face, z];
  const f = (x, z) => at(on(x, z));
  const recess = roundRect(IN.x0, IN.z0, IN.x1, IN.z1, 1.2).map(([x, z]) => f(x, z));
  const beads = evenly(roundRect(HB.x0 + HB.frame / 2, HB.z0 + HB.frame / 2, HB.x1 - HB.frame / 2, HB.z1 - HB.frame / 2, 1.6, 6).map(([x, z]) => on(x, z)), 1.2).map(at);
  const mouth = [...roundRect(IN.x0 + 0.6, MOUTH.z0, IN.x1 - 0.6, MOUTH.z1, 0.5)].map(([x, z]) => f(x, z));
  const notch = roundRect(-MOUTH.notch[0], MOUTH.z1 - 0.2, MOUTH.notch[0], MOUTH.z1 + MOUTH.notch[1], 0.3).map(([x, z]) => f(x, z));
  const band = roundRect(IN.x0 + 0.6, KEYS.band[0], IN.x1 - 0.6, KEYS.band[1], 0.6).map(([x, z]) => f(x, z));
  const slots = KEYS.xs.map((x) => k.pathOf(roundRect(x - KEYS.slot[0] / 2, KEYS.z0 - 0.2, x + KEYS.slot[0] / 2, KEYS.z0 - 0.2 + KEYS.slot[1], 0.4).map(([xx, z]) => f(xx, z)), true)).join("");
  const creases = k.pathOf([f(IN.x0, LEDGE), f(IN.x1, LEDGE)]) + k.pathOf([f(IN.x0, DOOR.z0), f(IN.x1, DOOR.z0)]);
  const lip = k.pathOf([f(IN.x0 + 1.2, IN.z0), f(IN.x1 - 1.2, IN.z0)]);
  const body =
    `<path class="rb-panel-recess" d="${k.pathOf(recess, true)}"/>` +
    Ln(k.pathOf(recess, true), { tone: "lo" }) +
    `<path class="rb-keylight" d="${lip}"/>` +
    `<path class="rb-slot" d="${k.pathOf(mouth, true)}"/><path class="rb-slot" d="${k.pathOf(notch, true)}"/>` +
    Ln(creases, { tone: "lo" }) +
    Ln(k.pathOf(band, true), { tone: "faint" }) +
    `<path class="rb-slot" d="${slots}"/>` +
    `<g class="rb-beads">${Dots(beads, { size: (0.42 * KS).toFixed(2), tone: "hi" })}</g>`;
  const id = "chest.heartbox";
  const shape = (heartbox = record(A.extruded(ring, HB.z0, HB.z1 - HB.z0, { name: id, cut: [chestSolid], seated: true })));
  put("chest", [0, HB.face - 1, (HB.z0 + HB.z1) / 2], Sv(k.extrude(ring, HB.z0, HB.z1 - HB.z0, P, { convex: false, bevel: 0.6 }), { tone: "hi" }) + body, { name: id, shapes: [shape], bias: 0.5 });
}
const FLAP = { hinge: [0, HB.face, DOOR.z0], along: [-1, 0, 0], up: [0, 0, 1], out: [0, 1, 0], width: DOOR.x1 - DOOR.x0 - 0.4, height: DOOR.z1 - DOOR.z0, thick: 0.6, bulge: DOOR.bulge };
{
  const { F, poly } = rollTop({ ...FLAP, angle: 0 });
  const w = FLAP.width / 2;
  const id = "chest.door";
  const shape = record(A.prism(F, poly, -w, w, { name: id, cut: [heartbox], seated: true }));
  put("chest", [0, HB.face + 0.4, (DOOR.z0 + DOOR.z1) / 2], `<g data-live="door">${Sv(G.prismOf(F, poly, -w, w, P), { tone: "hi" })}</g>`, { name: id, shapes: [shape], bias: 1 });
}
// The lamps: on the left a faceted clear lens holding a four-pointed star, on the right a brass
// disc with four chrome rivets on a diamond. Their insides are drawn live.
for (const [index, x] of LIGHTS.xs.entries()) {
  const F = G.frameOf([x, HB.face, LIGHTS.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const kind = index === 0 ? "star" : "quad";
  discOn("chest", F, 0, 0.8, LIGHTS.r, { tone: "hi", name: `chest.${kind}-bezel`, bias: 1 });
  const C = G.add3(F.o, [0, 0.9, 0]);
  const facets = index ? "" : Ln(Array.from({ length: 8 }, (_, j) => {
    const a = (j / 8) * Math.PI * 2 + Math.PI / 8;
    return k.pathOf([at(G.add3(C, [Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9])), at(G.add3(C, [Math.cos(a) * LIGHTS.glass, 0, Math.sin(a) * LIGHTS.glass]))]);
  }).join(""), { tone: "faint", free: true });
  const lens = `<path class="rb-lens" data-lens="${index ? "amber" : "clear"}" d="${G.circleOf(F, 0.8, LIGHTS.glass, P)}"/>` + facets;
  put("chest", C, lens + `<g data-live="${kind}">${index ? quadInside(0, -1) : starInside(0)}</g>`, { name: `chest.${kind}`, bias: 1.2, shapes: [record(A.disc(F, 0.8, 0.86, LIGHTS.glass, { name: `chest.${kind}` }))] });
}
// The star: four concave points. The quad: four rivets, one lit at a time.
function starInside(angle) {
  const c = [LIGHTS.xs[0], HB.face + 0.9, LIGHTS.z];
  const g = LIGHTS.glass;
  const pts = [];
  for (let i = 0; i < 4; i++) {
    const a0 = angle + (i * Math.PI) / 2;
    const a1 = a0 + Math.PI / 2;
    for (let j = 0; j < 8; j++) {
      const t = j / 8;
      // A quadratic curve from one point to the next, pulled in toward the centre.
      const tip0 = [Math.cos(a0) * g * 0.82, Math.sin(a0) * g * 0.82];
      const tip1 = [Math.cos(a1) * g * 0.82, Math.sin(a1) * g * 0.82];
      const mid = [Math.cos((a0 + a1) / 2) * g * 0.08, Math.sin((a0 + a1) / 2) * g * 0.08];
      const x = (1 - t) ** 2 * tip0[0] + 2 * (1 - t) * t * mid[0] + t * t * tip1[0];
      const z = (1 - t) ** 2 * tip0[1] + 2 * (1 - t) * t * mid[1] + t * t * tip1[1];
      pts.push(at(G.add3(c, [x, 0, z])));
    }
  }
  return `<path class="rb-star" d="${k.pathOf(pts, true)}"/>`;
}
function quadInside(angle, lit) {
  const c = [LIGHTS.xs[1], HB.face + 0.9, LIGHTS.z];
  return Array.from({ length: 4 }, (_, i) => {
    const a = angle + (i * Math.PI) / 2;
    const F = G.frameOf(G.add3(c, [Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7]), [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    return `<path class="rb-rivet"${i === lit ? " data-on" : ""} d="${G.circleOf(F, 0, 0.42, P)}"/>`;
  }).join("");
}
{
  const shapes = [];
  const parts = KEYS.xs.map((x, index) => {
    const plan = { x: x - KEYS.w / 2, y: HB.face, w: KEYS.w, d: KEYS.d, r: 0.5 };
    shapes.push(record(A.slab(plan, KEYS.z0, KEYS.h, { name: "chest.keys" }, 2)));
    const top = k.pathOf([at([x - KEYS.w / 2 + 0.5, HB.face + KEYS.d, KEYS.z0 + KEYS.h]), at([x + KEYS.w / 2 - 0.5, HB.face + KEYS.d, KEYS.z0 + KEYS.h])]);
    return `<g data-key="${index}">${Sv(k.slabOf(plan, KEYS.z0, KEYS.h, P, 2, 0.2), { tone: "mid" })}<path class="rb-keylight" data-free="" d="${top}"/></g>`;
  });
  put("chest", [0, HB.face + 0.5, KEYS.z0 + 1.5], parts.join(""), { name: "chest.keys", bias: 1.1, shapes });
}
// ---------------------------------------------------------------- shoulders and arms
// Each arm hangs from one big ball (R6.50 in on the CAD; acetate "gimbals" on the prop) sunk
// into a socket at the barrel's front corner, right beside the panel. It is the only joint, so
// everything after it shares one straight axis: four fat rubber rolls out of the ball's front
// face, each a little smaller, then a rolled lip ring round the base of a half ball, cut flat
// at its tip. Out of the cut come the tool adaptor and a rubber mitten: two long fingers
// stacked one over the other in a V and a short thumb on the inner side, drooping a little, as
// in the studio stills.
const ARM = {
  dir: [0.157, 0.892, -0.423],
  rolls: [13.4, 12.9, 12.4, 11.9],
  roll: 4,
  neck: 0.86,
  lip: { R: 12.3, length: 1.6, end: 11.3 },
  half: { R: 11.2, cut: 6.3 },
  adaptor: { r: 5.8, length: 2.4 },
};
const HAND = {
  droop: 20 * DEG,
  cuff: { r: 5.2, length: 1 },
  palm: { length: 5.6, poly: roundRect(-3.8, -5.5, 3.8, 5.5, 2.6) },
  finger: { R: 2.45, neck: 2.05 },
  digits: [
    { u: 0, v: 2.9, turn: [0, 8], length: 12 },
    { u: 0, v: -2.9, turn: [0, -8], length: 12 },
    { u: 2.4, v: 0.4, turn: [14, 0], length: 7, thumb: true },
  ],
};
// A rubber finger: segments that swell between knuckle creases, ending in a round tip.
function fingerBody(length, R, neck, knuckles) {
  const cuts = [0, ...knuckles.map((t) => t * length), length];
  const p = 2.2;
  const radius = (s) => {
    const index = Math.max(0, Math.min(cuts.length - 2, cuts.findIndex((cut, i) => s >= cut && s <= cuts[i + 1])));
    const a = cuts[index];
    const b = cuts[index + 1];
    const last = index === cuts.length - 2;
    const c = last ? a + (b - a) * 0.3 : (a + b) / 2;
    const h = s < c ? S.reach(R, neck, p, c - a) : last ? b - c : S.reach(R, neck, p, b - c);
    const t = Math.min(0.999999, Math.abs(s - c) / h);
    return R * Math.pow(1 - Math.pow(t, p), 1 / p);
  };
  const slope = (s) => (radius(Math.min(length, s + 0.01)) - radius(Math.max(0, s - 0.01))) / (Math.min(length, s + 0.01) - Math.max(0, s - 0.01));
  return { radius, slope };
}
// The visible part of a prism's cross-section at s: a knuckle groove that ends on the outline.
function grooveOf(F, poly, s) {
  const seen = poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const n = G.add3(G.mul3(F.u, q[1] - p[1]), G.mul3(F.v, p[0] - q[0]));
    return G.dot3(n, V) > 1e-6;
  });
  const start = seen.findIndex((on, i) => on && !seen[(i - 1 + seen.length) % seen.length]);
  if (start < 0) return "";
  const run = [];
  for (let k2 = 0; k2 < poly.length && seen[(start + k2) % poly.length]; k2++) run.push(poly[(start + k2) % poly.length]);
  run.push(poly[(start + run.length) % poly.length]);
  return path(run.map(([x, y]) => G.add3(G.add3(G.add3(F.o, G.mul3(F.a, s)), G.mul3(F.u, x)), G.mul3(F.v, y))));
}
for (const side of [1, -1]) {
  const piece = side > 0 ? "armR" : "armL";
  const tag = side > 0 ? "R" : "L";
  const d = shoulderDir(side);
  const centre = G.add3([0, 0, SHOULDER.z], G.mul3(d, SHOULDER.centre));
  // The ball: drawn only where it stands out of the barrel.
  const outside = [];
  for (let i = 0; i <= 30; i++) {
    const lat = -Math.PI / 2 + (Math.PI * i) / 30;
    for (let j = 0; j < 60; j++) {
      const lon = (j / 60) * Math.PI * 2;
      const p = G.add3(centre, [SHOULDER.R * Math.cos(lat) * Math.cos(lon), SHOULDER.R * Math.cos(lat) * Math.sin(lon), SHOULDER.R * Math.sin(lat)]);
      if (Math.hypot(p[0], p[1]) > S.CHEST.body.radius(p[2]) + 0.02) outside.push(at(p));
    }
  }
  const ballId = `${piece}.shoulder`;
  const ball = record(A.ball(centre, SHOULDER.R, { name: ballId, cut: [chestSolid] }));
  put(piece, G.add3(centre, G.mul3(d, SHOULDER.R * 0.5)), `<clipPath id="rb-shoulder${tag}"><path d="${k.pathOf(G.hullOf(outside), true)}"/></clipPath><g clip-path="url(#rb-shoulder${tag})">${Sv(G.sphereOf(centre, SHOULDER.R, P), { tone: "hi" })}${glossBall(centre, SHOULDER.R)}${rimOn(G.frameOf(centre, [0, 0, 1], [1, 0, 0], [0, 1, 0]), sphereBody(SHOULDER.R).radius, sphereBody(SHOULDER.R).slope, -SHOULDER.R * 0.97, SHOULDER.R * 0.97)}</g>`, { name: ballId, shapes: [ball] });
  const dir = G.unit3([side * ARM.dir[0], ARM.dir[1], ARM.dir[2]]);
  const across = G.unit3(G.cross3([0, 0, 1], dir));
  const AF = G.frameOf(centre, dir, across, G.cross3(dir, across));
  // The rolls start where the ball's cross-section meets the first roll's neck.
  let s = Math.sqrt(SHOULDER.R ** 2 - (ARM.rolls[0] * ARM.neck) ** 2);
  ARM.rolls.forEach((R, index) => {
    const h = S.reach(R, R * ARM.neck, 2.4, ARM.roll / 2);
    const body = S.bulb({ R, c: s + ARM.roll / 2, below: h, above: h, p: 2.4 });
    const cut = index === 0 ? [ball, chestSolid] : index === 1 ? [ball] : undefined;
    bodyOn(piece, AF, body, s, s + ARM.roll, { tone: "hi", name: `${piece}.sleeve`, count: 18, cut, seated: false, gloss: { width: 0.07 } });
    s += ARM.roll;
  });
  const L = ARM.lip;
  const lipH = S.reach(L.R, L.end, 2.4, L.length / 2);
  bodyOn(piece, AF, S.bulb({ R: L.R, c: s + L.length / 2, below: lipH, above: lipH, p: 2.4 }), s, s + L.length, { tone: "hi", name: `${piece}.lip`, count: 10 });
  s += L.length;
  const H = ARM.half;
  const halfLength = H.R * Math.sqrt(1 - (H.cut / H.R) ** 2);
  bodyOn(piece, AF, S.bulb({ R: H.R, c: s, below: 0.5, above: S.reach(H.R, H.cut, 2, halfLength), p: 2 }), s, s + halfLength, { tone: "hi", name: `${piece}.half-ball`, count: 24, rim: true });
  s += halfLength;
  const Ad = ARM.adaptor;
  const adaptor = discOn(piece, AF, s, s + Ad.length, Ad.r, { tone: "mid", name: `${piece}.adaptor`, inner: Ln(G.arcOf(AF, s + Ad.length / 2, Ad.r, P), { tone: "lo" }) });
  s += Ad.length;
  // The cuff, the mitten and its fingers are one item, drawn back to front, since the fingers
  // grow out of the mitten and the mitten out of the cuff.
  const hand = [];
  const cuff = record(A.disc(AF, s, s + HAND.cuff.length, HAND.cuff.r, { name: `${piece}.cuff` }));
  hand.push({ depth: -Infinity, svg: Sv(G.disc(s, s + HAND.cuff.length, HAND.cuff.r, AF, P), { tone: "mid" }), shape: cuff });
  s += HAND.cuff.length;
  // The mitten droops from the cuff's end.
  const pivot = G.add3(AF.o, G.mul3(AF.a, s - 1));
  const hd = G.unit3(G.sub3(G.mul3(AF.a, Math.cos(HAND.droop)), G.mul3(AF.v, Math.sin(HAND.droop))));
  const HF = G.frameOf(pivot, hd, AF.u, G.cross3(hd, AF.u));
  const palm = record(A.prism(HF, HAND.palm.poly, 0, HAND.palm.length, { name: `${piece}.palm`, cut: [cuff, adaptor], seated: true }));
  hand.push({ depth: -1e9, svg: Sv(G.prismOf(HF, HAND.palm.poly, 0, HAND.palm.length, P), { tone: "hi" }), shape: palm });
  const root = HAND.palm.length - 1.4;
  const digits = [];
  for (const [index, digit] of HAND.digits.entries()) {
    const u = digit.thumb ? side * digit.u : digit.u;
    const [tu, tv] = [digit.thumb ? side * digit.turn[0] : digit.turn[0], digit.turn[1]].map((deg) => Math.tan(deg * DEG));
    const fdir = G.unit3(G.add3(HF.a, G.add3(G.mul3(HF.u, tu), G.mul3(HF.v, tv))));
    const o = G.add3(G.add3(G.add3(HF.o, G.mul3(HF.a, root)), G.mul3(HF.u, u)), G.mul3(HF.v, digit.v));
    const fu = G.unit3(G.sub3(HF.u, G.mul3(fdir, G.dot3(HF.u, fdir))));
    const FF = G.frameOf(o, fdir, fu, G.cross3(fdir, fu));
    const knuckles = digit.thumb ? [0.5] : [0.38, 0.68];
    const body = fingerBody(digit.length, HAND.finger.R * (digit.thumb ? 0.92 : 1), HAND.finger.neck * (digit.thumb ? 0.92 : 1), knuckles);
    const ribs = digit.thumb ? [] : [0.86, 0.91];
    const part = bodyParts(piece, FF, body, 0, digit.length, { tone: "hi", name: `${piece}.finger${index}`, count: 30, seams: [...knuckles, ...ribs].map((t) => t * digit.length), cut: digit.thumb ? [palm, ...digits] : [palm], gloss: false });
    digits.push(part.shape);
    hand.push({ depth: G.dot3(part.ref, V), svg: part.svg, shape: part.shape });
  }
  hand.sort((a, b) => a.depth - b.depth);
  put(piece, G.add3(pivot, G.mul3(hd, HAND.palm.length / 2)), hand.map((part) => part.svg).join(""), { name: `${piece}.hand`, shapes: hand.map((part) => part.shape) });
}

// ---------------------------------------------------------------- head: voice collar, brim lip, key chassis
// Under the head the collar is recessed inside the brim: a window of voice tubes across the
// front, stacked plates down each side, and vertical flutes round the back of the neck. Its top
// follows the head's two planes, so it is drawn and recorded as a front and a back part.
const onCollar = (theta, z, r = S.COLLAR.r) => [r * Math.sin(theta), r * Math.cos(theta), z];
const NEON = { a: 45 * DEG, step: 1.15, plates: 1.6 };
const SLANT_F = G.frameOf(S.SLANT_O, S.SLANT_N, [1, 0, 0], G.cross3(S.SLANT_N, [1, 0, 0]));
const brimTop = G.add3(S.SLANT_O, G.mul3(S.SLANT_N, S.BRIM.thick));
const brimTopZ = (x, y) => brimTop[2] - ((x - brimTop[0]) * S.SLANT_N[0] + (y - brimTop[1]) * S.SLANT_N[1]) / S.SLANT_N[2];
// The head's underside: the brim top in front, the rear plane behind.
const headFloor = (x, y) => Math.max(brimTopZ(x, y), S.rearZ(y));
const rearCut = () => beyond(S.REAR_O, S.REAR_N);
const collarTop = (theta) => {
  const y = S.COLLAR.r * Math.cos(theta);
  return y >= S.REAR.y0 ? S.slantZ(y) : S.rearZ(y);
};
const SPLIT = Math.acos(S.REAR.y0 / S.COLLAR.r);
{
  const R = S.COLLAR.r;
  const parts = [
    { name: "head.collar", from: -SPLIT, to: SPLIT, top: (y) => S.slantZ(y), cut: [beyond(S.SLANT_O, G.mul3(S.SLANT_N, -1)), beyond([0, S.REAR.y0, 0], [0, 1, 0])] },
    { name: "head.neck", from: SPLIT, to: Math.PI * 2 - SPLIT, top: (y) => S.rearZ(y), cut: [beyond(S.REAR_O, G.mul3(S.REAR_N, -1)), beyond([0, S.REAR.y0, 0], [0, -1, 0])] },
  ];
  for (const part of parts) {
    const n = 48;
    const angles = Array.from({ length: n + 1 }, (_, j) => part.from + ((part.to - part.from) * j) / n);
    const low = angles.map((t) => onCollar(t, S.COLLAR.z0));
    const high = angles.map((t) => onCollar(t, part.top(R * Math.cos(t))));
    const faces = [];
    for (let j = 0; j < n; j++) faces.push([low[j], low[j + 1], high[j + 1], high[j]]);
    faces.push([low[n], low[0], high[0], high[n]]);
    faces.push(high, [...low].reverse());
    const detail = [];
    if (part.name === "head.collar") {
      // Voice tubes: horizontal arcs across the front window, each stopping at the stiles or
      // where the brim comes down over it; a mullion down the middle.
      const tubes = [];
      let index = 0;
      for (let z = S.COLLAR.z0 + 1.2; z < S.slantZ(R) - 0.4; z += NEON.step) {
        const c = (z + 0.3 - S.SLANT.o) / (S.SLANT.k * R);
        const limit = Math.min(NEON.a, Math.acos(Math.max(-1, Math.min(1, c))));
        if (limit < 0.05) continue;
        const points = [];
        for (let j = 0; j <= 30; j++) points.push(onCollar(-limit + (2 * limit * j) / 30, z, R + 0.05));
        const d = path(points);
        tubes.push(`<g class="rb-tube" data-tube="${index++}"><path class="rb-neon" d="${d}"/></g>`);
      }
      const frame = [];
      for (const t of [-NEON.a, 0, NEON.a]) frame.push(path([onCollar(t, S.COLLAR.z0, R + 0.05), onCollar(t, collarTop(t), R + 0.05)]));
      // Side plates: stacked horizontal edges from the stile back to where the brim cuts them.
      for (const sign of [-1, 1]) {
        for (let z = S.COLLAR.z0 + 0.2; z < S.slantZ(R * Math.cos(NEON.a)) - 0.3; z += NEON.plates) {
          const c = (z - S.SLANT.o) / (S.SLANT.k * R);
          const end = Math.min(SPLIT - 0.02, Math.acos(Math.max(-1, Math.min(1, c))));
          if (end <= NEON.a + 0.03) continue;
          const points = [];
          for (let j = 0; j <= 8; j++) points.push(onCollar(sign * (NEON.a + ((end - NEON.a) * j) / 8), z, R + 0.05));
          frame.push(path(points));
        }
      }
      detail.push(`<g data-live="neon">${tubes.join("")}</g>`, Ln(frame.join(""), { tone: "mid" }));
    } else {
      // Flutes round the back of the neck: only those facing us are drawn.
      const flutes = [];
      for (let t = SPLIT + 0.08; t < Math.PI * 2 - SPLIT - 0.04; t += 0.11) {
        const normal = [Math.sin(t), Math.cos(t), 0];
        if (G.dot3(normal, V) < 0.08) continue;
        flutes.push(path([onCollar(t, S.COLLAR.z0, R + 0.05), onCollar(t, collarTop(t), R + 0.05)]));
      }
      if (flutes.length) detail.push(Ln(flutes.join(""), { tone: "faint" }));
    }
    const shape = record(A.cylinder(0, 0, R, S.COLLAR.z0, 20, { name: part.name, cut: part.cut }));
    put("head", [0, part.name === "head.collar" ? 8 : -12, 156], Sv(convexPaths(faces, P), { tone: "hi" }) + detail.join(""), { name: part.name, shapes: [shape] });
  }
}
// The brim: a rolled lip on the front plane, widest where it sits on the collar and rounding up
// into the head, so collar, brim and dome read as one contour. Behind the side line it runs
// into the neck and stops.
{
  const B = S.BRIM;
  const lip = S.bulb({ R: B.rOut, c: 0, below: 1, above: S.reach(B.rOut, B.rTop, 2.2, B.thick), p: 2.2 });
  const profile = S.sampled(lip, 0, B.thick, 14);
  const paths = G.solidOf(profile, SLANT_F, P, { smooth: { slope: lip.slope, radius: lip.radius } });
  const kept = [];
  for (let i = 0; i <= 14; i++) {
    const sAt = (B.thick * i) / 14;
    for (let j = 0; j < 120; j++) {
      const p = G.pointOf(SLANT_F, sAt, lip.radius(sAt), (j / 120) * Math.PI * 2);
      if (p[2] >= S.rearZ(p[1]) - 0.01) kept.push(at(p));
    }
  }
  const id = "head.brim";
  const shape = record(A.solid(SLANT_F, profile, { radius: lip.radius, name: id, cut: [rearCut()] }));
  const shine = glossOn(SLANT_F, lip.radius, lip.slope, 0, B.thick, { spot: false, rows: 10 });
  put("head", G.add3(S.SLANT_O, G.mul3(S.SLANT_N, 1.1)), `<clipPath id="rb-brim"><path d="${k.pathOf(G.hullOf(kept), true)}"/></clipPath><g clip-path="url(#rb-brim)">${Sv(paths, { tone: "hi" })}${shine}</g>`, { name: id, shapes: [shape] });
}
// The hood and the key chassis: one D-shaped column, flat across the front behind the
// window. Below HOOD.top its round back is the hood, flush with the head's outline; above,
// it stands back from the clear cap and carries the gyro deck. A cheek fills each side of
// the window, between the window's edge and the flat front, and carries an ear.
const CH = S.CHASSIS;
const HOOD = S.HOOD;
// The relay row behind the window: six cream bobbins with black flanges, each with a chrome
// typebar lever curling up to a cup, and a clear push-rod up to a rod of amber beads; red jewel
// lamps at the ends; clear J-tubes down into finned glass stacks and a finned glass cylinder.
const KEYROW = { xs: [-10.5, -6.3, -2.1, 2.1, 6.3, 10.5], z: 175.5, y: CH.front + 2.5, drum: 2.1, half: 1.3, flange: { r: 2.45, t: 0.6 }, cup: 180, rod: { z: 184, y: CH.front + 3, x: 13 }, beads: [-12.4, -9.4, -7.4, -5.2, -3.2, -0.75, 0.75, 3.2, 5.2, 7.4, 9.4, 12.4], lamps: 14.6, stacks: [0, 5], drops: [2, 3] };
const hoodR = (z) => S.shellRadius(z) - 0.05;
const capR = (z) => S.shellRadius(z) - 0.8;
const HOOD_LOW = headFloor(0, S.REAR.y0) - 0.2;
const HOOD_FLAT = Math.max(headFloor(0, S.SHELL.R), headFloor(0, -S.SHELL.R), brimTopZ(0, CH.front)) + 0.2;
const windowX = CH.front * Math.tan(HOOD.window);
// Side quads between matching rings, and the two end caps.
function loft(rings) {
  const faces = [];
  for (let i = 0; i + 1 < rings.length; i++) {
    const lo = rings[i];
    const hi = rings[i + 1];
    for (let j = 0; j < lo.length; j++) faces.push([lo[j], lo[(j + 1) % lo.length], hi[(j + 1) % lo.length], hi[j]]);
  }
  faces.push(rings[rings.length - 1], [...rings[0]].reverse());
  return faces;
}
const levelsOf = (z0, z1, step = 1.5) => {
  const out = [];
  for (let z = z0; z < z1 - 0.3; z += step) out.push(z);
  out.push(z1);
  return out;
};
// A D of radius r cut flat at y = CH.front: front right corner, front left corner, then
// round the back.
function dPlan(r) {
  const half = Math.sqrt(Math.max(0, r * r - CH.front * CH.front));
  const a0 = Math.atan2(CH.front, -half);
  const a1 = Math.atan2(CH.front, half) + Math.PI * 2;
  const out = [[half, CH.front], [-half, CH.front]];
  for (let j = 1; j < 48; j++) {
    const a = a0 + ((a1 - a0) * j) / 48;
    out.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}
// A cheek in plan: the window's edge, the arc of the outline, the flat front.
function cheekPlan(side, r) {
  const aEnd = Math.acos(Math.min(1, CH.front / r));
  const out = [[side * windowX, CH.front]];
  for (let j = 0; j <= 8; j++) {
    const a = HOOD.window + ((aEnd - HOOD.window) * j) / 8;
    out.push([side * r * Math.sin(a), r * Math.cos(a)]);
  }
  return side > 0 ? out.reverse() : out;
}
const onBrim = (plan) => plan.map(([x, y]) => [x, y, headFloor(x, y)]);
const atLevel = (plan, z) => plan.map(([x, y]) => [x, y, z]);
const turned = (radius, z0, z1) => levelsOf(z0, z1).map((z) => [z, radius(z)]);
const brimCut = () => beyond(brimTop, S.SLANT_N);
const frontCut = () => beyond([0, CH.front, 0], [0, -1, 0]);
let hood;
{
  const rings = [onBrim(dPlan(hoodR(HOOD_FLAT))), ...levelsOf(HOOD_FLAT, HOOD.top).map((z) => atLevel(dPlan(hoodR(z)), z))];
  // The recess behind the window: the flat front between the cheeks, drawn dark.
  const recess = [];
  for (const z of levelsOf(brimTopZ(windowX, CH.front), HOOD.top, 2)) recess.push(at([windowX, CH.front, Math.max(z, brimTopZ(windowX, CH.front))]));
  for (const z of levelsOf(brimTopZ(-windowX, CH.front), HOOD.top, 2).reverse()) recess.push(at([-windowX, CH.front, Math.max(z, brimTopZ(-windowX, CH.front))]));
  const id = "head.hood";
  hood = record(A.solid(Fz(0, 0), [[HOOD_LOW, hoodR(HOOD_LOW)], ...turned(hoodR, HOOD_LOW + 1.5, HOOD.top)], { name: id, cut: [brimCut(), rearCut(), frontCut()] }));
  put("head", [0, 0, 180], Sv(convexPaths(loft(rings), P), { tone: "hi" }) + `<path class="rb-recess" d="${k.pathOf(recess, true)}"/>`, { name: id, shapes: [hood] });
}
for (const side of [-1, 1]) {
  const tag = side > 0 ? "R" : "L";
  const rings = [onBrim(cheekPlan(side, hoodR(HOOD_FLAT))), ...levelsOf(HOOD_FLAT, HOOD.top).map((z) => atLevel(cheekPlan(side, hoodR(z)), z))];
  const n = [side * Math.cos(HOOD.window), -Math.sin(HOOD.window), 0];
  const id = `head.cheek${tag}`;
  const shape = record(A.solid(Fz(0, 0), [[HOOD_LOW, hoodR(HOOD_LOW)], ...turned(hoodR, HOOD_LOW + 1.5, HOOD.top)], { name: id, cut: [brimCut(), beyond([0, CH.front, 0], [0, 1, 0]), beyond(G.mul3(n, 0.05), n)] }));
  put("head", [side * 15.5, CH.front + 1.5, 180], Sv(convexPaths(loft(rings), P), { tone: "hi" }), { name: id, shapes: [shape] });
}
// Comb fins: thin plates standing out from each side of the hood, from the brim to the ears.
const COMB = { z0: 170, pitch: 2.2, count: 6, out: 3.4, half: 0.9, thick: 0.35 };
for (const side of [-1, 1]) {
  for (let index = 0; index < COMB.count; index++) {
    const z = COMB.z0 + index * COMB.pitch;
    const r = hoodR(z + COMB.thick);
    const plan = side > 0 ? { x: r - 0.4, y: -COMB.half, w: COMB.out + 0.4, d: 2 * COMB.half, r: 0.25 } : { x: -r - COMB.out, y: -COMB.half, w: COMB.out + 0.4, d: 2 * COMB.half, r: 0.25 };
    const id = nameFor("head.comb-fin");
    const shape = record(A.slab(plan, z, COMB.thick, { name: id, cut: [hood], seated: true }, 2));
    put("head", [side * (r + COMB.out / 2), 0, z + COMB.thick / 2], Sv(k.slabOf(plan, z, COMB.thick, P, 2, 0.1), { tone: "hi" }), { name: id, shapes: [shape] });
  }
}
{
  const f = (x, z, y = CH.front) => at([x, y, z]);
  const K2 = KEYROW;
  const parts = [];
  const add = (centre, svg) => parts.push({ depth: G.dot3(centre, V), svg });
  const mat = (name, svg) => `<g class="rb-mat-${name}">${svg}</g>`;
  const along = (o, axis) => G.frameAlong(o, axis);
  // Vents: four tall slots each side, dark with a lit lower lip.
  const vents = [];
  for (const sign of [-1, 1]) for (let j = 0; j < 4; j++) {
    const x = sign * (8.8 + j * 1.8);
    vents.push(`<path class="rb-vent" d="${k.pathOf(roundRect(x - 0.55, 186.5, x + 0.55, 193, 0.55, 3).map(([xx, z]) => f(xx, z)), true)}"/>`);
  }
  // The bead rod and its beads, which chase while he computes.
  const rodF = along([-K2.rod.x, K2.rod.y, K2.rod.z], [1, 0, 0]);
  add([0, K2.rod.y, K2.rod.z], mat("brass", k.solidSvg(G.disc(0, 2 * K2.rod.x, 0.15, rodF, P), { tone: "mid" })));
  K2.beads.forEach((x, index) => {
    const c = [x, K2.rod.y, K2.rod.z];
    add(c, `<g class="rb-bead" data-ind="${index}">${mat("amber", k.solidSvg(G.sphereOf(c, 0.65, P), { tone: "mid" }))}</g>`);
  });
  // The six relays and their typebars.
  K2.xs.forEach((x, index) => {
    const F = along([x, K2.y, K2.z], [1, 0, 0]);
    add([x, K2.y, K2.z], mat("ivory", k.solidSvg(G.disc(-K2.half, K2.half, K2.drum, F, P), { tone: "mid" })));
    add([x + K2.half + 0.3, K2.y, K2.z], mat("gunmetal", k.solidSvg(G.disc(K2.half, K2.half + K2.flange.t, K2.flange.r, F, P), { tone: "mid" })));
    const front = [x, K2.y + K2.drum, K2.z];
    add(G.add3(front, [0, 0.2, 0]), mat("chrome", k.solidSvg(G.disc(0, 0.4, 0.6, along(front, [0, 1, 0]), P), { tone: "mid" })));
    const lever = G.fillet([[x, K2.y + 0.6, K2.z + K2.drum - 0.3], [x, K2.y + 1.9, K2.z + 2.9], [x, K2.y + 0.9, K2.z + 3.9], [x, K2.rod.y, K2.cup]], 0.9, 8, { P, tube: 0.2 });
    const typebar = tubePieces(lever, 0.2, P, { maxLength: 400 }).map((part) => tubeSvg(part, { tone: "mid" })).join("");
    const cupF = along([x, K2.rod.y, K2.cup], [0, 0, 1]);
    const cup = k.solidSvg(G.disc(0, 0.3, 0.8, cupF, P), { tone: "mid" });
    const pushRod = k.solidSvg(G.disc(0.3, K2.rod.z - K2.cup - 0.15, 0.18, cupF, P), { tone: "mid" });
    add([x, K2.rod.y + 0.6, K2.cup], `<g data-rocker="${index}">${mat("chrome", typebar + cup)}${mat("clear", pushRod)}</g>`);
  });
  // Clear J-tubes from four relays down into finned glass stacks standing on the brim.
  for (const index of K2.stacks) {
    const x = K2.xs[index];
    const y = K2.y + K2.drum + 1;
    const floor = brimTopZ(x, y);
    const top = K2.z - 2.6;
    const route = G.fillet([[x, K2.y + K2.drum - 0.4, K2.z - 0.9], [x, y, K2.z - 0.9], [x, y, top + 0.6]], 0.9, 8, { P, tube: 0.4 });
    const tube = tubePieces(route, 0.4, P, { maxLength: 400 }).map((part) => tubeSvg(part, { tone: "mid" })).join("");
    const SF = along([x, y, 0], [0, 0, 1]);
    const fins = [];
    for (let j = 0; j < 5; j++) {
      const z0 = top - 0.6 - j * 0.85;
      if (z0 - 0.25 < floor + 1) break;
      fins.push(k.solidSvg(G.disc(z0 - 0.25, z0, 1.9, SF, P), { tone: "mid" }));
    }
    const stack = k.solidSvg(G.disc(floor, top, 0.6, SF, P), { tone: "mid" }) + fins.join("") + k.solidSvg(G.disc(top, top + 0.6, 0.8, SF, P), { tone: "mid" });
    add([x, y, (floor + top) / 2], mat("clear", stack + tube));
  }
  // Slim clear drop tubes from the two middle relays, down past the cylinder to the brim.
  for (const index of K2.drops) {
    const x = K2.xs[index];
    const y = K2.y + K2.drum + 1;
    const floor = brimTopZ(x, y);
    const route = G.fillet([[x, K2.y + K2.drum - 0.4, K2.z - 0.9], [x, y, K2.z - 0.9], [x, y, floor + 0.6]], 0.9, 8, { P, tube: 0.3 });
    const tube = tubePieces(route, 0.3, P, { maxLength: 400 }).map((part) => tubeSvg(part, { tone: "mid" })).join("");
    const foot = k.solidSvg(G.disc(floor, floor + 0.6, 0.55, along([x, y, 0], [0, 0, 1]), P), { tone: "mid" });
    add([x, y, (floor + K2.z) / 2], mat("clear", foot + tube));
  }
  // A finned glass cylinder across the middle, fed from relays two and five.
  {
    const CF = along([-3.5, K2.y - 0.5, K2.z - 4.5], [1, 0, 0]);
    let svg = k.solidSvg(G.solidOf([[0, 0.9], [0.5, 1.4, 1], [6.5, 1.4, 1], [7, 0.9]], CF, P, { smooth: { rows: 3 } }), { tone: "mid" });
    for (let j = 1; j <= 9; j++) svg += k.solidSvg(G.disc(0.45 + j * 0.62, 0.65 + j * 0.62, 1.65, CF, P), { tone: "mid" });
    for (const index of [1, 4]) {
      const x = K2.xs[index];
      const end = x < 0 ? -3.5 : 3.5;
      const route = G.fillet([[x, K2.y, K2.z - K2.drum + 0.3], [x, K2.y - 0.5, K2.z - 4.5], [end, K2.y - 0.5, K2.z - 4.5]], 0.9, 8, { P, tube: 0.35 });
      svg += tubePieces(route, 0.35, P, { maxLength: 400 }).map((part) => tubeSvg(part, { tone: "mid" })).join("");
    }
    add([0, K2.y - 0.5, K2.z - 4.5], mat("clear", svg));
  }
  // Red jewel lamps at either end of the row.
  for (const [sign, which] of [[-1, "lampL"], [1, "lampR"]]) {
    const o = [sign * K2.lamps, CH.front, K2.z];
    const LF = along(o, [0, 1, 0]);
    const bezel = mat("gunmetal", k.solidSvg(G.disc(0, 0.5, 2, LF, P), { tone: "mid" }));
    const dome = k.solidSvg(G.solidOf([[0.5, 1.8], [0.9, 1.75, 1], [1.5, 1.35, 1], [2.1, 0.6, 1], [2.3, 0.01]], LF, P, { smooth: { rows: 3 } }), { tone: "mid" });
    add(G.add3(o, [0, 1.2, 0]), bezel + `<g class="rb-jewel" data-live="${which}">${dome}</g>`);
  }
  parts.sort((a, b) => a.depth - b.depth);
  var extra = vents.join("") + parts.map((part) => part.svg).join("");
}
{
  const rings = levelsOf(HOOD.top, CH.top, 1).map((z) => atLevel(dPlan(capR(z)), z));
  const id = "head.chassis";
  const shape = record(A.solid(Fz(0, 0), turned(capR, HOOD.top, CH.top), { name: id, cut: [frontCut()] }));
  put("head", [0, 2, 196], `<g class="rb-inner">${Sv(convexPaths(loft(rings), P), { tone: "mid" })}</g>`, { name: id, shapes: [shape] });
  // The front details sit on the hood's flat front, seen through the window.
  // Kept inside the glass and clear of the brim, whose slant rises toward the front.
  const face = film("head.keyface", [0, CH.front + 2.75, 179.75], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [10, 2.75, 11.25]);
  const sides = [-1, 1].map((sign) => film("head.keyface", [sign * 13.2, CH.front + 1.2, 174.25], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [3.1, 1.2, 5.75]));
  put("head", [0, CH.front + 2.5, 178], `<g class="rb-inner">${extra}</g>`, { name: "head.keyface", shapes: [face, ...sides], bias: 0.4 });
}

// ---------------------------------------------------------------- gyro tower on the chassis deck (rides the head)
// The gyro tower, with the cap to itself: a brass bell flared like a trumpet's foot, a chrome
// heat-sink column of thin fins, a clear egg-shaped cage round the pilot lamp, and three ivory
// wire gyros on arms from knobs on the bell, turning in planetary fashion, so they read from
// across the room.
const TOWER = { z: CH.top, orbit: 7.2, gyroZ: CH.top + 5.6, gyroR: 4.5, lampZ: CH.top + 11.6, armRise: 30 };
// The whole tower is one item, drawn bottom to top so each fin sits over the column below it
// and under the column above it. The gyros orbit round it, so they are drawn live in two
// layers: those behind the column before it, those in front after it.
{
  const F = Fz(0, 0);
  const z0 = TOWER.z;
  const owner = "brain.tower";
  const parts = [];
  const shapes = [];
  const mat = (name, svg) => `<g class="rb-mat-${name}">${svg}</g>`;
  const disc = (from, to, r, name, tone = "mid") => {
    shapes.push(record(A.disc(F, from, to, r, { name, owner })));
    parts.push(mat(name === "brain.bell" ? "brass" : "chrome", k.solidSvg(G.disc(from, to, r, F, P), { tone })));
  };
  disc(z0, z0 + 0.4, 2.7, "brain.flange");
  // The bell: a trumpet foot narrowing to a waist, then a slight flare under the column.
  const waist = z0 + 2.8;
  const bellR = (z) => (z < waist ? 1.55 + 0.75 * ((waist - z) / (waist - z0 - 0.4)) ** 2 : 1.55 + 0.2 * ((z - waist) / (z0 + 4.8 - waist)) ** 2);
  const bellSlope = (z) => (z < waist ? (-1.5 * (waist - z)) / (waist - z0 - 0.4) ** 2 : (0.4 * (z - waist)) / (z0 + 4.8 - waist) ** 2);
  for (const [from, to] of [[z0 + 0.4, waist], [waist, z0 + 4.8]]) {
    const profile = S.sampled({ radius: bellR }, from, to, 10);
    shapes.push(record(A.solid(F, profile, { radius: bellR, name: "brain.bell", owner })));
    parts.push(mat("brass", k.solidSvg(G.solidOf(profile, F, P, { smooth: { slope: bellSlope, radius: bellR } }), { tone: "hi" })));
  }
  // Heat-sink fins on the column, widest a third of the way down, with the column between them.
  const finR = [2.2, 2.6, 3.1, 2.9, 2.7, 2.6, 2.5, 2.4, 2.3, 2.2];
  const fins = finR.map((r, index) => ({ z: TOWER.lampZ - 1.2 - index * 0.55, r })).filter((fin) => fin.z - 0.18 > z0 + 5).reverse();
  let at0 = z0 + 4.8;
  for (const fin of fins) {
    disc(at0, fin.z - 0.18, 1.1, "brain.shaft");
    disc(fin.z - 0.18, fin.z, fin.r, "brain.fin", "hi");
    at0 = fin.z;
  }
  disc(at0, TOWER.lampZ - 0.6, 1.1, "brain.shaft");
  disc(TOWER.lampZ - 0.6, TOWER.lampZ, 1.7, "brain.lamp-holder");
  // The pilot lamp: a frosted bulb in a clear egg cage.
  const bulb = [0, 0, TOWER.lampZ + 2.2];
  const egg = (sz) => {
    const t = (sz - TOWER.lampZ) / 5.4;
    return 2.7 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)) ** 0.85);
  };
  const meridians = [];
  for (let j = 0; j < 4; j++) {
    const a = (j / 4) * Math.PI * 2 + 0.4;
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const sz = TOWER.lampZ + 0.08 + (5.25 * i) / 24;
      pts.push([egg(sz) * Math.cos(a), egg(sz) * Math.sin(a), sz]);
    }
    meridians.push(path(pts));
  }
  const band = [];
  const zb = TOWER.lampZ + 2.1;
  for (let j = 0; j <= 48; j++) band.push([egg(zb) * Math.cos((j / 48) * Math.PI * 2), egg(zb) * Math.sin((j / 48) * Math.PI * 2), zb]);
  shapes.push(record(A.ball([0, 0, TOWER.lampZ + 2.8], 2.75, { name: "brain.lamp", owner })));
  parts.push(`<g data-live="pilot" class="rb-pilot">${Sv(G.sphereOf(bulb, 1.1, P), { tone: "hi" })}</g><path class="rb-cage" data-free="" d="${meridians.join("")}${path(band, true)}"/>`);
  // The gyros: recorded as balls with their arms.
  for (let index = 0; index < 3; index++) {
    const a = (index * 2 * Math.PI) / 3;
    const dir = [Math.cos(a), Math.sin(a), 0];
    const c = [TOWER.orbit * dir[0], TOWER.orbit * dir[1], TOWER.gyroZ];
    const knob = [1.75 * dir[0], 1.75 * dir[1], TOWER.gyroZ - 3];
    const armF = G.frameAlong(knob, G.sub3(c, knob));
    const reach = Math.hypot(...G.sub3(c, knob));
    shapes.push(record(A.ball(c, TOWER.gyroR, { name: "brain.gyro", owner })), record(A.disc(armF, 0, reach - TOWER.gyroR + 0.2, 0.25, { name: "brain.gyro", owner })));
  }
  put("brain", [0, 0, TOWER.gyroZ], `<g data-live="gyroBack"></g>${parts.join("")}<g data-live="gyroFront"></g>`, { name: owner, shapes, bias: 0.3 });
}

// ---------------------------------------------------------------- the clear shell and the ears
// The clear plastic covers the whole cap above the hood, and below it runs down the front
// to the brim as a window between the cheeks: the "odd shape" of Robby's dome.
const SH = S.SHELL;
let shellShape;
{
  const F = Fz(0, 0);
  const profile = S.sampled({ radius: S.shellRadius }, SH.base, SH.top, 36);
  const paths = G.solidOf(profile, F, P, { smooth: { slope: S.shellSlope, radius: S.shellRadius } });
  const onShell = (az, z) => {
    const r = S.shellRadius(z);
    return [r * Math.sin(az), r * Math.cos(az), z];
  };
  // Where the outline meets the top of the brim, at an angle from the front.
  const footOf = (az) => {
    let lo = SH.base;
    let hi = SH.base + 12;
    for (let index = 0; index < 30; index++) {
      const mid = (lo + hi) / 2;
      const p = onShell(az, mid);
      if (mid < brimTopZ(p[0], p[1])) lo = mid;
      else hi = mid;
    }
    return hi;
  };
  const cap = [at([0, 0, SH.top])];
  for (let i = 0; i <= 24; i++) {
    const z = HOOD.top + ((SH.top - HOOD.top) * i) / 24;
    for (let j = 0; j < 96; j++) cap.push(at(onShell((j / 96) * Math.PI * 2, z)));
  }
  const pane = [];
  for (let j = 0; j <= 32; j++) {
    const az = -HOOD.window + (2 * HOOD.window * j) / 32;
    const foot = footOf(az);
    for (let i = 0; i <= 16; i++) pane.push(at(onShell(az, foot + ((HOOD.top - foot) * i) / 16)));
  }
  const clip = k.pathOf(G.hullOf(cap), true) + k.pathOf(G.hullOf(pane), true);
  // The front window, exactly: its top arc, down one edge, along the brim, up the other. Its
  // plastic keeps the original's tint, so the lamps behind it read as they always have, while
  // the cap above stays clear for the gyros.
  const [w0, w1] = [-HOOD.window, HOOD.window];
  const windowEdge = [];
  for (let j = 0; j <= 32; j++) windowEdge.push(at(onShell(w0 + ((w1 - w0) * j) / 32, HOOD.top)));
  const f1 = footOf(w1);
  for (let i = 1; i < 16; i++) windowEdge.push(at(onShell(w1, HOOD.top - ((HOOD.top - f1) * i) / 16)));
  for (let j = 32; j >= 0; j--) {
    const az = w0 + ((w1 - w0) * j) / 32;
    windowEdge.push(at(onShell(az, footOf(az))));
  }
  const f0 = footOf(w0);
  for (let i = 1; i < 16; i++) windowEdge.push(at(onShell(w0, f0 + ((HOOD.top - f0) * i) / 16)));
  const capClip = k.pathOf(G.hullOf(cap), true);
  const windowClip = k.pathOf(windowEdge, true);
  const shine = [];
  for (let j = 0; j <= 18; j++) {
    const z = 174 + (j * 30) / 18;
    const r = S.shellRadius(z) - 0.05;
    shine.push(at([r * Math.sin(-0.62), r * Math.cos(-0.62), z]));
  }
  // Below the hood's top, everything outside the window belongs to the hood.
  const besideWindow = (side) => {
    const n = [side * Math.cos(HOOD.window), -Math.sin(HOOD.window), 0];
    return A.orientedBox(G.add3(G.mul3(n, 400), [0, 0, HOOD.top - 400]), [n, [0, 0, 1], G.cross3(n, [0, 0, 1])], [400, 400, 400], { name: "cut" });
  };
  const outer = profile.map(([z, r]) => [z, r]).concat([[SH.top, 0]]);
  const inner = [[SH.top - SH.wall, 0], ...[...profile].reverse().map(([z, r]) => [Math.min(z, SH.top - SH.wall), Math.max(0.1, r - SH.wall)])];
  shellShape = record(A.body(F, [...outer, ...inner], { name: "dome.shell", cut: [brimCut(), besideWindow(-1), besideWindow(1)] }));
  const glint = glossOn(F, S.shellRadius, S.shellSlope, SH.base + 6, SH.top - 0.6, { width: 0.1, floor: 0.2, spotTol: 0.008, kind: ' data-glass=""' });
  const peakZ = (() => {
    let best = SH.base;
    let most = -1;
    const [hu, hv, ha] = [G.dot3(HV, F.u), G.dot3(HV, F.v), G.dot3(HV, F.a)];
    for (let z = SH.base + 6; z < SH.top - 1; z += 0.25) {
      const k2 = S.shellSlope(z);
      const m = (Math.hypot(hu, hv) - ha * k2) / Math.sqrt(1 + k2 * k2);
      if (m > most) [most, best] = [m, z];
    }
    return best;
  })();
  const glintAz = Math.atan2(G.dot3(HV, F.v), G.dot3(HV, F.u));
  const glintAt = at(G.add3([0, 0, peakZ], G.add3(G.mul3(F.u, S.shellRadius(peakZ) * Math.cos(glintAz)), G.mul3(F.v, S.shellRadius(peakZ) * Math.sin(glintAz)))));
  const glass = Sv(paths, { tone: "hi" });
  const clips = `<clipPath id="rb-shell"><path d="${clip}"/></clipPath><clipPath id="rb-shell-cap"><path d="${capClip}"/></clipPath><clipPath id="rb-shell-window"><path d="${windowClip}"/></clipPath>`;
  put("dome", [0, 0, 196], `${clips}<g class="rb-glass"><g clip-path="url(#rb-shell-cap)">${glass}</g><g class="rb-glass-window" clip-path="url(#rb-shell-window)">${glass}</g><g clip-path="url(#rb-shell)">${glint}<path class="rb-glass-edge" d="${paths.outline}"/><path class="rb-glass-hair" d="${paths.outline}"/></g></g>` + k.fadeLineSvg(shine, { fade: [10, 10], tone: "mid", className: "rb-shine" }) + sparkle(glintAt, 9), { name: "dome.shell", shapes: [shellShape], bias: 2 });
}
// Ears: a bullet pod out of each side of the hood, with a collar at its root and a lens on its
// front for the eye lamp, carrying clear acrylic fins and a rotating chrome ring. One ear has a
// ring on a short horizontal shaft and two open petals standing up in a V; the other has a ring
// on an upright post and two swept blades pointing outward in a 30-degree V (the CAD's "30°").
const EAR = { z: 187, ring: 4.5, tube: 0.65, root: 20.2, pod: { from: 21.2, wide: 24.5, to: 30.5, R: 3.5, r0: 3, tip: 0.9 }, collar: { r: 3.8, t: 1 } };
const LANCET = [[0, 0], [0.8, -1.2], [2.8, -1.45], [4.8, -1.15], [5.8, -0.5], [6.1, 0], [5.8, 0.5], [4.8, 1.15], [2.8, 1.45], [0.8, 1.2]];
// A swept fin: a broad root, a leading edge raking back to a rounded tip, and a trailing edge
// that sweeps in under it.
const BLADE = [[0, -1.4], [0, 1.6], [2.5, 1.9], [5.6, 1.4], [6.6, 0.6], [6.8, 0], [6.4, -0.7], [3.2, -1.3]];
const EARS = {};
function clearFin(piece, F, poly, thick, host, name, inner = "") {
  const id = nameFor(name);
  const shape = record(A.prism(F, poly, -thick / 2, thick / 2, { name: id, cut: [host], seated: true }));
  const cx = poly.reduce((sum, p) => sum + p[0], 0) / poly.length;
  const cy = poly.reduce((sum, p) => sum + p[1], 0) / poly.length;
  put(piece, G.add3(F.o, G.add3(G.mul3(F.u, cx), G.mul3(F.v, cy))), Sv(G.prismOf(F, poly, -thick / 2, thick / 2, P), { tone: "hi", inner }), { name: id, shapes: [shape] });
}
for (const side of [-1, 1]) {
  const tag = side > 0 ? "R" : "L";
  const F = G.frameOf([0, 0, EAR.z], [side, 0, 0], [0, 1, 0], [0, 0, 1]);
  const pod = EAR.pod;
  discOn("head", F, EAR.root, EAR.root + EAR.collar.t, EAR.collar.r, { tone: "mid", name: `head.ear${tag}-collar`, cut: [hood] });
  const podBody = S.bulb({ R: pod.R, c: pod.wide, below: S.reach(pod.R, pod.r0, 2.2, pod.wide - pod.from), above: S.reach(pod.R, pod.tip, 2, pod.to - pod.wide), p: 2.1 });
  const hub = bodyOn("head", F, podBody, pod.from, pod.to, { tone: "hi", name: `head.ear${tag}-hub`, count: 18 });
  // The lens on the pod's front, with the eye lamp at its centre.
  const lensAt = [side * 24.3, 0, EAR.z];
  const FL = G.frameOf(lensAt, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const lens = record(A.disc(FL, 2.7, 3.7, 2.1, { name: `head.eye${tag}`, cut: [hub], seated: true }));
  put("head", G.add3(lensAt, [0, 3.7, 0]), `<g class="rb-mat-clear">${Sv(G.disc(2.7, 3.7, 2.1, FL, P), { tone: "hi" })}</g><path class="rb-eye" data-live="eye${tag}" d="${G.circleOf(FL, 3.7, 0.6, P)}"/>`, { name: `head.eye${tag}`, shapes: [lens], bias: 0.3 });
  if (side < 0) {
    // Petals standing up in a V behind the lens, one leaning out, one nearly upright.
    for (const [x, y, lean] of [[25.5, 0.6, 14], [26.6, -1.2, -2]]) {
      const up = [side * Math.sin(lean * DEG), 0, Math.cos(lean * DEG)];
      const FF = G.frameOf([side * x, y, EAR.z + 1.2], [0, 1, 0], up, G.cross3([0, 1, 0], up));
      const innerPoly = LANCET.map(([u, v]) => [1.2 + (u - 1.2) * 0.62 + 0.4, v * 0.5]);
      clearFin("head", FF, LANCET, 0.3, hub, `head.ear${tag}-fin`, Ln(k.pathOf(innerPoly.map(([u, v]) => at(G.add3(FF.o, G.add3(G.add3(G.mul3(FF.u, u), G.mul3(FF.v, v)), G.mul3(FF.a, 0.16))))), true), { tone: "mid" }));
    }
    discOn("head", F, pod.to - 0.2, pod.to + 1, 0.6, { tone: "mid", name: "head.earL-shaft" });
    discOn("head", F, pod.to + 1, pod.to + 2.2, 0.5, { tone: "hi", name: "head.earL-shaft" });
    const clampAt = pod.to + 2.2;
    slab("head", { x: -(clampAt + 1.2), y: -0.6, w: 1.2, d: 1.2, r: 0.15 }, EAR.z - 0.6, 1.2, { tone: "mid", steps: 2, bevel: 0.1, name: "head.earL-clamp" });
    EARS.L = { centre: [-(clampAt + 1.2 + EAR.tube + EAR.ring), 0, EAR.z], axis: [1, 0, 0], ring: EAR.ring, tube: EAR.tube };
  } else {
    // Blades out of the cone tip in a 30-degree V, a little apart so they do not touch.
    for (const [tilt, y] of [[15, 0.25], [-15, -0.25]]) {
      const out = [side * Math.cos(tilt * DEG), 0, Math.sin(tilt * DEG)];
      // Mirrored so both leading edges face out of the V.
      const flip = tilt > 0 ? 1 : -1;
      const FF = G.frameOf([side * 28.4, y, EAR.z], [0, 1, 0], out, G.mul3(G.cross3([0, 1, 0], out), flip * side));
      const innerPoly = BLADE.map(([u, v]) => [0.9 + u * 0.7, v * 0.5]);
      clearFin("head", FF, BLADE, 0.3, hub, `head.ear${tag}-fin`, Ln(k.pathOf(innerPoly.map(([u, v]) => at(G.add3(FF.o, G.add3(G.add3(G.mul3(FF.u, u), G.mul3(FF.v, v)), G.mul3(FF.a, 0.16))))), true), { tone: "mid" }));
    }
    // An upright post from the top of the pod, a clamp block, and the ring standing on it.
    const postX = 26.5;
    const top = EAR.z + podBody.radius(postX);
    const FP = Fz(side * postX, 0);
    discOn("head", FP, top - 0.6, 196.5, 0.55, { tone: "hi", name: "head.earR-post", cut: [hub] });
    slab("head", { x: side * postX - 0.65, y: -0.65, w: 1.3, d: 1.3, r: 0.15 }, 196.5, 1.3, { tone: "mid", steps: 2, bevel: 0.1, name: "head.earR-clamp" });
    EARS.R = { centre: [side * postX, 0, 196.5 + 1.3 + EAR.tube + EAR.ring], axis: [0, 0, 1], ring: EAR.ring, tube: EAR.tube };
  }
}
function earRing(ear, angle) {
  const a = ear.axis;
  const base = [0, 1, 0];
  const side = G.unit3(G.cross3(a, base));
  const n = G.add3(G.mul3(base, Math.cos(angle)), G.mul3(side, Math.sin(angle)));
  const inPlane = G.unit3(G.cross3(n, a));
  const points = [];
  for (let index = 0; index < 96; index++) {
    const t = (index / 96) * Math.PI * 2;
    points.push(G.add3(ear.centre, G.add3(G.mul3(a, ear.ring * Math.cos(t)), G.mul3(inPlane, ear.ring * Math.sin(t)))));
  }
  return points;
}
for (const which of ["L", "R"]) {
  const ear = EARS[which];
  const points = earRing(ear, 0);
  const shapes = [record(A.tube([...points, points[0]], ear.tube, { name: `head.ear${which}-ring`, limp: true }))];
  const svg = tubePieces([...points, points[0]], ear.tube, P, { closed: true, maxLength: 400, spacing: 0.5 }).map((part) => tubeSvg(part, { tone: "hi" })).join("");
  put("head", ear.centre, `<g data-live="ear${which}">${svg}</g>`, { name: `head.ear${which}-ring`, shapes, bias: 0.4 });
}
// ---------------------------------------------------------------- control console, gooseneck microphone, cable
// MGM's auxiliary control panel, a cabinet on wheels: Bonhams lists it at 17 x 23.75 x 39 in.
// A cable ran from it to Robby's heel; the off-camera actor's voice drove the neon through it.
{
  const C = CONSOLE;
  for (const [x, y] of byDepth(k.corners(C, 5))) {
    const FW = G.frameOf([x, y, PLATE_TOP + CASTER.r], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    for (const side of [-1, 1]) slab("stand", { x: x + side * 1.25 - 0.2, y: y - 1.1, w: 0.4, d: 2.2, r: 0.1 }, PLATE_TOP + CASTER.r, CAB_Z0 - 0.6 - PLATE_TOP - CASTER.r, { tone: "mid", steps: 2, bevel: 0, name: "stand.caster-fork" });
    const facing = G.dot3(FW.a, V) > 0.12;
    discOn("stand", FW, -0.85, 0.85, CASTER.r, { tone: "hi", name: "stand.caster-wheel", inner: facing ? Ln(G.circleOf(FW, 0.85, 1.6, P), { tone: "lo" }) : "", extra: facing ? Dots([at([x + 0.85, y, PLATE_TOP + CASTER.r])], { size: 0.5, tone: "hi" }) : "" });
    slab("stand", { x: x - 2.4, y: y - 2.4, w: 4.8, d: 4.8, r: 0.8 }, CAB_Z0 - 0.6, 0.6, { tone: "mid", steps: 3, bevel: 0, name: "stand.caster-plate" });
  }
  // Two-tone, like a 1955 appliance: a dark base band with chrome louvres, the cabinet in
  // turquoise enamel, and an ivory sloped top.
  const BASE = 9;
  const front = C.y + C.d;
  const f = (x, z) => at([x, front, z]);
  const louvres = [];
  for (let index = 0; index < 4; index++) {
    const z = CAB_Z0 + 1.6 + index * 1.7;
    louvres.push(k.pathOf(roundRect(C.x + 8, z, C.x + C.w - 8, z + 0.6, 0.3, 2).map(([x, zz]) => f(x, zz)), true));
  }
  slab("stand", C, CAB_Z0, BASE, { tone: "mid", steps: 4, bevel: 0.6, name: "stand.console-base", extra: `<path class="rb-louvre" d="${louvres.join("")}"/>` });
  const z0 = CAB_Z0 + BASE;
  const door = roundRect(C.x + 4, z0 + 4, C.x + C.w - 4, CAB_TOP - 6, 1.6).map(([x, z]) => f(x, z));
  const plate = roundRect(C.x + 14, CAB_TOP - 16, C.x + C.w - 14, CAB_TOP - 10, 0.6).map(([x, z]) => f(x, z));
  const rules = [k.segment([C.x + 17, front, CAB_TOP - 12], [C.x + 33, front, CAB_TOP - 12], P), k.segment([C.x + 17, front, CAB_TOP - 14], [C.x + 28, front, CAB_TOP - 14], P)].join("");
  const screws = [[C.x + 6.2, z0 + 6.2], [C.x + C.w - 6.2, z0 + 6.2], [C.x + 6.2, CAB_TOP - 8.2], [C.x + C.w - 6.2, CAB_TOP - 8.2]].map(([x, z]) => f(x, z));
  const side = C.x + C.w;
  const vents = [];
  for (let index = 0; index < 5; index++) {
    const y = C.y + 8 + index * 6;
    vents.push(k.pathOf(roundRect(y, CAB_TOP - 24, y + 1.2, CAB_TOP - 8, 0.6, 2).map(([yy, z]) => at([side, yy, z])), true));
  }
  const extra = Ln(k.pathOf(door, true), { tone: "lo" }) + Ln(k.pathOf(plate, true), { tone: "lo" }) + Ln(rules, { tone: "lo", free: true }) + Dots(screws, { size: 0.45 }) + Ln(vents.join(""), { tone: "lo" });
  slab("stand", C, z0, CAB_TOP - z0, { tone: "mid", steps: 4, bevel: 0.8, name: "stand.console", extra });
  slab("stand", { x: C.x + C.w / 2 - 5, y: front, w: 10, d: 1.4, r: 0.5 }, CAB_TOP - 23, 1.6, { tone: "hi", steps: 2, bevel: 0.2, name: "stand.console-handle" });
  const F = G.frameOf([C.x, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const wedge = [[C.y, CAB_TOP], [front, CAB_TOP], [front, CAB_TOP + 1.5], [C.y, CAB_HIGH]];
  prism("stand", F, wedge, 0, C.w, { tone: "mid", name: "stand.console-top" });
}
// The console's sloped panel, from its front edge (w = 0) to its back edge (w = 1).
const SLOPE = (() => {
  const y0 = CONSOLE.y + CONSOLE.d;
  const z0 = CAB_TOP + 1.5;
  const y1 = CONSOLE.y;
  const z1 = CAB_HIGH;
  const along = G.unit3([0, y1 - y0, z1 - z0]);
  const normal = G.unit3([0, z1 - z0, y0 - y1]);
  const point = (x, w) => [x, y0 + (y1 - y0) * w, z0 + (z1 - z0) * w];
  return { along, normal, point, len: Math.hypot(y1 - y0, z1 - z0) };
})();
const VU = { x0: CONSOLE.x + 6, x1: CONSOLE.x + 30, w0: 0.24, w1: 0.74, r: 9.4 };
{
  const n = SLOPE.normal;
  const lift = (p, h) => G.add3(p, G.mul3(n, h));
  const win = roundRect(VU.x0, VU.w0, VU.x1, VU.w1, 0.03, 3).map(([x, w]) => at(lift(SLOPE.point(x, w), 0.02)));
  const centre = SLOPE.point((VU.x0 + VU.x1) / 2, VU.w0 + 0.05);
  const onDial = (a, r) => at(lift(G.add3(centre, G.add3([Math.sin(a) * r, 0, 0], G.mul3(SLOPE.along, Math.cos(a) * r))), 0.05));
  const ticks = [];
  for (let index = 0; index <= 10; index++) {
    const a = (-45 + index * 9) * DEG;
    ticks.push(k.pathOf([onDial(a, index % 5 === 0 ? VU.r - 1.9 : VU.r - 1.2), onDial(a, VU.r)]));
  }
  const arc = [];
  for (let index = 0; index <= 20; index++) arc.push(onDial((-45 + index * 4.5) * DEG, VU.r));
  const red = [];
  for (let index = 0; index <= 6; index++) red.push(onDial((27 + index * 3) * DEG, VU.r));
  put("stand", lift(centre, 0.1), `<path class="rb-dial" d="${k.pathOf(win, true)}"/>` + Ln(k.pathOf(win, true), { tone: "lo" }) + Ln(k.pathOf(arc), { tone: "mid" }) + `<path class="iso-line" data-tone="red" d="${k.pathOf(red)}"/>` + Ln(ticks.join(""), { tone: "mid" }) + `<path class="iso-line" data-tone="lit" data-free="" data-live="needle" style="stroke-width:1" d=""/>` + Dots([at(lift(centre, 0.1))], { size: 0.8, tone: "hi" }), { name: "stand.vu", bias: 1, shapes: [film("stand.vu", lift(SLOPE.point((VU.x0 + VU.x1) / 2, (VU.w0 + VU.w1) / 2), 0.03), [[1, 0, 0], SLOPE.along, n], [(VU.x1 - VU.x0) / 2, ((VU.w1 - VU.w0) / 2) * SLOPE.len, 0.03])] });
  // Three knurled rheostats (neon, gyros, voice gain) and four toggles.
  for (const x of [CONSOLE.x + 37, CONSOLE.x + 45, CONSOLE.x + 53]) {
    const p = SLOPE.point(x, 0.5);
    const FK = G.frameAlong(p, n);
    const rib = G.ribsOf(FK, 0.4, 2.6, 2.7, 26, P, { fade: [0.1, 0.55] });
    const top = G.add3(p, G.mul3(n, 3.12));
    turnedOn("stand", FK, [[0, 3.2], [0.4, 3.2], [0.4, 2.7], [2.6, 2.7], [3.1, 2.2]], { tone: "hi", name: "stand.knob", extra: Faded(rib, { tone: "lo" }) + Ln(k.pathOf([at(top), at(G.add3(top, G.mul3(SLOPE.along, 1.8)))]), { tone: "hi", free: "end" }) });
  }
  for (const [index, x] of [CONSOLE.x + 36, CONSOLE.x + 42, CONSOLE.x + 48, CONSOLE.x + 54].entries()) {
    const p = SLOPE.point(x, 0.16);
    const FT = G.frameAlong(p, n);
    discOn("stand", FT, 0, 0.6, 1.4, { tone: "mid", name: "stand.toggle-nut" });
    const base = G.add3(p, G.mul3(n, 0.6));
    const tip = G.add3(G.add3(p, G.mul3(n, 3.8)), G.mul3(SLOPE.along, index % 2 ? 1.4 : -1.4));
    const FL = G.frameAlong(base, G.sub3(tip, base));
    turnedOn("stand", FL, [[0, 0.48], [3, 0.38], [3.3, 0.56, 1], [3.6, 0.22]], { tone: "hi", name: "stand.toggle" });
  }
  const lamp = SLOPE.point(CONSOLE.x + 54, 0.84);
  const FLp = G.frameAlong(lamp, n);
  discOn("stand", FLp, 0, 0.7, 1.8, { tone: "mid", name: "stand.lamp-bezel" });
  put("stand", G.add3(lamp, G.mul3(n, 0.8)), `<path class="rb-console-lamp" data-live="consoleLamp" d="${G.circleOf(FLp, 0.75, 1.2, P)}"/>`, { name: "stand.lamp", bias: 0.3, shapes: [record(A.disc(FLp, 0.7, 0.76, 1.2, { name: "stand.lamp" }))] });
}
// Gooseneck microphone on the panel.
{
  const n = SLOPE.normal;
  const base = SLOPE.point(CONSOLE.x + 40, 0.88);
  const FB = G.frameAlong(base, n);
  discOn("stand", FB, 0, 1.2, 2.6, { tone: "mid", name: "stand.mic-base" });
  const start = G.add3(base, G.mul3(n, 1.2));
  const route = G.fillet([start, G.add3(start, G.mul3(n, 6)), [start[0] - 1, start[1], start[2] + 26], [start[0] - 10, start[1] + 12, start[2] + 32]], 7, 12, { P, tube: 0.75 });
  tubeItems("stand", route, 0.75, { name: "stand.gooseneck", tone: "hi", rings: { pitch: 0.9, fade: [0.1, 0.55] } });
  const end = route[route.length - 1];
  const dir = G.tangentAlong(route, G.pathLength(route));
  const FM = G.frameAlong(end, dir);
  turnedOn("stand", FM, [[0, 1.3], [0.9, 1.3], [1.4, 2.3], [6, 2.3], [6.7, 1.8, 1], [7.4, 1]], { tone: "hi", name: "stand.mic", extra: Faded(G.ribsOf(FM, 1.4, 6, 2.3, 28, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) });
}
// The cable from the console's gland to the connector on Robby's right foot.
{
  // Connector on the outside of the right shoe, low on its side toward the heel.
  const shoeF = LEG_SHAPES[1].F;
  const along = -2;
  const lift = 15 * DEG;
  const footPoint = G.pointOf(shoeF, along, S.SHOE.radius(along), lift);
  const nrm = G.radialOf(shoeF, lift);
  const FC = G.frameAlong(footPoint, nrm);
  discOn("legs", FC, -0.4, 1.6, 1.6, { tone: "mid", name: "legs.connector", cut: [LEG_SHAPES[1].shoe] });
  const c0 = G.add3(footPoint, G.mul3(nrm, 1.6));
  // The console's gland, level with the run across the plate so the cable needs no sideways jog.
  const gland = [CONSOLE.x, c0[1] - 1.6, CAB_Z0 + 4];
  const FG = G.frameOf(gland, [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  discOn("stand", FG, 0, 1.6, 1.6, { tone: "mid", name: "stand.gland", extra: Ln(G.circleOf(FG, 1.6, 0.8, P), { tone: "lo" }) });
  const r = 0.62;
  const lie = PLATE_TOP + r;
  const g1 = [gland[0] - 1.6, gland[1], gland[2]];
  const route = G.fillet(
    [
      c0,
      G.add3(c0, G.mul3(nrm, 3)),
      [c0[0] + 5, c0[1] - 1, r + S.SOLE.h * 0],
      [DAIS_R + 2.2, c0[1] - 2.4, r],
      [DAIS_R + 2.2, c0[1] - 2.4, lie],
      [DAIS_R + 9, c0[1] - 1.6, lie],
      [g1[0] - 5, g1[1], lie],
      [g1[0] - 5, g1[1], gland[2]],
      g1,
    ],
    2.2,
    10,
    { P, tube: r },
  );
  tubeItems("stand", route, r, { name: "stand.cable", tone: "hi", limp: true, touch: ["stand.plate", "stand.dais"] });
}

// ---------------------------------------------------------------- settle, page
A.settle(R, P);
items.sort((a, b) => a.key - b.key);
// Materials: gunmetal lacquer for the body, chrome trim, a brass bell, a cream stand with a
// seafoam enamel console. Each sets the kit's tone tokens on its item (robby.css).
const MATERIALS = [
  [/^stand\.cable/, "gunmetal"],
  [/^stand\.console-top/, "cream"],
  [/^stand\.console-base/, "gunmetal"],
  [/^stand\.console(?=$|#)/, "enamel"],
  [/^stand\.(knob|toggle|caster|mic|gooseneck|gauge-rider|gauge-pointer|gauge-screw|lamp-bezel|gland|console-handle|foot-flange)/, "chrome"],
  [/^stand\./, "cream"],
  [/^dome\.shell/, ""],
  [/^head\.(chassis|keyface)/, ""],
  [/^brain\.tower/, ""],
  [/^(head\.ear[LR]-(ring|shaft|post|clamp)|head\.eye|chest\.(star|quad)-bezel|pelvis\.hip-(bolt|washer)|legs\.connector)/, "chrome"],
  [/^(brain\.bell|core\.)/, "brass"],
  [/^arm[LR]\.(hand|palm|finger|cuff)/, "rubber"],
  [/^head\.(ear[LR]-fin|comb-fin)/, "clear"],
  [/./, "gunmetal"],
];
const materialOf = (name) => MATERIALS.find(([pattern]) => pattern.test(name))[1];
const groups = items.map((item, index) => {
  const [mx, my, mz] = item.move;
  const material = materialOf(item.name);
  return `<g class="it${material ? ` rb-m-${material}` : ""}" data-piece="${item.piece}"${item.ride !== item.piece ? ` data-ride="${item.ride}"` : ""} data-k="${item.key.toFixed(2)}" data-m="${mx.toFixed(1)},${my.toFixed(1)},${mz.toFixed(1)}" data-i="${index}">${item.svg}</g>`;
});

const unit = (vector) => {
  const o = at([0, 0, 0]);
  const p = at(vector);
  return [p[0] - o[0], p[1] - o[1]];
};
const DATA = {
  W,
  H,
  P,
  V,
  KS,
  EX: unit([1, 0, 0]),
  EY: unit([0, 1, 0]),
  EZ: unit([0, 0, 1]),
  pieces: Object.fromEntries(Object.entries(PIECES).map(([id, piece]) => [id, { name: piece.name, say: piece.say }])),
  stagger: STAGGER,
  spring: SPRING,
  ears: EARS,
  tower: TOWER,
  flap: FLAP,
  hb: HB,
  lights: LIGHTS,
  keys: KEYS,
  keyrow: KEYROW,
  shell: { R: S.SHELL.R, base: S.SHELL.base, apex: S.SHELL.apex, q: S.SHELL.q, wall: S.SHELL.wall },
  vu: { centre: SLOPE.point((VU.x0 + VU.x1) / 2, VU.w0 + 0.06), along: SLOPE.along, normal: SLOPE.normal },
  drum: DRUM,
  cards: CARDS.length,
};

const LABEL =
  "Robby the Robot on a service riser: stacked-globe legs on oval shoes on a turntable dais, a squat pelvis with crank levers at the hips, a barrel chest with the beaded indicator panel and sample door, arms reaching forward from ball sockets, fat rubber rolls and a half ball ending in three-fingered rubber mittens, and a bullet head: a black hood with comb fins and two spinning ear rings, a clear cap over a gyro tower, and a clear front window over six relay keys, above a narrow brim lip and the blue neon voice tubes. A height gauge reads 214 cm; MGM's control console and microphone feed a cable into the right shoe.";

// The backdrop, after 1950s space painting (Bonestell, the Forbidden Planet one-sheet): a sky
// graded to a low horizon behind his knees, flat-topped mesas kept close to the sky's own
// value, Altair IV lit from one side with hairline rings, a moon, stars by night, a halo behind
// the dome so the gyros read, and a few glints. Behind everything, and it never moves.
{
  const head = at([0, 0, 200]);
  const hy = at([0, 0, 52])[1];
  const dy = hy - 800;
  const planet = { x: W - 118, y: 196, r: 158 };
  const rng = (() => {
    let seed = 7;
    return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  })();
  const high = [];
  const low = [];
  for (let index = 0; index < 110; index++) {
    const x = 20 + rng() * (W - 40);
    const y = 20 + rng() * (hy - 160);
    const r = 0.5 + rng() * rng() * 1.6;
    (y < 300 ? high : low).push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`);
  }
  const skyStops = [-300, hy - 330, hy - 120, hy, hy + 60, H + 300].map((y, i) => `<stop offset="${((y + 300) / (H + 600)).toFixed(4)}" class="rb-sky-${i}"/>`).join("");
  const mesas = {
    far: ["M0 830V786H22L30 774H78L86 786H118L124 779H170L178 788H214L222 770H252L262 790V830Z", "M856 830V788L866 778H912L918 768H948L956 784H960V830Z"],
    near: ["M0 830V796H40L48 788H96L104 798H150L156 792H196L204 800V830Z", "M548 830V792L556 784H586L592 790H632L640 798V830Z", "M880 830V798L888 790H932L938 796H960V830Z"],
  };
  // Mesa paths written with absolute commands; move each y by dy.
  const moved = (d) => d.replace(/([MLHV])([^MLHVZ]*)/g, (m, cmd, args) => {
    const n = args.trim().split(/[ ,]+/).filter(Boolean).map(Number);
    if (cmd === "H") return `H${n[0]}`;
    if (cmd === "V") return `V${(n[0] + dy).toFixed(1)}`;
    return `${cmd}${n[0]} ${(n[1] + dy).toFixed(1)}`;
  });
  const ringAt = (rx, ry) => `<ellipse cx="${planet.x}" cy="${planet.y}" rx="${rx}" ry="${ry}"/>`;
  const rings = `${ringAt(planet.r * 1.62, planet.r * 0.3)}${ringAt(planet.r * 1.78, planet.r * 0.33)}`;
  const band = `<path class="rb-ring-band" fill-rule="evenodd" d="M${planet.x - planet.r * 1.76} ${planet.y}a${planet.r * 1.76} ${planet.r * 0.326} 0 1 0 ${planet.r * 3.52} 0a${planet.r * 1.76} ${planet.r * 0.326} 0 1 0 ${-planet.r * 3.52} 0ZM${planet.x - planet.r * 1.64} ${planet.y}a${planet.r * 1.64} ${planet.r * 0.304} 0 1 0 ${planet.r * 3.28} 0a${planet.r * 1.64} ${planet.r * 0.304} 0 1 0 ${-planet.r * 3.28} 0Z"/>`;
  const tilt = `rotate(-14 ${planet.x} ${planet.y})`;
  const half = (upper) => `<rect x="${planet.x - planet.r * 2}" y="${upper ? planet.y - planet.r : planet.y}" width="${planet.r * 4}" height="${planet.r}"/>`;
  const limb = [];
  for (let a = 150; a <= 300; a += 5) limb.push([planet.x + (planet.r - 1) * Math.cos((a * Math.PI) / 180), planet.y + (planet.r - 1) * Math.sin((a * Math.PI) / 180)]);
  const burst = ([x, y], size) => {
    const rays = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const len = i % 2 ? size * 0.45 : size;
      rays.push(`M${x.toFixed(1)} ${y.toFixed(1)}L${(x + Math.cos(a) * len).toFixed(1)} ${(y + Math.sin(a) * len).toFixed(1)}`);
    }
    return `<path class="rb-burst" data-free="" d="${rays.join("")}"/><circle class="rb-burst-core" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6"/>`;
  };
  const ribbon = (pts, w0, w1, id) => {
    const top = [];
    const bottom = [];
    pts.forEach(([x, y], i) => {
      const t = i / (pts.length - 1);
      const w = (w0 + (w1 - w0) * t) * Math.sin(Math.PI * Math.min(0.92, Math.max(0.08, t)));
      top.push(`${x.toFixed(1)} ${(y - w / 2).toFixed(1)}`);
      bottom.unshift(`${x.toFixed(1)} ${(y + w / 2).toFixed(1)}`);
    });
    return `<path class="rb-wisp" fill="url(#${id})" d="M${top.join("L")}L${bottom.join("L")}Z"/>`;
  };
  const wispA = [[-20, 520], [80, 492], [180, 470], [270, 482], [360, 500], [460, 476], [560, 455]].map(([x, y]) => [x, y + dy]);
  const wispB = [[600, 600], [700, 590], [800, 578], [890, 568], [980, 560]].map(([x, y]) => [x, y + dy]);
  const wispGradient = (id, [x0], [x1]) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x1}" y2="0"><stop offset="0" class="rb-wisp-0"/><stop offset="0.5" class="rb-wisp-1"/><stop offset="1" class="rb-wisp-0"/></linearGradient>`;
  const sky = `<defs>
<linearGradient id="rb-sky" gradientUnits="userSpaceOnUse" x1="0" y1="-300" x2="0" y2="${H + 300}">${skyStops}</linearGradient>
<radialGradient id="rb-horizon"><stop offset="0" class="rb-horizon-0"/><stop offset="0.6" class="rb-horizon-1"/><stop offset="1" class="rb-horizon-2"/></radialGradient>
<radialGradient id="rb-planet" cx="32%" cy="30%" r="80%"><stop offset="0" class="rb-planet-a"/><stop offset="0.55" class="rb-planet-b"/><stop offset="1" class="rb-planet-c"/></radialGradient>
<radialGradient id="rb-halo"><stop offset="0" class="rb-halo-0"/><stop offset="1" class="rb-halo-1"/></radialGradient>
<filter id="rb-terminator" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
<clipPath id="rb-planet-disc"><circle cx="${planet.x}" cy="${planet.y}" r="${planet.r}"/></clipPath>
<clipPath id="rb-ring-back" transform="${tilt}">${half(true)}</clipPath><clipPath id="rb-ring-front" transform="${tilt}">${half(false)}</clipPath>
${wispGradient("rb-wisp-a", wispA[0], wispA.at(-1))}${wispGradient("rb-wisp-b", wispB[0], wispB.at(-1))}
</defs>
<g class="rb-sky" aria-hidden="true">
<rect class="rb-sky-fill" x="-300" y="-300" width="${W + 600}" height="${H + 600}" fill="url(#rb-sky)"/>
<g class="rb-stars rb-stars-high">${high.join("")}</g><g class="rb-stars rb-stars-low">${low.join("")}</g>
<g class="rb-wisps">${ribbon(wispA, 26, 8, "rb-wisp-a")}${ribbon(wispB, 18, 4, "rb-wisp-b")}</g>
<ellipse class="rb-horizon" cx="${W * 0.46}" cy="${hy}" rx="560" ry="150" fill="url(#rb-horizon)"/>
<g class="rb-mesa" data-far="">${mesas.far.map((d) => `<path d="${moved(d)}"/>`).join("")}</g>
<g class="rb-mesa">${mesas.near.map((d) => `<path d="${moved(d)}"/>`).join("")}</g>
<g transform="${tilt}" clip-path="url(#rb-ring-back)"><g class="rb-ring">${rings}</g>${band}</g>
<circle class="rb-planet-glow" cx="${planet.x}" cy="${planet.y}" r="${planet.r + 6}"/>
<circle class="rb-planet" cx="${planet.x}" cy="${planet.y}" r="${planet.r}" fill="url(#rb-planet)"/>
<g clip-path="url(#rb-planet-disc)"><circle class="rb-nightside" cx="${planet.x + planet.r * 0.42}" cy="${planet.y + planet.r * 0.22}" r="${planet.r}" filter="url(#rb-terminator)"/></g>
<path class="rb-limb" data-free="" d="${k.pathOf(limb)}"/>
<g transform="${tilt}" clip-path="url(#rb-ring-front)"><g class="rb-ring">${rings}</g>${band}</g>
<circle class="rb-moon" cx="${head[0] - 250}" cy="${head[1] - 205}" r="22"/>
<circle class="rb-dome-halo" cx="${head[0]}" cy="${head[1]}" r="120" fill="url(#rb-halo)"/>
${[[head[0] - 300, head[1] + 90, 7], [planet.x - 200, planet.y + 150, 7], [head[0] + 60, head[1] - 250, 6]].map(([x, y, size]) => sparkle([x, y], size, "rb-sky-glint")).join("")}
${burst([head[0] - 160, head[1] - 90], 10)}${burst([planet.x - 40, planet.y + planet.r + 40], 8)}
</g>`;
  back.unshift(sky);
}
const backSvg = k.figureSvg({ width: W, height: H, label: LABEL, body: back, className: "rb-back" });
const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg rb-front" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g class="rb-machine">${groups.join("")}</g></svg>`;

const kit = bundle();
const CSS = readFileSync(join(HERE, "robby.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const html = pageOf({ theme: THEME, css: CSS, stage: { backSvg, frontSvg }, script: kit + LIVE, pieces: PIECES });
const name = THEME === "light" ? "robby-light.html" : THEME === "dark" ? "robby-dark.html" : "robby.html";
writeFileSync(join(HERE, name), html);
// The same page without a document wrapper, for hosts that supply their own (claude.ai artifacts).
if (THEME === "auto") writeFileSync(join(HERE, "artifact.html"), pageOf({ theme: THEME, css: CSS, stage: { backSvg, frontSvg }, script: kit + LIVE, pieces: PIECES, fragment: true }));
console.log("wrote", name, `${(html.length / 1024).toFixed(0)} KB`, `${items.length} items`);

A.auditOrExit(R, P, { crowd: [] });
