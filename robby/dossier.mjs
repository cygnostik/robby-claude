// The research around Fig 1. Every claim carries a tag for where it comes from:
// film (the 1956 release), script (Cyril Hume's 1954 shooting script), prop (the MGM build,
// its restoration and sale) and spec (our engineering reading, not shown on screen).

const tag = (kind) => `<span class="tag" data-src="${kind}">${{ film: "Film", script: "1954 script", prop: "Prop", spec: "Speculative" }[kind]}</span>`;
const cite = (...numbers) => `<sup class="cite">${numbers.map((n) => `<a href="#src-${n}">${n}</a>`).join(",")}</sup>`;
const q = (text) => `<q>${text}</q>`;

export const HEADER = `
<header class="pg-head">
  <p class="pg-eyebrow">Anatomy · <i>Forbidden Planet</i>, MGM 1956</p>
  <h1 class="pg-title"><span class="pg-title-name">Robby</span> <span class="pg-title-hand">the Robot</span></h1>
</header>`;

// The numbers and the source key, read after the figure.
export const FACTS = `
<section class="pg-facts" aria-label="Robby in numbers">
  <p class="pg-dek">How the machine works, twice over. MGM built him in 1955 as a three-piece suit with a stuntman inside and a cable running out of his heel. On screen he is Dr. Morbius's servant on Altair IV, with a chemical laboratory in his belly and an inhibition that no order can override. This page draws both, and tags every claim by where it comes from.</p>
  <dl class="pg-stats">
    <div><dt>Height</dt><dd>214<small> cm</small></dd><span>just over 7 ft${cite(3)}</span></div>
    <div><dt>Suit</dt><dd>45–54<small> kg</small></dd><span>100–120 lb, carried on a shoulder harness${cite(4, 10)}</span></div>
    <div><dt>Cost in 1955</dt><dd>$100–125<small>k</small></dd><span>about 7% of the film's budget${cite(3)}</span></div>
    <div><dt>Languages</dt><dd>187</dd><span>plus dialects and sub-tongues${cite(1)}</span></div>
    <div><dt>Inhibition bank</dt><dd>6,501</dd><span>relays D-12,000 to D-18,500${cite(2)}</span></div>
    <div><dt>Sold</dt><dd>$5.375<small>M</small></dd><span>Bonhams New York, 21 Nov 2017${cite(4, 12)}</span></div>
  </dl>
  <ul class="pg-key" aria-label="Where claims come from">
    <li>${tag("film")} what the released film shows or says</li>
    <li>${tag("script")} Cyril Hume's shooting script, Aug–Sep 1954</li>
    <li>${tag("prop")} the physical MGM build, its restoration and sale</li>
    <li>${tag("spec")} our engineering reading; not on screen</li>
  </ul>
</section>`;

