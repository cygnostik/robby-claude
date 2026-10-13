// The page around Fig 1: header, the figure card with its controls, and the dossier.
import { ISO_CSS } from "../vendor/anatomy/kit/iso-kit.mjs";
import { DOSSIER, HEADER } from "./dossier.mjs";

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

export const PAGE_CSS = `
:root{
  --pg-bg:#e9ebec;--pg-ink:#17191c;--pg-text:#3d4248;--pg-muted:#6a7077;--pg-rule:#c9cdd1;--pg-card:#f7f8f8;
  --pg-accent:#2459c4;--pg-canon:#2459c4;--pg-script:#9a6a07;--pg-prop:#3d4248;--pg-spec:#a33a32;
  --pg-chip:#ffffff;--pg-quote:#dfe3e6;
  --pg-display:"Big Shoulders Display","Arial Narrow",Impact,sans-serif;
  --pg-serif:"Source Serif 4",Georgia,"Times New Roman",serif;
  --pg-mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;
  --pg-sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --pg-bg:#0b0c0d;--pg-ink:#eceef0;--pg-text:#b9bec4;--pg-muted:#7d838a;--pg-rule:#24272b;--pg-card:#131313;
  --pg-accent:#86b6ff;--pg-canon:#86b6ff;--pg-script:#e3b562;--pg-prop:#c9cdd1;--pg-spec:#ff8a80;
  --pg-chip:#16181a;--pg-quote:#1b1e21;color-scheme:dark}}
:root[data-theme="dark"]{
  --pg-bg:#0b0c0d;--pg-ink:#eceef0;--pg-text:#b9bec4;--pg-muted:#7d838a;--pg-rule:#24272b;--pg-card:#131313;
  --pg-accent:#86b6ff;--pg-canon:#86b6ff;--pg-script:#e3b562;--pg-prop:#c9cdd1;--pg-spec:#ff8a80;
  --pg-chip:#16181a;--pg-quote:#1b1e21;color-scheme:dark}
body{background:var(--pg-bg);color:var(--pg-text);font:17px/1.6 var(--pg-serif);margin:0}
.pg{max-width:1080px;margin:0 auto;padding-inline:20px;padding-block:28px 72px}
.pg *{box-sizing:border-box}
.pg a{color:var(--pg-accent);text-underline-offset:2px}
.pg h1,.pg h2,.pg h3{color:var(--pg-ink);text-wrap:balance}
.iso{--anatomy-page:var(--pg-bg)}
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
  const corners = `<div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Fig 1</span><span class="iso-plate-corner" data-corner="title">Robby · Altair IV pattern</span><span class="iso-plate-corner" data-corner="hint" data-hint>Hover to take apart</span><span class="iso-plate-corner" data-corner="readout" data-readout>214 cm · idle</span></div>`;
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
  const stageHtml = `<div class="rb-stage" tabindex="0" role="slider" aria-label="Robby the Robot. Hover or use the arrow keys to take him apart assembly by assembly. S speaks, M synthesizes the chosen sample, H gives the order to harm a man, R scans, Escape puts him back together." aria-valuemin="0" aria-valuemax="${order.length}" aria-valuenow="0" aria-valuetext="Assembled, idle">${stage.backSvg}${stage.frontSvg}</div>`;
  const figure = `<figure class="iso-figure rb"><div class="iso-plate">${corners}${stageHtml}</div><figcaption class="iso-legend">${controls}<span class="rb-parts">${parts}</span><span class="iso-caption">${DOSSIER.caption}</span></figcaption></figure>`;
  const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">`;
  const styles = `<style>${ISO_CSS}${THEME_CSS}${PAGE_CSS}${DOSSIER.css}${css}</style>`;
  const body = `<main class="pg iso">${HEADER}${figure}${DOSSIER.html}</main><script type="module">${script}</script>`;
  const title = "<title>Robby the Robot Anatomy</title>";
  if (fragment) return `${title}${fonts}${styles}${body}`;
  const rootTheme = theme === "auto" ? "" : ` data-theme="${theme}"`;
  return `<!doctype html><html lang="en"${rootTheme}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${title}${fonts}${styles}</head><body>${body}</body></html>`;
}
