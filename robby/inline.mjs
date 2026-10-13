// Inlines the kit modules the page needs to rebuild moving parts each frame, each in
// its own namespace (K: iso-kit, G: lathe, T: tube, X: hexa) so names don't collide.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..", "vendor", "anatomy", "kit");

function exportsOf(source) {
  const names = new Set();
  for (const match of source.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(match[1]);
  return [...names];
}

function wrap(name, source, prelude = "") {
  const body = source.replace(/^import[^;]*;\s*$/gm, "").replace(/^export\s+/gm, "");
  return `const ${name} = (() => {\n${prelude}\n${body}\nreturn { ${exportsOf(source).join(", ")} };\n})();\n`;
}

export function bundle() {
  const iso = readFileSync(join(KIT, "iso-kit.mjs"), "utf8");
  const lathe = readFileSync(join(KIT, "lathe.mjs"), "utf8");
  const tube = readFileSync(join(KIT, "tube.mjs"), "utf8");
  const hexa = readFileSync(join(HERE, "hexa.mjs"), "utf8");
  return [
    wrap("K", iso),
    wrap("G", lathe, "const { cameraOf, iso, pathOf } = K;"),
    wrap("T", tube, "const { iso, pathOf } = K;"),
    wrap("X", hexa, "const { iso, pathOf } = K; const { viewOf, lightOf, bandOf, dot3, sub3, cross3, unit3, hullOf } = G;"),
  ]
    .join("\n")
    .replace(/<\/script/gi, "<\\/script")
    .replace(/<!--/g, "<\\!--");
}
