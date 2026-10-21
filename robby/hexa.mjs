// A convex six-faced solid from its eight corners, shaded the way the kit shades
// prisms (four tones by facing, a lighter top). Used for parts that tilt or swing,
// such as the sample-door flap, where a floor prism can't follow the motion.
// Corner order: bottom face 0-1-2-3, top face 4-5-6-7, with 4 above 0.
import { iso, pathOf } from "../vendor/anatomy/kit/iso-kit.mjs";
import { viewOf, lightOf, bandOf, dot3, sub3, cross3, unit3, hullOf } from "../vendor/anatomy/kit/lathe.mjs";

const FACES = [
  [0, 3, 2, 1],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
];

export function hexaPaths(corners, P) {
  const V = viewOf(P);
  const L = lightOf(P);
  const centre = corners.reduce((sum, p) => [sum[0] + p[0] / 8, sum[1] + p[1] / 8, sum[2] + p[2] / 8], [0, 0, 0]);
  const flat = corners.map((p) => iso(p, P));
  const buckets = [[], [], [], [], []];
  const seen = FACES.map((face) => {
    let normal = unit3(cross3(sub3(corners[face[1]], corners[face[0]]), sub3(corners[face[2]], corners[face[0]])));
    const mid = face.reduce((sum, index) => [sum[0] + corners[index][0] / 4, sum[1] + corners[index][1] / 4, sum[2] + corners[index][2] / 4], [0, 0, 0]);
    if (dot3(normal, sub3(mid, centre)) < 0) normal = normal.map((value) => -value);
    return { face, normal, visible: dot3(normal, V) > 1e-6 };
  });
  for (const { face, normal, visible } of seen) {
    if (!visible) continue;
    const tone = normal[2] > 0.92 ? 4 : bandOf(dot3(normal, L));
    buckets[tone].push(pathOf(face.map((index) => flat[index]), true));
  }
  const edges = new Map();
  for (const { face, visible } of seen) {
    if (!visible) continue;
    for (let j = 0; j < 4; j++) {
      const a = face[j];
      const b = face[(j + 1) % 4];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  const crease = [...edges].filter(([, count]) => count === 2).map(([key]) => {
    const [a, b] = key.split("-").map(Number);
    return pathOf([flat[a], flat[b]]);
  });
  const hull = pathOf(hullOf(flat), true);
  return { fill: hull, outline: hull, crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((list) => list.join("")) };
}

// The eight corners of a thin plate hinged along a horizontal edge.
// hinge: point on the hinge line at the plate's centre; along: unit vector of the hinge;
// up: the plate's direction away from the hinge when closed; out: its outward normal when closed.
// angle swings the plate outward and down about the hinge.
export function flapCorners({ hinge, along, up, out, width, height, thick, angle }) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const u = [up[0] * c + out[0] * s, up[1] * c + out[1] * s, up[2] * c + out[2] * s];
  const n = [out[0] * c - up[0] * s, out[1] * c - up[1] * s, out[2] * c - up[2] * s];
  const p = (x, y, z) => [hinge[0] + along[0] * x + u[0] * y + n[0] * z, hinge[1] + along[1] * x + u[1] * y + n[1] * z, hinge[2] + along[2] * x + u[2] * y + n[2] * z];
  const w = width / 2;
  return [p(-w, 0, -thick), p(w, 0, -thick), p(w, height, -thick), p(-w, height, -thick), p(-w, 0, 0), p(w, 0, 0), p(w, height, 0), p(-w, height, 0)];
}

// Any convex solid from its faces (each a list of 3D points), shaded like hexaPaths.
// Faces seen edge-on are skipped; the fill and outline are the hull of every corner. `shade`,
// given a face's midpoint and outward normal, gives the normal its tone is taken from.
export function convexPaths(faces, P, { topTone = true, shade } = {}) {
  const V = viewOf(P);
  const L = lightOf(P);
  const all = faces.flat();
  const centre = all.reduce((sum, p) => [sum[0] + p[0] / all.length, sum[1] + p[1] / all.length, sum[2] + p[2] / all.length], [0, 0, 0]);
  const buckets = [[], [], [], [], []];
  const seen = [];
  for (const face of faces) {
    let normal = [0, 0, 0];
    for (let j = 0; j < face.length; j++) {
      const a = face[j];
      const b = face[(j + 1) % face.length];
      normal = [normal[0] + (a[1] - b[1]) * (a[2] + b[2]), normal[1] + (a[2] - b[2]) * (a[0] + b[0]), normal[2] + (a[0] - b[0]) * (a[1] + b[1])];
    }
    normal = unit3(normal);
    const mid = face.reduce((sum, p) => [sum[0] + p[0] / face.length, sum[1] + p[1] / face.length, sum[2] + p[2] / face.length], [0, 0, 0]);
    if (dot3(normal, sub3(mid, centre)) < 0) normal = normal.map((value) => -value);
    const visible = dot3(normal, V) > 1e-6;
    seen.push({ face, visible });
    if (!visible) continue;
    const lit = shade ? shade(mid, normal) : normal;
    const tone = topTone && lit[2] > 0.92 ? 4 : bandOf(dot3(lit, L));
    buckets[tone].push(pathOf(face.map((p) => iso(p, P)), true));
  }
  const hull = pathOf(hullOf(all.map((p) => iso(p, P))), true);
  return { fill: hull, outline: hull, crease: "", top: buckets[4].join(""), shades: buckets.slice(0, 4).map((list) => list.join("")), seamless: true };
}

// The hopper door: a convex roll-top hinged along its lower edge and tipped forward by angle.
// Gives a frame and a cross-section for a prism, s running along the hinge.
export function rollTop({ hinge, along, up, out, height, thick, bulge, angle }) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const u = [up[0] * c + out[0] * s, up[1] * c + out[1] * s, up[2] * c + out[2] * s];
  const v = [out[0] * c - up[0] * s, out[1] * c - up[1] * s, out[2] * c - up[2] * s];
  const R = (height * height) / 4 / (2 * bulge) + bulge / 2;
  const poly = [[0, -thick], [height, -thick]];
  for (let i = 0; i <= 16; i++) {
    const t = height * (1 - i / 16);
    poly.push([t, Math.sqrt(Math.max(0, R * R - (t - height / 2) ** 2)) - (R - bulge)]);
  }
  return { F: { o: hinge, a: along, u, v }, poly };
}
