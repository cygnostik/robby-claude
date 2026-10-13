# Robby the Robot Anatomy

An interactive, researched anatomy of Robby the Robot from *Forbidden Planet* (MGM, 1956). The page has two parts:

- **Fig 1** is a live isometric drawing of Robby, built from about 200 solid parts. He stands on a turntable dais beside MGM's rolling control panel, with a height gauge behind him. You can take him apart, and four buttons run his behaviours:
  - **Speak**: the six relay keys strike, then the blue neon voice tubes light syllable by syllable while the console's VU needle follows the voice.
  - **Synthesize**: the sample door opens, the analyzer runs, and he produces one of the products he makes on screen (60 gallons of bourbon, 10 tons of isotope 217, emeralds, or a refusal for star sapphires).
  - **Order: fire on a man**: the inhibition latches the 6,501 relays D-12,000 to D-18,500 until the order is cancelled.
  - **Scan**: the radar mast from the 1954 shooting script rises out of the clear shell.
- **The dossier** goes system by system and tags every claim by where it comes from:
  - the released film
  - Cyril Hume's 1954 shooting script
  - the physical prop (build, restoration, auction)
  - our own engineering reading, marked *Speculative*

  It also includes the inhibition logic, a ledger of everything Robby synthesizes, the build history from 1954 to 2017, spec sheets for the prop and the character, and sources.

Open `robby/robby.html` in a browser. It follows the system light or dark theme.

## Build

Requires Node.js 20+.

```sh
node robby/build.mjs            # writes robby/robby.html and robby/artifact.html
node robby/build.mjs --light    # robby/robby-light.html, forced light theme
node robby/build.mjs --audit    # also runs the geometry audit; ends "audit passed"
```

Checks, with Chrome or Chromium on `CHROME_PATH`:

```sh
node vendor/anatomy/scripts/lines.mjs robby/robby.html --reduced    # every line ends on something: "line ends: 0"
node vendor/anatomy/scripts/capture.mjs robby/robby.html --out shot.png
```

## Files

| File | What it holds |
|---|---|
| `robby/shape.mjs` | Analytic profiles for every turned body, in centimetres |
| `robby/build.mjs` | The geometry: stage, legs, pelvis, lab core, chest, arms, head and hood, gyro tower, clear shell, console and cable, plus the audit |
| `robby/live.js` | Explode springs, selection, the four behaviours, and the parts rebuilt every frame |
| `robby/hexa.mjs` | Six-faced solids that swing (the sample-door flap, the ivory V-arms), and convex solids from faces (the collar, the hood, the cheeks) |
| `robby/dossier.mjs` | The research text, the tables and the sources |
| `robby/page.mjs`, `robby/robby.css` | Page shell, theme handling, figure styles |
| `vendor/anatomy/` | Drawing kit and check scripts from the Anatomy skill (MIT, see its LICENSE) |

## How the drawing was made

- **Proportions:** taken from ArthMat's dimensioned CAD drawing of Robby (2013, in inches), scaled to the 214 cm height Wikipedia gives. Part names follow MGM's construction sheet.
- **The head:** photographs of replicas and renders of the clear shell show where the plastic stops. It covers the cap of the bullet-shaped head and runs down the front as a window. A black hood makes the cheeks and back, and carries the ears and comb fins.
- **Reference images:** the supplied drawings and photographs are kept out of the repository (`Robby-Finds/` is ignored).
- **Console:** follows the dimensions in the Bonhams lot.
- **Shapes:** every turned body uses an analytic profile, and every part records its true shape. The audit proves that nothing passes through anything at rest, apart, or in any frame of the explode, and that every overlap is drawn in true depth order.

The drawing kit is from [Anatomy, a skill for Claude Code](https://skills.wheresryan.sh/anatomy) by Ryan, used under its MIT license.
