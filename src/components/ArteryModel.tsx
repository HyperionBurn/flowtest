/* eslint-disable react-hooks/purity, react-hooks/immutability */
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAppStore, type PinnTrainingSnapshot } from '../store/useAppStore';

const NUM_POINTS = 8000;

export default function ArteryModel() {
  const pointsRef = useRef<THREE.Points>(null);
  const { 
    severity, 
    velocity, 
    mode, 
    pinnHistory, 
    currentPlaybackEpoch, 
    stentApplied, 
    postStentResults 
  } = useAppStore();

  // 1. Create constant base attributes for particles
  const { baseTheta, baseR, geometry } = useMemo(() => {
    const bT = new Float32Array(NUM_POINTS);
    const bR = new Float32Array(NUM_POINTS);
    const p = new Float32Array(NUM_POINTS * 3);
    const c = new Float32Array(NUM_POINTS * 3);
    
    for (let i = 0; i < NUM_POINTS; i++) {
      bT[i] = Math.random() * Math.PI * 2;
      bR[i] = 0.15 + 0.85 * Math.sqrt(Math.random()); // Radial distribution within volumetric tube
      
      // Initialize random distribution along length Z [-40, 40]
      const z = (Math.random() - 0.5) * 80;
      p[i * 3 + 2] = z;
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));

    return { baseTheta: bT, baseR: bR, geometry: geo };
  }, []);

  // 2. Create the vessel mesh geometry
  const cylinderGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(8, 8, 80, 64, 64, true);
    geo.rotateX(Math.PI / 2); // Align with Z-axis
    return geo;
  }, []);

  const activeHistory = stentApplied && postStentResults ? postStentResults.results.training_history : pinnHistory;

  // Memoize the active training snapshot for performance
  const currentSnapshot = useMemo(() => {
    if (!activeHistory || activeHistory.length === 0) return null;
    return activeHistory.find((h: PinnTrainingSnapshot) => h.epoch === currentPlaybackEpoch) || 
           activeHistory[activeHistory.length - 1];
  }, [activeHistory, currentPlaybackEpoch]);

  // Memoize velocity and pressure bounds for dynamic color scaling
  const velocityBounds = useMemo(() => {
    if (!currentSnapshot || !currentSnapshot.velocity_curve) return { min: 0.1, max: 1.0 };
    const vals = currentSnapshot.velocity_curve;
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [currentSnapshot]);

  const pressureBounds = useMemo(() => {
    if (!currentSnapshot || !currentSnapshot.pressure_curve) return { min: 80, max: 90 };
    const vals = currentSnapshot.pressure_curve;
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [currentSnapshot]);

  // Update geometry & particle coordinates on frame loop
  useFrame((state) => {
    if (!geometry || !cylinderGeometry) return;
    
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;

    const s = stentApplied ? 0.10 : severity / 100.0;
    const r0 = 8.0; // Base reference radius
    const time = state.clock.getElapsedTime();

    // -----------------------------------------------------------
    // STEP A: Morph Vessel Cylinder Mesh to Match Severity
    // -----------------------------------------------------------
    const cylPos = cylinderGeometry.attributes.position;
    const cylArr = cylPos.array as Float32Array;
    
    for (let i = 0; i < cylPos.count; i++) {
      const zVal = cylArr[i * 3 + 2];
      const angle = Math.atan2(cylArr[i * 3 + 1], cylArr[i * 3]);
      
      // Calculate radius contraction
      const rTarget = r0 * (1.0 - s * Math.exp(-(zVal * zVal) / 150));
      
      cylArr[i * 3] = rTarget * Math.cos(angle);
      cylArr[i * 3 + 1] = rTarget * Math.sin(angle);
    }
    cylPos.needsUpdate = true;
    cylinderGeometry.computeVertexNormals();

    // -----------------------------------------------------------
    // STEP B: Update Particle Positions (Flow Simulation) & Colors
    // -----------------------------------------------------------
    const baseDrop = Math.pow(s, 2) * (velocity / 0.25) * 0.45;
    const globalFfr = Math.max(0.40, 1.0 - baseDrop);

    const colGreen  = new THREE.Color(0x10b981); // Emerald Healthy
    const colAmber  = new THREE.Color(0xf59e0b); // Amber Warning
    const colRed    = new THREE.Color(0xef4444); // Red Critical
    const colCyan   = new THREE.Color(0x22d3ee); // Cyan High Flow
    const colBlue   = new THREE.Color(0x1d4ed8); // Blue Low Flow
    const colIndigo = new THREE.Color(0x6366f1); // Indigo High Pressure
    const colPurple = new THREE.Color(0xa855f7); // Purple Low Pressure

    const tmpColor = new THREE.Color();
    const speedFactor = 0.05 * (velocity / 0.25);

    for (let i = 0; i < NUM_POINTS; i++) {
      let z = positions[i * 3 + 2];
      
      // Local flow velocity conservation (continuity principle: V ~ 1/A ~ 1/r^2)
      const rLocal = r0 * (1.0 - s * Math.exp(-(z * z) / 150));
      const localSpeed = speedFactor * (r0 * r0) / (rLocal * rLocal);
      
      // Advance particle position
      z += localSpeed;
      
      // Loop back if particle exits output boundary
      if (z > 40) {
        z = -40;
      }
      
      // Swirling vector rotation
      const theta = baseTheta[i] + (z * 0.04) + (time * 0.15);
      const r = rLocal * baseR[i];
      
      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(theta);
      positions[i * 3 + 2] = z;

      // Map z [-40, 40] to normalized index [0, 99]
      const u = (z + 40) / 80;
      const index = Math.max(0, Math.min(99, Math.round(u * 99)));

      if (currentSnapshot) {
        if (mode === 'ffr') {
          const localFFR = currentSnapshot.ffr_curve?.[index] ?? 1.0;
          if (localFFR >= 0.90) {
            tmpColor.lerpColors(colAmber, colGreen, Math.min(1, (localFFR - 0.9) * 10));
          } else if (localFFR > 0.80) {
            tmpColor.lerpColors(colRed, colAmber, Math.min(1, (localFFR - 0.8) * 10));
          } else {
            tmpColor.copy(colRed);
          }
        } else if (mode === 'velocity') {
          const v = currentSnapshot.velocity_curve?.[index] ?? velocity;
          let normV = (v - velocityBounds.min) / (velocityBounds.max - velocityBounds.min || 1);
          normV = Math.max(0, Math.min(1, normV));
          tmpColor.lerpColors(colBlue, colCyan, normV);
        } else if (mode === 'pressure') {
          const p = currentSnapshot.pressure_curve?.[index] ?? 90.0;
          let normP = (p - pressureBounds.min) / (pressureBounds.max - pressureBounds.min || 1);
          normP = Math.max(0, Math.min(1, normP));
          tmpColor.lerpColors(colPurple, colIndigo, normP);
        }
      } else {
        if (mode === 'ffr') {
          const localFFR = 1.0 - (1.0 - globalFfr) / (1 + Math.exp(-z / 5));
          if (localFFR >= 0.90) {
            tmpColor.lerpColors(colAmber, colGreen, Math.min(1, (localFFR - 0.9) * 10));
          } else if (localFFR > 0.80) {
            tmpColor.lerpColors(colRed, colAmber, Math.min(1, (localFFR - 0.8) * 10));
          } else {
            tmpColor.copy(colRed);
          }
        } else if (mode === 'velocity') {
          const v = velocity * (r0 * r0) / (rLocal * rLocal);
          const vMax = velocity * (r0 * r0) / Math.pow(r0 * (1 - s), 2);
          let normV = (v - velocity) / (vMax - velocity || 1);
          normV = Math.max(0, Math.min(1, normV));
          tmpColor.lerpColors(colBlue, colCyan, normV);
        } else if (mode === 'pressure') {
          const v = velocity * (r0 * r0) / (rLocal * rLocal);
          const vMax = velocity * (r0 * r0) / Math.pow(r0 * (1 - s), 2);
          const pDrop = v * v - velocity * velocity;
          const pDropMax = vMax * vMax - velocity * velocity;
          let normP = pDrop / (pDropMax || 1);
          normP = Math.max(0, Math.min(1, normP));
          tmpColor.lerpColors(colPurple, colIndigo, normP);
        }
      }

      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <group>
      {/* 3D Translucent Glass Vessel Wall */}
      <mesh geometry={cylinderGeometry}>
        <meshPhysicalMaterial
          color="#0ea5e9"
          transmission={0.8}
          opacity={0.35}
          transparent
          roughness={0.12}
          thickness={1.5}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Holographic Wireframe Grid Overlay */}
      <mesh geometry={cylinderGeometry}>
        <meshBasicMaterial
          color="#22d3ee"
          wireframe
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Volumetric Glowing Fluid Flow Particles */}
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          size={0.24}
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
