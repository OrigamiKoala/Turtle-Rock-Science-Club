import * as THREE from 'three';
import { ELEMENTS, MOLECULES, MoleculeSpec } from './stoichiometryQuests';

// Pre-allocated math helpers at module scope (zero GC)
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _ortho = new THREE.Vector3();
const _quat = new THREE.Quaternion();

export interface ExplodableSubpart {
  object: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
}

export interface ApparatusHandles {
  root: THREE.Group;
  balanceBeamGroup: THREE.Group;
  leftPanGroup: THREE.Group;
  rightPanGroup: THREE.Group;
  coreFlashMesh: THREE.Mesh;
  corePointLight: THREE.PointLight;
  explodableParts: ExplodableSubpart[];
}

/**
 * Builds a clean, sculptural 3D Molecule Group (CPK spheres + covalent bond struts)
 * without visual clutter so molecular geometry is immediately legible.
 */
export function buildMoleculeGroup(
  specId: string,
  role: 'reactantA' | 'reactantB' | 'productC' | 'productD' | 'excess',
  isSoftwareGl: boolean
): THREE.Group {
  const spec: MoleculeSpec = MOLECULES[specId] || MOLECULES.H2O;
  const group = new THREE.Group();
  group.name = `molecule_${spec.id}`;

  const segs = isSoftwareGl ? 18 : 28;

  // 1. Atomic CPK Spheres
  spec.atoms.forEach((atomNode) => {
    const elSpec = ELEMENTS[atomNode.element];
    const sphereGeo = new THREE.SphereGeometry(elSpec.radius, segs, segs);
    const isMetal = atomNode.element === 'Fe' || atomNode.element === 'Al';
    const atomMat = new THREE.MeshPhysicalMaterial({
      color: elSpec.color,
      roughness: isMetal ? 0.22 : 0.28,
      metalness: isMetal ? 0.8 : 0.06,
      clearcoat: 0.7,
      clearcoatRoughness: 0.15,
    });

    const atomMesh = new THREE.Mesh(sphereGeo, atomMat);
    atomMesh.position.set(
      atomNode.position[0],
      atomNode.position[1],
      atomNode.position[2]
    );
    atomMesh.castShadow = !isSoftwareGl;
    atomMesh.receiveShadow = !isSoftwareGl;
    atomMesh.layers.enable(1);
    atomMesh.userData = {
      inspectType: 'molecule',
      speciesId: spec.id,
      formula: spec.displayFormula,
      name: spec.name,
      molarMass: spec.molarMass,
      geometryDesc: spec.geometryDesc,
      role,
    };
    group.add(atomMesh);
  });

  // 2. Covalent Bond Struts
  const bondMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.5,
    roughness: 0.35,
  });

  spec.bonds.forEach((bond) => {
    const a = spec.atoms[bond.from];
    const b = spec.atoms[bond.to];
    if (!a || !b) return;

    const pA = new THREE.Vector3(...a.position);
    const pB = new THREE.Vector3(...b.position);
    _dir.subVectors(pB, pA);
    const len = _dir.length();
    if (len < 0.001) return;

    _mid.addVectors(pA, pB).multiplyScalar(0.5);
    _dir.normalize();
    _quat.setFromUnitVectors(_up, _dir);

    _ortho.set(0, 0, 1).cross(_dir);
    if (_ortho.lengthSq() < 0.01) _ortho.set(1, 0, 0);
    _ortho.normalize();

    const offsets =
      bond.order === 1
        ? [0]
        : bond.order === 2
        ? [-0.055, 0.055]
        : [-0.075, 0, 0.075];

    const cylRadius = bond.order === 1 ? 0.052 : 0.034;

    offsets.forEach((off) => {
      const cylGeo = new THREE.CylinderGeometry(cylRadius, cylRadius, len, 12);
      const cylMesh = new THREE.Mesh(cylGeo, bondMat);
      cylMesh.position.copy(_mid).addScaledVector(_ortho, off);
      cylMesh.quaternion.copy(_quat);
      group.add(cylMesh);
    });
  });

  group.userData = {
    inspectType: 'molecule',
    speciesId: spec.id,
    formula: spec.displayFormula,
    name: spec.name,
    molarMass: spec.molarMass,
    geometryDesc: spec.geometryDesc,
    role,
  };

  return group;
}

/**
 * Builds a minimalist, sculptural 3D Equilibrium Stage:
 * - A quiet central fulcrum prism
 * - A slender precision balance beam with two suspended reactant trays (Left = A, Right = B)
 * - A serene product synthesis ring on the right where formed molecules gather
 */
