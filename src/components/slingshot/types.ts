/**
 * Gravity Slingshot — Type Definitions
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface PlanetDef {
  id: string;
  name: string;
  color: string;
  glowColor: string;
  radiusAU: number;      // Orbital semi-major axis (AU)
  massSolar: number;     // Mass relative to Sun
  physicalRadiusAU: number; // Collision radius for display and hit detection
  initialAngleRad: number; // Starting angle at t = 0
  orbitalPeriodYr: number; // Derived from Kepler's third law: T = r^1.5
}

export interface ProbeState {
  pos: Vector2D;         // Position in AU (origin = Sun)
  vel: Vector2D;         // Velocity in AU/year
  fuel: number;          // Fuel remaining in Delta-V equivalent (km/s)
  maxFuel: number;       // Initial fuel capacity (km/s)
  timeYr: number;        // Mission elapsed time (years)
  status: 'docked' | 'flying' | 'target_reached' | 'crashed_sun' | 'crashed_planet' | 'stranded' | 'lost_space';
  crashedBodyName?: string;
}

export interface Telemetry {
  speedHeliocentricKmS: number;  // Speed relative to Sun (km/s)
  speedPlanetKmS: number | null; // Speed relative to nearest planet (km/s)
  nearestPlanetId: string | null;
  nearestPlanetDistAU: number | null;
  targetDistAU: number;
  periapsisFlybySpeedKmS: number | null;
  fuelKmS: number;
  elapsedDays: number;
}

export interface StageGoal {
  type: 'orbit_sun' | 'reach_outer' | 'jupiter_slingshot' | 'grand_tour' | 'sandbox';
  targetBodyId?: string;
  minSpeedGainKmS?: number;
  maxFuelUsedKmS?: number;
  requireNoCrash?: boolean;
}

export interface StageHint {
  level: 1 | 2 | 3;
  text: string;
}

export interface StageDef {
  id: string;
  number: number;
  title: string;
  prompt: string;
  goalDescription: string;
  initialFuelKmS: number;
  planets: PlanetDef[];
  launchBodyId: string;   // Earth by default
  targetBodyId: string;   // Sun orbit / Neptune / Saturn / etc.
  defaultLaunchAngleDeg: number;
  defaultLaunchSpeedKmS: number;
  minLaunchSpeedKmS: number;
  maxLaunchSpeedKmS: number;
  allowMidCourseBurn: boolean;
  hints: StageHint[];
  completionText: {
    plain: string;
    term: string;
    detail: string;
  };
  checkSuccess: (state: ProbeState, flightLog: FlightTelemetryPoint[]) => boolean;
  checkFailure: (state: ProbeState, flightLog: FlightTelemetryPoint[]) => string | null;
}

export interface FlightTelemetryPoint {
  timeYr: number;
  x: number;
  y: number;
  speedKmS: number;
  fuelKmS: number;
  nearestPlanetId: string | null;
  nearestPlanetDistAU: number | null;
  event?: 'launch' | 'burn' | 'periapsis' | 'encounter' | 'crash' | 'target';
}

export interface SlingshotProgress {
  completedStages: string[];
  bestFuelUsage: Record<string, number>;
  unlockedSandbox: boolean;
}
