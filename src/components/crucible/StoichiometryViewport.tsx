import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { StoichiometryAnalysis } from './stoichiometryQuests';
import {
  ApparatusHandles,
  buildLaboratoryApparatus,
  buildMoleculeGroup,
} from './proceduralModels';

export type CameraPresetId = 'overview' | 'balance' | 'product';

export interface InspectedObjectInfo {
  title: string;
  subtitle: string;
}

interface StoichiometryViewportProps {
  analysis: StoichiometryAnalysis;
  cameraPreset: CameraPresetId;
  synthesisTriggerCount: number;
  resetTriggerCount: number;
  onSynthesisComplete: () => void;
  onInspectObject: (info: InspectedObjectInfo | null) => void;
}

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: { pos: [0.0, 3.8, 12.2], target: [0.0, 1.35, 0] },
  balance: { pos: [-1.6, 3.4, 8.8], target: [-1.6, 1.5, 0] },
  product: { pos: [4.2, 3.2, 7.6], target: [4.2, 1.5, 0] },
};

// Module-scope reusable math vectors (Zero GC inside render loop)
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _tempPos = new THREE.Vector3();
const _pointerNdc = new THREE.Vector2();

interface AnimatedMoleculeInstance {
  group: THREE.Group;
  traySide: 'A' | 'B' | 'product';
  localOffset: THREE.Vector3;
  convergencePos: THREE.Vector3;
  finalPos: THREE.Vector3;
  isConsumed: boolean;
  isExcess: boolean;
  isProduct: boolean;
  phaseOffset: number;
}