const systems = [
  {
    n: "01",
    title: "Clear shell and ears",
    rows: [
      ["prop", `MGM's construction sheet calls it the ${q("clear plastic dome")}${cite(16)}, but it is not a dome. The head is a bullet 17.34 in across and about 21 in tall on ArthMat's dimensioned drawing, standing on a brim cut on a slant: 4.45 in above the chest at the back and 7.19 in at the front${cite(15)}. The Plexiglas covers the whole upper part of that bullet. Below the ears it runs on down the front only, as a window over the keys, between the cheeks of a black hood that makes the sides and back${cite(15, 17)}. Seen past the glare in photographs, the clear part is a cap with a tongue hanging down the front.`],
      ["prop", `The model shop's schedule gave the plastic dome three weeks, 15 February to 8 March 1955${cite(7)}. When Fred Barton first saw the prop in 1973 it had yellowed${cite(6)}.`],
      ["script", `Robby turns his whole dome through 180 degrees to face his passengers, and ${q("a small radar antenna has come up out of Robby's dome, and is slowly rotating")} when he scans for Altaira${cite(2)}. No photograph of the prop that we found shows one, so the figure leaves it out.`],
      ["film", `He reports ${q("Something is approaching from the southwest. It is now quite close.")} The monster arrives minutes later${cite(1)}.`],
      ["spec", `Altair IV's air is high in oxygen, and Robby says it ${q("promotes rust")}${cite(1)}. A sealed shell keeps the key chassis and gyros out of it. Take the figure apart and the clear shell lifts off whole, so its shape can be read on its own.`],
    ],
  },
  {
    n: "02",
    title: "Gyro tower and pilot lamp",
    rows: [
      ["prop", `MGM's sheet labels the top of the head ${q("revolving gadgets")}${cite(16)}. Inside the glass: a pilot light at the very top, three white wire-frame spheres that orbit in planetary fashion to represent gyroscopic stabilizers, and a pair of reciprocating arms in an inverted V${cite(3)}. Barton's replica, moulded from the original, mounts the gyros on a spun brass bell under a heat sink and lamp housing${cite(5)}. The mechanisms were loud when powered up${cite(3)}.`],
      ["prop", `Photographs of the original at the 2017 auction preview show each gyro as an ivory wire disc, about 8 cm across, of concentric rings crossed by two hoops. Each rides on an arm from a black knob on the bell's flank, and the lamp sits in a clear egg-shaped cage on top of a stack of chrome fins${cite(18)}. The figure leaves out the inverted-V arms, so the gyros fill the cap and read clearly.`],
      ["script", `Robby calls his built-in reflexes ${q("infallible")} and drives Morbius's car fast enough that the Doc begs him to keep it under ninety${cite(2)}.`],
      ["spec", `A seven-foot walker on small, stiff steps needs a balance reference. Read as working parts, the three gyros are rate sensors on one carrier, and the figure spins them faster whenever Robby is computing: when he composes speech, analyses a sample, or fights an order.`],
    ],
  },
  {
    n: "03",
    title: "Head: voice tubes and key chassis",
    rows: [
      ["prop", `Behind the window the hood is flat and black, with vent slots and six relay units: cream bobbin drums between black flanges, each with a chrome lever like a typewriter's typebar or a saxophone key, pushed by a clear rod hanging from a rod of amber glass beads. Below them, clear Lucite rods bend down into finned stacks and a finned glass cylinder, the optical plumbing, which glows blue-white when lit. A large red domed lamp sits at each end${cite(17, 18)}. Above the hood the same black chassis carries the gyro tower on its top deck, inside the clear cap${cite(15, 17)}. Comb fins stand out from each cheek between the brim and the ears${cite(15)}. The brim is not a flat ring. It is a narrow rolled lip that flares out of the hood across the front only and dives steeply to the chest just behind the sides, so from the front it reads as an arch over the voice window${cite(15, 18)}.`],
      ["prop", `The mouth is a collar of parallel thin blue neon tubes, MGM's ${q("voice tubes")}${cite(16)}, that light in step with his speech. The same grille let the operator see out and breathe${cite(3)}. On set an off-camera actor spoke into a microphone, and a voice-actuated circuit ran through a cable into Robby's foot, up a leg, to the neon. Marvin Miller re-recorded the voice afterwards${cite(3)}.`],
      ["prop", `The ears are two rotating chrome rings, MGM's ${q("rotating rings")}${cite(16)}, one on a horizontal shaft and one on a post. The post stands upright on MGM's sheet, on the CAD drawing and in every photograph; the CAD's 30-degree mark is the angle between the two fins on that ear${cite(15, 16, 18)}. The eyes are two small blinking lights on cones, and across the front sits a row of levers like saxophone keys${cite(3)}. On the drawings and replicas the cones are the ear hubs on the hood's cheeks, so the eyes look forward from either side of the window. The fins are flat clear acrylic, not spikes. Robby's right ear, on the horizontal shaft, carries two open petals standing up in a V. His left ear, on the post, carries two swept fins pointing outward in a 30-degree V${cite(15, 17, 18)}. On Barton's replica six relays strike in turn, three times each, just before Robby speaks${cite(5)}.`],
      ["script", `Asked how he drives without looking, Robby answers ${q("I do everything by positronic transfiguration")}, and winks several lights to prove it${cite(2)}.`],
      ["spec", `Two scanners on crossed axes sweep a whole sphere between them, which is why one turns horizontally and one vertically. The six keys read as the output stage of a speech composer: they strike, then the neon carries the words.`],
    ],
  },
  {
    n: "04",
    title: "Chest barrel and indicator panel",
    rows: [
      ["film", `Morbius demonstrates: ${q("One introduces a sample of human food through this aperture. Down here there's a small built-in chemical laboratory where he analyzes it.")} Later Robby reproduces the molecules ${q("in any shape or quantity")}${cite(1)}.`],
      ["script", `The aperture is ${q("jaw-like")}, and reproduction happens ${q("right in his own workshop")}${cite(2)}.`],
      ["prop", `The barrel shape is a nod to Kinoshita's earlier work designing washing machines. Below the sample door sit two rotating discs with flashing lights and a row of five buttons that move in and out${cite(3)}. Barton calls this the heart box: an oscillating acrylic star, a brass quad light that turns, and pulsating piano keys${cite(5)}. MGM's sheet names the whole box the ${q("analyzing hopper & indicator panel")}${cite(16)}. It is 10.74 in wide on the CAD drawing, standing proud of a barrel 16.5 in tall${cite(15)}.`],
      ["prop", `On the original the panel is moulded in the body's own dark lacquer and framed by a chain of beads. Inside it, from the top: a dark hopper mouth, a convex roll-top door, a ledge, then a faceted clear lens holding a four-pointed star beside a brass disc with four chrome rivets on a diamond, and four narrow dark keys in slots${cite(16, 18)}.`],
      ["prop", `Wikipedia counts five buttons${cite(3)}. The CAD drawing, MGM's sheet and the replicas we followed all show four, and so does the figure${cite(15, 16, 17)}.`],
      ["spec", `In the figure the door drops like a jaw into a small tray, the throat behind it feeds the analyzer drum in the core, and the keys stand out further while the lab is working.`],
    ],
  },
  {
    n: "05",
    title: "Laboratory core",
    rows: [
      ["spec", `Nothing inside Robby's chest is shown on screen, so this assembly is invented, built only from what the dialogue implies. The abdomen holds an analyzer; manufacture comes later and elsewhere. The core in the figure has an analyzer drum on two cradles, a throat up to the sample door, a pattern store, a reflex pack, and the relay cage for his inhibitions. Every part fits through the barrel's 41 cm floor opening, so the chest can lift off without touching it.`],
      ["script", `When Altaira overrides him at the door she says ${q("Emergency cancellation Limberlock. Clear relays D-12,000 to D-18,500.")} That is 6,501 relays, the only numbered hardware anyone ever names inside him${cite(2)}. The cage's top rail carries the range as its one engraved label.`],
    ],
  },
  {
    n: "06",
    title: "Arms and hands",
    rows: [
      ["prop", `MGM's sheet calls each shoulder a ${q("flexible sleeve & ball socket")}, draws the ${q("arm in locked position")}, and specifies a ${q("tool adaptor & tools")}${cite(16)}. On the CAD drawing each arm starts in a ball of radius 6.50 in, sunk into the barrel's front corner right beside the panel${cite(15)}. It is the arm's only joint. Out of the ball's face come four fat rubber rolls, each a little smaller, then a rolled lip ring round the base of a half ball cut flat at its tip. Out of the cut come the tool adaptor and a mitten of matte grey rubber, flat like a paddle: two long, flat fingers that split from the palm in a V, each with a soft crease and four accordion ribs toward its squarish tip, and a short, flat thumb on the inner side. The rolls and the half ball are nearly as fat as the shoulder ball. In studio stills and on the poster the arms reach forward and down, as they do here${cite(15, 17, 18)}.`],
      ["prop", `Thick, stubby arms on plastic ball joints with limited rotation. They can extend under an expanding concertina sheath of rubber, and end in three-fingered rubber hands painted gunmetal grey${cite(3)}. The Bonhams lot included alternate claw hands${cite(4)}.`],
      ["film", `${q("Tremendously strong, of course. He could quite easily topple this house off its foundation.")} He carries ten tons of isotope 217 on his vehicle, and the wounded Doc is the only person he ever carries${cite(1, 3)}.`],
      ["script", `Morbius asks for a Stillson wrench, and Robby detaches his own left hand and fits the wrench in its place. Spare parts, one of them a metal hand, ride clipped to his body${cite(2)}.`],
      ["spec", `Swappable tools imply a standard wrist coupling, which MGM's tool adaptor makes explicit; it is drawn here as the collar between the half ball and the hand. The arms lift out of their sockets when the figure comes apart.`],
    ],
  },
  {
    n: "07",
    title: "Pelvis and hip hinges",
    rows: [
      ["prop", `The lower section hinges at the top of the legs, so the suit can bend forward and swing slightly, and the globes hide the operator's hips and knees${cite(3)}. The weight of all three sections hung from a flying harness on the actor's shoulders, and a special frame let him rest between takes${cite(10)}.`],
      ["prop", `On each side of the pelvis a flat plate, round on top (R 3.50 in on the CAD side view) and narrowing to a tongue over the top leg globe, carries a crank lever: a round head on a bolt, with a bar running down onto the globe. A curved waist seam dips at the front, and a V-shaped line runs from each hip down to the crotch${cite(15, 18)}.`],
      ["script", `At the car Robby ${q("goes round in front, sits down, engaging his rear end in the drive mechanism")}${cite(2)}. He plugs into his vehicle.`],
      ["spec", `The hip cranks in the figure double as that drive coupling: the same joint that lets him bend would carry torque into the car.`],
    ],
  },
  {
    n: "08",
    title: "Legs and feet",
    rows: [
      ["prop", `Interlocking vacuum-formed plastic globes with internal joints. Walking was possible in small, stiff steps${cite(3)}, on completely flat floors only. Frankie Darro, who stood 5 ft 3 in, was replaced by Frankie Carpenter after a near tumble${cite(10, 3)}. Inside, the robot was built around aluminium tracks, and it walked almost silently apart from a creak of plastic${cite(6)}.`],
      ["prop", `MGM's sheet marks the leg length ${q("this dimension to fit operator")}, and asks for an ${q("alternate sole with ball bearing casters for pulling sequence")}${cite(16)}. That second sole let Robby be towed on wheels in shots where he could not walk.`],
      ["film", `${q("Sorry, miss, I was giving myself an oil job.")}${cite(1)}`],
      ["spec", `The figure's proportions come from ArthMat's CAD drawing in inches, which totals about 84 in, the prop's 7 ft. Legs and pelvis stand 42.24 in (107 cm) to the chest. Each leg is three squat globes of radius 6.00, 5.60 and 6.00 in on an oval shoe 15.71 in long and 11.17 in wide${cite(15)}. Next come a pelvis 58 cm across, a barrel 74 cm across and 42 cm tall, the voice collar, and the shell, 44 cm across and 52 cm tall.`],
    ],
  },
  {
    n: "09",
    title: "Riser and console",
    rows: [
      ["prop", `Power came through a cable out of Robby's heel, or from onboard batteries${cite(10)}, run from a remote control panel on wheels${cite(11)}. Bonhams sold that auxiliary control panel with him and lists it at 17 × 23.75 × 39 in. The console in the figure is drawn at that size, with the off-camera microphone mounted on it${cite(11, 4)}.`],
      ["spec", `The riser and turntable dais are display furniture. The cable runs from the console's gland to a connector on the right shoe.`],
    ],
  },
];

