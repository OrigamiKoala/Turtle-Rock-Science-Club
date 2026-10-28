/**
 * Gravity Slingshot — Pure Physics Engine
 * ---------------------------------------
 * Symplectic Newtonian integration for heliocentric orbital mechanics with
 * moving Keplerian planets.
 *
 * Units:
 *   Distance: Astronomical Units (AU)  [1 AU = 1.495978707e8 km]
 *   Time: Earth Years (yr)              [1 yr = 365.25 days = 3.15576e7 s]
 *   Speed: km/s                         [1 AU/yr = 4.7403885 km/s]
 *   GM_sun: 4 * pi^2 AU^3 / yr^2       [~39.4784176 AU^3 / yr^2]
 */

import { PlanetDef, ProbeState, Vector2D, FlightTelemetryPoint } from './types';

export const GM_SUN = 4 * Math.PI * Math.PI; // AU^3 / yr^2
export const AU_YR_TO_KM_S = 4.7403885;
export const KM_S_TO_AU_YR = 1 / AU_YR_TO_KM_S;

export const SUN_COLLISION_RADIUS_AU = 0.08;
export const ESCAPE_RADIUS_AU = 55.0; // Probe left solar system

/**
 * Compute analytic Keplerian position and velocity for a planet at time t.
 */
export function getPlanetState(planet: PlanetDef, timeYr: number): { pos: Vector2D; vel: Vector2D } {
  const omega = (2 * Math.PI) / planet.orbitalPeriodYr;
  const theta = planet.initialAngleRad + omega * timeYr;
  const r = planet.radiusAU;

  const pos: Vector2D = {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta)
  };

  const vel: Vector2D = {
    x: -r * omega * Math.sin(theta),
    y: r * omega * Math.cos(theta)
  };

  return { pos, vel };
}

/**
 * Net gravitational acceleration on probe in AU/yr^2.
 */
export function computeAcceleration(
  probePos: Vector2D,
  planets: PlanetDef[],
  timeYr: number
): Vector2D {
  // 1. Gravity from Sun (at origin)
  const distSunSq = probePos.x * probePos.x + probePos.y * probePos.y;
  const distSun = Math.sqrt(distSunSq);
  if (distSun < 1e-4) {
    return { x: 0, y: 0 };
  }

  const sunAccelMag = GM_SUN / (distSunSq * distSun);
  let ax = -sunAccelMag * probePos.x;
  let ay = -sunAccelMag * probePos.y;

  // 2. Gravity from each planet
  for (const planet of planets) {
    const { pos: planetPos } = getPlanetState(planet, timeYr);
    const dx = planetPos.x - probePos.x;
    const dy = planetPos.y - probePos.y;
    const distSq = dx * dx + dy * dy;

    // Softening to prevent unphysical acceleration within physical planet body
    const softDistSq = distSq + (planet.physicalRadiusAU * 0.3) ** 2;
    const softDist = Math.sqrt(softDistSq);

    const planetAccelMag = (GM_SUN * planet.massSolar) / (softDistSq * softDist);
    ax += planetAccelMag * dx;
    ay += planetAccelMag * dy;
  }

  return { x: ax, y: ay };
}

/**
 * Advance probe state by dt using Velocity Verlet (symplectic, energy-conserving).
 */
