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
import { hexaPaths, flapCorners } from "./hexa.mjs";
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
  dome: { name: "Dome and radar mast", say: "dome · Plexiglas · 3 weeks in the model shop", move: [0, 0, 74] },
  head: { name: "Head: voice grille, relay keys, ears", say: "head · 9 neon tubes · 6 relay keys · 2 scanners", move: [0, 0, 56] },
  brain: { name: "Gyro tower and pilot lamp", say: "gyro tower · 3 wire gyros in planetary orbit", move: null },
  armR: { name: "Arms and claws", say: "arm · bellows forearm · 3-finger claw", move: [20, 20, 30] },
  armL: { name: "Left arm and claw", say: "arm · bellows forearm · 3-finger claw", move: [-20, 20, 30] },
  chest: { name: "Chest barrel and heart box", say: "chest · sample door · star · quad light · 5 keys", move: [0, 0, 38] },
  core: { name: "Laboratory core (speculative)", say: "lab core · analyzer drum · relays D-12,000–18,500", move: [0, 0, 0] },
  pelvis: { name: "Pelvis and hip hinges", say: "pelvis · hinged at the hips · hides the operator's knees", move: [0, 0, 0] },
  legs: { name: "Legs and feet", say: "legs · 3 globes a side on a foot · cable in the right foot", move: [0, 0, 0] },
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
    [-17, 0, 211 + 74],
    [17, 0, 211 + 74],
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
function bodyZ(piece, x, y, body, z0, z1, { tone = "hi", seams = [], extra = "", bias = 0, name, count = 28, rims, hollow = 0 } = {}) {
  const extraShapes = [];
  const F = Fz(x, y);
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
    shape = record(A.solid(F, profile, { radius: body.radius, name: id }));
  }
  put(piece, [x, y, (z0 + z1) / 2], Sv(paths, { tone, inner: inner ? Ln(inner, { tone: "faint" }) : "" }) + extra, { bias, name: id, shapes: [shape, ...extraShapes] });
  return shape;
}

function discOn(piece, F, s0, s1, r, { tone = "hi", extra = "", inner = "", bias = 0, name, lit = false, cut, seated, owner } = {}) {
  const id = nameFor(name ?? `${piece}.disc`);
  const shape = record(A.disc(F, s0, s1, r, { name: id, owner, ...(cut ? { cut, seated: seated ?? true } : {}) }));
  put(piece, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), Sv(G.disc(s0, s1, r, F, P), { tone, lit, inner }) + extra, { bias, name: id, shapes: [shape] });
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
  put(piece, centre, Sv(G.sphereOf(centre, r, P), { tone }) + extra, { bias, name: id, shapes: [shape] });
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

// ---------------------------------------------------------------- legs and feet
const LEG_SHAPES = {};
for (const side of [-1, 1]) {
  const x = side * S.LEG_X;
  const foot = bodyZ("legs", x, 0, S.FOOT.body, S.FOOT.z0, S.FOOT.z1, { seams: [6], name: `legs.foot${side > 0 ? "R" : "L"}` });
  LEG_SHAPES[side] = { foot };
  for (const part of S.LEG_STACK.parts) {
    if (part.neck) {
      const F = Fz(x, 0);
      discOn("legs", F, part.neck[0], part.neck[1], S.NECK.r, { tone: "mid", name: "legs.neck" });
    } else {
      const g = part.globe;
      bodyZ("legs", x, 0, g.body, g.z0, g.z1, { seams: [(g.z0 + g.z1) / 2], name: "legs.globe" });
    }
  }
}