const systemHtml = systems
  .map(
    (system) => `<article class="sys" id="sys-${system.n}">
  <h3><span class="sys-n">${system.n}</span>${system.title}</h3>
  ${system.rows.map(([kind, text]) => `<p class="claim" data-src="${kind}">${tag(kind)} ${text}</p>`).join("\n  ")}
</article>`,
  )
  .join("\n");

const ledger = [
  ["Lunch", "human food, through the aperture", "a meal", "not stated", q("Simply some of Robby's synthetics."), "film"],
  ["Bourbon", `one ${q("jolt")} of rocket bourbon`, "60 gal, as 480 pints", "not stated", q("Would 60 gallons be sufficient?"), "film"],
  ["Isotope 217", "for lead shielding", "10 t", "one morning", q("This is my morning's run of isotope 217."), "film"],
  ["Emeralds", "for Altaira's dress", "5, 10 and 15 ct", "on hand; dress by breakfast", q("I will run the dress up for you in time for breakfast."), "film"],
  ["Star sapphires", "for the same dress", "none", "a week", q("Star sapphires take a week to crystallize properly."), "film"],
  ["A companion", "for the cook", "one chimpanzee", "next day", q("a placental anthropoid like yourself"), "script"],
];

const ledgerHtml = `<table class="ledger">
<thead><tr><th scope="col">Product</th><th scope="col">Sample or purpose</th><th scope="col">Quantity</th><th scope="col">Time</th><th scope="col">Robby</th><th scope="col">Source</th></tr></thead>
<tbody>${ledger.map(([a, b, c, d, e, f]) => `<tr><th scope="row">${a}</th><td>${b}</td><td class="num">${c}</td><td>${d}</td><td>${e}</td><td>${tag(f)}</td></tr>`).join("")}</tbody>
</table>`;