export function stepSimulation(
  state: ProbeState,
  planets: PlanetDef[],
  dtYr: number
): { nextState: ProbeState; event?: FlightTelemetryPoint['event']; eventBody?: string } {
  if (state.status !== 'flying') {
    return { nextState: state };
  }

  const currentPos = state.pos;
  const currentVel = state.vel;
  const t = state.timeYr;

  // Accel at current position
  const a0 = computeAcceleration(currentPos, planets, t);

  // Position update: r(t + dt) = r(t) + v(t)*dt + 0.5*a(t)*dt^2
  const nextX = currentPos.x + currentVel.x * dtYr + 0.5 * a0.x * dtYr * dtYr;
  const nextY = currentPos.y + currentVel.y * dtYr + 0.5 * a0.y * dtYr * dtYr;
  const nextPos: Vector2D = { x: nextX, y: nextY };
  const nextTime = t + dtYr;

  // Accel at next position
  const a1 = computeAcceleration(nextPos, planets, nextTime);

  // Velocity update: v(t + dt) = v(t) + 0.5*(a(t) + a(t+dt))*dt
  const nextVx = currentVel.x + 0.5 * (a0.x + a1.x) * dtYr;
  const nextVy = currentVel.y + 0.5 * (a0.y + a1.y) * dtYr;
  const nextVel: Vector2D = { x: nextVx, y: nextVy };

  // Check boundary collisions
  const distSun = Math.hypot(nextX, nextY);
  if (distSun < SUN_COLLISION_RADIUS_AU) {
    return {
      nextState: {
        ...state,
        pos: nextPos,
        vel: { x: 0, y: 0 },
        timeYr: nextTime,
        status: 'crashed_sun',
        crashedBodyName: 'Sun'
      },
      event: 'crash',
      eventBody: 'Sun'
    };
  }

  if (distSun > ESCAPE_RADIUS_AU) {
    return {
      nextState: {
        ...state,
        pos: nextPos,
        vel: nextVel,
        timeYr: nextTime,
        status: 'lost_space'
      }
    };
  }

  // Check planet collisions / encounters
  let event: FlightTelemetryPoint['event'] | undefined;
  let eventBody: string | undefined;

  for (const planet of planets) {
    const { pos: planetPos } = getPlanetState(planet, nextTime);
    const distToPlanet = Math.hypot(nextPos.x - planetPos.x, nextPos.y - planetPos.y);

    if (distToPlanet <= planet.physicalRadiusAU) {
      return {
        nextState: {
          ...state,
          pos: nextPos,
          vel: { x: 0, y: 0 },
          timeYr: nextTime,
          status: 'crashed_planet',
          crashedBodyName: planet.name
        },
        event: 'crash',
        eventBody: planet.name
      };
    }

    // Encounter bubble (e.g. within 3x physical radius or 0.6 AU for gas giants)
    const encounterThreshold = Math.max(planet.physicalRadiusAU * 4, 0.4);
    if (distToPlanet < encounterThreshold) {
      event = 'encounter';
      eventBody = planet.name;
    }
  }

  return {
    nextState: {
      ...state,
      pos: nextPos,
      vel: nextVel,
      timeYr: nextTime
    },
    event,
    eventBody
  };
}

/**
 * Apply impulsive mid-course burn (in km/s).
 * Reduces fuel by the magnitude of delta-V.
 */
export function applyBurn(
  state: ProbeState,
  deltaVKmS: Vector2D
): ProbeState {
  if (state.status !== 'flying') return state;

  const burnMagKmS = Math.hypot(deltaVKmS.x, deltaVKmS.y);
  if (burnMagKmS <= 0) return state;

  // Cap burn by available fuel
  const actualBurnKmS = Math.min(burnMagKmS, state.fuel);
  const scale = actualBurnKmS / burnMagKmS;

  const dvAUYr: Vector2D = {
    x: deltaVKmS.x * scale * KM_S_TO_AU_YR,
    y: deltaVKmS.y * scale * KM_S_TO_AU_YR
  };

  return {
    ...state,
    vel: {
      x: state.vel.x + dvAUYr.x,
      y: state.vel.y + dvAUYr.y
    },
    fuel: Math.max(0, state.fuel - actualBurnKmS)
  };
}

/**
 * Predict probe trajectory for `steps` into future without mutating state.
 * Useful for ghost trajectory and real-time flight path rendering.
 */
export function predictTrajectory(
  startState: ProbeState,
  planets: PlanetDef[],
  maxSteps: number = 800,
  dtYr: number = 0.005
): Vector2D[] {
  const points: Vector2D[] = [{ x: startState.pos.x, y: startState.pos.y }];
  let sim = { ...startState };

  for (let i = 0; i < maxSteps; i++) {
    // Dynamic substep: step smaller if near a planet
    let currentDt = dtYr;
    for (const p of planets) {
      const { pos: pPos } = getPlanetState(p, sim.timeYr);
      const dist = Math.hypot(sim.pos.x - pPos.x, sim.pos.y - pPos.y);
      if (dist < 1.0) {
        currentDt = Math.min(currentDt, 0.001);
        break;
      }
    }

    const { nextState } = stepSimulation(sim, planets, currentDt);
    sim = nextState;
    points.push({ x: sim.pos.x, y: sim.pos.y });

    if (sim.status !== 'flying') {
      break;
    }
  }

  return points;
}

