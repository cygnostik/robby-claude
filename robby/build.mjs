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
import { hexaPaths, flapCorners, convexPaths } from "./hexa.mjs";
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
  dome: { name: "Clear shell and radar mast", say: "clear shell · Plexiglas cap and front window · 3 weeks in the model shop", move: [0, 0, 88] },
  head: { name: "Head: hood, voice tubes, keys and ears", say: "head · black hood · voice tubes · 6 relay keys · 2 rotating rings", move: [0, 0, 56] },
  brain: { name: "Gyro tower and pilot lamp", say: "gyro tower · 3 wire gyros in planetary orbit", move: null },
  armR: { name: "Arms and hands", say: "arm · ball socket · rubber rings · flanged wrist bulb · 3-finger rubber hand", move: [17.3, 13.6, 38] },
  armL: { name: "Left arm and hand", say: "arm · ball socket · rubber rings · flanged wrist bulb · 3-finger rubber hand", move: [-17.3, 13.6, 38] },
  chest: { name: "Chest barrel and indicator panel", say: "chest · analyzing hopper · star · quad light · 4 keys", move: [0, 0, 38] },
  core: { name: "Laboratory core (speculative)", say: "lab core · analyzer drum · relays D-12,000–18,500", move: [0, 0, 0] },
  pelvis: { name: "Pelvis and hip hinges", say: "pelvis · hinged at the hips · hides the operator's knees", move: [0, 0, 0] },
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
  let out = `<path class="rb-gloss" data-g="halo"${kind} d="${band(2.8)}"/><path class="rb-gloss" data-g="streak"${kind} d="${band(1)}"/>`;
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
    if (near.length > 2) out += `<path class="rb-gloss" data-g="spot"${kind} d="${k.pathOf(G.hullOf(near), true)}"/>`;
  }
  return out;
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
  return `<path class="rb-gloss" data-g="halo" d="${cap(0.62)}"/><path class="rb-gloss" data-g="spot" d="${cap(0.22)}"/>`;
}
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
function bodyOn(piece, F, body, z0, z1, { tone = "hi", seams = [], extra = "", bias = 0, name, count = 28, rims, hollow = 0, cut, owner, gloss } = {}) {
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
    shape = record(A.solid(F, profile, { radius: body.radius, name: id, owner, ...(cut ? { cut, seated: true } : {}) }));
  }
  const shine = piece === "stand" || gloss === false ? "" : glossOn(F, body.radius, body.slope, z0, z1, gloss || {});
  put(piece, G.add3(F.o, G.mul3(F.a, (z0 + z1) / 2)), Sv(paths, { tone, inner: inner ? Ln(inner, { tone: "faint" }) : "" }) + shine + extra, { bias, name: id, shapes: [shape, ...extraShapes] });
  return shape;
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

function prism(piece, F, polygon, s0, s1, { tone = "mid", extra = "", inner = "", bias = 0, name } = {}) {
  const id = nameFor(name ?? `${piece}.prism`);
  const shape = record(A.prism(F, polygon, s0, s1, { name: id }));
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
      bodyZ("legs", x, 0, g.body, g.z0, g.z1, { seams: [(g.z0 + g.z1) / 2], name: "legs.globe" });
    }
  }
}