const rule = [
  ["Order", "Morbius hands Robby the commander's blaster and has him fire at a shrub on the terrace. Robby: " + q("A simple blaster.")],
  ["Check", "Then: point it at the commander, between the eyes, fire. The target is a rational being."],
  ["Lock", "Robby freezes, " + q("locked in a sub-electronic dilemma between my direct orders and his basic inhibitions against harming rational beings.")],
  ["Cancel", "Morbius cancels the order. " + q("If I were to allow that to continue, he would blow every circuit in his body.")],
];

const timeline = [
  ["Aug–Sep 1954", "Cyril Hume's shooting script already describes a robot with " + q("no face") + ", only " + q("a complicated arrangement of electronic gadgets") + ".", "script", [2]],
  ["1954–55", "Concepts from A. Arnold Gillespie, Arthur Lonergan and Irving Block are refined by illustrator Mentor Huebner. Robert Kinoshita builds a miniature about 10 in tall; the art director takes it to the producer and comes back with " + q("Draw it!"), "prop", [3, 7]],
  ["15 Feb–8 Mar 1955", "The MGM model shop's schedule for building Robby; three weeks go to the plastic dome. Parts are early ABS (Royalite), vacuum-formed over wooden moulds.", "prop", [7, 3]],
  ["1956", "<i>Forbidden Planet</i> opens. Frankie Darro and Frankie Carpenter wear the suit; Marvin Miller's voice is dubbed in; Bebe and Louis Barron's circuits supply the film's " + q("electronic tonalities") + ".", "film", [3, 13]],
  ["1957", "<i>The Invisible Boy</i> gives Robby a new origin: brought back by time machine from a Chicago spaceport of 2309, then rebuilt by a boy under the influence of a supercomputer, which strips his prohibition against harming people.", "film", [9]],
  ["1958–1984", "Decades of reuse on television and film: <i>The Gale Storm Show</i>, <i>The Twilight Zone</i> (a toy in 1959; an " + q("oil-can") + " head in " + q("Uncle Simon") + "), <i>Lost in Space</i>, <i>Columbo</i>, <i>Project U.F.O.</i> with a one-eyed head, <i>Mork &amp; Mindy</i>, and a cameo in <i>Gremlins</i>.", "prop", [3]],
  ["1970–71", "MGM sells him to Jim Brucker's Movie World / Cars of the Stars museum in Buena Park, where he is often vandalised. Sources disagree on the year.", "prop", [3, 10]],
  ["1973–74", "Fred Barton finds him painted silver, missing an ear, a scanner, the blasters and the heart-box detail, legs warped, ankles broken, dome yellowed, yet " + q("the neon tubes and every MGM mechanism functioned") + ". Barton strips, moulds and restores him in about two months.", "prop", [6]],
  ["1979–80", "Director William Malone buys Robby, his car, spare parts and shipping cases. Sources disagree on the year.", "prop", [3, 10]],
  ["2004", "Inducted into the Robot Hall of Fame.", "prop", [3]],
  ["21 Nov 2017", "Bonhams New York sells suit, car, control panel, alternate claws, the " + q("Uncle Simon") + " head and crates for $5,375,000, then the highest price for a film prop at auction.", "prop", [4, 12, 11]],
];

