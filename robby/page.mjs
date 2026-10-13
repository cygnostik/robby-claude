// The page around Fig 1: header, the figure card with its controls, and the dossier.
import { ISO_CSS } from "../vendor/anatomy/kit/iso-kit.mjs";
import { DOSSIER, HEADER, FACTS } from "./dossier.mjs";

const LIGHT_ISO = (() => {
  const match = ISO_CSS.match(/\.iso\[data-theme="light"\]\{([^}]*)\}/);
  return match ? match[1] : "";
})();

// Theme follows the viewer: light values under prefers-color-scheme light (unless the host
// forces dark), and under an explicit data-theme="light" on the root.
const THEME_CSS = `
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]) .iso{${LIGHT_ISO}}}
:root[data-theme="light"] .iso{${LIGHT_ISO}}
`;

// A 1950s palette: cream paper, navy ink, atomic coral, teal and mustard by day; a navy
// night sky with mint and mustard after dark. Type: a Futura-like geometric (Jost), a
// sign-painter's script for the name (Yellowtail), and a typewriter mono (Space Mono).
const DAY = `--pg-bg:#efe6d2;--pg-ink:#14213d;--pg-text:#3a4152;--pg-muted:#77715f;--pg-rule:#d8ccb0;--pg-card:#f8f2e4;
  --pg-accent:#0f6e6f;--pg-canon:#0f6e6f;--pg-script:#9a6200;--pg-prop:#3a4152;--pg-spec:#c2412b;
  --pg-chip:#fbf7ee;--pg-quote:#e6dcc4;--pg-coral:#e4572e;--pg-teal:#127475;--pg-mustard:#e3a72f;`;
const NIGHT = `--pg-bg:#0b1324;--pg-ink:#f3ead6;--pg-text:#c3c7cf;--pg-muted:#8a93a6;--pg-rule:#22304b;--pg-card:#101b31;
  --pg-accent:#6fd6c0;--pg-canon:#6fd6c0;--pg-script:#f2c14e;--pg-prop:#c3c7cf;--pg-spec:#ff8466;
  --pg-chip:#13203a;--pg-quote:#17243f;--pg-coral:#ff7a59;--pg-teal:#6fd6c0;--pg-mustard:#f2c14e;color-scheme:dark;`;
export const PAGE_CSS = `
:root{
  ${DAY}
  --pg-display:"Jost",Futura,"Century Gothic","Avenir Next",sans-serif;
  --pg-hand:"Yellowtail","Brush Script MT",cursive;
  --pg-serif:"Source Serif 4",Georgia,"Times New Roman",serif;
  --pg-mono:"Space Mono",ui-monospace,Menlo,Consolas,monospace;
  --pg-sans:"Jost",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${NIGHT}}}
:root[data-theme="dark"]{${NIGHT}}
body{background:var(--pg-bg);color:var(--pg-text);font:17px/1.6 var(--pg-serif);margin:0}
.pg{max-width:1080px;margin:0 auto;padding-inline:20px;padding-block:28px 72px}
.pg *{box-sizing:border-box}
.pg a{color:var(--pg-accent);text-underline-offset:2px}
.pg h1,.pg h2,.pg h3{color:var(--pg-ink);text-wrap:balance}
.iso{--anatomy-page:var(--pg-bg);--anatomy-mono:var(--pg-mono);--rb-sans:var(--pg-sans)}
`;

// Re-key a ".x-light-tokens{...}" block onto the viewer's light theme for the selector given.
function lightThemed(css, marker, selector) {
  const match = css.match(new RegExp(`\\.${marker}\\s*\\{([^}]*)\\}`));
  if (!match) return css;
  const body = match[1];
  return css.replace(match[0], `@media (prefers-color-scheme: light){:root:not([data-theme="dark"]) ${selector}{${body}}}\n:root[data-theme="light"] ${selector}{${body}}`);
}

export function pageOf({ theme, css: rawCss, stage, script, pieces, fragment = false }) {
  const css = lightThemed(rawCss, "rb-light-tokens", ".rb");
  const order = ["dome", "brain", "head", "chest", "core", "armR", "pelvis", "legs", "stand"];
  const parts = order
    .map((id, index) => `<button type="button" class="rb-part" data-part="${id}"><span class="rb-num">${String(index + 1).padStart(2, "0")}</span>${pieces[id].name}</button>`)
    .join("");
  const corners = `<div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Fig 1</span><span class="iso-plate-corner" data-corner="title">Robby · Altair IV pattern</span><span class="iso-plate-corner" data-corner="hint" data-hint>Click to take apart</span><span class="iso-plate-corner" data-corner="readout" data-readout>214 cm · idle</span></div>`;
  const controls = `<div class="rb-controls">
<button type="button" class="rb-act" data-act="speak"><span class="rb-act-lamp" aria-hidden="true"></span>Speak</button>
<button type="button" class="rb-act" data-act="make"><span class="rb-act-lamp" aria-hidden="true"></span>Synthesize</button>
<label class="rb-visually" for="rb-recipe">Sample</label>
<select class="rb-select" id="rb-recipe" data-recipe>
<option value="bourbon">Bourbon · 60 gal</option>
<option value="isotope">Isotope 217 · 10 t</option>
<option value="emerald">Emeralds · 5, 10, 15 ct</option>
<option value="sapphire">Star sapphires</option>
</select>
<button type="button" class="rb-act" data-act="harm" data-kind="harm"><span class="rb-act-lamp" aria-hidden="true"></span>Order: fire on a man</button>
<button type="button" class="rb-act" data-act="scan"><span class="rb-act-lamp" aria-hidden="true"></span>Scan</button>
<button type="button" class="rb-act" data-act="apart" aria-pressed="false"><span class="rb-act-lamp" aria-hidden="true"></span>Take apart</button>
<span class="rb-live" aria-live="polite" data-live></span>
</div>`;
  const stageHtml = `<div class="rb-stage" tabindex="0" role="slider" aria-label="Robby the Robot. Click a part, or use the arrow keys, to take him apart assembly by assembly. S speaks, M synthesizes the chosen sample, H gives the order to harm a man, R scans, Escape puts him back together." aria-valuemin="0" aria-valuemax="${order.length}" aria-valuenow="0" aria-valuetext="Assembled, idle">${stage.backSvg}${stage.frontSvg}</div>`;
  // Controls sit above the drawing and stay in reach while it is on screen; the parts list
  // and the caption read below it.
  const figure = `<figure class="iso-figure rb">${controls}<div class="iso-plate">${corners}${stageHtml}</div><figcaption class="iso-legend"><span class="rb-parts">${parts}</span><span class="iso-caption">${DOSSIER.caption}</span></figcaption></figure>`;
  const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600;1,800&family=Yellowtail&family=Space+Mono:wght@400;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">`;
  const styles = `<style>${ISO_CSS}${THEME_CSS}${PAGE_CSS}${DOSSIER.css}${css}</style>`;
  const body = `<main class="pg iso">${HEADER}${figure}${FACTS}${DOSSIER.html}</main><script type="module">${script}</script>`;
  const title = "<title>Robby the Robot Anatomy</title>";
  if (fragment) return `${title}${fonts}${styles}${body}`;
  const rootTheme = theme === "auto" ? "" : ` data-theme="${theme}"`;
  return `<!doctype html><html lang="en"${rootTheme}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${title}${fonts}${styles}</head><body>${body}</body></html>`;
}
