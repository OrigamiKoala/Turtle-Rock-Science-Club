/**
 * Gravity Slingshot — Stage Definitions & Educational Progression
 */

import { StageDef, PlanetDef, ProbeState, FlightTelemetryPoint } from './types';

// Reusable planet definitions with Keplerian periods T = r^1.5
export const PLANET_EARTH: PlanetDef = {
  id: 'earth',
  name: 'Earth',
  color: '#38bdf8',       // Light sky blue
  glowColor: 'rgba(56, 189, 248, 0.4)',
  radiusAU: 1.0,
  massSolar: 3.0e-6,
  physicalRadiusAU: 0.015,
  initialAngleRad: 0,
  orbitalPeriodYr: 1.0
};

export const PLANET_JUPITER: PlanetDef = {
  id: 'jupiter',
  name: 'Jupiter',
  color: '#f59e0b',       // Amber / banded
  glowColor: 'rgba(245, 158, 11, 0.45)',
  radiusAU: 5.204,
  massSolar: 9.543e-4 * 4.0, // Scaled for clean planar pedagogical deflection
  physicalRadiusAU: 0.015,
  initialAngleRad: 1.72,
  orbitalPeriodYr: Math.pow(5.204, 1.5) // ~11.87 yr
};

export const PLANET_SATURN: PlanetDef = {
  id: 'saturn',
  name: 'Saturn',
  color: '#fbbf24',       // Golden ringed
  glowColor: 'rgba(251, 191, 36, 0.4)',
  radiusAU: 9.54,
  massSolar: 2.858e-4 * 4.0,
  physicalRadiusAU: 0.015,
  initialAngleRad: 2.70,
  orbitalPeriodYr: Math.pow(9.54, 1.5) // ~29.46 yr
};

export const PLANET_URANUS: PlanetDef = {
  id: 'uranus',
  name: 'Uranus',
  color: '#2dd4bf',       // Cyan / teal
  glowColor: 'rgba(45, 212, 191, 0.35)',
  radiusAU: 19.19,
  massSolar: 4.366e-5 * 4.0,
  physicalRadiusAU: 0.012,
  initialAngleRad: 3.38,
  orbitalPeriodYr: Math.pow(19.19, 1.5) // ~84.07 yr
};

export const PLANET_NEPTUNE: PlanetDef = {
  id: 'neptune',
  name: 'Neptune',
  color: '#6366f1',       // Deep azure
  glowColor: 'rgba(99, 102, 241, 0.45)',
  radiusAU: 30.07,
  massSolar: 5.151e-5 * 4.0,
  physicalRadiusAU: 0.012,
  initialAngleRad: 3.513,
  orbitalPeriodYr: Math.pow(30.07, 1.5) // ~164.9 yr
};