export const StoichiometryViewport: React.FC<StoichiometryViewportProps> = ({
  analysis,
  cameraPreset,
  synthesisTriggerCount,
  resetTriggerCount,
  onSynthesisComplete,
  onInspectObject,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const analysisRef = useRef<StoichiometryAnalysis>(analysis);
  analysisRef.current = analysis;

  const onSynthesisCompleteRef = useRef(onSynthesisComplete);
  onSynthesisCompleteRef.current = onSynthesisComplete;

  const onInspectObjectRef = useRef(onInspectObject);
  onInspectObjectRef.current = onInspectObject;

  const cameraTransitionActiveRef = useRef<boolean>(false);
  const desiredCameraPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...CAMERA_PRESETS.overview.pos)
  );
  const desiredCameraTargetRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...CAMERA_PRESETS.overview.target)
  );

  const synthesisStateRef = useRef<{
    mode: 'idle' | 'running' | 'completed';
    progress: number;
  }>({ mode: 'idle', progress: 0 });

  const rebuildMoleculesFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const preset = CAMERA_PRESETS[cameraPreset] || CAMERA_PRESETS.overview;
    desiredCameraPosRef.current.set(...preset.pos);
    desiredCameraTargetRef.current.set(...preset.target);
    cameraTransitionActiveRef.current = true;
  }, [cameraPreset]);

  useEffect(() => {
    if (synthesisTriggerCount > 0) {
      synthesisStateRef.current.mode = 'running';
      synthesisStateRef.current.progress = 0;
    }
  }, [synthesisTriggerCount]);

  useEffect(() => {
    synthesisStateRef.current.mode = 'idle';
    synthesisStateRef.current.progress = 0;
    if (rebuildMoleculesFnRef.current) {
      rebuildMoleculesFnRef.current();
    }
  }, [
    resetTriggerCount,
    analysis.reaction.id,
    analysis.molesA,
    analysis.molesB,
    analysis.percentYield,
  ]);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgHex = 0x090d16;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.02);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 4.5;
    controls.maxDistance = 22;
    controls.update();

    const onControlStart = () => {
      cameraTransitionActiveRef.current = false;
    };
    controls.addEventListener('start', onControlStart);

    // Serene 3-Point Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.25);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.5);
    keyLight.position.set(6, 12, 9);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(-8, 6, -7);
    scene.add(rimLight);

    // Subtle Contact Shadow Plane
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 128, 12, 128, 128, 128);
      grad.addColorStop(0, 'rgba(0,0,0,0.55)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const contactShadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 8),
      contactShadowMat
    );
    contactShadowPlane.rotation.x = -Math.PI / 2;
    contactShadowPlane.position.set(0.8, 0.005, 0);
    scene.add(contactShadowPlane);

    const apparatus: ApparatusHandles = buildLaboratoryApparatus(
      renderer,
      isSoftwareGl
    );
    scene.add(apparatus.root);

    const moleculesRoot = new THREE.Group();
    scene.add(moleculesRoot);

    let animatedMolecules: AnimatedMoleculeInstance[] = [];

    const disposeGroupHierarchy = (grp: THREE.Object3D) => {
      grp.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    };

    const rebuildMolecules = () => {
      while (moleculesRoot.children.length > 0) {
        const ch = moleculesRoot.children[0];
        moleculesRoot.remove(ch);
        disposeGroupHierarchy(ch);
      }
      animatedMolecules = [];

      const cur = analysisRef.current;

      // 1. Reactant A molecules on Left Tray (center x = -4.1)
      const countA = Math.min(10, Math.round(cur.molesA));
      const consumedCountA = Math.round(cur.consumedMolesA);
      for (let i = 0; i < countA; i++) {
        const isConsumed = i < consumedCountA;
        const molGrp = buildMoleculeGroup(
          cur.molA.id,
          isConsumed ? 'reactantA' : 'excess',
          isSoftwareGl
        );
        molGrp.scale.setScalar(0.95);

        const layer = Math.floor(i / 3);
        const angle = (i % 3) * ((Math.PI * 2) / 3) + layer * 0.5;
        const rad = countA === 1 ? 0 : 0.56;
        const lx = Math.cos(angle) * rad;
        const ly = 0.28 + layer * 0.68;
        const lz = Math.sin(angle) * rad;

        moleculesRoot.add(molGrp);

        animatedMolecules.push({
          group: molGrp,
          traySide: 'A',
          localOffset: new THREE.Vector3(lx, ly, lz),
          convergencePos: new THREE.Vector3(
            4.2 + (Math.random() - 0.5) * 0.5,
            2.1 + (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
          ),
          finalPos: new THREE.Vector3(-4.1 + lx, 1.45 + ly, lz),
          isConsumed,
          isExcess: !isConsumed,
          isProduct: false,
          phaseOffset: i * 0.8,
        });
      }

      // 2. Reactant B molecules on Right Tray (center x = +0.9)
      const countB = Math.min(10, Math.round(cur.molesB));
      const consumedCountB = Math.round(cur.consumedMolesB);
      for (let i = 0; i < countB; i++) {
        const isConsumed = i < consumedCountB;
        const molGrp = buildMoleculeGroup(
          cur.molB.id,
          isConsumed ? 'reactantB' : 'excess',
          isSoftwareGl
        );
        molGrp.scale.setScalar(0.95);

        const layer = Math.floor(i / 3);
        const angle = (i % 3) * ((Math.PI * 2) / 3) + layer * 0.5;
        const rad = countB === 1 ? 0 : 0.56;
        const lx = Math.cos(angle) * rad;
        const ly = 0.28 + layer * 0.68;
        const lz = Math.sin(angle) * rad;

        moleculesRoot.add(molGrp);

        animatedMolecules.push({
          group: molGrp,
          traySide: 'B',
          localOffset: new THREE.Vector3(lx, ly, lz),
          convergencePos: new THREE.Vector3(
            4.2 + (Math.random() - 0.5) * 0.5,
            2.1 + (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
          ),
          finalPos: new THREE.Vector3(0.9 + lx, 1.45 + ly, lz),
          isConsumed,
          isExcess: !isConsumed,
          isProduct: false,
          phaseOffset: i * 0.9 + 1.4,
        });
      }

      // 3. Product C & D molecules on Right Product Pedestal (x = +4.2)
      const countC = Math.min(10, Math.max(0, Math.round(cur.actualMolesC)));
      const countD = Math.min(
        8,
        Math.max(0, Math.round(cur.theoreticalMolesD * (cur.percentYield / 100)))
      );
      const totalProducts = countC + countD;

      for (let i = 0; i < totalProducts; i++) {
        const isC = i < countC;
        const specId = isC
          ? cur.molC.id
          : cur.molD
          ? cur.molD.id
          : cur.molC.id;
        const prodGrp = buildMoleculeGroup(
          specId,
          isC ? 'productC' : 'productD',
          isSoftwareGl
        );
        prodGrp.scale.setScalar(0.001);
        prodGrp.visible = false;

        const layer = Math.floor(i / 3);
        const angle = (i % 3) * ((Math.PI * 2) / 3) + layer * 0.55;
        const rad = totalProducts === 1 ? 0 : 0.65;
        const fx = 4.2 + Math.cos(angle) * rad;
        const fy = 0.95 + layer * 0.72;
        const fz = Math.sin(angle) * rad;

        const cPos = new THREE.Vector3(4.2, 2.1, 0);
        prodGrp.position.copy(cPos);
        moleculesRoot.add(prodGrp);

        animatedMolecules.push({
          group: prodGrp,
          traySide: 'product',
          localOffset: new THREE.Vector3(),
          convergencePos: cPos,
          finalPos: new THREE.Vector3(fx, fy, fz),
          isConsumed: false,
          isExcess: false,
          isProduct: true,
          phaseOffset: i * 0.7,
        });
      }
    };

    rebuildMoleculesFnRef.current = rebuildMolecules;
    rebuildMolecules();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting on Layer 1 for quiet hover/click molecule inspection
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let lastRaycastMs = 0;

    const performRaycast = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (hits.length > 0) {
        const data = hits[0].object.userData;
        if (data && data.inspectType === 'molecule') {
          onInspectObjectRef.current({
            title: `${data.formula} (${data.name})`,
            subtitle: `${Number(data.molarMass).toFixed(1)} g/mol · ${data.geometryDesc}`,
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      renderer.domElement.style.cursor = 'grab';
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastMs < 80) return;
      lastRaycastMs = now;
      performRaycast(e.clientX, e.clientY);
    };

    const onPointerDown = (e: PointerEvent) => {
      performRaycast(e.clientX, e.clientY);
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    let frameId = 0;
    let isDisposed = false;
    let lastTimeMs = performance.now();
    const startTimeMs = lastTimeMs;

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync
        ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
        : null;
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;
      const nowMs = performance.now();
      const dt = Math.min((nowMs - lastTimeMs) / 1000, 0.1);
      lastTimeMs = nowMs;
      const elapsed = (nowMs - startTimeMs) / 1000;

      // Smooth Camera Transitions
      if (cameraTransitionActiveRef.current) {
        _camTargetPos.copy(desiredCameraPosRef.current);
        _camLookTarget.copy(desiredCameraTargetRef.current);

        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _camTargetPos.x,
          4.5,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _camTargetPos.y,
          4.5,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _camTargetPos.z,
          4.5,
          dt
        );

        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          _camLookTarget.x,
          4.5,
          dt
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          _camLookTarget.y,
          4.5,
          dt
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          _camLookTarget.z,
          4.5,
          dt
        );

        if (
          camera.position.distanceToSquared(_camTargetPos) < 0.002 &&
          controls.target.distanceToSquared(_camLookTarget) < 0.002
        ) {
          cameraTransitionActiveRef.current = false;
        }
      }
      controls.update();

      // Subtle Balance Beam Tilt (Only reveals exact stoichiometric balance when reacting/completed, or subtle mass tilt during setup)
      const syn = synthesisStateRef.current;
      const cur = analysisRef.current;
      const rawMassDiff = (cur.molesB - cur.molesA) * 0.06;
      const targetTilt =
        syn.mode === 'idle'
          ? Math.max(-0.22, Math.min(0.22, rawMassDiff))
          : cur.balanceTiltRadians;

      apparatus.balanceBeamGroup.rotation.z = THREE.MathUtils.damp(
        apparatus.balanceBeamGroup.rotation.z,
        targetTilt,
        5.0,
        dt
      );
      const beamAngle = apparatus.balanceBeamGroup.rotation.z;
      apparatus.leftPanGroup.rotation.z = -beamAngle;
      apparatus.rightPanGroup.rotation.z = -beamAngle;

      // Compute current world Y of Left Pan and Right Pan so molecules ride smoothly on their trays
      const leftTrayBaseY = 1.58 - Math.sin(beamAngle) * 2.5 - 0.1;
      const rightTrayBaseY = 1.58 + Math.sin(beamAngle) * 2.5 - 0.1;

      if (syn.mode === 'running') {
        syn.progress += dt / 2.2;
        if (syn.progress >= 1.0) {
          syn.progress = 1.0;
          syn.mode = 'completed';
          onSynthesisCompleteRef.current();
        }
      }

      const p = syn.progress;
      const flashFactor =
        syn.mode === 'running' && p > 0.35 && p < 0.68
          ? Math.sin(((p - 0.35) / 0.33) * Math.PI)
          : 0;
      (apparatus.coreFlashMesh.material as THREE.MeshBasicMaterial).opacity =
        flashFactor * 0.75;
      apparatus.coreFlashMesh.scale.setScalar(1.0 + flashFactor * 1.6);
      apparatus.corePointLight.intensity = flashFactor * 6.0;

      for (let i = 0; i < animatedMolecules.length; i++) {
        const m = animatedMolecules[i];
        const bobY = Math.sin(elapsed * 2.0 + m.phaseOffset) * 0.05;
        m.group.rotation.y += dt * 0.7;
        m.group.rotation.x = Math.sin(elapsed * 1.2 + m.phaseOffset) * 0.2;

        const homeX =
          m.traySide === 'A'
            ? -1.6 - Math.cos(beamAngle) * 2.5 + m.localOffset.x
            : -1.6 + Math.cos(beamAngle) * 2.5 + m.localOffset.x;
        const homeY =
          (m.traySide === 'A' ? leftTrayBaseY : rightTrayBaseY) +
          m.localOffset.y;
        const homeZ = m.localOffset.z;

        if (syn.mode === 'idle') {
          if (m.isProduct) {
            m.group.visible = false;
          } else {
            m.group.visible = true;
            m.group.scale.setScalar(0.95);
            m.group.position.set(homeX, homeY + bobY, homeZ);
          }
        } else {
          if (m.isConsumed) {
            if (p < 0.45) {
              const t = THREE.MathUtils.smoothstep(p, 0.0, 0.45);
              _tempPos.set(homeX, homeY, homeZ).lerp(m.convergencePos, t);
              _tempPos.y += Math.sin(t * Math.PI) * 1.6;
              m.group.position.copy(_tempPos);
              m.group.visible = true;
              m.group.scale.setScalar(0.95);
            } else if (p < 0.56) {
              const t = (p - 0.45) / 0.11;
              m.group.position.copy(m.convergencePos);
              m.group.scale.setScalar(Math.max(0.001, 0.95 * (1 - t)));
            } else {
              m.group.visible = false;
            }
          } else if (m.isExcess) {
            // Unreacted excess stays visibly on its reactant tray!
            m.group.visible = true;
            m.group.scale.setScalar(0.95);
            m.group.position.set(homeX, homeY + bobY, homeZ);
          } else if (m.isProduct) {
            if (p < 0.48) {
              m.group.visible = false;
            } else {
              m.group.visible = true;
              const t = THREE.MathUtils.smoothstep(p, 0.48, 0.92);
              _tempPos.lerpVectors(m.convergencePos, m.finalPos, t);
              _tempPos.y += bobY;
              m.group.position.copy(_tempPos);
              m.group.scale.setScalar(
                0.95 * THREE.MathUtils.smoothstep(p, 0.48, 0.66)
              );
            }
          }
        }
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    const onResize = () => {
      if (!mountEl) return;
      const w = mountEl.clientWidth || window.innerWidth;
      const h = mountEl.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', onResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', onControlStart);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      controls.dispose();
      envRT.dispose();
      pmremGenerator.dispose();
      disposeGroupHierarchy(scene);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      className="absolute inset-0 w-full h-full select-none overflow-hidden"
      aria-label="Interactive 3D Stoichiometry Puzzle Stage"
    />
  );
};
