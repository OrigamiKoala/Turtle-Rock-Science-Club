import { ScienceInteractive } from '../types';

/**
 * All weekly science interactives published on trscienceclub.org.
 * Stored in chronological order (oldest to newest).
 */
export const WEEKLY_INTERACTIVES: ScienceInteractive[] = [
  {
    id: 'slingshot',
    title: 'Gravity Slingshot',
    route: '/slingshot',
    week: 1,
    date: 'October 28, 2026',
    field: 'Physics · Orbital Mechanics',
    description:
      'Launch an interplanetary spacecraft from Earth to Neptune with limited fuel. Time planetary flybys behind Jupiter, Saturn, and Uranus to steal orbital momentum and reach the outer planets.',
    mechanics:
      'Kick-drift-kick leapfrog symplectic n-body gravity simulation. Passing behind a moving planet transfers orbital momentum to the spacecraft relative to the Sun.',
    concepts: ['Gravity assists', 'Heliocentric orbits', 'Orbital velocity', 'Fuel conservation']
  }
];
