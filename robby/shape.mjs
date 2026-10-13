// Robby's turned bodies as analytic profiles, in centimetres (1 world unit = 1 cm).
// Heights are measured from the top of the dais. Proportions come from a 768 × 920
// studio photograph of the Fred Barton replica (built from the MGM moulds) scaled to
// the 214 cm overall height Wikipedia gives for the original prop.

export const HEIGHT = 214;

// A bulb whose radius is a superellipse in z: r = R · (1 − |t|^p)^(1/p),
// t = (z − c) / h, with a different h below and above the widest ring.
export function bulb({ R, c, below, above, p }) {
  const radius = (z) => {
    const h = z < c ? below : above;
    const t = Math.min(0.999999, Math.abs(z - c) / h);
    return R * Math.pow(1 - Math.pow(t, p), 1 / p);
  };
  const slope = (z) => {
    const h = z < c ? below : above;
    const t = Math.min(0.999999, Math.abs(z - c) / h);
    if (t < 1e-9) return 0;
    const sign = z < c ? -1 : 1;
    return (-R * Math.pow(1 - Math.pow(t, p), 1 / p - 1) * Math.pow(t, p - 1) * sign) / h;
  };
  return { radius, slope };
}

// A barrel: straight between z0 and z1, rounded by superellipse quarters below and above.
export function barrel({ R, z0, z1, below, above, p }) {
  const radius = (z) => {
    if (z >= z0 && z <= z1) return R;
    const h = z < z0 ? below : above;
    const t = Math.min(0.999999, (z < z0 ? z0 - z : z - z1) / h);
    return R * Math.pow(1 - Math.pow(t, p), 1 / p);
  };
  const slope = (z) => {
    if (z >= z0 && z <= z1) return 0;
    const h = z < z0 ? below : above;
    const t = Math.min(0.999999, (z < z0 ? z0 - z : z - z1) / h);
    if (t < 1e-9) return 0;
    const sign = z < z0 ? -1 : 1;
    return (-R * Math.pow(1 - Math.pow(t, p), 1 / p - 1) * Math.pow(t, p - 1) * sign) / h;
  };
  return { radius, slope };
}

// Sample an analytic body into a profile of smooth knots between two flat caps.
export function sampled({ radius }, z0, z1, count = 26) {
  const out = [];
  for (let index = 0; index <= count; index++) {
    const z = z0 + ((z1 - z0) * index) / count;
    out.push(index === 0 || index === count ? [z, radius(z)] : [z, radius(z), 1]);
  }
  return out;
}

export const FOOT = { z0: 0, z1: 20, body: bulb({ R: 14.4, c: 6, below: 8.1, above: 15.2, p: 2.4 }) };
export const NECK = { h: 1.4, r: 8 };
export const GLOBE_H = 17.6;
export const GLOBE_R = 12.5;
export const globeAt = (z0) => ({ z0, z1: z0 + GLOBE_H, body: bulb({ R: GLOBE_R, c: z0 + GLOBE_H / 2, below: 10.21, above: 10.21, p: 2.2 }) });
export const LEG_X = 15.2;
export const LEG_STACK = (() => {
  const out = [];
  let z = FOOT.z1;
  for (let index = 0; index < 3; index++) {
    out.push({ neck: [z, z + NECK.h] });
    z += NECK.h;
    out.push({ globe: globeAt(z) });
    z += GLOBE_H;
  }
  return { parts: out, top: z };
})();

export const PELVIS = { z0: 77, z1: 108, body: bulb({ R: 25.5, c: 90, below: 22.07, above: 26.08, p: 2.6 }) };
export const CHEST = { z0: 108, z1: 150, body: barrel({ R: 29.5, z0: 114, z1: 140, below: 10.12, above: 12.99, p: 2.5 }) };
export const BEARING = { z0: 150, z1: 151.2, rIn: 15, rOut: 21 };
export const LIP = { z0: 151.2, z1: 152.6, r: 31.2 };
export const FLARE = {
  z0: 152.6,
  z1: 167,
  body: {
    radius: (z) => 21.4 + 9.8 * Math.pow(Math.max(0, (167 - z) / 14.4), 1.6),
    slope: (z) => (-9.8 * 1.6 * Math.pow(Math.max(0, (167 - z) / 14.4), 0.6)) / 14.4,
  },
};
export const HELMET = { z0: 167, z1: 188, rBottom: 20.2, rTop: 17.4, zTop: 186 };
export const helmetRadius = (z) => HELMET.rBottom + ((HELMET.rTop - HELMET.rBottom) * (z - HELMET.z0)) / (HELMET.zTop - HELMET.z0);
export const HELMET_SLOPE = (HELMET.rTop - HELMET.rBottom) / (HELMET.zTop - HELMET.z0);
export const DOME_RING = { z0: 188, z1: 189.2, rIn: 15.6, rOut: 17.2 };
export const DOME = {
  z0: 189.2,
  z1: 210.6,
  apex: 211,
  base: 16.6,
  body: {
    radius: (z) => 16.6 * Math.sqrt(Math.max(0, (211 - z) / 21.8)),
    slope: (z) => -16.6 / (2 * Math.sqrt(21.8 * Math.max(0.05, 211 - z))),
  },
};

// The helmet: a cone whose top edge rolls over in a quarter ellipse.
export const HELMET_BODY = (() => {
  const round = 2.2;
  const drop = 1;
  const z1 = HELMET.zTop;
  const radius = (z) => {
    const cone = helmetRadius(z);
    if (z <= z1) return cone;
    const u = Math.min(0.999, (z - z1) / round);
    return cone - drop * (1 - Math.sqrt(1 - u * u));
  };
  const slope = (z) => {
    if (z <= z1) return HELMET_SLOPE;
    const u = Math.min(0.999, (z - z1) / round);
    return HELMET_SLOPE - (drop * u) / (Math.sqrt(1 - u * u) * round);
  };
  return { radius, slope };
})();

// The brass bell under the gyros: an exponential taper from 3.2 to the shaft.
export const BELL = {
  radius: (z) => 1.2 + 2 * Math.exp(-(z - 189) / 1.6),
  slope: (z) => -(2 / 1.6) * Math.exp(-(z - 189) / 1.6),
};