export const STAGES: StageDef[] = [
  // Stage 1: Falling and Missing
  {
    id: 'stage-1',
    number: 1,
    title: 'Falling and Missing',
    prompt: 'Establish an orbit around the Sun without crashing.',
    goalDescription: 'Keep the probe orbiting the Sun for at least 1 full revolution without plunging into the Sun.',
    initialFuelKmS: 12.0,
    planets: [PLANET_EARTH],
    launchBodyId: 'earth',
    targetBodyId: 'sun',
    defaultLaunchAngleDeg: 90, // Prograde (tangent to orbit)
    defaultLaunchSpeedKmS: 6.0,
    minLaunchSpeedKmS: 1.0,
    maxLaunchSpeedKmS: 12.0,
    allowMidCourseBurn: true,
    hints: [
      { level: 1, text: 'Drag the aim arrow to change your launch direction and speed.' },
      { level: 2, text: 'Aim along Earth\'s direction of travel rather than straight at the Sun.' },
      { level: 3, text: 'An orbit happens when forward speed carries you sideways as fast as gravity pulls you inward.' }
    ],
    completionText: {
      plain: 'When forward velocity curves you past the Sun at the exact rate gravity pulls you down, you never hit the ground.',
      term: 'Orbit',
      detail: 'An orbit is not the absence of gravity — it is freefall that continually misses the center.'
    },
    checkSuccess: (state: ProbeState) => {
      if (state.status === 'crashed_sun' || state.status === 'crashed_planet') return false;
      const dist = Math.hypot(state.pos.x, state.pos.y);
      return state.timeYr >= 1.0 && dist > 0.4 && dist < 3.5;
    },
    checkFailure: (state: ProbeState) => {
      if (state.status === 'crashed_sun') return 'The probe fell directly into the Sun. Add more sideways speed to miss it.';
      if (state.status === 'crashed_planet') return 'The probe crashed back into Earth.';
      if (state.status === 'lost_space') return 'Too much speed hurled the probe out into deep space.';
      return null;
    }
  },

  // Stage 2: The Fuel Wall
  {
    id: 'stage-2',
    number: 2,
    title: 'The Fuel Wall',
    prompt: 'Try to reach Neptune using only your rocket engine.',
    goalDescription: 'Burn all your available fuel trying to reach Neptune (at 30 AU). Can direct propulsion make it?',
    initialFuelKmS: 8.0,
    planets: [
      PLANET_EARTH,
      { ...PLANET_NEPTUNE, initialAngleRad: 0.5 }
    ],
    launchBodyId: 'earth',
    targetBodyId: 'neptune',
    defaultLaunchAngleDeg: 90,
    defaultLaunchSpeedKmS: 8.0,
    minLaunchSpeedKmS: 2.0,
    maxLaunchSpeedKmS: 8.0,
    allowMidCourseBurn: true,
    hints: [
      { level: 1, text: 'Set launch power to maximum and burn in your direction of travel.' },
      { level: 2, text: 'Watch your speed drop as you climb against the Sun\'s gravity well.' },
      { level: 3, text: 'Notice how the probe stalls and turns back around 4 to 5 AU with zero fuel left.' }
    ],
    completionText: {
      plain: 'Climbing against the Sun\'s gravity drains speed so relentlessly that chemical rockets run dry far short of Neptune.',
      term: 'The Propulsion Limit',
      detail: 'Reaching the outer solar system by brute-force rocket fuel is impossible on a realistic budget. We must steal speed from planets.'
    },
    checkSuccess: (state: ProbeState) => {
      const dist = Math.hypot(state.pos.x, state.pos.y);
      return state.fuel <= 0.1 && dist >= 3.0 && state.timeYr >= 1.0;
    },
    checkFailure: (state: ProbeState) => {
      if (state.status === 'crashed_sun') return 'Plunged into the Sun. Burn prograde to climb outward.';
      return null;
    }
  },

  // Stage 3: The Moving Slingshot (Jupiter)
  {
    id: 'stage-3',
    number: 3,
    title: 'The Moving Slingshot',
    prompt: 'Steal speed from Jupiter to reach Saturn on a limited fuel budget.',
    goalDescription: 'Pass behind Jupiter along its orbital path to boost your heliocentric speed and reach Saturn.',
    initialFuelKmS: 10.0,
    planets: [
      PLANET_EARTH,
      PLANET_JUPITER,
      PLANET_SATURN
    ],
    launchBodyId: 'earth',
    targetBodyId: 'saturn',
    defaultLaunchAngleDeg: 85.0,
    defaultLaunchSpeedKmS: 9.6,
    minLaunchSpeedKmS: 5.0,
    maxLaunchSpeedKmS: 10.0,
    allowMidCourseBurn: true,
    hints: [
      { level: 1, text: 'Aim toward where Jupiter will be when you arrive, not where it is now.' },
      { level: 2, text: 'Pass behind Jupiter\'s path through space, not in front of it.' },
      { level: 3, text: 'Passing through Jupiter\'s wake drags you forward in its orbital direction, adding free speed relative to the Sun.' }
    ],
    completionText: {
      plain: 'Relative to Jupiter, your flyby speed was unchanged. But relative to the Sun, you stole a chunk of Jupiter\'s orbital momentum.',
      term: 'Gravity Assist',
      detail: 'Jupiter slowed down by an imperceptible fraction of an atom, while your lightweight probe gained over 10 km/s for zero fuel.'
    },
    checkSuccess: (state: ProbeState, flightLog: FlightTelemetryPoint[]) => {
      const hadJupiterAssist = flightLog.some(p => p.nearestPlanetId === 'jupiter' && (p.nearestPlanetDistAU ?? 99) < 0.6);
      const saturn = PLANET_SATURN;
      const omega = (2 * Math.PI) / saturn.orbitalPeriodYr;
      const theta = saturn.initialAngleRad + omega * state.timeYr;
      const saturnPos = {
        x: saturn.radiusAU * Math.cos(theta),
        y: saturn.radiusAU * Math.sin(theta)
      };
      const distToSaturn = Math.hypot(state.pos.x - saturnPos.x, state.pos.y - saturnPos.y);
      return hadJupiterAssist && distToSaturn < 1.0;
    },
    checkFailure: (state: ProbeState, flightLog: FlightTelemetryPoint[]) => {
      if (state.status === 'crashed_planet' && state.crashedBodyName === 'Jupiter') {
        return 'Too close — the probe crashed into Jupiter\'s atmosphere. Aim slightly wider to skim past.';
      }
      if (state.status === 'crashed_sun') return 'The probe dove into the Sun.';
      const jupiterEncounter = flightLog.find(p => p.nearestPlanetId === 'jupiter' && (p.nearestPlanetDistAU ?? 99) < 0.6);
      if (jupiterEncounter && state.fuel <= 0.1 && Math.hypot(state.pos.x, state.pos.y) < 6.0 && state.timeYr > 3.0) {
        return 'Passing in front of Jupiter slowed the probe down. Aim behind its trailing edge to speed up.';
      }
      return null;
    }
  },

  // Stage 4: The Grand Tour (Voyager 2 to Neptune)
  {
    id: 'stage-4',
    number: 4,
    title: 'The Grand Tour',
    prompt: 'Chain gravity assists past the giant planets to reach Neptune.',
    goalDescription: 'Recreate Voyager 2: Sling past Jupiter and Saturn to reach Neptune on a single launch tank.',
    initialFuelKmS: 10.0,
    planets: [
      PLANET_EARTH,
      PLANET_JUPITER,
      PLANET_SATURN,
      PLANET_NEPTUNE
    ],
    launchBodyId: 'earth',
    targetBodyId: 'neptune',
    defaultLaunchAngleDeg: 85.0,
    defaultLaunchSpeedKmS: 9.6,
    minLaunchSpeedKmS: 6.0,
    maxLaunchSpeedKmS: 10.0,
    allowMidCourseBurn: true,
    hints: [
      { level: 1, text: 'Launch prograde so Earth\'s 30 km/s orbital speed helps fling you to Jupiter.' },
      { level: 2, text: 'Use tiny mid-course burns if needed to nudge your post-Jupiter trajectory toward Saturn.' },
      { level: 3, text: 'Every flyby redirects your velocity vector toward the next planet without draining your main tanks.' }
    ],
    completionText: {
      plain: 'By hopping across moving gravitational slingshots, a tiny probe reached the edge of the solar system.',
      term: 'The Grand Tour',
      detail: 'Voyager 2 launched in 1977 during a rare 176-year planetary geometry, exploring Jupiter, Saturn, Uranus, and Neptune.'
    },
    checkSuccess: (state: ProbeState) => {
      const neptune = PLANET_NEPTUNE;
      const omega = (2 * Math.PI) / neptune.orbitalPeriodYr;
      const theta = neptune.initialAngleRad + omega * state.timeYr;
      const nPos = { x: neptune.radiusAU * Math.cos(theta), y: neptune.radiusAU * Math.sin(theta) };
      const dist = Math.hypot(state.pos.x - nPos.x, state.pos.y - nPos.y);
      return dist < 1.5;
    },
    checkFailure: (state: ProbeState) => {
      if (state.status === 'crashed_planet') return `Crashed into ${state.crashedBodyName}. Give the planet more clearance.`;
      if (state.status === 'crashed_sun') return 'Lost into the Sun.';
      return null;
    }
  },

  // Stage 5: Deep Space Sandbox
  {
    id: 'stage-sandbox',
    number: 5,
    title: 'Deep Space Sandbox',
    prompt: 'Experiment with custom launch angles, speeds, and planetary slingshots.',
    goalDescription: 'Full solar system simulator. Test extreme trajectories, reverse orbits, or slingshot out of the solar system.',
    initialFuelKmS: 30.0,
    planets: [
      PLANET_EARTH,
      PLANET_JUPITER,
      PLANET_SATURN,
      PLANET_URANUS,
      PLANET_NEPTUNE
    ],
    launchBodyId: 'earth',
    targetBodyId: 'neptune',
    defaultLaunchAngleDeg: 90,
    defaultLaunchSpeedKmS: 12.0,
    minLaunchSpeedKmS: 1.0,
    maxLaunchSpeedKmS: 30.0,
    allowMidCourseBurn: true,
    hints: [
      { level: 1, text: 'Toggle planet visibility or scrub the simulation speed with the playback controls.' },
      { level: 2, text: 'Try launching backward (retrograde) to see what it takes to dive into the Sun.' },
      { level: 3, text: 'Try a close flyby of Jupiter to see how much speed you can steal in a single pass.' }
    ],
    completionText: {
      plain: 'You have mastered orbital mechanics and planetary gravity assists.',
      term: 'Astrodynamics',
      detail: 'Every interplanetary mission, from Mariner to Cassini and New Horizons, relies on the exact principles you tested.'
    },
    checkSuccess: () => false, // Sandbox does not end
    checkFailure: () => null
  }
];