// ---------------------------------------------------------------- pelvis and hip hinges
const HIP_Z = 96;
const pelvis = bodyZ("pelvis", 0, 0, S.PELVIS.body, S.PELVIS.z0, S.PELVIS.z1, { seams: [HIP_Z, 104], name: "pelvis.body", count: 30, gloss: { spotTol: 0.006, width: 0.11 } });
for (const side of [-1, 1]) {
  const F = G.frameOf([0, 0, HIP_Z], [side, 0, 0], [0, 1, 0], [0, 0, 1]);
  const a = 4.8;
  const start = (t) => Math.sqrt(Math.max(0, S.PELVIS.body.radius(HIP_Z + a * Math.sin(t)) ** 2 - (a * Math.cos(t)) ** 2));
  const s1 = 30.4;
  saddle("pelvis", F, a, start, s1, pelvis, { name: "pelvis.hip-pad" });
  const facing = G.dot3(F.a, V) > 0.12;
  discOn("pelvis", F, s1, s1 + 1.4, 5.6, { tone: "mid", name: "pelvis.hip-plate", extra: facing ? Dots(G.dotsOf(F, s1 + 1.4, 4.4, 6, P, { all: true }), { size: 0.42 }) : "" });
  discOn("pelvis", F, s1 + 1.4, s1 + 2.8, 2.8, { tone: "hi", name: "pelvis.hip-pivot", inner: facing ? Ln(G.circleOf(F, s1 + 2.8, 1.2, P), { tone: "lo" }) : "" });
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
const chest = bodyZ("chest", 0, 0, S.CHEST.body, S.CHEST.z0, S.CHEST.z1, { seams: [116, 140], name: "chest.barrel", count: 36, gloss: { spotTol: 0.004, rows: 60 }, hollow: { wall: 1.6, floor: [25, 28.4, 1.6], roof: 1.6 } });
// The barrel as a solid, used only to cut the pads seated on it.
const chestSolid = Object.assign(A.solid(Fz(0, 0), S.sampled(S.CHEST.body, S.CHEST.z0, S.CHEST.z1, 36), { radius: S.CHEST.body.radius, name: "chest.barrel" }), { piece: "chest", ride: "chest", move: PIECES.chest.move });
{
  const F = Fz(0, 0);
  const id = "chest.bearing";
  const shape = record(A.ring(F, S.BEARING.z0, S.BEARING.z1, S.BEARING.rIn, S.BEARING.rOut, { name: id }));
  put("chest", [0, 0, S.BEARING.z0 + 0.5], Sv(G.ringBand(S.BEARING.z0, S.BEARING.z1, S.BEARING.rIn, S.BEARING.rOut, F, P), { tone: "mid" }) + Dots(G.dotsOf(F, S.BEARING.z1, 23.5, 28, P, { all: true }), { size: 0.4 }), { name: id, shapes: [shape] });
}
// MGM's sheet calls the panel the "analyzing hopper & indicator panel": a box standing
// proud of the barrel (10.74 in wide on the CAD), with the hopper door on top.
const HB = { x0: -13.5, x1: 13.5, z0: 114, z1: 141, face: S.CHEST.R + 2.6 };
const DOOR = { x0: -9.5, x1: 9.5, z0: 131.8, z1: 138.6 };
const LIGHTS = { z: 125.4, r: 3.5, xs: [-5.4, 5.4] };
const KEYS = { xs: [-7.2, -2.4, 2.4, 7.2], w: 3.2, z0: 116.8, h: 3, d: 1 };
{
  const ring = [];
  ring.push([HB.x1, HB.face], [HB.x0, HB.face]);
  for (let index = 0; index <= 24; index++) {
    const x = HB.x0 + ((HB.x1 - HB.x0) * index) / 24;
    ring.push([x, Math.sqrt(S.CHEST.R ** 2 - x * x)]);
  }
  const f = (x, z) => at([x, HB.face, z]);
  const inset = roundRect(HB.x0 + 1.7, HB.z0 + 1.7, HB.x1 - 1.7, HB.z1 - 1.7, 1.3).map(([x, z]) => f(x, z));
  const ribs = [];
  for (let x = HB.x0 + 2.5; x <= HB.x1 - 2.4; x += 1.05) ribs.push(k.pathOf([f(x, HB.z0), f(x, HB.z0 + 1.7)]), k.pathOf([f(x, HB.z1 - 1.7), f(x, HB.z1)]));
  for (let z = HB.z0 + 2.5; z <= HB.z1 - 2.4; z += 1.05) ribs.push(k.pathOf([f(HB.x0, z), f(HB.x0 + 1.7, z)]), k.pathOf([f(HB.x1 - 1.7, z), f(HB.x1, z)]));
  const door = roundRect(DOOR.x0, DOOR.z0, DOOR.x1, DOOR.z1, 0.8).map(([x, z]) => f(x, z));
  const voidPath = k.pathOf(door, true);
  const keyWell = roundRect(-9.6, KEYS.z0 - 0.6, 9.6, KEYS.z0 + KEYS.h + 0.6, 0.8).map(([x, z]) => f(x, z));
  const body = Ln(k.pathOf(inset, true), { tone: "lo" }) + Ln(ribs.join(""), { tone: "lo" }) + `<path class="rb-cavity" d="${voidPath}"/>` + Ln(voidPath, { tone: "lo" }) + Ln(k.pathOf(keyWell, true), { tone: "faint" });
  const id = "chest.heartbox";
  const shape = record(A.extruded(ring, HB.z0, HB.z1 - HB.z0, { name: id, cut: [chestSolid], seated: true }));
  put("chest", [0, HB.face - 1, (HB.z0 + HB.z1) / 2], Sv(k.extrude(ring, HB.z0, HB.z1 - HB.z0, P, { convex: false, bevel: 0.5 }), { tone: "hi" }) + body, { name: id, shapes: [shape], bias: 0.5 });
}
const FLAP = { hinge: [0, HB.face, DOOR.z0 + 0.2], along: [1, 0, 0], up: [0, 0, 1], out: [0, 1, 0], width: DOOR.x1 - DOOR.x0 - 0.4, height: DOOR.z1 - DOOR.z0 - 0.4, thick: 0.6 };
{
  const corners = flapCorners({ ...FLAP, angle: 0 });
  const paths = hexaPaths(corners, P);
  const slot = roundRect(-3.4, DOOR.z1 - 2.4, 3.4, DOOR.z1 - 1.6, 0.4).map(([x, z]) => at([x, HB.face + 0.6, z]));
  const id = "chest.door";
  const shape = record(A.box([DOOR.x0 + 0.2, HB.face, DOOR.z0 + 0.2], [DOOR.x1 - 0.2, HB.face + 0.6, DOOR.z1 - 0.2], { name: id }));
  put("chest", [0, HB.face + 0.3, (DOOR.z0 + DOOR.z1) / 2], `<g data-live="door">${Sv(paths, { tone: "hi" })}${Ln(k.pathOf(slot, true), { tone: "lo" })}</g>`, { name: id, shapes: [shape], bias: 1 });
}
for (const [index, x] of LIGHTS.xs.entries()) {
  const F = G.frameOf([x, HB.face, LIGHTS.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const kind = index === 0 ? "star" : "quad";
  discOn("chest", F, 0, 0.8, LIGHTS.r, { tone: "mid", name: `chest.${kind}-bezel`, bias: 1 });
  const lens = Ln(G.circleOf(F, 0.8, LIGHTS.r - 0.8, P), { tone: "lo" });
  put("chest", G.add3(F.o, [0, 0.9, 0]), lens + `<g data-live="${kind}"></g>`, { name: `chest.${kind}`, bias: 1.2, shapes: [record(A.disc(F, 0.8, 0.86, LIGHTS.r - 0.4, { name: `chest.${kind}` }))] });
}
{
  const shapes = [];
  const parts = KEYS.xs.map((x, index) => {
    const plan = { x: x - KEYS.w / 2, y: HB.face, w: KEYS.w, d: KEYS.d, r: 0.3 };
    shapes.push(record(A.slab(plan, KEYS.z0, KEYS.h, { name: "chest.keys" }, 2)));
    return `<g data-key="${index}">${Sv(k.slabOf(plan, KEYS.z0, KEYS.h, P, 2, 0.2), { tone: "hi" })}</g>`;
  });
  put("chest", [0, HB.face + 0.5, KEYS.z0 + 1.5], parts.join(""), { name: "chest.keys", bias: 1.1, shapes });
}
// Shoulder pods at the barrel's front corners (R6.50 in on the CAD): round domes on a ribbed
// collar, each with a ball socket in its face: MGM's "flexible sleeve & ball socket".
const POD = { z: 128, az: 52 * DEG, a: 15, s1: 38.4, wide: 42.4, R: 16.5, face: 52, faceR: 8.5, socket: 1.2, ball: 6.5 };
POD.body = S.bulb({ R: POD.R, c: POD.wide, below: S.reach(POD.R, POD.a, 2.4, POD.wide - POD.s1), above: S.reach(POD.R, POD.faceR, 2.4, POD.face - POD.wide), p: 2.4 });
const shoulderDir = (side) => [side * Math.sin(POD.az), Math.cos(POD.az), 0];
for (const side of [-1, 1]) {
  const d = shoulderDir(side);
  const F = G.frameOf([0, 0, POD.z], d, G.unit3([d[1], -d[0], 0]), [0, 0, 1]);
  const start = (t) => Math.sqrt(Math.max(0, S.CHEST.body.radius(POD.z + POD.a * Math.sin(t)) ** 2 - (POD.a * Math.cos(t)) ** 2));
  saddle("chest", F, POD.a, start, POD.s1, chestSolid, { name: "chest.shoulder-pad" });
  const facing = G.dot3(F.a, V) > 0.12;
  // The collar's ribs, round the pod's swelling root.
  const ribs = [39.3, 40.2, 41.1].map((s) => G.arcOf(F, s, POD.body.radius(s), P, { slope: POD.body.slope(s) })).join("");
  bodyOn("chest", F, POD.body, POD.s1, POD.face, { tone: "hi", name: "chest.shoulder", count: 30, extra: Ln(ribs, { tone: "lo" }) });
  discOn("chest", F, POD.face, POD.face + POD.socket, 7.2, { tone: "mid", name: "chest.socket", inner: facing ? Ln(G.circleOf(F, POD.face + POD.socket, 5, P), { tone: "lo" }) : "", extra: facing ? Dots(G.dotsOf(F, POD.face + POD.socket, 6.2, 10, P, { all: true }), { size: 0.4 }) : "" });
}

// ---------------------------------------------------------------- arms: ball, rings, flanged wrist bulb, hand
// Extended forward and a little down, as in the studio stills and on the poster: a ball in the
// socket, three rubber rings stepping down from the shoulder, a big wrist bulb with a flange
// round its widest point, the chrome tool adaptor, and a rubber hand: a palm block with two
// flat, jointed fingers side by side and a thumb under them.
const ARM = { ball: 7.2, root: 3.6, rings: [8.4, 7.8, 7.2], ring: 4.2, neck: 0.86, bulb: { R: 8.6, rise: 2.4, flange: { r: 9.8, t: 0.9 }, dome: 6.6, to: 3.6 }, collar: { r: 3.6, length: 1.6 } };
const HAND = {
  palm: { length: 4.5, poly: roundRect(-5.2, -3.6, 5.2, 3.8, 2.4) },
  finger: roundRect(-2.35, -1.5, 2.35, 1.5, 0.9),
  digits: [
    { u: -2.55, v: 1.4, length: 10, turn: [-6, 0] },
    { u: 2.55, v: 1.4, length: 10, turn: [6, 0] },
    { u: 0, v: -1.75, length: 6.2, turn: [0, -14] },
  ],
};
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
  const d = shoulderDir(side);
  const centre = G.add3([0, 0, POD.z], G.mul3(d, POD.face + POD.socket + ARM.ball));
  const ball = ballAt(piece, centre, ARM.ball, { tone: "hi", name: `${piece}.ball` });
  const dir = G.unit3([side * 0.34, 0.86, -0.36]);
  const across = G.unit3(G.cross3([0, 0, 1], dir));
  const AF = G.frameOf(centre, dir, across, G.cross3(dir, across));
  // The first ring flares out of the ball's face; the others step down from it.
  let s = Math.sqrt(ARM.ball ** 2 - ARM.root ** 2) - 0.3;
  ARM.rings.forEach((R, index) => {
    const h = S.reach(R, R * ARM.neck, 2.4, ARM.ring / 2);
    const below = index === 0 ? S.reach(R, ARM.root, 2.4, ARM.ring / 2 + 0.4) : h;
    const c = s + (index === 0 ? ARM.ring / 2 + 0.4 : ARM.ring / 2);
    const length = index === 0 ? ARM.ring + 0.4 : ARM.ring;
    const body = S.bulb({ R, c, below, above: h, p: 2.4 });
    bodyOn(piece, AF, body, s, s + length, { tone: "hi", name: `${piece}.sleeve`, count: 16, ...(index === 0 ? { cut: [ball] } : {}) });
    s += length;
  });
  // The wrist bulb, in two halves either side of its flange.
  const B = ARM.bulb;
  const rise = S.bulb({ R: B.R, c: s + B.rise, below: S.reach(B.R, ARM.rings.at(-1) * ARM.neck, 2.2, B.rise), above: 1, p: 2.2 });
  bodyOn(piece, AF, rise, s, s + B.rise, { tone: "hi", name: `${piece}.wrist-bulb`, count: 12 });
  s += B.rise;
  discOn(piece, AF, s, s + B.flange.t, B.flange.r, { tone: "hi", name: `${piece}.flange` });
  s += B.flange.t;
  const dome = S.bulb({ R: B.R, c: s, below: 1, above: S.reach(B.R, B.to, 2, B.dome), p: 2 });
  bodyOn(piece, AF, dome, s, s + B.dome, { tone: "hi", name: `${piece}.wrist-dome`, count: 20 });
  s += B.dome;
  discOn(piece, AF, s, s + ARM.collar.length, ARM.collar.r, { tone: "mid", name: `${piece}.wrist` });
  s += ARM.collar.length;
  const palm = record(A.prism(AF, HAND.palm.poly, s, s + HAND.palm.length, { name: `${piece}.palm` }));
  put(piece, G.add3(AF.o, G.mul3(AF.a, s + HAND.palm.length / 2)), Sv(G.prismOf(AF, HAND.palm.poly, s, s + HAND.palm.length, P), { tone: "hi" }), { name: `${piece}.palm`, shapes: [palm] });
  const root = s + HAND.palm.length - 1.2;
  for (const [index, digit] of HAND.digits.entries()) {
    const [tu, tv] = digit.turn.map((deg) => Math.tan(deg * DEG));
    const fdir = G.unit3(G.add3(AF.a, G.add3(G.mul3(AF.u, tu), G.mul3(AF.v, tv))));
    const o = G.add3(G.add3(G.add3(AF.o, G.mul3(AF.a, root)), G.mul3(AF.u, digit.u)), G.mul3(AF.v, digit.v));
    const fu = G.unit3(G.sub3(AF.u, G.mul3(fdir, G.dot3(AF.u, fdir))));
    const FF = G.frameOf(o, fdir, fu, G.cross3(fdir, fu));
    const id = `${piece}.finger${index}`;
    const grooves = [0.42, 0.72].map((t) => grooveOf(FF, HAND.finger, digit.length * t)).join("");
    const shape = record(A.prism(FF, HAND.finger, 0, digit.length, { name: id, cut: [palm], seated: true }));
    put(piece, G.add3(o, G.mul3(fdir, digit.length / 2)), Sv(G.prismOf(FF, HAND.finger, 0, digit.length, P), { tone: "hi", inner: Ln(grooves, { tone: "mid" }) }), { name: id, shapes: [shape] });
  }
}

// ---------------------------------------------------------------- head: voice collar, slanted brim, key chassis
// The collar and the shell meet on one sloping plane, high at the front and low at the
// back, so the voice tubes show under the brim at the front only.
const onCollar = (theta, z, r = S.COLLAR.r) => [r * Math.sin(theta), r * Math.cos(theta), z];
const NEON = { a: 50 * DEG, column: 56 * DEG, step: 1.15 };
const SLANT_F = G.frameOf(S.SLANT_O, S.SLANT_N, [1, 0, 0], G.cross3(S.SLANT_N, [1, 0, 0]));
const brimTop = G.add3(S.SLANT_O, G.mul3(S.SLANT_N, S.BRIM.thick));
const brimTopZ = (x, y) => brimTop[2] - ((x - brimTop[0]) * S.SLANT_N[0] + (y - brimTop[1]) * S.SLANT_N[1]) / S.SLANT_N[2];
{
  const n = 144;
  const ring = Array.from({ length: n }, (_, j) => (j / n) * Math.PI * 2);
  const low = ring.map((t) => onCollar(t, S.COLLAR.z0));
  const high = ring.map((t) => onCollar(t, S.slantZ(S.COLLAR.r * Math.cos(t))));
  const faces = ring.map((_, j) => [low[j], low[(j + 1) % n], high[(j + 1) % n], high[j]]);
  faces.push(high, [...low].reverse());
  const paths = convexPaths(faces, P);
  // Voice tubes: horizontal neon arcs across the front, each running until it meets the
  // slanted top edge or the plated columns at either side.
  const tubes = [];
  let index = 0;
  for (let z = S.COLLAR.z0 + 0.9; z < S.slantZ(S.COLLAR.r) - 0.25; z += NEON.step) {
    const c = ((z - S.SLANT.back) / ((S.SLANT.front - S.SLANT.back) / (2 * S.SLANT.span)) - S.SLANT.span) / S.COLLAR.r;
    const limit = Math.min(NEON.a, Math.acos(Math.max(-1, Math.min(1, c))));
    if (limit < 0.05) continue;
    const points = [];
    for (let j = 0; j <= 30; j++) points.push(onCollar(-limit + (2 * limit * j) / 30, z, S.COLLAR.r + 0.05));
    tubes.push(`<path class="rb-neon" data-tube="${index++}" d="${path(points)}"/>`);
  }
  const columns = [];
  for (const sign of [-1, 1]) {
    for (const t of [NEON.a, NEON.column]) {
      const top = S.slantZ(S.COLLAR.r * Math.cos(t));
      columns.push(path([onCollar(sign * t, S.COLLAR.z0, S.COLLAR.r + 0.05), onCollar(sign * t, top, S.COLLAR.r + 0.05)]));
    }
    const top = S.slantZ(S.COLLAR.r * Math.cos(NEON.column));
    for (let z = S.COLLAR.z0 + 0.7; z < top - 0.2; z += 0.9) {
      const points = [];
      for (let j = 0; j <= 4; j++) points.push(onCollar(sign * (NEON.a + ((NEON.column - NEON.a) * j) / 4), z, S.COLLAR.r + 0.05));
      columns.push(path(points));
    }
  }
  const id = "head.collar";
  const shape = record(A.cylinder(0, 0, S.COLLAR.r, S.COLLAR.z0, S.slantZ(S.COLLAR.r) + 0.5 - S.COLLAR.z0, { name: id, cut: [beyond(S.SLANT_O, G.mul3(S.SLANT_N, -1))] }));
  put("head", [0, 0, 158], Sv(paths, { tone: "hi" }) + `<g data-live="neon">${tubes.join("")}</g>` + Ln(columns.join(""), { tone: "mid" }), { name: id, shapes: [shape] });
}
{
  const id = "head.brim";
  const shape = record(A.ring(SLANT_F, 0, S.BRIM.thick, S.BRIM.rIn, S.BRIM.rOut, { name: id }));
  put("head", G.add3(S.SLANT_O, G.mul3(S.SLANT_N, 0.7)), Sv(G.ringBand(0, S.BRIM.thick, S.BRIM.rIn, S.BRIM.rOut, SLANT_F, P, { bevel: 0.4 }), { tone: "mid" }) + Dots(G.dotsOf(SLANT_F, S.BRIM.thick, 24.6, 36, P, { all: true }), { size: 0.4 }), { name: id, shapes: [shape] });
}
// The hood and the key chassis: one D-shaped column, flat across the front behind the
// window. Below HOOD.top its round back is the hood, flush with the head's outline; above,
// it stands back from the clear cap and carries the gyro deck. A cheek fills each side of
// the window, between the window's edge and the flat front, and carries an ear.
const CH = S.CHASSIS;
const HOOD = S.HOOD;
const KEYROW = { xs: [-8.75, -5.25, -1.75, 1.75, 5.25, 8.75], y: CH.front + 0.8, top: 184.8, bottom: 182, stem: 179.6, coils: [176.8, 177.65, 178.5, 179.35], lamps: 10.7, lampZ: 180.6, ind: 187.2 };
const hoodR = (z) => S.shellRadius(z) - 0.05;
const capR = (z) => S.shellRadius(z) - 0.8;
const HOOD_LOW = brimTopZ(0, -S.SHELL.R) - 0.2;
const HOOD_FLAT = brimTopZ(0, S.SHELL.R) + 0.2;
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
const onBrim = (plan) => plan.map(([x, y]) => [x, y, brimTopZ(x, y)]);
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
  hood = record(A.solid(Fz(0, 0), [[HOOD_LOW, hoodR(HOOD_LOW)], ...turned(hoodR, HOOD_LOW + 1.5, HOOD.top)], { name: id, cut: [brimCut(), frontCut()] }));
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
const COMB = { z0: 168.8, pitch: 1.9, count: 8, out: 3.6, half: 0.9, thick: 0.4 };
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
  const frame = roundRect(-11.6, 175.8, 11.6, 185.8, 0.8).map(([x, z]) => f(x, z));
  const vents = [];
  for (const sign of [-1, 1]) for (let j = 0; j < 4; j++) {
    const x = sign * (7.4 + j * 1.3);
    vents.push(k.pathOf(roundRect(x - 0.32, 188.6, x + 0.32, 191.8, 0.3, 2).map(([xx, z]) => f(xx, z)), true));
  }
  const coils = [];
  const keys = KEYROW.xs.map((x, index) => {
    for (const z of KEYROW.coils) {
      const ringPts = [];
      for (let j = 0; j <= 20; j++) {
        const a = (j / 20) * Math.PI * 2;
        ringPts.push([x + 0.85 * Math.cos(a), KEYROW.y + 0.85 * Math.sin(a), z]);
      }
      coils.push(path(ringPts, true));
    }
    const tab = roundRect(x - 1.05, KEYROW.bottom, x + 1.05, KEYROW.top, 0.3, 2).map(([xx, z]) => at([xx, KEYROW.y, z]));
    const stem = path([[x, KEYROW.y, KEYROW.bottom], [x, KEYROW.y + 0.85, KEYROW.coils[3]]]);
    return `<g data-rocker="${index}"><path class="iso-line" data-tone="mid" d="${stem}"/><path class="rb-key" d="${k.pathOf(tab, true)}"/></g>`;
  });
  const lampOf = (x, which) => {
    const pts = [];
    for (let j = 0; j < 20; j++) pts.push(f(x + 0.95 * Math.cos((j / 20) * Math.PI * 2), KEYROW.lampZ + 0.95 * Math.sin((j / 20) * Math.PI * 2)));
    return `<path class="rb-lamp" data-live="${which}" d="${k.pathOf(pts, true)}"/>`;
  };
  const indicators = KEYROW.xs.map((x, index) => {
    const pts = [];
    for (let j = 0; j < 16; j++) pts.push(f(x + 0.55 * Math.cos((j / 16) * Math.PI * 2), KEYROW.ind + 0.55 * Math.sin((j / 16) * Math.PI * 2)));
    return `<path class="rb-ind" data-ind="${index}" d="${k.pathOf(pts, true)}"/>`;
  });
  const extra = Ln(k.pathOf(frame, true), { tone: "lo" }) + Ln(vents.join(""), { tone: "lo" }) + Ln(coils.join(""), { tone: "mid" }) + keys.join("") + lampOf(-KEYROW.lamps, "lampL") + lampOf(KEYROW.lamps, "lampR") + indicators.join("");
  const rings = levelsOf(HOOD.top, CH.top, 1).map((z) => atLevel(dPlan(capR(z)), z));
  const id = "head.chassis";
  const shape = record(A.solid(Fz(0, 0), turned(capR, HOOD.top, CH.top), { name: id, cut: [frontCut()] }));
  put("head", [0, 2, 196], `<g class="rb-inner">${Sv(convexPaths(loft(rings), P), { tone: "mid" })}</g>`, { name: id, shapes: [shape] });
  // The front details sit on the hood's flat front, seen through the window.
  const face = film("head.keyface", [0, CH.front + 1, 183], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [windowX, 1, 11]);
  put("head", [0, CH.front + 0.6, 183], `<g class="rb-inner">${extra}</g>`, { name: "head.keyface", shapes: [face], bias: 0.4 });
}

// ---------------------------------------------------------------- gyro tower on the chassis deck (rides the head)
const TOWER = { z: CH.top, orbit: 5.5, gyroZ: 205.4, gyroR: 2.4, lampZ: 208.2, apex: [0, 8.1, CH.top + 6.8] };
{
  const F = Fz(0, 0);
  discOn("brain", F, TOWER.z, TOWER.z + 1, 4.6, { tone: "mid", name: "brain.flange" });
  bodyZ("brain", 0, 0, S.bellAt(TOWER.z + 1), TOWER.z + 1, TOWER.z + 5.6, { name: "brain.bell", count: 16 });
  discOn("brain", F, TOWER.z + 5.6, TOWER.gyroZ - 0.7, 0.55, { tone: "mid", name: "brain.shaft" });
  discOn("brain", F, TOWER.gyroZ - 0.7, TOWER.gyroZ + 0.7, 1.3, { tone: "mid", name: "brain.carrier" });
  discOn("brain", F, TOWER.gyroZ + 0.7, TOWER.lampZ, 0.55, { tone: "mid", name: "brain.shaft" });
  const shapes = [0, 1, 2].flatMap((index) => {
    const a = (index * 2 * Math.PI) / 3;
    const dir = [Math.cos(a), Math.sin(a), 0];
    const spoke = G.frameAlong([0, 0, TOWER.gyroZ], dir);
    return [
      record(A.ball([TOWER.orbit * dir[0], TOWER.orbit * dir[1], TOWER.gyroZ], TOWER.gyroR, { name: `brain.gyro#${index}` })),
      record(A.disc(spoke, 1.2, TOWER.orbit - TOWER.gyroR + 0.1, 0.12, { name: `brain.gyro#${index}` })),
    ];
  });
  put("brain", [0, 0, TOWER.gyroZ], `<g data-live="gyro"></g>`, { name: "brain.gyros", shapes, bias: 0.3 });
  turnedOn("brain", F, [[TOWER.lampZ, 1.6], [TOWER.lampZ + 0.8, 1.6], [TOWER.lampZ + 1.2, 1.2]], { tone: "mid", name: "brain.lamp-holder" });
  const bulb = [0, 0, TOWER.lampZ + 1.2 + 1.3];
  const lampShape = record(A.ball(bulb, 1.3, { name: "brain.lamp" }));
  put("brain", bulb, `<g data-live="pilot" class="rb-pilot">${Sv(G.sphereOf(bulb, 1.3, P), { tone: "hi" })}</g>`, { name: "brain.lamp", shapes: [lampShape], bias: 0.2 });
  const apex = TOWER.apex;
  slab("brain", { x: -0.5, y: apex[1] + 0.35, w: 1, d: 0.8, r: 0.2 }, TOWER.z, apex[2] + 0.6 - TOWER.z, { tone: "mid", steps: 2, bevel: 0, name: "brain.varm-post" });
  const vShapes = [-1, 1].map((side) => {
    const lean = 22 * DEG;
    const down = [side * Math.sin(lean), 0, -Math.cos(lean)];
    const across = [Math.cos(lean), 0, side * Math.sin(lean)];
    return record(A.orientedBox(G.add3(apex, G.add3(G.mul3(down, 3.1), [0, 0.15, 0])), [down, across, [0, 1, 0]], [3.1, 0.9, 0.15], { name: "brain.varms" }));
  });
  put("brain", G.add3(apex, [0, 3, -3]), `<g data-live="varms"></g>`, { name: "brain.varms", bias: 0.5, shapes: vShapes });
}

// ---------------------------------------------------------------- the clear shell, the ears and the radar mast
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
  put("dome", [0, 0, 196], `<clipPath id="rb-shell"><path d="${clip}"/></clipPath><g class="rb-glass" clip-path="url(#rb-shell)">${Sv(paths, { tone: "hi" })}${glint}</g>` + k.fadeLineSvg(shine, { fade: [10, 10], tone: "mid", className: "rb-shine" }) + sparkle(glintAt, 9), { name: "dome.shell", shapes: [shellShape], bias: 2 });
}
// Ears: a cone hub out of each side of the hood with a blue eye lamp on its front and two
// whisker spikes, and a rotating ring: on a short horizontal shaft on the left, on a post
// tilted 30° on the right (CAD). The left whiskers stand up in a V, the right point outward.
const EAR = { z: 187, ring: 4.6, tube: 0.55 };
const EARS = {};
for (const side of [-1, 1]) {
  const tag = side > 0 ? "R" : "L";
  const F = G.frameOf([0, 0, EAR.z], [side, 0, 0], [0, 1, 0], [0, 0, 1]);
  const owner = `head.ear${tag}`;
  discOn("head", F, hoodR(EAR.z) - 0.6, 24, 2.4, { tone: "mid", name: `head.ear${tag}-stub`, cut: [hood] });
  const hub = turnedOn("head", F, [[24, 2.6], [26.2, 2.3], [28.6, 1.4]], { tone: "hi", name: `head.ear${tag}-hub`, smooth: false, owner });
  const lensAt = [side * 25.2, 0, EAR.z];
  const FL = G.frameOf(lensAt, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const lens = record(A.disc(FL, 2.1, 2.7, 0.85, { name: `head.eye${tag}`, cut: [hub], seated: true }));
  put("head", G.add3(lensAt, [0, 2.6, 0]), Sv(G.disc(2.1, 2.7, 0.85, FL, P), { tone: "mid" }) + `<path class="rb-eye" data-live="eye${tag}" d="${G.circleOf(FL, 2.7, 0.6, P)}"/>`, { name: `head.eye${tag}`, shapes: [lens], bias: 0.3 });
  const whiskers = side < 0 ? [8, 34].map((a) => [[-25, 0, EAR.z], [-Math.sin(a * DEG), 0, Math.cos(a * DEG)]]) : [-30, 30].map((a) => [[26.6, 0, EAR.z], [Math.cos(a * DEG), Math.sin(a * DEG), 0]]);
  for (const [root, dir] of whiskers) {
    const FS = G.frameAlong(root, G.unit3(dir));
    const profile = [[2.2, 0.4], [7.8, 0.12]];
    const id = nameFor(`head.ear${tag}-spike`);
    const shape = record(A.solid(FS, profile, { name: id, owner, cut: [hub], seated: true }));
    put("head", G.add3(FS.o, G.mul3(FS.a, 5)), Sv(G.solidOf(profile, FS, P, { smooth: false }), { tone: "hi" }), { name: id, shapes: [shape] });
  }
  if (side < 0) {
    discOn("head", F, 28.6, 30.6, 0.75, { tone: "hi", name: "head.earL-shaft" });
    ballAt("head", [-31.75, 0, EAR.z], 1.3, { tone: "mid", name: "head.earL-ball", owner: "head.earL-tip" });
    EARS.L = { centre: [-(31.75 + 1.3 + EAR.tube + EAR.ring), 0, EAR.z], axis: [1, 0, 0], ring: EAR.ring, tube: EAR.tube };
  } else {
    const elbow = [28.6 + 1.3, 0, EAR.z];
    ballAt("head", elbow, 1.3, { tone: "mid", name: "head.earR-elbow", owner: "head.earR-post" });
    const dir = [Math.sin(30 * DEG), 0, Math.cos(30 * DEG)];
    const FP = G.frameAlong(elbow, dir);
    const s0 = Math.sqrt(1.3 ** 2 - 0.7 ** 2);
    discOn("head", FP, s0, s0 + 8, 0.7, { tone: "hi", name: "head.earR-post", owner: "head.earR-post" });
    const topBall = G.add3(elbow, G.mul3(dir, s0 + 8 + Math.sqrt(1.4 ** 2 - 0.7 ** 2)));
    ballAt("head", topBall, 1.4, { tone: "mid", name: "head.earR-hub", owner: "head.earR-post" });
    EARS.R = { centre: G.add3(topBall, G.mul3(dir, 1.4 + EAR.tube + EAR.ring)), axis: dir, ring: EAR.ring, tube: EAR.tube };
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
let MAST;
{
  const F = Fz(0, 0);
  discOn("dome", F, SH.top, SH.top + 0.8, 2, { tone: "mid", name: "dome.gland" });
  const from = SH.top + 0.8;
  MAST = { from, to: from + 0.8, stroke: 22, r: 0.5 };
  const rod = G.rodOut(F, MAST.from, MAST.to, MAST.r, P, { stroke: MAST.stroke });
  put("dome", [0, 0, MAST.to], `<clipPath id="rb-mast"><path d="${rod.clip}"/></clipPath><g clip-path="url(#rb-mast)"><g data-live="mast">${Sv(rod.paths, { tone: "hi" })}</g></g><g data-live="radar"></g>`, { name: "dome.mast", shapes: [record(A.disc(F, MAST.from, MAST.to, MAST.r, { name: "dome.mast" }))], bias: 0.5 });
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
  const front = C.y + C.d;
  const f = (x, z) => at([x, front, z]);
  const door = roundRect(C.x + 4, CAB_Z0 + 5, C.x + C.w - 4, CAB_TOP - 6, 1.6).map(([x, z]) => f(x, z));
  const louvres = [];
  for (let index = 0; index < 6; index++) {
    const z = CAB_Z0 + 9 + index * 2.6;
    louvres.push(k.pathOf(roundRect(C.x + 12, z, C.x + C.w - 12, z + 1, 0.5, 2).map(([x, zz]) => f(x, zz)), true));
  }
  const plate = roundRect(C.x + 14, CAB_TOP - 16, C.x + C.w - 14, CAB_TOP - 10, 0.6).map(([x, z]) => f(x, z));
  const rules = [k.segment([C.x + 17, front, CAB_TOP - 12], [C.x + 33, front, CAB_TOP - 12], P), k.segment([C.x + 17, front, CAB_TOP - 14], [C.x + 28, front, CAB_TOP - 14], P)].join("");
  const screws = [[C.x + 6.2, CAB_Z0 + 7.2], [C.x + C.w - 6.2, CAB_Z0 + 7.2], [C.x + 6.2, CAB_TOP - 8.2], [C.x + C.w - 6.2, CAB_TOP - 8.2]].map(([x, z]) => f(x, z));
  const side = C.x + C.w;
  const vents = [];
  for (let index = 0; index < 5; index++) {
    const y = C.y + 8 + index * 6;
    vents.push(k.pathOf(roundRect(y, CAB_TOP - 24, y + 1.2, CAB_TOP - 8, 0.6, 2).map(([yy, z]) => at([side, yy, z])), true));
  }
  const extra = Ln(k.pathOf(door, true), { tone: "lo" }) + Ln(louvres.join(""), { tone: "lo" }) + Ln(k.pathOf(plate, true), { tone: "lo" }) + Ln(rules, { tone: "lo", free: true }) + Dots(screws, { size: 0.45 }) + Ln(vents.join(""), { tone: "lo" });
  slab("stand", C, CAB_Z0, CAB_TOP - CAB_Z0, { tone: "mid", steps: 4, bevel: 0.8, name: "stand.console", inner: Ln(k.sideSeam(C, CAB_Z0 + 2.4, P, 4), { tone: "faint" }), extra });
  slab("stand", { x: C.x + C.w - 7, y: front, w: 2, d: 1.4, r: 0.4 }, CAB_Z0 + 30, 14, { tone: "hi", steps: 2, bevel: 0.2, name: "stand.console-handle" });
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
  [/^stand\.(console|console-top)\b/, "enamel"],
  [/^stand\.(knob|toggle|caster|mic|gooseneck|gauge-rider|gauge-pointer|gauge-screw|lamp-bezel|gland|console-handle|foot-flange)/, "chrome"],
  [/^stand\./, "cream"],
  [/^dome\.shell/, ""],
  [/^head\.(chassis|keyface)/, ""],
  [/^brain\.(lamp|varms)\b/, ""],
  [/^(dome\.(gland|mast)|head\.ear[LR]-(ring|shaft|ball|elbow|post|spike)|head\.eye|head\.comb-fin|chest\.(socket|keys|bearing|heartbox|star|quad)|arm[LR]\.wrist(?=$|#)|brain\.(shaft|carrier|flange|lamp-holder|varm-post|gyro)|pelvis\.hip-(plate|pivot)|legs\.connector)/, "chrome"],
  [/^(brain\.bell|core\.)/, "brass"],
  [/^arm[LR]\.(palm|finger)/, "rubber"],
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
  mast: MAST,
  shell: { R: S.SHELL.R, base: S.SHELL.base, apex: S.SHELL.apex, q: S.SHELL.q, wall: S.SHELL.wall },
  vu: { centre: SLOPE.point((VU.x0 + VU.x1) / 2, VU.w0 + 0.06), along: SLOPE.along, normal: SLOPE.normal },
  drum: DRUM,
  cards: CARDS.length,
};

const LABEL =
  "Robby the Robot on a service riser: stacked-globe legs on oval shoes on a turntable dais, a squat pelvis, a barrel chest with the indicator panel and sample door, arms reaching forward from ball sockets, rubber rings and a flanged wrist bulb ending in three-fingered rubber hands, and a bullet head: a black hood with comb fins and two spinning ear rings, a clear cap over a gyro tower, and a clear front window over six relay keys, above a wide brim and the blue neon voice tubes. A height gauge reads 214 cm; MGM's control console and microphone feed a cable into the right shoe.";

// The backdrop: Altair IV and its ring hanging behind Robby, a small moon, stars (the dark
// theme shows them) and a few glints, in the manner of a 1950s poster. Behind everything.
{
  const head = at([0, 0, 196]);
  const planet = { x: head[0] + 300, y: head[1] - 175, r: 122 };
  const rng = (() => {
    let seed = 7;
    return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  })();
  const stars = [];
  for (let index = 0; index < 90; index++) {
    const x = 20 + rng() * (W - 40);
    const y = 20 + rng() * (head[1] + 260);
    const r = 0.5 + rng() * rng() * 1.6;
    stars.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`);
  }
  const ring = (rx, ry) => `<ellipse cx="${planet.x}" cy="${planet.y}" rx="${rx}" ry="${ry}" transform="rotate(-14 ${planet.x} ${planet.y})"/>`;
  const sky = `<defs><radialGradient id="rb-planet" cx="38%" cy="32%" r="75%"><stop offset="0" class="rb-planet-a"/><stop offset="0.65" class="rb-planet-b"/><stop offset="1" class="rb-planet-c"/></radialGradient><radialGradient id="rb-glow" cx="50%" cy="50%" r="50%"><stop offset="0.55" class="rb-glow-a"/><stop offset="1" class="rb-glow-b"/></radialGradient></defs>
<g class="rb-sky" aria-hidden="true"><g class="rb-stars">${stars.join("")}</g>
<circle class="rb-planet-glow" cx="${planet.x}" cy="${planet.y}" r="${planet.r * 1.45}" fill="url(#rb-glow)"/>
<g class="rb-ring rb-ring-back">${ring(planet.r * 1.75, planet.r * 0.34)}</g>
<circle class="rb-planet" cx="${planet.x}" cy="${planet.y}" r="${planet.r}" fill="url(#rb-planet)"/>
<path class="rb-ring-front" d="M ${planet.x - planet.r * 1.75} ${planet.y} A ${planet.r * 1.75} ${planet.r * 0.34} 0 0 0 ${planet.x + planet.r * 1.75} ${planet.y} L ${planet.x + planet.r * 1.75 - 3} ${planet.y} A ${planet.r * 1.75 - 3} ${planet.r * 0.34 - 3} 0 0 1 ${planet.x - planet.r * 1.75 + 3} ${planet.y} Z" transform="rotate(-14 ${planet.x} ${planet.y})"/>
<circle class="rb-moon" cx="${head[0] - 250}" cy="${head[1] - 205}" r="22"/>
${[[head[0] - 160, head[1] - 90, 10], [planet.x + 110, planet.y + 175, 8], [head[0] - 300, head[1] + 90, 7], [planet.x - 200, planet.y - 40, 7], [head[0] + 60, head[1] - 250, 6]].map(([x, y, size]) => sparkle([x, y], size, "rb-sky-glint")).join("")}</g>`;
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
