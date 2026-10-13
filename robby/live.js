const D = __DATA__;
const P = D.P;
const root = document.querySelector(".rb");
const stage = root.querySelector(".rb-stage");
const machine = stage.querySelector(".rb-machine");
const readout = root.querySelector("[data-readout]");
const hint = root.querySelector("[data-hint]");
const live = root.querySelector("[data-live]");
const recipeSelect = root.querySelector("[data-recipe]");
const actButtons = Object.fromEntries([...root.querySelectorAll("[data-act]")].map((button) => [button.dataset.act, button]));
const partButtons = [...root.querySelectorAll(".rb-part")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const q = (name) => machine.querySelector(`[data-live="${name}"]`);
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const ease = (x) => x * x * (3 - 2 * x);
const smoothstep = (a, b, x) => ease(clamp((x - a) / (b - a), 0, 1));
const pulse = (age, rise, fall) => (age < 0 ? 0 : age < rise ? ease(age / rise) : Math.exp(-(age - rise) / fall));
const fmt = (value, digits = 0) => value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// ---------------------------------------------------------------- items and the explode
const GROUP = { armL: "armR" };
const nodes = [...machine.querySelectorAll(".it")].map((el) => ({
  el,
  piece: el.dataset.piece,
  group: GROUP[el.dataset.piece] ?? el.dataset.piece,
  ride: el.dataset.ride || el.dataset.piece,
  key: Number(el.dataset.k),
  m: el.dataset.m.split(",").map(Number),
  shown: "",
}));
for (const node of nodes) node.lift = node.m[0] * D.V[0] + node.m[1] * D.V[1] + node.m[2] * D.V[2];
let order = nodes.map((_, index) => index);
const IDS = Object.keys(D.pieces);
const spring = Object.fromEntries(IDS.map((id) => [id, { x: 0, v: 0, target: 0, pending: null }]));
const ORDER = ["dome", "brain", "head", "chest", "core", "armR", "pelvis", "legs", "stand"];

let clock = 0;
let apart = false;
let selected = null;
let inside = false;
let leaveTimer = 0;
let touring = !still.matches;
let tourClock = -1.4;
let idleTimer = 0;
let visible = false;
let frame = 0;
let last = 0;

function say(text) {
  if (readout.textContent !== text) readout.textContent = text;
}
function announce(text) {
  if (live.textContent !== text) live.textContent = text;
}
function describe(text) {
  if (stage.getAttribute("aria-valuetext") !== text) stage.setAttribute("aria-valuetext", text);
}

function setApart(on) {
  if (apart === on) return;
  apart = on;
  const goal = on ? 1 : 0;
  const list = (on ? D.stagger : [...D.stagger].reverse()).filter((id) => spring[id].target !== goal || spring[id].pending);
  list.forEach((id, index) => {
    spring[id].pending = { value: goal, at: clock + (still.matches ? 0 : index * D.spring.stagger) };
  });
  actButtons.apart.setAttribute("aria-pressed", String(on));
  actButtons.apart.dataset.state = on ? "on" : "";
  describe(on ? "Apart" : "Assembled");
  run();
}

function select(id) {
  if (id && GROUP[id]) id = GROUP[id];
  if (selected === id) return;
  selected = id;
  for (const node of nodes) {
    if (id !== null && node.group === id) node.el.setAttribute("data-on", "");
    else node.el.removeAttribute("data-on");
  }
  if (id) stage.setAttribute("data-focus", "");
  else stage.removeAttribute("data-focus");
  partButtons.forEach((button) => (button.dataset.part === id ? button.setAttribute("data-on", "") : button.removeAttribute("data-on")));
  stage.setAttribute("aria-valuenow", String(id ? ORDER.indexOf(id) + 1 : 0));
  if (id) describe(D.pieces[id].name + ": " + D.pieces[id].say);
}

function stepSpring(state, dt, calm) {
  if (state.pending && clock >= state.pending.at) {
    state.target = state.pending.value;
    state.pending = null;
  }
  if (calm) {
    state.x = state.target;
    state.v = 0;
    return false;
  }
  for (let index = 0; index < D.spring.substeps; index++) {
    const h = dt / D.spring.substeps;
    state.v += ((state.target - state.x) * D.spring.stiffness - state.v * D.spring.damping) * h;
    state.x += state.v * h;
  }
  if (Math.abs(state.target - state.x) < 2e-4 && Math.abs(state.v) < 2e-4) {
    state.x = state.target;
    state.v = 0;
    return state.pending !== null;
  }
  return true;
}

function place() {
  for (const node of nodes) {
    const share = spring[node.ride].x;
    const tx = (D.EX[0] * node.m[0] + D.EY[0] * node.m[1] + D.EZ[0] * node.m[2]) * share;
    const ty = (D.EX[1] * node.m[0] + D.EY[1] * node.m[1] + D.EZ[1] * node.m[2]) * share;
    const text = share === 0 ? "" : `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`;
    if (text !== node.shown) {
      node.shown = text;
      if (text) node.el.setAttribute("transform", text);
      else node.el.removeAttribute("transform");
    }
  }
  const next = nodes.map((_, index) => index).sort((a, b) => nodes[a].key + nodes[a].lift * spring[nodes[a].ride].x - (nodes[b].key + nodes[b].lift * spring[nodes[b].ride].x));
  if (next.some((index, at) => index !== order[at])) {
    const fragment = document.createDocumentFragment();
    for (const index of next) fragment.appendChild(nodes[index].el);
    machine.appendChild(fragment);
    order = next;
  }
}
const moving = () => IDS.some((id) => Math.abs(spring[id].x - spring[id].target) > 0.002 || spring[id].pending);

// ---------------------------------------------------------------- the moving parts, rebuilt each frame
const parts = {
  gyro: q("gyro"),
  earL: q("earL"),
  earR: q("earR"),
  varms: q("varms"),
  pilot: q("pilot"),
  door: q("door"),
  star: q("star"),
  quad: q("quad"),
  drum: q("drum"),
  needle: q("needle"),
  mast: q("mast"),
  radar: q("radar"),
  lampL: q("lampL"),
  lampR: q("lampR"),
  eyeL: q("eyeL"),
  eyeR: q("eyeR"),
  consoleLamp: q("consoleLamp"),
  tubes: [...machine.querySelectorAll("[data-tube]")],
  rockers: [...machine.querySelectorAll("[data-rocker]")],
  keys: [...machine.querySelectorAll("[data-key]")],
  leds: [...machine.querySelectorAll("[data-led]")],
};
const iso = (p) => K.iso(p, P);
const line = (points) => K.pathOf(points.map(iso));
const add = G.add3;
const mul = G.mul3;
const shown = new Map();
const write = (el, attr, value) => {
  if (!el) return;
  const key = el;
  const memo = shown.get(key) ?? {};
  if (memo[attr] === value) return;
  memo[attr] = value;
  shown.set(key, memo);
  if (value === null) el.removeAttribute(attr);
  else el.setAttribute(attr, value);
};
const html = (el, value) => {
  if (!el) return;
  const memo = shown.get(el) ?? {};
  if (memo.html === value) return;
  memo.html = value;
  shown.set(el, memo);
  el.innerHTML = value;
};
const on = (el, flag) => write(el, "data-on", flag ? "" : null);

function gyroSvg(spin, orbit, arcs) {
  const out = [];
  const T = D.tower;
  for (let index = 0; index < 3; index++) {
    const a = orbit + (index * TAU) / 3;
    const c = [T.orbit * Math.cos(a), T.orbit * Math.sin(a), T.gyroZ];
    const hub = [1.3 * Math.cos(a), 1.3 * Math.sin(a), T.gyroZ];
    const rim = add(c, mul(G.unit3(G.sub3(hub, c)), T.gyroR));
    out.push(`<path class="rb-wire" d="${line([hub, rim])}"/>`);
    const rings = [0, 1, 2].map((j) => {
      const tilt = spin * (1 + index * 0.27) + (j * Math.PI) / 3;
      const n = [Math.cos(tilt) * Math.cos(a), Math.cos(tilt) * Math.sin(a), Math.sin(tilt)];
      const F = G.frameAlong(c, n);
      return line(Array.from({ length: 37 }, (_, t) => G.pointOf(F, 0, T.gyroR, (t / 36) * TAU)));
    });
    out.push(`<path class="rb-wire" data-tone="hi" d="${rings.join("")}"/>`);
  }
  if (arcs > 0.02) {
    // Crackle between the tower and the dome wall while the relays fight an order.
    const seed = Math.floor(clock * 18);
    const rand = (n) => {
      const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    const bolts = [];
    for (let b = 0; b < 3; b++) {
      if (rand(b) > arcs) continue;
      const a = rand(b + 10) * TAU;
      const z0 = T.gyroZ + (rand(b + 20) - 0.5) * 4;
      const from = [1.4 * Math.cos(a), 1.4 * Math.sin(a), z0];
      const zTo = z0 + (rand(b + 30) - 0.5) * 6;
      const reach = 16.6 * Math.sqrt(Math.max(0, (211 - zTo) / 21.8)) - 0.6;
      const to = [reach * Math.cos(a + 0.3), reach * Math.sin(a + 0.3), zTo];
      const points = [];
      for (let s = 0; s <= 6; s++) {
        const t = s / 6;
        const p = G.lerp3(from, to, t);
        const j = s === 0 || s === 6 ? 0 : (rand(b * 7 + s + 40) - 0.5) * 2.4;
        points.push([p[0] + j * Math.sin(a), p[1] - j * Math.cos(a), p[2] + j * 0.6]);
      }
      bolts.push(line(points));
    }
    if (bolts.length) out.push(`<path class="rb-arc" d="${bolts.join("")}"/>`);
  }
  return out.join("");
}

function earSvg(ear, angle) {
  const a = ear.axis;
  const base = [0, 1, 0];
  const side = G.unit3(G.cross3(a, base));
  const n = add(mul(base, Math.cos(angle)), mul(side, Math.sin(angle)));
  const inPlane = G.unit3(G.cross3(n, a));
  const points = [];
  for (let index = 0; index <= 96; index++) {
    const t = (index / 96) * TAU;
    points.push(add(ear.centre, add(mul(a, ear.ring * Math.cos(t)), mul(inPlane, ear.ring * Math.sin(t)))));
  }
  return T.tubePieces(points, ear.tube, P, { closed: true, maxLength: 400, spacing: 0.5 })
    .map((part) => T.tubeSvg(part, { tone: "hi" }))
    .join("");
}

// Two ivory arms in an inverted V at the front of the tower, hinged at the top.
function vArmsSvg(twitch) {
  const T = D.tower;
  const apex = [0, 4.2, T.z + 7.4];
  const out = [];
  for (const side of [-1, 1]) {
    const lean = (22 + side * twitch * 9) * (Math.PI / 180);
    const down = [side * Math.sin(lean), 0, -Math.cos(lean)];
    const across = [Math.cos(lean), 0, side * Math.sin(lean)];
    const length = 6.2;
    const width = 0.9;
    const thick = 0.3;
    const p = (u, v, w) => add(apex, add(mul(down, u), add(mul(across, v), [0, w, 0])));
    const corners = [p(0, -width, 0), p(0, width, 0), p(length, width, 0), p(length, -width, 0), p(0, -width, thick), p(0, width, thick), p(length, width, thick), p(length, -width, thick)];
    out.push(`<g class="rb-ivory">${K.solidSvg(X.hexaPaths(corners, P), { tone: "mid" })}</g>`);
  }
  out.push(K.dotsSvg([iso(add(apex, [0, 0.3, 0]))], { size: 0.6, tone: "hi" }));
  return out.join("");
}

function doorSvg(angle) {
  const F = D.flap;
  const corners = X.flapCorners({ ...F, angle });
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const up = [F.up[0] * c + F.out[0] * s, F.up[1] * c + F.out[1] * s, F.up[2] * c + F.out[2] * s];
  const slotAt = (x, h) => add(add(F.hinge, mul(F.along, x)), mul(up, h));
  const lift = [F.out[0] * c - F.up[0] * s, F.out[1] * c - F.up[1] * s, F.out[2] * c - F.up[2] * s];
  const h = F.height - 2;
  const slot = [slotAt(-3, h - 0.4), slotAt(3, h - 0.4), slotAt(3, h + 0.4), slotAt(-3, h + 0.4)].map((p) => add(p, mul(lift, 0.02)));
  return K.solidSvg(X.hexaPaths(corners, P), { tone: "hi" }) + `<path class="iso-line" data-tone="lo" d="${K.pathOf(slot.map(iso), true)}"/>`;
}

function starSvg(angle) {
  const [x0, x1] = D.lights.xs;
  const c = [x0, D.hb.face + 0.9, D.lights.z];
  const spikes = [];
  for (let index = 0; index < 6; index++) {
    const a = angle + (index * TAU) / 6;
    const r = index % 2 ? 1.2 : 2.1;
    spikes.push(line([c, add(c, [Math.cos(a) * r, 0, Math.sin(a) * r])]));
  }
  return `<path class="rb-star" d="${spikes.join("")}"/>`;
}

function quadSvg(angle) {
  const c = [D.lights.xs[1], D.hb.face + 0.9, D.lights.z];
  const out = [];
  const F = G.frameOf(c, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(`<path class="rb-quad" d="${G.circleOf(F, 0, 0.9, P)}"/>`);
  for (let index = 0; index < 4; index++) {
    const a = angle + (index * TAU) / 4;
    const lug = G.frameOf(add(c, [Math.cos(a) * 1.75, 0, Math.sin(a) * 1.75]), [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    out.push(`<path class="rb-quad" d="${G.circleOf(lug, 0, 0.45, P)}"/>`);
  }
  return out.join("");
}

function drumSvg(phase) {
  const F = G.frameOf([0, D.drum.y, D.drum.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  return K.fadedSvg(G.ribsOf(F, -D.drum.half + 1.5, D.drum.half - 1.5, D.drum.r, 28, P, { fade: [0.1, 0.55], seams: true, phase }), { tone: "lo" });
}

function needlePath(level) {
  const a = (-45 + 90 * clamp(level, 0, 1)) * (Math.PI / 180);
  const c = D.vu.centre;
  const dir = add(mul([1, 0, 0], Math.sin(a)), mul(D.vu.along, Math.cos(a)));
  const lift = mul(D.vu.normal, 0.15);
  return line([add(add(c, lift), mul(dir, -1.2)), add(add(c, lift), mul(dir, 7.9))]);
}

function radarSvg(extend, angle, open) {
  if (open < 0.02) return "";
  const tip = [0, 0, D.mast.to + extend];
  const dir = [Math.cos(angle), Math.sin(angle), 0];
  const F = G.frameAlong(add(tip, [0, 0, 0.6]), dir);
  const r = 3 * open;
  const dish = [[-0.6, 0.6], [-0.2, r * 0.55, 1], [0.3, r * 0.85, 1], [0.6, r]];
  const bowl = G.solidOf(dish, F, P, { smooth: { rows: 3 } });
  const feed = line([add(tip, [0, 0, 0.6]), add(add(tip, [0, 0, 0.6]), mul(dir, 2.6 * open))]);
  return K.solidSvg(bowl, { tone: "hi" }) + `<path class="iso-line" data-tone="hi" d="${feed}"/>` + K.dotsSvg([iso(add(add(tip, [0, 0, 0.6]), mul(dir, 2.6 * open)))], { size: 0.6, tone: "hi" });
}

// ---------------------------------------------------------------- behaviour: speech, synthesis, the inhibition, the scan
const LINES = [
  "I am at your disposal with 187 other languages.",
  "I rarely use it myself, sir. It promotes rust.",
  "In my case, sir, the question is totally without meaning.",
  "Passengers will please fasten their seat belts.",
  "Something is approaching from the southwest.",
];
const RECIPES = {
  bourbon: { sample: "one jolt of rocket bourbon", finding: "simple alcohol molecules, traces of fusel oil", unit: "gal", total: 60, digits: 0, line: "Would 60 gallons be sufficient?", done: "60 gal · 480 pints · Kansas City bourbon" },
  isotope: { sample: "a sample of lead", finding: "lead · lighter isotope 217 will serve", unit: "t", total: 10, digits: 1, line: "This is my morning's run of isotope 217.", done: "10 t of isotope 217 · lead shielding for the C-57D" },
  emerald: { sample: "a dress pattern", finding: "beryl lattice · 5, 10 and 15 carats on hand", unit: "ct", total: 30, digits: 0, line: "I will run the dress up for you in time for breakfast.", done: "dress set with 5, 10 and 15 ct emeralds" },
  sapphire: { sample: "a star sapphire", finding: "corundum, rutile needles · a week to crystallize", unit: "days", total: 7, digits: 0, line: "Star sapphires take a week to crystallize properly.", done: "star sapphires · 7 days · offering emeralds", slow: true },
};
const syllables = (word) => Math.max(1, (word.toLowerCase().match(/[aeiouy]+/g) || []).length);
function speechTrack(text, at = 0) {
  // One pulse per syllable, at about 5.2 syllables a second, with a gap between words.
  const words = text.split(" ");
  const events = [];
  let t = 0;
  for (const [index, word] of words.entries()) {
    const n = syllables(word);
    for (let s = 0; s < n; s++) {
      events.push({ t, word: index, strength: 0.65 + 0.35 * ((word.length * 7 + s * 13) % 10) / 10 });
      t += 0.19;
    }
    t += /[.,?]$/.test(word) ? 0.32 : 0.06;
  }
  return { words, events, length: t + 0.2, at };
}

const act = {
  mode: "idle",
  t: 0,
  line: 0,
  speech: null,
  recipe: "bourbon",
  run: 0,
  harm: 0,
  latched: 0,
  scanUp: { x: 0, v: 0 },
  scanAngle: 0,
  doorAngle: 0,
  armedFor: null,
};
const RELAYS = 6501;
const RECHARGE = 4.2;

function start(mode, fromTour = false) {
  if (!fromTour) quietTour();
  if (apart || moving()) {
    setApart(false);
    select(null);
    act.armedFor = mode;
    act.mode = "arming";
    act.t = 0;
    announce("closing up · arming");
    run();
    return;
  }
  act.mode = mode;
  act.t = 0;
  act.armedFor = null;
  if (mode === "speak") {
    act.speech = speechTrack(LINES[act.line % LINES.length], 0);
    act.line++;
    announce("speaking");
  }
  if (mode === "make") {
    act.recipe = recipeSelect.value;
    act.speech = null;
    announce("synthesizing " + recipeSelect.selectedOptions[0].textContent);
  }
  if (mode === "harm") announce("order to fire on a man");
  if (mode === "scan") announce("radar scan");
  for (const [name, button] of Object.entries(actButtons)) if (name !== "apart") button.dataset.state = name === mode ? "on" : "";
  run();
}
function finish(text) {
  act.mode = "idle";
  act.t = 0;
  act.speech = null;
  for (const [name, button] of Object.entries(actButtons)) if (name !== "apart") button.dataset.state = "";
  if (text) announce(text);
}

// The state of every light and moving part this frame, from the active behaviour.
function behaviour(dt, calm = false) {
  const s = {
    rocker: 0,
    rockerOn: -1,
    voice: 0,
    tubes: 0,
    spin: 0.6,
    orbit: 0.35,
    twitch: 0,
    lamps: 0,
    eyes: 1,
    door: 0,
    drum: 0,
    arcs: 0,
    pilot: 1,
    latched: 0,
    scan: 0,
    text: null,
    jitter: 0,
  };
  const t = act.t;
  if (act.mode === "arming") {
    s.text = "closing up · arming";
    if (!moving() && !apart) start(act.armedFor, touring);
    return s;
  }
  if (act.speech) {
    // The relay keys strike in turn before he speaks; then the neon follows the voice.
    const lead = 0.9;
    const ts = t - act.speech.at;
    if (ts < lead) {
      const k = Math.floor((ts / lead) * 18);
      s.rockerOn = k % 6;
      s.rocker = 1;
      s.lamps = (k % 2) * 1;
      s.twitch = Math.sin(ts * 40) * 0.8;
      s.orbit = 1.4;
      s.text = act.mode === "speak" ? "relays · composing" : s.text;
    } else {
      const track = act.speech;
      const local = ts - lead;
      let level = 0;
      let word = -1;
      for (const event of track.events) {
        level = Math.max(level, event.strength * pulse(local - event.t, 0.04, 0.09));
        if (local >= event.t) word = event.word;
      }
      s.voice = calm ? 0.7 : level;
      s.tubes = calm ? 0.7 : level;
      s.lamps = level > 0.5 ? 1 : 0;
      if (act.mode === "speak") s.text = "“" + track.words.slice(0, word + 1).join(" ") + "”";
      if (local > track.length) {
        if (act.mode === "speak") finish("idle");
        else act.speech = null;
      }
    }
  }
  if (act.mode === "make") {
    const r = RECIPES[act.recipe];
    const open = smoothstep(0, 0.6, t) * (1 - smoothstep(1.8, 2.4, t));
    s.door = open * 1.35;
    if (t < 2.2) s.text = "sample door open · " + r.sample;
    else if (t < 4.2) {
      s.drum = 1;
      s.orbit = 1.2;
      s.twitch = Math.sin(t * 22) * 0.5;
      s.text = "analyzing · " + r.finding;
    } else if (r.slow) {
      if (!act.speech && t < 4.3) act.speech = speechTrack(r.line, t);
      s.text = r.done;
      if (t > 7.5) finish("star sapphires take a week");
    } else {
      if (!act.speech && t < 4.3) act.speech = speechTrack(r.line, t);
      const runT = clamp((t - 4.2) / 5, 0, 1);
      act.run = r.total * ease(runT);
      s.drum = 0.6;
      s.text = runT < 1 ? `pattern held · ${fmt(act.run, r.digits)} / ${fmt(r.total, r.digits)} ${r.unit}` : r.done;
      if (t > 10.6) finish("done · " + r.done);
    }
  }
  if (act.mode === "harm") {
    // Morbius: point it at the commander, between the eyes, fire. The order meets the
    // inhibition against harming rational beings; the relays latch until he cancels.
    const cancelAt = RECHARGE;
    if (t < 0.9) s.text = "order · aim between the eyes · fire";
    else if (t < cancelAt) {
      const stress = smoothstep(0.9, cancelAt, t);
      act.latched = Math.round(RELAYS * stress);
      s.latched = stress;
      s.arcs = 0.25 + stress * 0.7;
      s.spin = 4 + stress * 10;
      s.orbit = 2 + stress * 4;
      s.twitch = Math.sin(t * 61) * (0.6 + stress);
      s.rockerOn = Math.floor(t * 30) % 6;
      s.rocker = 1;
      s.lamps = Math.floor(t * 14) % 2;
      s.eyes = Math.floor(t * 9) % 2;
      s.tubes = 0.25 + 0.4 * ((Math.sin(t * 47) + 1) / 2);
      s.pilot = Math.floor(t * 11) % 3 ? 1 : 0;
      s.jitter = stress;
      s.text = `sub-electronic dilemma · ${fmt(act.latched)} of ${fmt(RELAYS)} relays latched`;
    } else if (t < cancelAt + 1.4) {
      const fade = 1 - smoothstep(cancelAt, cancelAt + 0.6, t);
      s.latched = fade;
      s.spin = 0.6 + fade * 4;
      s.arcs = fade * 0.3;
      s.text = "cancel · relays D-12,000–18,500 clear";
    } else finish("order cancelled");
  }
  if (act.mode === "scan") {
    const up = t < 5.4 ? 1 : 0;
    s.scan = up;
    act.scanAngle += dt * 1.6;
    const bearing = ((((-act.scanAngle * 180) / Math.PI) % 360) + 360) % 360;
    if (t < 1.2) s.text = "radar mast up";
    else if (t < 4) s.text = `scanning · bearing ${fmt(bearing)}°`;
    else if (t < 5.4) s.text = "something approaching · southwest · now quite close";
    else s.text = "mast stowed";
    if (t > 6.6) finish("scan complete");
  }
  return s;
}

// ---------------------------------------------------------------- the tour, the loop
const TOUR = [
  { at: 0, run: () => start("speak", true) },
  { at: 5.2, run: () => { setApart(true); select(null); } },
  ...ORDER.slice(0, 7).map((id, index) => ({ at: 6.2 + index * 1.25, run: () => select(id) })),
  { at: 15.2, run: () => { select(null); setApart(false); } },
  { at: 16.8, run: () => { recipeSelect.value = "bourbon"; start("make", true); } },
  { at: 28.2, run: () => start("scan", true) },
  { at: 35.4, run: () => start("harm", true) },
  { at: 43, run: () => {} },
];
const TOUR_LENGTH = 44;
let tourStep = 0;
function stepTour(dt) {
  const before = tourClock;
  tourClock += dt;
  if (tourClock >= TOUR_LENGTH) {
    tourClock -= TOUR_LENGTH;
    tourStep = 0;
  }
  while (tourStep < TOUR.length && TOUR[tourStep].at <= tourClock) {
    if (TOUR[tourStep].at > before || tourStep === 0) TOUR[tourStep].run();
    tourStep++;
  }
}
function quietTour() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (inside || act.mode !== "idle") return quietTour();
    touring = !still.matches;
    tourClock = -0.6;
    tourStep = 0;
    run();
  }, 6000);
}

const ear = { L: 0, R: 0 };
let spin = 0;
let orbit = 0;
let drumPhase = 0;
let star = 0;
let quad = 0;
let needle = { x: 0, v: 0 };
let doorAngle = { x: 0, v: 0 };
let mastUp = { x: 0, v: 0 };
let keyPhase = 0;

function settleTo(state, target, dt, seconds, calm) {
  if (calm) {
    state.x = target;
    state.v = 0;
    return;
  }
  const w = 1 / seconds;
  for (let index = 0; index < 4; index++) {
    const h = dt / 4;
    state.v += (w * w * (target - state.x) - 2 * w * state.v) * h;
    state.x += state.v * h;
  }
}

function draw(s, dt, calm) {
  const speed = calm ? 0 : 1;
  spin += dt * s.spin * speed;
  orbit += dt * s.orbit * speed;
  ear.L += dt * (s.jitter ? 9 : 3.4) * speed;
  ear.R -= dt * (s.jitter ? 7 : 2.6) * speed;
  drumPhase += dt * s.drum * 2.4 * speed;
  star = calm ? 0 : Math.sin(clock * 2.2) * 0.35;
  quad += dt * 1.6 * speed;
  keyPhase += dt * speed;
  settleTo(needle, s.voice, dt, 0.06, calm);
  settleTo(doorAngle, s.door, dt, 0.18, calm);
  settleTo(mastUp, s.scan, dt, 0.35, calm);

  html(parts.gyro, gyroSvg(spin, orbit, calm ? 0 : s.arcs));
  html(parts.earL, earSvg(D.ears.L, ear.L));
  html(parts.earR, earSvg(D.ears.R, ear.R));
  html(parts.varms, vArmsSvg(s.twitch));
  html(parts.door, doorSvg(doorAngle.x));
  html(parts.star, starSvg(star));
  html(parts.quad, quadSvg(quad));
  html(parts.drum, drumSvg(drumPhase));
  write(parts.needle, "d", needlePath(needle.x));
  const extend = mastUp.x * D.mast.stroke;
  write(parts.mast, "transform", extend > 0.01 ? K.translateAlong(P, [0, 0, extend]) : null);
  html(parts.radar, radarSvg(extend, act.scanAngle, smoothstep(0.35, 0.9, mastUp.x)));
  on(parts.pilot, s.pilot > 0.5);
  on(parts.lampL, s.lamps > 0.5);
  on(parts.lampR, s.lamps > 0.5 && !(s.rockerOn % 2));
  const blink = calm ? 1 : clock % 3.4 < 3.25 ? 1 : 0;
  on(parts.eyeL, s.eyes && blink);
  on(parts.eyeR, s.eyes && blink);
  on(parts.consoleLamp, s.voice > 0.12);
  parts.tubes.forEach((tube, index) => {
    const pick = s.tubes > 0 && (s.jitter ? Math.sin(clock * 37 + index * 2.1) > 0 : Math.sin(index * 1.7 + Math.floor(clock * 7) * 0.9) > 0.55 - s.tubes * 1.6);
    on(tube, pick && s.tubes > 0.06);
    if (pick) tube.style.setProperty("--glow", clamp(s.tubes * 1.1, 0.25, 1).toFixed(2));
  });
  parts.rockers.forEach((rocker, index) => {
    const dz = index === s.rockerOn ? 0.9 : 0;
    write(rocker, "transform", dz ? K.translateAlong(P, [0, 0, dz]) : null);
  });
  parts.keys.forEach((key, index) => {
    const out = calm ? 0 : 0.35 * (0.5 + 0.5 * Math.sin(keyPhase * 2.3 + index * 1.3)) * (s.drum || s.voice ? 1.6 : 1);
    write(key, "transform", out > 0.02 ? K.translateAlong(P, [0, out, 0]) : null);
  });
  const latched = Math.round(s.latched * parts.leds.length);
  parts.leds.forEach((led, index) => on(led, index < latched));
}

function idleText() {
  if (selected) return D.pieces[selected].say;
  if (act.mode === "arming") return "closing up · arming";
  if (moving()) return apart ? "taking apart" : "closing up";
  return apart ? "apart · 5 assemblies lift away" : "214 cm · 187 languages · idle";
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  if (touring) stepTour(dt);
  if (act.mode !== "idle") act.t += dt;
  for (const id of IDS) stepSpring(spring[id], dt, calm);
  place();
  const s = behaviour(dt, calm);
  draw(s, dt, calm);
  say(s.text ?? idleText());
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
  if (calm && (moving() || act.mode !== "idle")) frame = requestAnimationFrame(tick);
}
function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

// ---------------------------------------------------------------- input
function pieceAt(event) {
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const item = hit && hit.closest ? hit.closest(".it") : null;
  return item ? item.dataset.piece : null;
}
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  inside = true;
  clearTimeout(leaveTimer);
  quietTour();
  if (act.mode !== "idle" && act.mode !== "arming") return;
  if (act.mode === "arming") return;
  setApart(true);
  select(pieceAt(event));
  run();
});
stage.addEventListener("pointerleave", () => {
  inside = false;
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => {
    if (inside) return;
    select(null);
    setApart(false);
  }, 260);
});
stage.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch") return;
  quietTour();
  if (act.mode !== "idle") return;
  const id = pieceAt(event);
  if (!id || (id === "stand" && !apart)) {
    select(null);
    setApart(!apart);
  } else {
    setApart(true);
    select(id);
  }
  run();
});
for (const [name, button] of Object.entries(actButtons)) {
  button.addEventListener("click", () => {
    quietTour();
    if (name === "apart") {
      if (act.mode !== "idle") finish("");
      select(null);
      setApart(!apart);
      return;
    }
    if (act.mode === name) return;
    start(name);
  });
}
partButtons.forEach((button) => {
  const show = () => {
    if (act.mode !== "idle") return;
    quietTour();
    clearTimeout(leaveTimer);
    setApart(true);
    select(button.dataset.part);
    run();
  };
  const hide = () => {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      if (inside || partButtons.some((other) => other.matches(":hover, :focus-visible"))) return;
      select(null);
      setApart(false);
    }, 260);
  };
  button.addEventListener("pointerenter", show);
  button.addEventListener("focus", show);
  button.addEventListener("pointerleave", hide);
  button.addEventListener("blur", hide);
  button.addEventListener("click", show);
});
stage.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const index = selected ? ORDER.indexOf(selected) : -1;
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(ORDER.length - 1, index + 1);
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = Math.max(0, index - 1);
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = ORDER.length - 1;
  else if (event.key === "Escape") {
    event.preventDefault();
    quietTour();
    finish("");
    select(null);
    setApart(false);
    return;
  } else if (key === "s" || key === "m" || key === "h" || key === "r") {
    event.preventDefault();
    start({ s: "speak", m: "make", h: "harm", r: "scan" }[key]);
    return;
  } else if (event.key === " ") {
    event.preventDefault();
    quietTour();
    if (act.mode !== "idle") finish("");
    select(null);
    setApart(!apart);
    return;
  }
  if (next === null || act.mode !== "idle") return;
  event.preventDefault();
  quietTour();
  setApart(true);
  select(ORDER[next]);
  run();
});
stage.addEventListener("focus", () => announce(apart ? "apart" : "assembled, idle"));

const narrow = matchMedia("(hover: none), (max-width: 480px)");
const wording = () => hint && (hint.textContent = narrow.matches ? "Tap to take apart" : "Hover to take apart");
wording();
narrow.addEventListener("change", wording);
if (still.matches) touring = false;
place();
draw(behaviour(0), 0, true);
say(idleText());