const specs = [
  ["Height", "just over 7 ft (2.14 m); Bonhams catalogue: 29 × 38 × 71 in with arms forward", [3, 11]],
  ["Weight", "100–120 lb (45–54 kg)", [10, 11]],
  ["Sections", "three: legs and lower torso; barrel chest with arms; head", [3]],
  ["Materials", "Royalite ABS, vacuum-formed; Plexiglas dome; rubber hands; aluminium; acetate; wood", [3, 10, 11]],
  ["Head", "black hood with a clear Plexiglas cap and front window: pilot lamp, three wire gyros, six relay keys with sax-key levers, two blinking eyes on the ear hubs, two rotating ear rings, comb fins, blue neon mouth", [3, 15]],
  ["Shell", "17.34 in across, about 21 in tall; brim 4.45 in above the chest at the back, 7.19 in at the front", [15]],
  ["Neck", "custom bearing; head turns either way", [3]],
  ["Chest", "barrel 16.5 in tall; sample door, two rotating discs, four moving buttons (Wikipedia: five)", [3, 15]],
  ["Legs", "42.24 in to the chest; globes R 6.00, 5.60, 6.00 in; shoes 15.71 × 11.17 in", [15]],
  ["Power", "cable through the heel from a wheeled control panel, or onboard batteries", [10, 11]],
  ["Crew", "operators Frankie Darro (5 ft 3 in) and Frankie Carpenter; voice Marvin Miller", [3, 10]],
  ["Design", "Robert Kinoshita, working drawings, with Gillespie, Lonergan, Block and Huebner", [3, 7, 8]],
  ["Cost", "$100,000–$125,000 in 1955 (New Atlas: $120,000)", [3, 10]],
];

const canonSpecs = [
  ["Builder", "Dr. Edward Morbius, who " + q("tinkered him together") + " in his first months on Altair IV", "film"],
  ["Origin", "the first practical result of decoding Krell knowledge", "script"],
  ["Name", q("For your convenience, I am monitored to respond to the name Robby."), "film"],
  ["Languages", "187 others, " + q("along with their various dialects and sub-tongues"), "film"],
  ["Sex", q("In my case, sir, the question is totally without meaning."), "film"],
  ["Defence", q("My beams are focused on your blasters, gentlemen."), "film"],
  ["Duties", "cook, tailor, chemist, chauffeur, doorman, and at the end the C-57D's astrogator", "film"],
];

const sources = [
  ["Forbidden Planet (MGM, 1956), dialogue transcript", "https://www.springfieldspringfield.co.uk/movie_script.php?movie=forbidden-planet"],
  ["Cyril Hume, Forbidden Planet shooting script, 26 Aug–3 Sep 1954 (Internet Archive scan)", "https://archive.org/details/ForbiddenPlanetScreenplay-1954-09-03"],
  ["Robby the Robot, Wikipedia", "https://en.wikipedia.org/wiki/Robby_the_Robot"],
  ["Bonhams, lot 1070: the original Robby the Robot suit and Jeep, 21 Nov 2017", "https://www.bonhams.com/auction/24465/lot/1070/the-iconic-original-robby-the-robot-suit-and-jeep-from-forbidden-planet/"],
  ["Fred Barton Productions, Robby the Robot replica", "https://the-robotman.com/robby-the-robot"],
  ["Fred Barton Productions, Restoration", "http://the-robotman.com/restoration-2"],
  ["Down the Tubes, Remembering Robert Kinoshita", "https://downthetubes.net/remembering-robert-kinoshita/"],
  ["Robert Kinoshita, Wikipedia", "https://en.wikipedia.org/wiki/Robert_Kinoshita"],
  ["The Invisible Boy, Wikipedia", "https://en.wikipedia.org/wiki/The_Invisible_Boy"],
  ["David Szondy, The original Robby the Robot goes up for auction, New Atlas, 27 Oct 2017", "https://newatlas.com/robby-robot-bonhams/51922/"],
  ["Down the Tubes, Robby the Robot becomes the most valuable movie prop ever sold at auction, 27 Nov 2017", "https://downthetubes.net/robby-the-robot-star-of-forbidden-planet-becomes-the-most-valuable-movie-prop-ever-sold-at-auction/"],
  ["Guinness World Records, most expensive prop from a film sold at auction", "https://www.guinnessworldrecords.com/world-records/62564-most-expensive-prop-from-a-film-sold-at-auction"],
  ["AFI Catalog, Forbidden Planet (1956)", "https://catalog.afi.com/Catalog/moviedetails/51831"],
  ["Anatomy, a skill for Claude Code, by Ryan (drawing kit, MIT)", "https://skills.wheresryan.sh/anatomy"],
  ["ArthMat, Robby the Robot, dimensioned CAD drawing in inches, sheet 1 of 1, rev 2, 21 Mar 2013 (reference image supplied with this commission)", null],
  ["MGM, Robby, the Robot: construction drawing with part callouts, shown beside a 3D overlay (reference image supplied with this commission)", null],
  ["Photographs of full-size replicas and a life-size figure, a model kit, and renders of the clear shell (reference images supplied with this commission)", null],
  ["Mike Ogrinz, photographs of the original prop at the Bonhams preview, New York, November 2017, and of his full-size replica", "https://ogrinz.com/"],
];

