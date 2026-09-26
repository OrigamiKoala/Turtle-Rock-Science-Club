# Minigame Ideas — Turtle Rock Science Club

Seven candidate games for `src/components/games/`, plus a bench of smaller ideas.
Nothing here is built yet; this is a design document to pick from.

## The bar these have to clear

The existing four set the standard, and it's a specific one:

- **A real mechanic, not a quiz.** `MoleculeBuilder` doesn't ask "what is water's
  formula?" — it enforces valence and connectivity and lets you discover that CO₂
  can't be built with single bonds. The science *is* the rule system.
- **A win condition you can't fake.** Every atom satisfied, graph connected. The
  probe touches the beacon. The program runs the maze unaided.
- **Levels that genuinely get harder,** including at least one level that is
  unsolvable by the technique that worked before it (`RobotProgrammer`'s recursive
  F1 mazes, `MoleculeBuilder`'s C₂H₄).
- **Fun in under a minute.** Elementary kids and their parents. First level should
  be winnable by fiddling; the last should require a plan.

Each idea below is graded on **Build cost** (rough LOC + any new dependency) and
**Fun risk** (my honest read on whether it's entertaining or merely educational).

---

## 1. Lightbender — optics on a grid

**Field:** Physics · Optics
**Badge:** `Optician`
**Build cost:** ~550 LOC, canvas 2D, no new deps
**Fun risk:** Low. This genre (SpaceChem-style beam routing) is reliably addictive.

### Pitch

A laser fires from a fixed emitter. You drag mirrors, lenses, prisms and glass
blocks onto a grid to steer the beam into one or more targets. The beam is
ray-traced for real — Snell's law at every surface, wavelength-dependent
refractive index, total internal reflection past the critical angle.

### Why it's fun

The beam updates live while you drag, so the whole game is a continuous "ooh"
feedback loop. You can't lose, only fail to solve, so kids fiddle happily.
Crucially, the later levels are only solvable if you *understand* the optics —
you can't brute-force a dispersion puzzle.

### The real science

| Element | Behaviour implemented |
|---|---|
| Flat mirror | Reflect: `d' = d - 2(d·n)n` |
| Convex/concave lens | Thin-lens deflection toward/away from the focal point |
| Glass block | Snell: `n₁sinθ₁ = n₂sinθ₂`, refract in *and* out |
| Prism | Same, but `n(λ)` differs per wavelength → white light fans out |
| Fibre / high-index block | Total internal reflection past `θ_c = asin(n₂/n₁)` |
| Beam splitter | Ray forks; both children traced |
| Filter | Absorbs all but one wavelength |

White light is traced as 6 rays (red → violet) that travel together until
something disperses them. That single decision is what makes levels 5+ possible.

### Level progression

1. **First Bounce** — one mirror, one target. Teaches angle of incidence.
2. **Corner Pocket** — two mirrors, a wall in the way.
3. **Through the Glass** — a glass slab offsets the beam sideways; the target is
   deliberately placed at that offset, so you must refract, not reflect.
4. **Split Decision** — beam splitter, two targets, only one splitter available.
5. **Rainbow Gate** — white beam, a red-only target and a violet-only target on
   opposite sides. Only a prism separates them; filters alone can't reach both.
6. **Light Pipe** — the target is around a corner behind an opaque wall, with a
   curved high-index channel between. Only shallow entry angles stay trapped by
   TIR; steeper ones leak out. This is the "you must understand critical angle"
   level.
7. **Observatory** — free-form: a scattered set of targets, a limited inventory,
   and a par count. Solving under par earns the bonus.

### Screen layout

Left: a 12×9 canvas grid, ~640×480, beam glowing over a dark backdrop.
Right: the inventory tray (draggable component chips with remaining counts), the
level goal, and a hint button matching the existing games' pattern.
Rotate a placed piece by clicking it; drag it back to the tray to remove.

### Implementation notes

- Ray march: recursive `traceRay(origin, dir, wavelength, depth)`, cap `depth` at
  ~30 to survive mirror-facing-mirror loops. Push each segment to a list, draw
  the list. Recompute on every drag frame — it's cheap (tens of segments).
- Store optics as `{id, type, cell:[x,y], angleDeg}`. Grid-snapped placement
  removes 90% of the fiddliness; rotation is in 15° steps.
- Hit-testing: each component is a line segment or circle in world space.
  Segment-segment intersection, take the nearest positive `t`.
- Target satisfaction: a ray endpoint within the target radius *and* wavelength
  match. Store `solved` as a set so multi-target levels light up one at a time.
- Draw beams with `globalCompositeOperation = 'lighter'` and a wide translucent
  stroke under a thin bright one — that's the glow, and it's two lines of code.

### Pitfalls

- Floating-point re-intersection with the surface a ray just left. Nudge the new
  origin along the direction by `1e-4` before continuing.
- Don't let players place a component on top of the emitter or a target.

---

## 2. Short Circuit — a breadboard that actually solves

**Field:** Physics · Electronics
**Badge:** `Sparky`
**Build cost:** ~600 LOC, SVG, no new deps (write the linear solver by hand, ~60 lines)
**Fun risk:** Medium. Needs strong visual feedback — bulbs must glow, and things
must be allowed to burn out — or it reads like homework.

### Pitch

A battery, some wires, bulbs, resistors, a switch and a motor. Build a circuit
that meets the level's spec: "light all three bulbs equally," "run the motor at
half speed without burning the bulb," "measure the unknown resistor." The
simulation is a real nodal-analysis solve, so *any* topology you build works,
including ones the level designer never anticipated.

### Why it's fun

Two reasons. First, bulbs brighten smoothly with power and **pop with a puff of
smoke** when you exceed their rating — a fail state that's funny rather than
punishing, and immediately teaches current limits. Second, the sandbox is honest:
kids will try shorting the battery, and they should get a satisfying spark and a
"short circuit!" banner instead of a validation error.

### The real science

Modified nodal analysis. Build the conductance matrix `G` from every resistive
branch, put the battery in as a voltage source (extra row/column), solve `Gx = b`
by Gaussian elimination with partial pivoting. Out comes every node voltage and
branch current — from which brightness (`P = I²R`), motor speed (`∝ I`) and
meter readings all fall out for free.

This is the crucial architectural call: **do not special-case series and
parallel.** A general solver is barely more code and it's what makes level 6
possible.

### Level progression

1. **Close the Loop** — battery, one bulb, one switch. Just make it light.
2. **Two in a Row** — series: both bulbs are dimmer. The game asks you to explain
   nothing; the dimness is the lesson.
3. **Side by Side** — parallel: full brightness on both, and the battery drains
   faster (show a current gauge).
4. **Don't Pop It** — a bulb rated 0.2 A on a 9 V supply. You must add a resistor
   in series and pick the right value from a tray of five.
5. **The Dimmer** — a potentiometer and a motor; hit and *hold* a target RPM band
   for 3 seconds.
6. **The Bridge** — a Wheatstone bridge with one unknown resistor. Balance it
   (galvanometer reads zero) to read the unknown off the dial. Unsolvable by
   series/parallel intuition; this is the level that rewards the real model.
7. **Two-Way Switch** — the hallway-light problem: one lamp, two switches, either
   one toggles it. A pure logic/topology puzzle with no arithmetic at all, which
   makes a nice closer.

### Screen layout

SVG breadboard: a 10×8 lattice of nodes. Drag a component from the tray onto any
two adjacent-or-distant nodes; wires are drawn by dragging node-to-node. A
persistent readout strip along the bottom shows total current, battery voltage
and each bulb's power. Multimeter probes are two draggable pins that display
V/I/R between wherever you drop them.

### Implementation notes

- Data model: `nodes: number[]`, `branches: {a, b, type, value}[]`. Union-find
  over pure-wire branches to collapse shorted nodes before building the matrix —
  otherwise the matrix is singular.
- Singular matrix = an unconnected fragment or a shorted source. Catch it, don't
  crash: show "nothing's connected" or the short-circuit spark.
- Store the solve in a `useMemo` keyed on the branch list. It's a 10×10 solve;
  running it on every render is fine.
- Bulb glow: an SVG `<radialGradient>` whose opacity is `clamp(P/P_rated)`, plus a
  CSS `filter: blur()` halo. Burnt bulbs get a grey filament and a smoke puff
  (three fading circles, `motion` is already a dependency).

### Pitfalls

- Motors and bulbs are non-linear in real life. Model them as fixed resistors and
  say so in the hint text; the physics stays honest at this level.
- Mobile: dragging wires on a phone is fussy. Fall back to tap-node-then-tap-node.

---

## 3. Epicenter — you are the seismologist

**Field:** Earth Science · Geophysics
**Badge:** `Seismologist`
**Build cost:** ~450 LOC, SVG map + a small canvas for waveforms, no new deps
**Fun risk:** Low-medium. The detective framing carries it. Needs the map to look
good.

### Pitch

An earthquake just happened somewhere under a fictional coastline. You have a
budget, a map of seismograph stations, and nothing else. Buy a station's readout,
read the gap between the P-wave and S-wave arrivals, convert it to a distance,
draw the circle. Three circles intersect at one point — that's your epicenter.
Place your marker there, and estimate the magnitude from the wave amplitude.

### Why it's fun

It's a deduction game with a physical answer, and the "three circles crossing at
one spot" moment is genuinely satisfying to watch resolve. The budget turns it
into a real decision: you *can* buy every station, but par is three, and the
scoring rewards choosing well-spread ones (poorly-spread stations give a
sliver-shaped intersection and a sloppy answer — which is real geometry, not a
made-up penalty).

### The real science

- P-waves travel ~6.5 km/s, S-waves ~3.5 km/s. The arrival gap `Δt` gives
  distance `d = Δt / (1/v_s − 1/v_p)` — the actual travel-time method.
- Trilateration: three distance circles pin a point in 2D.
- Magnitude from a Richter-style log of amplitude corrected for distance.
- **Level 6 introduces the shadow zone:** stations beyond ~103° of arc receive no
  direct S-wave at all, because the outer core is liquid. A player who assumes a
  broken station and buys three more learns the single most important fact about
  Earth's interior.
- **Level 5 introduces a lying station:** one clock is off, so its circle misses
  the common intersection. The player must identify and discard the outlier —
  which is exactly what real networks do.

### Level progression

1. **First Tremor** — 3 stations, all bought for you, circles pre-drawn. Just
   place the pin.
2. **Buy Your Own** — budget of 4 readings, 6 stations available, clean data.
3. **How Big Was It?** — same, plus a magnitude estimate from amplitude, tolerance ±0.3.
4. **Tight Budget** — 3 readings, 8 stations, and the cheap ones are clustered
   together on one side. Spreading out costs more and is worth it.
5. **The Broken Clock** — 4 readings, one inconsistent. Find the liar.
6. **Shadow Zone** — a distant quake; two stations report P-only. Explain why, and
   still locate it.
7. **Aftershock Sequence** — three quakes in a row on a timer, shared budget.
   Speed round.

### Screen layout

Left ~65%: stylized coastline map, station pins, expanding circles animated
outward when a reading is bought, a draggable crosshair for the player's guess.
Right: the seismogram panel — a small canvas drawing the purchased station's
trace with P and S arrivals marked, plus a ruler tool to read `Δt`.
Bottom: budget, "Submit epicenter", and a distance-error readout after submit.

### Implementation notes

- Generate levels from a hidden true epicenter + magnitude; derive every station's
  arrival times from it. That guarantees consistency and lets you seed levels with
  a fixed PRNG so everyone plays the same puzzles.
- Waveform rendering: noise floor = summed sines with random phase; P and S
  arrivals = a damped-sine burst (`e^(-kt)·sin(ωt)`), S-burst larger. 40 lines and
  it looks convincingly like a real drum recording.
- Scoring: distance error in km → stars. Within 15 km = solved.
- The ruler tool matters more than it sounds. Let players drag two vertical
  markers onto the trace and show `Δt` live; without it the game is guesswork.

### Pitfalls

- Keep the map flat-earth (planar trilateration). Spherical geometry is a
  needless complication except conceptually in the shadow-zone level.
- Make circle intersections visually obvious — thick translucent rings, and
  brighten the region where all three overlap.

---

## 4. Critter Ranch — Mendelian breeding as a puzzle

**Field:** Biology · Genetics
**Badge:** `Geneticist`
**Build cost:** ~500 LOC, SVG critters (procedurally drawn from genotype), no new deps
**Fun risk:** Very low. Breeding games are famously compulsive. The risk is the
opposite — that it's *too* addictive and kids ignore the genetics.

### Pitch

You run a ranch of cartoon critters. Each has genes for colour, ear shape, tail
length and a few other visible traits. A customer wants a specific critter:
"orange, floppy-eared, long-tailed." You have a starting pair, a limited number
of breeding rounds, and a barn with limited slots. Cross, inspect the offspring,
cross again. Deliver the order before you run out of rounds.

### Why it's fun

Every offspring is a little reveal, drawn live from its genotype, and you're
always one cross from the thing you want. The strategy — deciding *which* pair to
cross to maximise information rather than to chase the phenotype — is real and
surprisingly deep.

### The real science

Escalating genetic concepts, each introduced by a level that can't be solved
without it:

| Concept | Where it lands |
|---|---|
| Dominant / recessive alleles | L1–2 |
| Punnett squares, 3:1 and 9:3:3:1 ratios | L2–3 |
| Heterozygotes look identical to homozygous dominants | L3 |
| **Test cross** — the only way to tell them apart | L4 |
| Incomplete dominance (red × white = pink) | L5 |
| Sex linkage (a trait far more common in one sex) | L6 |
| Epistasis (one gene masking another entirely) | L7 |

Level 4 is the design keystone: the order specifies a **true-breeding** orange
critter, so you must prove homozygosity by crossing your candidate with a
recessive tester and getting zero recessive offspring in a sample. Producing an
orange critter is easy; *proving* it breeds true is the puzzle. That's the
scientific method as a game mechanic.

### Level progression

1. **The Obvious Order** — one gene, both parents heterozygous. Any recessive
   offspring wins it.
2. **Two Traits** — dihybrid cross; show the 9:3:3:1 filling in as offspring
   accumulate.
3. **Out of Stock** — the trait you need isn't visible in either parent. It's
   carried. Cross and wait.
4. **Certified True-Breeding** — must pass a test cross. See above.
5. **Pink Ones Only** — incomplete dominance; the target phenotype is the
   heterozygote, so it can *never* breed true. Some kids will try; the game should
   let them and then explain.
6. **The Prince's Cats** — sex-linked trait; the customer wants a female with a
   trait that shows up almost only in males.
7. **The Masked Gene** — epistasis: a second gene switches off pigment entirely,
   so albino critters hide their colour genotype. Requires reasoning about
   invisible genes.

### Screen layout

Barn grid of critter cards (SVG portrait + visible traits + a "genotype" strip
that shows `??` for anything not yet proven). Two parent slots at the top; a
"Breed" button rolls 4–6 offspring with a little animation. A Punnett square
panel on the right auto-fills for whatever cross is currently staged — visible
from L2 on, and it's the game's tutorial layer.

### Implementation notes

- Genotype is `Record<GeneId, [Allele, Allele]>`. Phenotype is a pure function of
  it, per gene, with a resolver type (`dominant | incomplete | epistatic-on:X`).
- Critter art: one parametric SVG — body ellipse tinted by colour gene, ear path
  chosen from 3 variants, tail as a quadratic curve whose length is a gene.
  ~60 lines, and every genotype gets a distinct-looking animal for free.
- **Seed the RNG per level** so a reload can't be used to reroll a bad litter, and
  so a stuck kid's screenshot matches yours. Persist the seed in the game state.
- Always allow "start over" — genetic RNG *can* strand a player, and a soft reset
  is a better answer than rigging the dice.
- Show the underlying ratios honestly: a 3:1 expectation over 4 offspring often
  gives 4:0. Add a small "expected vs. actual" tally; that's a real statistics
  lesson hiding in a breeding game.

### Pitfalls

- Keep the trait names silly and the critters cute; the vocabulary (`homozygous`)
  can be introduced in the hint text but shouldn't be needed to play.
- Cap the barn (say 12 slots) or the mid-game turns into inventory management.

---

## 5. Island Keeper — a food web that fights back

**Field:** Biology · Ecology · Systems
**Badge:** `Ecologist`
**Build cost:** ~500 LOC, canvas chart + SVG island, no new deps
**Fun risk:** Medium-high. Population graphs are not intrinsically exciting; this
lives or dies on the island animating — visible critters appearing and vanishing
as numbers move.

### Pitch

You've been handed an island and 100 simulated years. Populations of grass,
rabbits, foxes and hawks rise and fall according to a real coupled model. Your
levers are few and expensive: introduce a species, cull one, plant vegetation,
build a fence. Goal: reach year 100 with nothing extinct. The catch is that the
system has momentum — by the time a crash is visible on the graph, the cause was
fifteen years ago.

### Why it's fun

It's the "consequences" game. Nearly every player's first instinct — kill the
predators to save the cute animals — produces a rabbit boom, a grass collapse and
mass starvation. Watching that happen to *your* island in fast-forward is a far
better teacher than any diagram, and it's genuinely funny the first time.

### The real science

Discrete-step Lotka-Volterra with logistic carrying capacity:

```
dN_i/dt = N_i · ( r_i · (1 − N_i/K_i) + Σ_j a_ij · N_j )
```

with `a_ij` the interaction matrix (negative for "j eats i", positive for "i eats
j"). Step it ~12 times per simulated year with a small `dt` for stability. Real
behaviours that emerge without being scripted: predator-prey lag cycles, boom-bust
overshoot, trophic cascades, and the fact that removing a keystone species
collapses species it never directly touched.

Add stochasticity: a population below a floor has a per-step chance of extinction,
so "hovering near zero" is genuinely dangerous rather than safe.

### Level progression

1. **Rabbits and Grass** — two species, one lever. Learn carrying capacity.
2. **Enter the Fox** — classic predator-prey oscillation. Survive 50 years.
3. **The Obvious Mistake** — you start with too many foxes and the game *suggests*
   culling them. Do it and the island crashes. This level is designed to be
   failed once.
4. **Keystone** — 5 species; the sea otter analogue looks useless and eats
   something you want. Removing it collapses the kelp and takes three species with
   it.
5. **Invasive** — a species arrives at year 20 whatever you do. Contain it.
6. **Drought Years** — carrying capacity drops 40% for a decade on a schedule you
   can see coming. Prepare.
7. **Hands Off** — a fully stocked island and only two interventions allowed in
   100 years. Pick your moments.

### Screen layout

Top: the island, drawn as a stylized SVG with a scatter of little animal glyphs
whose count scales with population (cap the glyph count, jitter positions).
Middle: a live stacked line chart, years on x. Bottom: intervention buttons with
costs, a speed control (1×/4×/pause) and the year counter.

### Implementation notes

- Simulation state in a `useRef`, `requestAnimationFrame` loop, and only push to
  React state ~4×/second for the readouts — same reasoning as `OrbitalSlingshot`.
- Draw the chart to canvas from a ring buffer of samples. Don't use a chart lib
  for this; you need 100 points and full control of the redraw.
- Balance is the whole job here. Budget real time for tuning `r`, `K` and `a_ij`
  per level — an unbalanced level is either trivially stable or unwinnable, and
  you can only tell by playing it.
- Let players scrub back through the year history after a collapse to see where it
  started. That post-mortem is where the learning actually happens.

### Pitfalls

- Runaway `dt`: with big `r` values the discrete model explodes to Infinity. Clamp
  populations and use a small enough step.
- Don't make extinction instant and silent — fade the species out with a
  notification, or players won't know what they lost.

---

## 6. Starlight Decoder — read a star's fingerprint

**Field:** Astronomy · Spectroscopy
**Badge:** `Astrophysicist`
**Build cost:** ~450 LOC, canvas spectrum strip + charts, no new deps
**Fun risk:** Medium. It's a matching game at heart; the Doppler constraint and
the transit levels are what elevate it. Best kept short and punchy.

### Pitch

A telescope feed gives you one thing: a band of light with dark lines cut out of
it. From that alone, work out what the star is made of, how hot it is, and how
fast it's moving toward or away from us. Then find its planets.

### Why it's fun

The reveal. You drag element reference cards over the spectrum, nothing lines up,
you slide the Doppler control and *every line snaps into place at once*. That
moment — the whole pattern shifting together — is the actual insight behind
measuring the expansion of the universe, and it lands in about four seconds.

### The real science

- **Absorption lines**: each element removes a fixed set of wavelengths.
- **Doppler shift**: `λ_obs = λ_rest · (1 + v/c)` — a *multiplicative* shift, so
  every line moves proportionally. Individual lines are ambiguous; the whole
  pattern isn't. That's the puzzle's spine.
- **Wien's law**: `λ_peak = 2.898e-3 / T`. Read temperature off the continuum's
  colour, which also gives spectral class.
- **Transit photometry**: depth of the dip = `(R_planet/R_star)²`; period from
  spacing.
- **Radial velocity wobble**: a sine in the Doppler shift over time reveals an
  unseen companion.

### Level progression

1. **What's in the Sun?** — no shift, three elements, drag-and-match.
2. **How Hot?** — Wien's law from the continuum; classify O/B/A/F/G/K/M.
3. **Red Shift** — the lines don't match anything until you slide the velocity
   control. Distant galaxy, ~2% recession.
4. **Blue Arrival** — an approaching star; also a decoy element that matches two
   lines by coincidence but breaks the pattern. Teaches "fit everything, not
   something."
5. **Transit** — a light curve with a repeating dip. Report planet radius and
   orbital period.
6. **The Wobble** — no transit; instead the star's own lines shift back and forth
   on a period. Deduce that a planet is there and estimate its mass.
7. **Is It Habitable?** — combine class, distance, period. Compute whether the
   planet sits in the habitable zone. A synthesis level with no new mechanic.

### Screen layout

Top: the spectrum strip, drawn to canvas as a real wavelength→RGB gradient
(400–700 nm) with dark absorption bands. Below: draggable element reference cards
whose line patterns overlay the strip and highlight green on match. Right: the
Doppler slider with a live km/s readout, and the answer form (composition
checklist + numeric fields with tolerances).

### Implementation notes

- Wavelength→RGB: use the standard piecewise approximation (Bruton's), ~25 lines,
  looks great.
- Snapping: score a match as the fraction of reference lines within a tolerance of
  an observed line. Show the score live — a partial fit reading "4 of 7 lines"
  tells players they're close, which is what makes the slider feel good.
- Keep the numbers real. Use actual hydrogen Balmer, sodium D, helium and calcium
  H&K wavelengths; a curious kid who looks them up should find they match.
- Light curves: plot to a second canvas from a generated array with a little
  noise. The noise matters — a clean curve looks fake and removes the challenge.

### Pitfalls

- Wavelength fields need generous tolerances and unit labels, or this becomes a
  data-entry exercise.
- Don't require reading numeric wavelengths off an axis; the drag-to-match
  interaction should carry every level it can.

---

## 7. Reactor Line — stoichiometry as a factory

**Field:** Chemistry · Math
**Badge:** `Chemical Engineer`
**Build cost:** ~700 LOC, SVG node graph, no new deps. The most expensive on this list.
**Fun risk:** Low for the kids who like it, higher for the rest — factory games
are a taste. Strong pairing with the existing `MoleculeBuilder` audience.

### Pitch

Factorio, but conservation of mass is the law. Drag reaction nodes onto a board,
pipe reagents between them, and produce the quantity of product the order calls
for. A reaction node refuses to run until its equation is balanced — and you're
the one who balances it, by setting the coefficients.

### Why it's fun

Building a working line and watching material flow through it is intrinsically
satisfying, and balancing an equation stops feeling like homework the moment it's
the thing standing between you and a running factory. The late levels — where the
naive route wastes a limiting reagent and you have to *recycle a byproduct back
upstream* — are a real chemical-engineering insight arriving as a genuine "aha."

### The real science

- Balancing equations (the game verifies atom counts per element on both sides).
- Molar ratios: a balanced 2:1 reaction consumes reagents at exactly that rate.
- **Limiting reagent** — the level's bottleneck is always one input, and finding
  it is the core skill.
- Percent yield: later reactions run at 80%, so you must overshoot the input.
- Byproduct recycling and multi-step synthesis routes.
- Optional flavour: exothermic reactions produce heat that a later endothermic
  step needs, which turns energy into a routed resource too.

### Level progression

1. **Make Water** — `H₂ + O₂ → H₂O`. One node. Set the coefficients (2, 1, 2).
2. **Rust Never Sleeps** — `Fe + O₂ → Fe₂O₃`; coefficients get uglier (4, 3, 2).
3. **The Bottleneck** — plenty of one reagent, scarce the other. Compute how much
   product is actually possible before you build, or waste the run.
4. **Two-Step** — ammonia from nitrogen and hydrogen, then ammonia into fertiliser.
   Two nodes, one feeding the other, rates must match or the buffer overflows.
5. **Eighty Percent** — a lossy reaction; hit an exact output quantity, which means
   working backwards from the target through the yield.
6. **Nothing Wasted** — the obvious route strands a byproduct and runs the input
   dry. A recycle loop back to node 1 is the only way to hit quota.
7. **The Contract** — free-build: a target product, a shopping list with prices,
   and a profit threshold. Multiple valid routes; the leaderboard is cost.

### Screen layout

Node-graph canvas (SVG): reagent silos on the left, reaction nodes in the middle,
product tank on the right, pipes drawn as bezier curves with little animated dots
for flow. Clicking a reaction node opens a balancing panel — the equation with
editable coefficient boxes and a live per-element atom tally that turns green when
both sides agree. Bottom bar: run/pause, quota progress, elapsed batches.

### Implementation notes

- Reaction spec: `{reagents: {formula, coeff}[], products: [...], yield: 0..1}`.
  Parse formulas into element counts once (a ~30-line tokenizer handling
  `Fe2O3`, `Ca(OH)2`) and validate balance by comparing the two count maps.
- The sim is a discrete tick: each tick, every node consumes `min(available/ratio)`
  and emits products. That's enough — no continuous flow model needed.
- Let players run a partial factory. Half-built lines that produce *something*
  keep the loop rewarding; requiring completeness before anything moves kills it.
- Show a per-element mass balance readout for the whole board. It's a debugging
  tool and it quietly reinforces conservation of mass.

### Pitfalls

- This is the biggest build here. If time is short, ship levels 1–4 and hold the
  recycle/free-build levels for a second pass; the level array makes that trivial.
- Coefficient entry on mobile needs +/− steppers, not text fields.

---

## The bench — smaller ideas, one paragraph each

- **Cipher Lab** (Math · Logic) — break substitution ciphers with letter-frequency
  tools; later levels move to Vigenère and a simple public-key toy. ~250 LOC, and
  the frequency histogram does most of the teaching.
- **Balance Point** (Physics · Statics) — hang weights on a mobile so every arm
  balances; torque = force × distance, and later levels are only solvable with
  fractional placements. Cheap to build, very tactile.
- **Pressure Drop** (Chemistry · States of Matter) — a piston chamber with
  simulated particles; hit target pressure/temperature/volume states. Boyle's and
  Charles's laws emerge from the particle sim rather than being asserted. ~350 LOC
  canvas.
- **Half-Life** (Chemistry · Nuclear) — date artefacts from decay curves; a
  waiting-free version where you drag a "years elapsed" slider until the isotope
  ratio matches the sample.
- **Terraformer** (Earth Science) — set albedo, CO₂ and orbital distance on a toy
  energy-balance model and try to land a planet in the liquid-water band. Simple
  math (Stefan-Boltzmann), big concept.
- **Bridge Load** (Engineering) — build a truss from beams, then load it and watch
  members turn red under tension/compression until something snaps. Needs a small
  static-equilibrium solver; shares the matrix code with Short Circuit.

---

## If you build only two

**Lightbender** and **Critter Ranch**. They're the highest fun-per-line on the
list, they cover the two domains the current lineup misses most (optics and
biology), and neither needs a new dependency. **Short Circuit** is the strongest
third but costs a solver; **Reactor Line** is the most ambitious and the one most
likely to eat a weekend.

---

## Integration notes (whichever you pick)

Every game here assumes the existing `VirtualLab` contract:

```ts
interface GameProps {
  solvedLevels: number[];
  onSolve: (levelIndex: number) => void;
}
```

Adding a game touches four places:

1. `src/types.ts` — extend the `GameId` union and add the key to
   `EMPTY_GAME_PROGRESS` (it's spread over stored progress, so old saves stay
   valid and simply arrive with an empty array).
2. `src/components/VirtualLab.tsx` — a `GAMES` entry (id, title, tagline, field,
   `lucide-react` icon, badge) and a render line. Note the tab grid is currently
   `lg:grid-cols-4`; going past four games means changing that, and past eight it
   should probably scroll or wrap into rows.
3. Badge name — passed as a string into `unlockedBadges`. Be aware of the known
   mismatch documented in `CLAUDE.md`: `Dashboard.tsx` has its own hardcoded
   `badgeCatalog` that these game badges are not part of. Adding games makes that
   gap wider, so it may be worth fixing the catalog in the same pass.
4. XP is awarded automatically by `makeSolveHandler` as `10 + levelIndex * 5`,
   once per level, and persisted under `tr_sc_game_progress`. Nothing to do beyond
   calling `onSolve(levelIndex)` exactly once on a genuine win.

**Theming.** `src/index.css` implements dark mode as per-hex `:root.dark`
overrides, so any new colour outside that enumerated list renders identically in
both themes. Either reuse the approved palette (`#1F3A42`, `#4B6169`, `#2E7D46`
on `#FBF7EC` / `white` / `#E4F5DA`) or add the override alongside. Games with
their own dark chrome — Lightbender and Starlight Decoder both want a dark
backdrop — should follow `OrbitalSlingshot`'s always-dark approach rather than the
unfinished `.game-*` wrapper-class scheme, which is wired up in CSS but applied
nowhere.

**Performance.** Anything with a per-frame simulation (Lightbender's drag preview,
Island Keeper, Reactor Line's tick) should keep sim state in `useRef` and push to
React state at a throttled rate, as `OrbitalSlingshot` does. Don't drive 60 fps
through `useState`.

**Checks.** `npm run lint` (`tsc --noEmit`) and `npm run build` are the whole test
story — there's no test suite, so keep win conditions in small pure functions that
are obvious by inspection.