export function buildLaboratoryApparatus(
  _renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): ApparatusHandles {
  const root = new THREE.Group();
  const explodableParts: ExplodableSubpart[] = [];

  const darkAnodized = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.65,
    roughness: 0.4,
  });

  const brushedSilver = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.82,
    roughness: 0.22,
  });

  const warmBrass = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.78,
    roughness: 0.26,
  });

  // 1. Minimalist Base Plinth (Grounded at y = 0)
  const plinthGroup = new THREE.Group();
  const baseDiscGeo = new THREE.CylinderGeometry(1.1, 1.3, 0.18, 32);
  const baseDisc = new THREE.Mesh(baseDiscGeo, darkAnodized);
  baseDisc.position.set(-1.6, 0.09, 0);
  baseDisc.receiveShadow = !isSoftwareGl;
  plinthGroup.add(baseDisc);

  // Central Fulcrum Spine
  const spineGeo = new THREE.CylinderGeometry(0.08, 0.14, 1.35, 24);
  const spine = new THREE.Mesh(spineGeo, brushedSilver);
  spine.position.set(-1.6, 0.85, 0);
  spine.castShadow = !isSoftwareGl;
  plinthGroup.add(spine);

  // Fulcrum Pivot Jewel
  const pivotGeo = new THREE.OctahedronGeometry(0.16, 0);
  const pivot = new THREE.Mesh(pivotGeo, warmBrass);
  pivot.position.set(-1.6, 1.58, 0);
  plinthGroup.add(pivot);

  root.add(plinthGroup);

  // 2. Dynamic Tilting Balance Beam (Centered at x = -1.6, y = 1.58)
  const balanceBeamGroup = new THREE.Group();
  balanceBeamGroup.position.set(-1.6, 1.58, 0);

  const beamRodGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.2, 16);
  beamRodGeo.rotateZ(Math.PI / 2);
  const beamRod = new THREE.Mesh(beamRodGeo, brushedSilver);
  balanceBeamGroup.add(beamRod);

  // Left Reactant A Tray (relative x = -2.5 -> world x = -4.1)
  const leftPanGroup = new THREE.Group();
  leftPanGroup.position.set(-2.5, 0, 0);

  const stemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.45, 12);
  const leftStem = new THREE.Mesh(stemGeo, brushedSilver);
  leftStem.position.set(0, -0.22, 0);
  leftPanGroup.add(leftStem);

  const trayGeo = new THREE.CylinderGeometry(1.35, 1.2, 0.08, 36);
  const leftTray = new THREE.Mesh(trayGeo, darkAnodized);
  leftTray.position.set(0, -0.45, 0);
  leftTray.receiveShadow = !isSoftwareGl;
  leftPanGroup.add(leftTray);

  const leftRimGeo = new THREE.TorusGeometry(1.35, 0.025, 12, 48);
  const leftRimMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  const leftRim = new THREE.Mesh(leftRimGeo, leftRimMat);
  leftRim.position.set(0, -0.41, 0);
  leftRim.rotation.x = Math.PI / 2;
  leftPanGroup.add(leftRim);

  balanceBeamGroup.add(leftPanGroup);

  // Right Reactant B Tray (relative x = +2.5 -> world x = +0.9)
  const rightPanGroup = new THREE.Group();
  rightPanGroup.position.set(2.5, 0, 0);

  const rightStem = new THREE.Mesh(stemGeo, brushedSilver);
  rightStem.position.set(0, -0.22, 0);
  rightPanGroup.add(rightStem);

  const rightTray = new THREE.Mesh(trayGeo, darkAnodized);
  rightTray.position.set(0, -0.45, 0);
  rightTray.receiveShadow = !isSoftwareGl;
  rightPanGroup.add(rightTray);

  const rightRimGeo = new THREE.TorusGeometry(1.35, 0.025, 12, 48);
  const rightRimMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xf43f5e,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  const rightRim = new THREE.Mesh(rightRimGeo, rightRimMat);
  rightRim.position.set(0, -0.41, 0);
  rightRim.rotation.x = Math.PI / 2;
  rightPanGroup.add(rightRim);

  balanceBeamGroup.add(rightPanGroup);
  root.add(balanceBeamGroup);

  // 3. Minimalist Product Synthesis Stage on the Right (world x = +4.2)
  const productStageGroup = new THREE.Group();
  productStageGroup.position.set(4.2, 0, 0);

  const prodPedestalGeo = new THREE.CylinderGeometry(1.55, 1.65, 0.14, 40);
  const prodPedestal = new THREE.Mesh(prodPedestalGeo, darkAnodized);
  prodPedestal.position.set(0, 0.07, 0);
  prodPedestal.receiveShadow = !isSoftwareGl;
  productStageGroup.add(prodPedestal);

  const prodRimGeo = new THREE.TorusGeometry(1.55, 0.03, 12, 48);
  const prodRimMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 0.4,
    roughness: 0.25,
  });
  const prodRim = new THREE.Mesh(prodRimGeo, prodRimMat);
  prodRim.position.set(0, 0.14, 0);
  prodRim.rotation.x = Math.PI / 2;
  productStageGroup.add(prodRim);

  // Soft reaction flash sphere at synthesis convergence point
  const coreFlashGeo = new THREE.SphereGeometry(0.65, 24, 24);
  const coreFlashMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const coreFlashMesh = new THREE.Mesh(coreFlashGeo, coreFlashMat);
  coreFlashMesh.position.set(0, 2.1, 0);
  productStageGroup.add(coreFlashMesh);

  const corePointLight = new THREE.PointLight(0x38bdf8, 0, 10);
  corePointLight.position.set(0, 2.1, 0);
  productStageGroup.add(corePointLight);

  root.add(productStageGroup);

  return {
    root,
    balanceBeamGroup,
    leftPanGroup,
    rightPanGroup,
    coreFlashMesh,
    corePointLight,
    explodableParts,
  };
}