export const DOSSIER = {
  caption:
    "Robby on a turntable dais, beside MGM's rolling control panel. Take him apart and the clear shell, head, arms and chest lift away in turn, the outermost first, to show the key chassis, the gyro tower and a laboratory core that is our speculation. Speak strikes the six relay keys, then lights the neon with each syllable while the console's needle follows the voice. Synthesize opens the sample door and runs a sample from the film. The order to fire latches the inhibition relays until it is cancelled. Scan spins up the ear rings and gyros and sweeps the eye lamps from side to side.",
  css: `
.rb-visually{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.pg-head{display:grid;gap:18px;margin-block:12px 20px}
.pg-facts{display:grid;gap:18px;margin-block:28px 8px}
.pg-eyebrow{margin:0;font:500 12px/1.4 var(--pg-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--pg-muted)}
.pg-title{position:relative;margin:0 0 22px;padding-block:.06em .1em;line-height:.8;isolation:isolate}
.pg-title::before{content:"";position:absolute;z-index:-1;left:-.12em;top:.1em;width:min(5.6em,92%);height:.8em;border:1.5px solid var(--pg-coral);border-radius:50%;transform:rotate(-9deg);opacity:.5;font-size:clamp(64px,13vw,156px)}
.pg-title::after{content:"";position:absolute;z-index:-1;left:min(5.05em,84%);top:.16em;width:.1em;height:.1em;border-radius:50%;background:var(--pg-coral);font-size:clamp(64px,13vw,156px)}
.pg-title-name{display:inline-block;font:800 italic clamp(64px,13vw,156px)/.86 var(--pg-display);letter-spacing:-.01em;text-transform:uppercase;color:var(--pg-ink)}
.pg-title-hand{display:inline-block;margin-left:-.1em;font:400 clamp(38px,6.6vw,80px)/1 var(--pg-hand);color:var(--pg-coral);transform:rotate(-7deg) translateY(.12em);text-transform:none;letter-spacing:0}
.pg-dek{margin:0;max-width:62ch;font-size:clamp(17px,2.1vw,20px);line-height:1.55;color:var(--pg-text)}
.pg-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;margin:6px 0 0;background:var(--pg-rule);border:1px solid var(--pg-rule)}
.pg-stats>div{display:grid;gap:2px;align-content:start;padding:12px 14px;background:var(--pg-bg);min-width:0}
.pg-stats dt{font:500 10.5px/1.3 var(--pg-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--pg-muted)}
.pg-stats dd{margin:0;font:700 clamp(24px,2.6vw,30px)/1 var(--pg-display);color:var(--pg-ink);font-variant-numeric:tabular-nums;letter-spacing:-.01em;white-space:nowrap}
.pg-stats dd small{font-size:.5em;margin-left:1px;letter-spacing:.04em}
.pg-stats span{font:13.5px/1.4 var(--pg-sans);color:var(--pg-muted)}
.pg-key{display:flex;flex-wrap:wrap;gap:8px 20px;margin:0;padding:0;list-style:none;font:13.5px/1.4 var(--pg-sans);color:var(--pg-muted)}
.pg-key li{display:inline-flex;align-items:center;gap:8px}
.tag{display:inline-block;padding:2px 7px 1px;border-radius:3px;font:500 10px/1.5 var(--pg-mono);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;vertical-align:1px;border:1px solid currentColor}
.tag[data-src="film"]{color:var(--pg-canon)}
.tag[data-src="script"]{color:var(--pg-script)}
.tag[data-src="prop"]{color:var(--pg-prop)}
.tag[data-src="spec"]{color:var(--pg-spec);border-style:dashed}
.cite{font:500 10px/0 var(--pg-mono);margin-left:1px}
.cite a{text-decoration:none}
.pg q{quotes:"\\201C" "\\201D";font-style:italic}
.pg-sec{margin-top:56px}
.pg-sec>h2{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:0 0 8px;font:500 clamp(26px,3.4vw,34px)/1.05 var(--pg-display);text-transform:uppercase;letter-spacing:.08em}
.pg-sec>h2::before{content:"";flex:none;width:22px;height:12px;background:var(--pg-coral);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 22 12'%3E%3Cg fill='none' stroke='black' stroke-width='1.25'%3E%3Ccircle cx='11' cy='6' r='4'/%3E%3Cellipse cx='11' cy='6' rx='9.4' ry='2.5' transform='rotate(-14 11 6)'/%3E%3C/g%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 22 12'%3E%3Cg fill='none' stroke='black' stroke-width='1.25'%3E%3Ccircle cx='11' cy='6' r='4'/%3E%3Cellipse cx='11' cy='6' rx='9.4' ry='2.5' transform='rotate(-14 11 6)'/%3E%3C/g%3E%3C/svg%3E") center/contain no-repeat}
.pg-sec>h2 small{font:500 11px/1 var(--pg-mono);letter-spacing:.12em;color:var(--pg-muted)}
.pg-sec>p.lede{margin:0 0 22px;max-width:66ch}
.sys-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:1px;background:var(--pg-rule);border:1px solid var(--pg-rule)}
.sys{background:var(--pg-bg);padding:20px 22px 22px;min-width:0}
.sys:last-child:nth-child(odd){grid-column:1/-1}
.sys:last-child:nth-child(odd) .claim{max-width:78ch}
.sys h3{display:flex;align-items:baseline;gap:12px;margin:0 0 10px;font:700 22px/1.1 var(--pg-display);text-transform:uppercase;letter-spacing:.02em}
.sys-n{font:500 12px/1 var(--pg-mono);color:var(--pg-muted);letter-spacing:.06em}
.claim{margin:0 0 10px;font-size:15.5px;line-height:1.58}
.claim:last-child{margin-bottom:0}
.claim[data-src="spec"]{padding-left:12px;border-left:1px dashed var(--pg-spec)}
.rule{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:0;padding:0;list-style:none;counter-reset:step}
.rule li{position:relative;padding:14px 16px 16px;background:var(--pg-card);border:1px solid var(--pg-rule);min-width:0}
.rule li b{display:block;margin-bottom:6px;font:800 italic 21px/1 var(--pg-display);text-transform:uppercase;letter-spacing:.02em;color:var(--pg-ink)}
.rule li p{margin:0;font-size:15px;line-height:1.5}
.rule li[data-lock] b{color:var(--pg-spec)}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:16px;margin-top:16px}
.pair>div{padding:16px 18px;background:var(--pg-card);border:1px solid var(--pg-rule);min-width:0}
.pair h4{margin:0 0 8px;font:500 11px/1.3 var(--pg-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--pg-muted)}
.pair p{margin:0 0 8px;font-size:15.5px}
.pair p:last-child{margin:0}
.scroll{overflow-x:auto;border:1px solid var(--pg-rule);background:var(--pg-card)}
.ledger,.specs{width:100%;border-collapse:collapse;font:14.5px/1.45 var(--pg-sans)}
.ledger{min-width:760px}
.ledger th,.ledger td,.specs th,.specs td{padding:10px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--pg-rule)}
.ledger thead th{font:500 10.5px/1.3 var(--pg-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--pg-muted)}
.ledger tbody th,.specs th{color:var(--pg-ink);font-weight:600;white-space:nowrap}
.ledger tr:last-child>*,.specs tr:last-child>*{border-bottom:0}
.num{font-variant-numeric:tabular-nums;white-space:nowrap}
.timeline{margin:0;padding:0;list-style:none;border-left:1px solid var(--pg-rule)}
.timeline li{display:grid;grid-template-columns:150px minmax(0,1fr);gap:16px;padding:12px 0 12px 18px;position:relative}
.timeline li::before{content:"";position:absolute;left:-4px;top:19px;width:7px;height:7px;border-radius:50%;background:var(--pg-bg);border:1.5px solid var(--pg-coral)}
.timeline time{font:500 13px/1.6 var(--pg-mono);color:var(--pg-ink);font-variant-numeric:tabular-nums}
.timeline p{margin:0;font-size:15.5px}
.spec-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px}
.spec-cols h3{margin:0 0 10px;font:700 20px/1 var(--pg-display);text-transform:uppercase;letter-spacing:.03em}
.sources{margin:0;padding-left:22px;font:14px/1.5 var(--pg-sans);columns:2 340px;column-gap:32px}
.sources li{margin-bottom:6px;break-inside:avoid;overflow-wrap:anywhere}
.notes{font-size:15px;max-width:70ch}
@media (max-width:560px){.timeline li{grid-template-columns:1fr;gap:2px}.pg{padding-inline:16px}}
`,
  html: `
<section class="pg-sec" id="systems">
  <h2>System by system <small>09 assemblies</small></h2>
  <p class="lede">Numbered as in the figure's parts list. Each assembly says what the film shows, how MGM actually built it, and how it might work if it were real. Only the last kind is our invention, and it is always marked.</p>
  <div class="sys-grid">${systemHtml}</div>
</section>

<section class="pg-sec" id="inhibition">
  <h2>The inhibition <small>how an order fails</small></h2>
  <p class="lede">Robby's one hard rule is never stated as a law. It is shown three times, and each time it beats a direct order.</p>
  <ol class="rule">
    ${rule.map(([head, text], index) => `<li${index === 2 ? " data-lock" : ""}><b>${head}</b><p>${text}</p></li>`).join("")}
  </ol>
  <div class="pair">
    <div>
      <h4>At the door, after dark</h4>
      <p>${tag("film")} ${q("I am monitored to admit no one at this hour.")} ${q("My beams are focused on your blasters, gentlemen.")} The Doc asks whether he has a built-in rule against wringing their necks: ${q("That is true, sir. Yet I am monitored to admit no one.")}${cite(1)}</p>
      <p>${tag("script")} In the script their blasters fail, and Robby warns he ${q("cannot prevent you gentlemen from damaging yourselves against me")}${cite(2)}.</p>
      <p>${tag("film")} Altaira releases him: ${q("Robby, emergency cancellation Archimedes.")}${cite(1)}</p>
      <p>${tag("script")} The 1954 script spells the same override out as hardware: ${q("Emergency cancellation Limberlock. Clear relays D-12,000 to D-18,500.")}${cite(2)}</p>
    </div>
    <div>
      <h4>The last order</h4>
      <p>${tag("film")} With the monster tearing through the steel shutters, Morbius orders ${q("Kill it, Robby.")} Robby does nothing. Adams: ${q("He knows it's your other self.")}${cite(1)}</p>
      <p>${tag("script")} ${q("The Robot stands motionless. His gadget lights have gone out.")}${cite(2)}</p>
      <p>${tag("spec")} The refusal is the film's proof. A machine that cannot harm a rational being will not fire on the monster, so the monster must be part of a man: Morbius himself. Wikipedia compares the rule to Asimov's Three Laws${cite(3)}; the 1957 sequel shows what happens when a computer removes it${cite(9)}.</p>
    </div>
  </div>
</section>

<section class="pg-sec" id="ledger">
  <h2>Synthesis ledger <small>everything he makes</small></h2>
  <p class="lede">Every product Robby makes on screen, with the sample, the quantity and the time he quotes. Analysis happens in his abdomen; the quantities point to a production plant somewhere else.</p>
  <div class="scroll">${ledgerHtml}</div>
</section>

<section class="pg-sec" id="build">
  <h2>The build and after <small>1954–2017</small></h2>
  <ol class="timeline">
    ${timeline.map(([when, text, kind, refs]) => `<li><time>${when}</time><p>${tag(kind)} ${text}${cite(...refs)}</p></li>`).join("")}
  </ol>
</section>

<section class="pg-sec" id="specs">
  <h2>Spec sheet</h2>
  <div class="spec-cols">
    <div>
      <h3>The prop</h3>
      <div class="scroll"><table class="specs"><tbody>${specs.map(([a, b, refs]) => `<tr><th scope="row">${a}</th><td>${b}${cite(...refs)}</td></tr>`).join("")}</tbody></table></div>
    </div>
    <div>
      <h3>The character</h3>
      <div class="scroll"><table class="specs"><tbody>${canonSpecs.map(([a, b, kind]) => `<tr><th scope="row">${a}</th><td>${b} ${tag(kind)}</td></tr>`).join("")}</tbody></table></div>
    </div>
  </div>
</section>

<section class="pg-sec" id="method">
  <h2>How the figure was made</h2>
  <p class="notes">Proportions come from ArthMat's dimensioned CAD drawing, in inches, scaled to Wikipedia's 214 cm${cite(15, 3)}. Part names come from MGM's construction sheet${cite(16)}. Photographs of replicas and renders of the clear shell settled what the drawings leave open, chiefly where the clear plastic stops. It covers the cap of the bullet head and runs down the front as a window. A black hood makes the cheeks and back, carries the ears and comb fins, and shows through the window as a dark recess behind the keys${cite(17)}. Photographs of the original prop at the 2017 auction preview set the sizes of the arms, the hips, the chest panel, the ears and the gyros${cite(18)}. Materials and light follow 1950s publicity stills rather than a technical plate: black lacquer with an airbrushed highlight down every curve, chrome trim, a brass bell under the gyros, and a glint on the clear plastic. The console follows Bonhams' dimensions. Every turned body (shoes, globes, pelvis, barrel, shoulder balls, arm rolls, half balls, collar, brim, head) is an analytic profile, and every part records its true shape, so a geometry audit can check that nothing passes through anything at rest, apart, or at any moment in between. The laboratory core and the readings marked Speculative are ours. Drawn with the Anatomy skill's kit.${cite(14)}</p>
</section>

<section class="pg-sec" id="sources">
  <h2>Sources</h2>
  <ol class="sources">${sources.map(([title, url], index) => `<li id="src-${index + 1}">${url ? `<a href="${url}" target="_blank" rel="noopener">${title}</a>` : title}</li>`).join("")}</ol>
</section>
`,
};
