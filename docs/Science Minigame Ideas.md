# Science Minigame Ideas

Oct 27, 2026 · @Carl Liu

These 29 ideas for short online science interactives are grouped by field. Each one is built around a "wait, really?" moment that makes a student want more of that field, which matters more than how much content it covers. Each idea lists the moment it's built around as its **Hook**.

## Physics & Engineering

- **Gravity Slingshot.** Launch a probe from Earth with a fixed fuel budget and slingshot it past planets to reach Neptune. Direct routes always fail, and only gravity assists get you there. *Hook:* Voyager 2 actually did this, and orbits turn out to be "falling and constantly missing."
- **Shake the Tower.** Drive a skyscraper model with a frequency slider and find the frequency that makes it sway wildly. Then hang a giant pendulum inside to calm it. *Hook:* resonance destroyed the Tacoma Narrows Bridge, and Taipei 101 really has a 660-ton ball hanging inside it.
- **Sound Sculptor.** Stack sine waves (harmonics) to rebuild a flute, a violin, or a voice, and hear the result change live. *Hook:* every sound is a sum of simple waves. It's Fourier intuition without the math.
- **Egg Drop Lab.** Design a container using crumple zones, padding, and parachute size, then watch a slow-motion replay with a force readout. *Hook:* the same idea explains why cars are built to crumple.
- **Light the Village.** A circuit puzzle with limited batteries and wire. Series wiring dims the bulbs and parallel wiring drains the battery faster, so players have to work out the tradeoff.

## Chemistry

- **Star Barcode.** Players identify mystery firework salts by flame color, and later use the same spectral "barcodes" to work out what a distant star is made of. *Hook:* we know the composition of stars we'll never visit.
- **Cosmic Forge.** Fuse nuclei inside a star's core to build up the periodic table. Iron refuses to fuse profitably, so you need a supernova or neutron-star collision to make gold. *Hook:* the gold in a ring came from colliding dead stars.
- **Cabbage Detective.** Use virtual red-cabbage indicator to test household liquids, then solve "which cup has the antacid?" by neutralizing.
- **Crystal Grower.** Control cooling rate and watch huge crystals or tiny grains form. *Hook:* this explains geodes, rock candy, and why granite looks different from basalt.
- **Slime Chemist.** A cross-linking slider takes a polymer from runny to bouncy to brittle. A bonus level is running across oobleck.
- **Ink Lineup.** Use paper chromatography to find which suspect's pen wrote the ransom note. This also maps directly onto Science Olympiad forensics events.

## Biology

- **You Are the Bird.** The player just catches the bugs they can see. After 20 generations, the surviving population blends into the bark. *Hook:* the player caused evolution without meaning to, which makes selection feel real in a way a diagram can't.
- **Wolves of Yellowstone.** Remove or reintroduce wolves and watch elk, willows, beavers, and even riverbanks change. *Hook:* this trophic cascade really happened, and one predator reshaped the landscape.
- **Outbreak Town.** Vaccinate a fraction of a town of dots and watch a disease either fizzle or explode. The herd-immunity threshold appears without anyone stating it.
- **Superbug.** Treat a bacterial colony and see what happens if you stop the antibiotics early: the survivors are the resistant ones. *Hook:* it's evolution happening fast enough to watch.
- **Pond Drop.** Zoom into a drop of pond water and identify the creatures, tardigrades included. *Hook:* a whole hidden zoo lives in a puddle.
- **Fever Lab.** A temperature slider unfolds an enzyme until it stops fitting its target. This shows why high fevers are dangerous.

## Earth & Space

- **Planet Hunter.** Watch a star's brightness dip and work out the planet's size and orbit from the dips, then judge whether it's habitable. It could use real Kepler/TESS light curves. *Hook:* volunteers have discovered real planets this way.
- **Find the Epicenter.** Three seismograph stations each give a P-to-S wave gap. Turn those gaps into distances, draw circles, and locate the quake. This is the real method, and it's a satisfying puzzle.
- **Wegener's Case.** Drag continents back into Pangaea using matching fossils and rock layers as evidence. *Hook:* Wegener was right and nobody believed him for decades.
- **Volcano Personality.** Adjust silica and gas content to get a gentle Hawaiian lava flow or a Mount St. Helens blast.
- **Crater Maker.** Set asteroid size and speed and see the crater it makes. Players can then count craters to date surfaces and reconstruct the dinosaur-killer impact.
- **Three Planets.** Adjust the atmospheres of Venus, Earth, and Mars to see why one is an oven, one is just right, and one is frozen. This makes the greenhouse effect intuitive.
- **Weather Balloon.** Ride a balloon upward as air pressure drops, the balloon swells, the temperature changes, and it finally pops.

## Brain & Senses

- **Find Your Blind Spot.** A guided test reveals the hole in your vision, then shows how your brain fills it in. *Hook:* you're constantly seeing things that aren't there.
- **Illusion Lab.** Interactive illusions that players can tweak to break them. *Hook:* perception is your brain's prediction, not a camera feed.
- **Reaction Relay.** Measure your own reaction time and estimate how fast signals travel along your nerves. This is personal data, which kids love.

## Scale & Wonder

- **Powers of Ten.** Zoom from a playground out to the galaxy and in to an atom. It's simple, but it sticks.
- **Deep Time Scroll.** Scroll through Earth's history at a constant rate per million years. Humans show up in the last sliver.

## Top five to build first

1. **You Are the Bird**
2. **Cosmic Forge**
3. **Planet Hunter**
4. **Find the Epicenter**
5. **Wolves of Yellowstone**

In each of these, the motivation comes from the phenomenon itself rather than from points, and the player does what real scientists do rather than just watching. Each one also ends on a fact surprising enough that a 5th grader would repeat it at dinner. They all work well in 2D, and they hold up for solo play.

## Overlap with the Virtual Lab

Five of these ideas overlap with games already on the club site, including two of the top five (Find the Epicenter and Wolves of Yellowstone). If you want new ground, **Superbug** and **Outbreak Town** would be good substitutes for those two.

| Idea | Existing game | How close |
| --- | --- | --- |
| Gravity Slingshot | `OrbitalSlingshot.tsx` | Same core idea, a canvas gravity sim |
| Find the Epicenter | `Epicenter.tsx` | Same method (trilateration) |
| Star Barcode | `StarlightDecoder.tsx` | Covers the spectral-line half; the flame-test half is new |
| Light the Village | `ShortCircuit.tsx` | Same domain (circuits) |
| Wolves of Yellowstone | `IslandKeeper.tsx`, `public/ecology/` | Same model (a food web); the real Yellowstone story is the new angle |