/**
 * Create initial probe state at launch from a planetary body.
 */
export function createLaunchState(
  launchPlanet: PlanetDef,
  targetPlanets: PlanetDef[],
  launchAngleDeg: number,
  launchSpeedKmS: number,
  fuelCapacityKmS: number
): ProbeState {
  const t0 = 0;
  const { pos: planetPos, vel: planetVel } = getPlanetState(launchPlanet, t0);

  // Probe starts just outside launch planet's surface along launch direction
  const angleRad = (launchAngleDeg * Math.PI) / 180;
  const launchDir: Vector2D = {
    x: Math.cos(angleRad),
    y: Math.sin(angleRad)
  };

  const startOffsetAU = launchPlanet.physicalRadiusAU * 1.5;
  const startPos: Vector2D = {
    x: planetPos.x + launchDir.x * startOffsetAU,
    y: planetPos.y + launchDir.y * startOffsetAU
  };

  // Heliocentric velocity = planet orbital velocity + launch burn velocity
  const launchVelAUYr = launchSpeedKmS * KM_S_TO_AU_YR;
  const startVel: Vector2D = {
    x: planetVel.x + launchDir.x * launchVelAUYr,
    y: planetVel.y + launchDir.y * launchVelAUYr
  };

  return {
    pos: startPos,
    vel: startVel,
    fuel: Math.max(0, fuelCapacityKmS - launchSpeedKmS),
    maxFuel: fuelCapacityKmS,
    timeYr: t0,
    status: 'flying'
  };
}

/**
 * Compute live telemetry metrics.
 */
export function computeTelemetry(
  state: ProbeState,
  planets: PlanetDef[],
  targetBodyId: string
): {
  speedHeliocentricKmS: number;
  speedNearestPlanetKmS: number | null;
  nearestPlanet: PlanetDef | null;
  nearestPlanetDistAU: number | null;
  targetDistAU: number;
  targetReached: boolean;
  isPassingBehindNearest: boolean | null;
} {
  const speedHeliocentricKmS = Math.hypot(state.vel.x, state.vel.y) * AU_YR_TO_KM_S;

  let nearestPlanet: PlanetDef | null = null;
  let nearestDistAU = Infinity;
  let speedNearestKmS: number | null = null;
  let isPassingBehindNearest: boolean | null = null;

  let targetDistAU = Infinity;
  let targetReached = false;

  for (const planet of planets) {
    const { pos: pPos, vel: pVel } = getPlanetState(planet, state.timeYr);
    const dx = state.pos.x - pPos.x;
    const dy = state.pos.y - pPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist < nearestDistAU) {
      nearestDistAU = dist;
      nearestPlanet = planet;

      const relVx = (state.vel.x - pVel.x) * AU_YR_TO_KM_S;
      const relVy = (state.vel.y - pVel.y) * AU_YR_TO_KM_S;
      speedNearestKmS = Math.hypot(relVx, relVy);

      // Check whether probe is behind planet in its direction of motion:
      // Planet direction unit vector: pVel / |pVel|
      // Vector from planet to probe: (dx, dy)
      // Dot product < 0 means probe is behind planet's velocity vector (in its wake)!
      const pSpeed = Math.hypot(pVel.x, pVel.y);
      if (pSpeed > 1e-4) {
        const dot = (dx * pVel.x + dy * pVel.y) / pSpeed;
        isPassingBehindNearest = dot < 0;
      }
    }

    if (planet.id === targetBodyId) {
      targetDistAU = dist;
      // Reached if within arrival tolerance (e.g. 0.5 AU)
      if (dist < Math.max(planet.physicalRadiusAU * 3.5, 0.5)) {
        targetReached = true;
      }
    }
  }

  return {
    speedHeliocentricKmS,
    speedNearestPlanetKmS: speedNearestKmS,
    nearestPlanet,
    nearestPlanetDistAU: nearestDistAU === Infinity ? null : nearestDistAU,
    targetDistAU,
    targetReached,
    isPassingBehindNearest
  };
}