// ---------------------------------------------------------------- pelvis and hip hinges
const pelvis = bodyZ("pelvis", 0, 0, S.PELVIS.body, S.PELVIS.z0, S.PELVIS.z1, { seams: [90, 100], name: "pelvis.body", count: 30 });
for (const side of [-1, 1]) {
  const F = G.frameOf([0, 0, 90], [side, 0, 0], [0, 1, 0], [0, 0, 1]);
  const a = 4.6;
  const start = (t) => Math.sqrt(Math.max(0, S.PELVIS.body.radius(90 + a * Math.sin(t)) ** 2 - (a * Math.cos(t)) ** 2));
  saddle("pelvis", F, a, start, 26.8, pelvis, { name: "pelvis.hip-pad" });
  const facing = G.dot3(F.a, V) > 0.12;
  discOn("pelvis", F, 26.8, 28.2, 5.4, { tone: "mid", name: "pelvis.hip-plate", extra: facing ? Dots(G.dotsOf(F, 28.2, 4.2, 6, P, { all: true }), { size: 0.42 }) : "" });
  discOn("pelvis", F, 28.2, 29.6, 2.6, { tone: "hi", name: "pelvis.hip-pivot", inner: facing ? Ln(G.circleOf(F, 29.6, 1.1, P), { tone: "lo" }) : "" });
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

// ---------------------------------------------------------------- chest barrel, bearing, heart box
const chest = bodyZ("chest", 0, 0, S.CHEST.body, S.CHEST.z0, S.CHEST.z1, { seams: [114, 140], name: "chest.barrel", count: 36, hollow: { wall: 1.6, floor: [20.6, 25, 1.6], roof: 1.6 } });
// The barrel as a solid, used only to cut the pads seated on it.
const chestSolid = Object.assign(A.solid(Fz(0, 0), S.sampled(S.CHEST.body, S.CHEST.z0, S.CHEST.z1, 36), { radius: S.CHEST.body.radius, name: "chest.barrel" }), { piece: "chest", ride: "chest", move: PIECES.chest.move });
{
  const F = Fz(0, 0);
  const id = "chest.bearing";
  const shape = record(A.ring(F, S.BEARING.z0, S.BEARING.z1, S.BEARING.rIn, S.BEARING.rOut, { name: id }));
  put("chest", [0, 0, S.BEARING.z0 + 0.6], Sv(G.ringBand(S.BEARING.z0, S.BEARING.z1, S.BEARING.rIn, S.BEARING.rOut, F, P), { tone: "mid" }) + Dots(G.dotsOf(F, S.BEARING.z1, 18, 24, P, { all: true }), { size: 0.4 }), { name: id, shapes: [shape] });
}
const HB = { x0: -12.5, x1: 12.5, z0: 115, z1: 139, face: 31.2 };
const DOOR = { x0: -8, x1: 8, z0: 128.6, z1: 136.4 };
const LIGHTS = { z: 123.2, r: 3.2, xs: [-4.8, 4.8] };
const KEYS = { xs: [-8, -4, 0, 4, 8], w: 2.4, z0: 116.6, h: 2.6, d: 0.9 };
{
  const ring = [];
  ring.push([HB.x1, HB.face], [HB.x0, HB.face]);
  for (let index = 0; index <= 24; index++) {
    const x = HB.x0 + ((HB.x1 - HB.x0) * index) / 24;
    ring.push([x, Math.sqrt(S.CHEST.body.radius(127) ** 2 - x * x)]);
  }
  const f = (x, z) => at([x, HB.face, z]);
  const inset = roundRect(HB.x0 + 1.6, HB.z0 + 1.6, HB.x1 - 1.6, HB.z1 - 1.6, 1.2).map(([x, z]) => f(x, z));
  const ribs = [];
  for (let x = HB.x0 + 2.4; x <= HB.x1 - 2.3; x += 1.05) {
    ribs.push(k.pathOf([f(x, HB.z0), f(x, HB.z0 + 1.6)]), k.pathOf([f(x, HB.z1 - 1.6), f(x, HB.z1)]));
  }
  for (let z = HB.z0 + 2.4; z <= HB.z1 - 2.3; z += 1.05) {
    ribs.push(k.pathOf([f(HB.x0, z), f(HB.x0 + 1.6, z)]), k.pathOf([f(HB.x1 - 1.6, z), f(HB.x1, z)]));
  }
  const door = roundRect(DOOR.x0, DOOR.z0, DOOR.x1, DOOR.z1, 0.8).map(([x, z]) => f(x, z));
  const voidPath = k.pathOf(door, true);
  const keyWell = roundRect(-10, KEYS.z0 - 0.6, 10, KEYS.z0 + KEYS.h + 0.6, 0.8).map(([x, z]) => f(x, z));
  const body =
    Ln(k.pathOf(inset, true), { tone: "lo" }) +
    Ln(ribs.join(""), { tone: "lo" }) +
    `<path class="rb-cavity" d="${voidPath}"/>` +
    Ln(voidPath, { tone: "lo" }) +
    Ln(k.pathOf(keyWell, true), { tone: "faint" });
  const id = "chest.heartbox";
  const shape = record(A.extruded(ring, HB.z0, HB.z1 - HB.z0, { name: id, cut: [chestSolid], seated: true }));
  put("chest", [0, HB.face - 1, (HB.z0 + HB.z1) / 2], Sv(k.extrude(ring, HB.z0, HB.z1 - HB.z0, P, { convex: false, bevel: 0.5 }), { tone: "hi" }) + body, { name: id, shapes: [shape], bias: 0.5 });
}
// Sample door: a jaw-like flap hinged on its lower edge.
const FLAP = { hinge: [0, HB.face, DOOR.z0 + 0.2], along: [1, 0, 0], up: [0, 0, 1], out: [0, 1, 0], width: DOOR.x1 - DOOR.x0 - 0.4, height: DOOR.z1 - DOOR.z0 - 0.4, thick: 0.6 };
{
  const corners = flapCorners({ ...FLAP, angle: 0 });
  const paths = hexaPaths(corners, P);
  const slot = roundRect(-3, DOOR.z1 - 2.4, 3, DOOR.z1 - 1.6, 0.4).map(([x, z]) => at([x, HB.face + 0.6, z]));
  const id = "chest.door";
  const shape = record(A.box([DOOR.x0 + 0.2, HB.face, DOOR.z0 + 0.2], [DOOR.x1 - 0.2, HB.face + 0.6, DOOR.z1 - 0.2], { name: id }));
  put("chest", [0, HB.face + 0.3, (DOOR.z0 + DOOR.z1) / 2], `<g data-live="door">${Sv(paths, { tone: "hi" })}${Ln(k.pathOf(slot, true), { tone: "lo" })}</g>`, { name: id, shapes: [shape], bias: 1 });
}
for (const [index, x] of LIGHTS.xs.entries()) {
  const F = G.frameOf([x, HB.face, LIGHTS.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const kind = index === 0 ? "star" : "quad";
  discOn("chest", F, 0, 0.8, LIGHTS.r, { tone: "mid", name: `chest.${kind}-bezel`, bias: 1 });
  const lens = kind === "star" ? Ln(G.circleOf(F, 0.8, 2.3, P), { tone: "lo" }) : Ln(G.circleOf(F, 0.8, 2.6, P), { tone: "lo" });
  put("chest", G.add3(F.o, [0, 0.9, 0]), lens + `<g data-live="${kind}"></g>`, { name: `chest.${kind}`, bias: 1.2, shapes: [record(A.disc(F, 0.8, 0.86, LIGHTS.r - 0.4, { name: `chest.${kind}` }))] });
}
{
  const shapes = [];
  const parts = KEYS.xs.map((x, index) => {
    const plan = { x: x - KEYS.w / 2, y: HB.face, w: KEYS.w, d: KEYS.d, r: 0.3 };
    shapes.push(record(A.slab(plan, KEYS.z0, KEYS.h, { name: "chest.keys" }, 2)));
    return `<g data-key="${index}">${Sv(k.slabOf(plan, KEYS.z0, KEYS.h, P, 2, 0.2), { tone: "hi" })}</g>`;
  });
  put("chest", [0, HB.face + 0.5, KEYS.z0 + 1.3], parts.join(""), { name: "chest.keys", bias: 1.1, shapes });
}
// Shoulder drums, seated on the barrel; the arm sockets sit on the drums.
const DRUM_SH = { z: 127, a: 12.5, s0: 31.4, s1: 44.6, arm: 37, socket: 5 };
const ARM_DIR = [0, Math.cos(-20 * DEG), Math.sin(-20 * DEG)];
const ARM_PAD = 13.8;
const drums = {};
for (const side of [-1, 1]) {
  const F = G.frameOf([0, 0, DRUM_SH.z], [side, 0, 0], [0, 1, 0], [0, 0, 1]);
  saddle("chest", F, DRUM_SH.a, 29.5, DRUM_SH.s0, chestSolid, { name: "chest.shoulder-pad" });
  const profile = [[DRUM_SH.s0, DRUM_SH.a], [42, DRUM_SH.a], [43.2, 12, 1], [44, 11, 1], [DRUM_SH.s1, 9.6]];
  const facing = G.dot3(F.a, V) > 0.12;
  drums[side] = turnedOn("chest", F, profile, { tone: "hi", name: "chest.shoulder", inner: Ln(G.arcOf(F, 34.6, DRUM_SH.a, P), { tone: "faint" }), extra: facing ? Dots(G.dotsOf(F, DRUM_SH.s1, 7.2, 8, P, { all: true }), { size: 0.42 }) : "" });
  if (facing) discOn("chest", F, DRUM_SH.s1, DRUM_SH.s1 + 1.2, 4.2, { tone: "mid", name: "chest.shoulder-boss", extra: Ln(G.circleOf(F, DRUM_SH.s1 + 1.2, 2, P), { tone: "lo" }) });
  // Arm socket pad on the drum's front.
  const centre = [side * DRUM_SH.arm, 0, DRUM_SH.z];
  const AF = G.frameAlong(centre, ARM_DIR);
  saddle("chest", AF, DRUM_SH.socket, DRUM_SH.a, ARM_PAD, drums[side], { name: "chest.arm-socket" });
}

// ---------------------------------------------------------------- arms (bellows forearm, three-finger claw)
for (const side of [1, -1]) {
  const piece = side > 0 ? "armR" : "armL";
  const centre = [side * DRUM_SH.arm, 0, DRUM_SH.z];
  const AF = G.frameOf(centre, ARM_DIR, [side, 0, 0], G.cross3(ARM_DIR, [side, 0, 0]));
  discOn(piece, AF, ARM_PAD, ARM_PAD + 1.6, DRUM_SH.socket, { tone: "mid", name: `${piece}.collar` });
  const bellows = [];
  const n = 16;
  for (let index = 0; index <= n; index++) bellows.push([ARM_PAD + 1.6 + (index * 8.8) / n, index % 2 ? 4 : 4.8]);
  turnedOn(piece, AF, bellows, { tone: "hi", name: `${piece}.bellows`, smooth: false });
  const wrist = ARM_PAD + 1.6 + 8.8;
  discOn(piece, AF, wrist, wrist + 1.6, 4.5, { tone: "mid", name: `${piece}.wrist` });
  const palm = [[wrist + 1.6, 4.2], [wrist + 3.2, 4.2], [wrist + 4.4, 3.4, 1], [wrist + 5, 2.4]];
  turnedOn(piece, AF, palm, { tone: "hi", name: `${piece}.palm` });
  const face = wrist + 5;
  for (const angle of [90, 210, 330]) {
    const owner = `${piece}.digit${angle}`;
    const radial = G.radialOf(AF, angle * DEG);
    const base = G.add3(G.pointOf(AF, face, 1.3, angle * DEG), G.mul3(AF.a, 1.15));
    ballAt(piece, base, 1.15, { tone: "mid", name: `${piece}.knuckle`, owner });
    const dir = G.unit3(G.add3(G.mul3(AF.a, Math.cos(16 * DEG)), G.mul3(radial, Math.sin(16 * DEG))));
    const FF = G.frameAlong(base, dir);
    const start = Math.sqrt(1.15 ** 2 - 0.95 ** 2);
    turnedOn(piece, FF, [[start, 0.95], [start + 1.4, 0.95], [start + 5.2, 0.55], [start + 6, 0.32]], { tone: "hi", name: `${piece}.finger`, owner });
  }
}

// ---------------------------------------------------------------- head: lip, flared brim with the voice grille
const HEAD_X = (theta, z, radius, inset = 0) => [(radius(z) - inset) * Math.sin(theta), (radius(z) - inset) * Math.cos(theta), z];
{
  const F = Fz(0, 0);
  discOn("head", F, S.LIP.z0, S.LIP.z1, S.LIP.r, { tone: "mid", name: "head.lip" });
}
const GRILLE = { a: 0.62, z0: 153.6, z1: 165, tubes: 9 };
{
  const r = S.FLARE.body.radius;
  const outline = [];
  for (let index = 0; index <= 16; index++) outline.push(HEAD_X(-GRILLE.a + (2 * GRILLE.a * index) / 16, GRILLE.z0, r));
  for (let index = 0; index <= 10; index++) outline.push(HEAD_X(GRILLE.a, GRILLE.z0 + ((GRILLE.z1 - GRILLE.z0) * index) / 10, r));
  for (let index = 0; index <= 16; index++) outline.push(HEAD_X(GRILLE.a - (2 * GRILLE.a * index) / 16, GRILLE.z1, r));
  for (let index = 0; index <= 10; index++) outline.push(HEAD_X(-GRILLE.a, GRILLE.z1 - ((GRILLE.z1 - GRILLE.z0) * index) / 10, r));
  const opening = path(outline, true);
  const tubes = [];
  for (let index = 0; index < GRILLE.tubes; index++) {
    const z = GRILLE.z0 + 1.1 + (index * (GRILLE.z1 - GRILLE.z0 - 2.2)) / (GRILLE.tubes - 1);
    const points = [];
    for (let j = 0; j <= 20; j++) points.push(HEAD_X(-GRILLE.a + 0.07 + ((2 * GRILLE.a - 0.14) * j) / 20, z, r, 1.6));
    tubes.push(`<path class="rb-neon" data-tube="${index}" d="${path(points)}"/>`);
  }
  const columns = [];
  for (const sign of [-1, 1]) {
    for (let z = GRILLE.z0 + 0.6; z < GRILLE.z1 - 0.3; z += 0.9) {
      const points = [];
      for (let j = 0; j <= 4; j++) points.push(HEAD_X(sign * (GRILLE.a - 0.07 + (0.07 * j) / 4), z, r, 0));
      columns.push(path(points));
    }
  }
  for (const sign of [-1, 1]) columns.push(path([HEAD_X(sign * (GRILLE.a - 0.07), GRILLE.z0, r, 0), HEAD_X(sign * (GRILLE.a - 0.07), GRILLE.z1, r, 0)]));
  const divider = path([HEAD_X(0, GRILLE.z0, r, 0), HEAD_X(0, GRILLE.z1, r, 0)]);
  const grille = `<clipPath id="rb-grille"><path d="${opening}"/></clipPath><path class="rb-cavity" d="${opening}"/><g clip-path="url(#rb-grille)"><g data-live="neon">${tubes.join("")}</g>${Ln(columns.join(""), { tone: "mid" })}${Ln(divider, { tone: "lo" })}</g>${Ln(opening, { tone: "lo" })}`;
  bodyZ("head", 0, 0, S.FLARE.body, S.FLARE.z0, S.FLARE.z1, { seams: [], name: "head.brim", extra: grille, count: 20 });
}
// Helmet: a cone with the relay window row, lamps and vents on its front.
const KEYROW = { thetas: [-0.3, -0.18, -0.06, 0.06, 0.18, 0.3], z: 177, halfA: 0.038, halfZ: 2.5, lamps: 0.4 };
const helmet = (() => {
  const F = Fz(0, 0);
  const hr = S.helmetRadius;
  const body = S.HELMET_BODY;
  const profile = S.sampled(body, S.HELMET.z0, S.HELMET.z1, 30);
  const on = (theta, z, inset = 0) => HEAD_X(theta, z, hr, inset);
  const frame = roundRect(-0.4, 173.4, 0.4, 180.6, 0.06, 3);
  const framePath = path(frame.map(([t, z]) => on(t, z)), true);
  const windows = KEYROW.thetas.map((theta, index) => {
    const ring = [];
    for (let j = 0; j < 24; j++) {
      const a = (j / 24) * Math.PI * 2;
      ring.push(on(theta + KEYROW.halfA * Math.cos(a), KEYROW.z + KEYROW.halfZ * Math.sin(a)));
    }
    const d = path(ring, true);
    const key = [];
    const kw = KEYROW.halfA * 0.62;
    for (const [t, z] of roundRect(-kw, -1.5, kw, 1.5, 0.012, 2)) key.push(on(theta + t, KEYROW.z + z, 0.3));
    return `<clipPath id="rb-win${index}"><path d="${d}"/></clipPath><path class="rb-cavity" d="${d}"/><g clip-path="url(#rb-win${index})"><g data-rocker="${index}"><path class="rb-key" d="${path(key, true)}"/>${Ln(path([on(theta - kw, KEYROW.z + 0.6, 0.3), on(theta + kw, KEYROW.z + 0.6, 0.3)]), { tone: "lo" })}</g></g>${Ln(d, { tone: "lo" })}`;
  });
  const holes = [];
  const holeDots = [];
  for (let index = 0; index < 7; index++) {
    const theta = -0.33 + index * 0.11;
    const ring = [];
    for (let j = 0; j < 16; j++) ring.push(on(theta + 0.02 * Math.cos((j / 16) * Math.PI * 2), 182.2 + 0.4 * Math.sin((j / 16) * Math.PI * 2)));
    holes.push(path(ring, true));
    holeDots.push(at(on(theta, 182.2)));
  }
  const vents = [];
  for (const sign of [-1, 1]) {
    for (let j = 0; j < 4; j++) {
      const t = sign * (0.2 + j * 0.05);
      vents.push(path(roundRect(t - 0.012, 183.4, t + 0.012, 186.4, 0.01, 2).map(([a, z]) => on(a, z)), true));
    }
  }
  const lampOf = (theta, which) => {
    const ring = [];
    for (let j = 0; j < 20; j++) ring.push(on(theta + 0.05 * Math.cos((j / 20) * Math.PI * 2), KEYROW.z + 0.95 * Math.sin((j / 20) * Math.PI * 2), -0.2));
    return `<path class="rb-lamp" data-live="${which}" d="${path(ring, true)}"/>`;
  };
  const extra =
    Ln(framePath, { tone: "lo" }) +
    windows.join("") +
    lampOf(-KEYROW.lamps - 0.03, "lampL") +
    lampOf(KEYROW.lamps + 0.03, "lampR") +
    Ln(holes.join(""), { tone: "lo" }) +
    Dots(holeDots, { size: 0.35, tone: "mid" }) +
    Ln(vents.join(""), { tone: "lo" });
  const id = "head.helmet";
  const shape = record(A.solid(F, profile, { name: id, radius: body.radius }));
  put("head", [0, 0, 178], Sv(G.solidOf(profile, F, P, { smooth: { slope: body.slope, radius: body.radius } }), { tone: "hi", inner: Ln(G.arcOf(F, 170.2, hr(170.2), P, { slope: S.HELMET_SLOPE }), { tone: "faint" }) }) + extra, { name: id, shapes: [shape] });
  return shape;
})();
// Ears: two scanners, one on a horizontal shaft and one on a vertical post.
const EAR = { z: 181, ring: 4.6, tube: 0.55 };
const EARS = {};
{
  const hr = S.helmetRadius(EAR.z);
  // Left ear (screen left, -x): horizontal shaft.
  const FL = G.frameOf([0, 0, EAR.z], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  discOn("head", FL, hr - 0.3, hr + 1.6, 1.7, { tone: "mid", name: "head.earL-collar", cut: [helmet] });
  discOn("head", FL, hr + 1.6, 26, 0.85, { tone: "hi", name: "head.earL-shaft" });
  ballAt("head", [-27.4, 0, EAR.z], 1.45, { tone: "mid", name: "head.earL-hub" });
  EARS.L = { centre: [-(27.4 + 1.45 + EAR.tube + EAR.ring), 0, EAR.z], axis: [1, 0, 0], ring: EAR.ring, tube: EAR.tube };
  // Right ear: shaft out, elbow, then a vertical post.
  const FR = G.frameOf([0, 0, EAR.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  discOn("head", FR, hr - 0.3, hr + 1.6, 1.7, { tone: "mid", name: "head.earR-collar", cut: [helmet] });
  discOn("head", FR, hr + 1.6, 23.6, 0.85, { tone: "hi", name: "head.earR-shaft" });
  ballAt("head", [24.9, 0, EAR.z], 1.3, { tone: "mid", name: "head.earR-elbow" });
  const FP = G.frameOf([24.9, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  discOn("head", FP, EAR.z + Math.sqrt(1.3 ** 2 - 0.75 ** 2), 188.6, 0.75, { tone: "hi", name: "head.earR-post" });
  ballAt("head", [24.9, 0, 188.6 + 1.3], 1.4, { tone: "mid", name: "head.earR-hub" });
  EARS.R = { centre: [24.9, 0, 188.6 + 1.3 + 1.4 + EAR.tube + EAR.ring], axis: [0, 0, 1], ring: EAR.ring, tube: EAR.tube };
}
function earRing(ear, angle) {
  // The ring's plane contains its spin axis; angle turns it about that axis.
  const a = ear.axis;
  const base = Math.abs(a[2]) > 0.9 ? [0, 1, 0] : [0, 1, 0];
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
// Eyes: forward lamps on cones, normal to the helmet's sloping side.
for (const side of [-1, 1]) {
  const theta = side * 55 * DEG;
  const z = 176;
  const hr = S.helmetRadius(z);
  const radial = [Math.sin(theta), Math.cos(theta), 0];
  const normal = G.unit3([radial[0], radial[1], -S.HELMET_SLOPE]);
  const base = [hr * radial[0], hr * radial[1], z];
  const F = G.frameAlong(base, normal);
  turnedOn("head", F, [[-0.15, 2.3], [0.6, 2.3], [3.2, 1.15], [3.6, 1.15]], { tone: "mid", name: `head.eye${side > 0 ? "R" : "L"}` });
  const lens = G.circleOf(F, 3.6, 1.0, P);
  put("head", G.add3(base, G.mul3(normal, 3.7)), `<path class="rb-eye" data-live="eye${side > 0 ? "R" : "L"}" d="${lens}"/>`, { name: `head.eye${side > 0 ? "R" : "L"}-lens`, bias: 0.2, shapes: [record(A.disc(F, 3.6, 3.66, 1, { name: `head.eye${side > 0 ? "R" : "L"}-lens` }))] });
}
// Fin stacks below the ears: seven thin plates on a rod.
for (const side of [-1, 1]) {
  const theta = side * 80 * DEG;
  const rod = [(S.helmetRadius(174) + 2.4) * Math.sin(theta), (S.helmetRadius(174) + 2.4) * Math.cos(theta)];
  const F = Fz(rod[0], rod[1]);
  let below = 168.4;
  for (let index = 0; index < 7; index++) {
    const z = 169.4 + index * 1.45;
    discOn("head", F, below, z, 0.5, { tone: "mid", name: "head.fin-rod" });
    discOn("head", F, z, z + 0.45, 1.75, { tone: "hi", name: "head.fin" });
    below = z + 0.45;
  }
  discOn("head", F, below, 179.6, 0.5, { tone: "mid", name: "head.fin-rod" });
  for (const z of [168.4, 179.2]) {
    const radial = [Math.sin(theta), Math.cos(theta), 0];
    const FS = G.frameOf([0, 0, z + 0.2], radial, [0, 0, 1], G.cross3(radial, [0, 0, 1]));
    discOn("head", FS, S.helmetRadius(z + 0.2) - 0.2, S.helmetRadius(174) + 2.4 - 0.5, 0.42, { tone: "mid", name: "head.fin-standoff", cut: [helmet] });
  }
}

// ---------------------------------------------------------------- gyro tower (rides the head)
const TOWER = { z: S.HELMET.z1, orbit: 6, gyroZ: 202, gyroR: 2.7, lampZ: 205.4 };
{
  const F = Fz(0, 0);
  discOn("brain", F, TOWER.z, TOWER.z + 1, 4.6, { tone: "mid", name: "brain.flange" });
  bodyZ("brain", 0, 0, S.BELL, TOWER.z + 1, TOWER.z + 7, { name: "brain.bell", count: 16 });
  discOn("brain", F, TOWER.z + 7, TOWER.gyroZ - 0.7, 0.55, { tone: "mid", name: "brain.shaft" });
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
  // Two ivory reciprocating arms in an inverted V at the front of the tower, hung from a pin
  // on a bracket that stands on the helmet deck.
  const apex = [0, 4.2, TOWER.z + 7.4];
  slab("brain", { x: -0.5, y: apex[1] + 0.35, w: 1, d: 0.8, r: 0.2 }, TOWER.z, apex[2] + 0.6 - TOWER.z, { tone: "mid", steps: 2, bevel: 0, name: "brain.varm-post" });
  const vShapes = [-1, 1].map((side) => {
    const lean = 22 * DEG;
    const down = [side * Math.sin(lean), 0, -Math.cos(lean)];
    const across = [Math.cos(lean), 0, side * Math.sin(lean)];
    return record(A.orientedBox(G.add3(apex, G.add3(G.mul3(down, 3.1), [0, 0.15, 0])), [down, across, [0, 1, 0]], [3.1, 0.9, 0.15], { name: "brain.varms" }));
  });
  put("brain", [0, 7.5, 193], `<g data-live="varms"></g>`, { name: "brain.varms", bias: 0.5, shapes: vShapes });
}

// ---------------------------------------------------------------- dome, gland, radar mast
let MAST;
{
  const F = Fz(0, 0);
  const ringShape = record(A.ring(F, S.DOME_RING.z0, S.DOME_RING.z1, S.DOME_RING.rIn, S.DOME_RING.rOut, { name: "dome.ring" }));
  put("dome", [0, 0, S.DOME_RING.z0 + 0.6], Sv(G.ringBand(S.DOME_RING.z0, S.DOME_RING.z1, S.DOME_RING.rIn, S.DOME_RING.rOut, F, P), { tone: "mid" }) + Dots(G.dotsOf(F, S.DOME_RING.z1, 16.4, 20, P, { fade: FADE }), { size: 0.4 }), { name: "dome.ring", shapes: [ringShape] });
  const profile = S.sampled(S.DOME.body, S.DOME.z0, S.DOME.z1, 24);
  const outer = profile.map(([s, r]) => [s, r]);
  const inner = [...outer].reverse().map(([s, r]) => [s, Math.max(0.2, r - 0.4)]);
  const glass = record(A.body(F, [...outer, ...inner], { name: "dome.glass" }));
  const paths = G.solidOf(profile, F, P, { smooth: { slope: S.DOME.body.slope, radius: S.DOME.body.radius } });
  const shine = [];
  for (let j = 0; j <= 18; j++) {
    const z = S.DOME.z0 + 2 + (j * (S.DOME.z1 - S.DOME.z0 - 6)) / 18;
    const rr = S.DOME.body.radius(z) - 0.1;
    shine.push(at([rr * Math.sin(-0.85), rr * Math.cos(-0.85), z]));
  }
  put("dome", [0, 0, 200], `<g class="rb-glass">${Sv(paths, { tone: "hi" })}</g>` + k.fadeLineSvg(shine, { fade: [10, 10], tone: "mid", className: "rb-shine" }), { name: "dome.glass", shapes: [glass], bias: 2 });
  discOn("dome", F, S.DOME.z1, S.DOME.z1 + 0.8, 1.9, { tone: "mid", name: "dome.gland" });
  const from = S.DOME.z1 + 0.8;
  MAST = { from, to: from + 1.2, stroke: 22, r: 0.5 };
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
  const gland = [CONSOLE.x, 4, CAB_Z0 + 4];
  const FG = G.frameOf(gland, [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  discOn("stand", FG, 0, 1.6, 1.6, { tone: "mid", name: "stand.gland", extra: Ln(G.circleOf(FG, 1.6, 0.8, P), { tone: "lo" }) });
  const theta = -18 * DEG;
  const fz = 6;
  const fr = S.FOOT.body.radius(fz);
  const footPoint = [S.LEG_X + fr * Math.cos(theta), fr * Math.sin(theta), fz];
  const nrm = [Math.cos(theta), Math.sin(theta), 0];
  const FC = G.frameAlong(footPoint, nrm);
  discOn("legs", FC, -0.4, 1.6, 1.6, { tone: "mid", name: "legs.connector", cut: [LEG_SHAPES[1].foot] });
  const c0 = G.add3(footPoint, G.mul3(nrm, 1.6));
  const r = 0.62;
  const lie = PLATE_TOP + r;
  const g1 = [gland[0] - 1.6, gland[1], gland[2]];
  const route = G.fillet(
    [
      c0,
      G.add3(c0, G.mul3(nrm, 3)),
      [c0[0] + 5, c0[1] - 1, r],
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
const groups = items.map((item, index) => {
  const [mx, my, mz] = item.move;
  return `<g class="it" data-piece="${item.piece}"${item.ride !== item.piece ? ` data-ride="${item.ride}"` : ""} data-k="${item.key.toFixed(2)}" data-m="${mx.toFixed(1)},${my.toFixed(1)},${mz.toFixed(1)}" data-i="${index}">${item.svg}</g>`;
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
  grille: GRILLE,
  mast: MAST,
  vu: { centre: SLOPE.point((VU.x0 + VU.x1) / 2, VU.w0 + 0.06), along: SLOPE.along, normal: SLOPE.normal },
  drum: DRUM,
  cards: CARDS.length,
};

const LABEL =
  "Robby the Robot on a service riser: stacked-globe legs on a turntable dais, a squat pelvis, a barrel chest with the heart box and sample door, bellows arms with three-finger claws, a flared head with the blue neon voice grille and six relay keys, two spinning ear rings, and a clear dome over a gyro tower. A height gauge reads 214 cm; MGM's control console and microphone feed a cable into the right foot.";

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
