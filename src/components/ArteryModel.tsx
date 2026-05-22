/* eslint-disable react-hooks/purity, react-hooks/immutability */
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAppStore, type PinnTrainingSnapshot } from '../store/useAppStore';

const NUM_POINTS = 7200;

export default function ArteryModel() {
  const pointsRef = useRef<THREE.Points>(null);
  const { severity, velocity, mode, pinnHistory, currentPlaybackEpoch } = useAppStore();

  // Create base attributes that stay constant
  const { baseZ, baseTheta, geometry } = useMemo(() => {
    const bZ = new Float32Array(NUM_POINTS);
    const bT = new Float32Array(NUM_POINTS);
    const p = new Float32Array(NUM_POINTS * 3);
    const c = new Float32Array(NUM_POINTS * 3);
    
    for (let i = 0; i < NUM_POINTS; i++) {
      bZ[i] = (Math.random() - 0.5) * 80; // length 80
      bT[i] = Math.random() * Math.PI * 2;
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));

    return { baseZ: bZ, baseTheta: bT, geometry: geo };
  }, []);

  // Memoize the active training snapshot for performance
  const currentSnapshot = useMemo(() => {
    if (!pinnHistory || pinnHistory.length === 0) return null;
    return pinnHistory.find((h: PinnTrainingSnapshot) => h.epoch === currentPlaybackEpoch) || 
           pinnHistory[pinnHistory.length - 1];
  }, [pinnHistory, currentPlaybackEpoch]);

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

  // Update logic matching our physical constraints
  useFrame(() => {
    if (!geometry) return;
    
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;

    const s = severity / 100.0;
    const r0 = 10;

    // Base FFR fallback if no solver snapshot
    const baseDrop = Math.pow(s, 2) * (velocity / 0.25) * 0.45;
    const globalFfr = Math.max(0.40, 1.0 - baseDrop);

    const colGreen = new THREE.Color(0x10b981);
    const colAmber = new THREE.Color(0xf59e0b);
    const colRed   = new THREE.Color(0xef4444);
    const colCyan  = new THREE.Color(0x00ffff);
    const colBlue  = new THREE.Color(0x0044ff);
    const colPurple = new THREE.Color(0xa855f7);
    const colIndigo = new THREE.Color(0x4f46e5);

    const tmpColor = new THREE.Color();

    for (let i = 0; i < NUM_POINTS; i++) {
      const z = baseZ[i];
      const theta = baseTheta[i];

      // Physical shape r(z)
      const r = r0 * (1 - s * Math.exp(-(z*z)/150));
      
      positions[i*3] = r * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(theta);
      positions[i*3+2] = z;

      // Map z [-40, 40] to normalized index [0, 99]
      const u = (z + 40) / 80;
      const index = Math.max(0, Math.min(99, Math.round(u * 99)));

      if (currentSnapshot) {
        // Read directly from solver snapshot
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
          tmpColor.lerpColors(colCyan, colBlue, normV);
        } else if (mode === 'pressure') {
          const p = currentSnapshot.pressure_curve?.[index] ?? 90.0;
          let normP = (p - pressureBounds.min) / (pressureBounds.max - pressureBounds.min || 1);
          normP = Math.max(0, Math.min(1, normP));
          tmpColor.lerpColors(colIndigo, colPurple, normP);
        }
      } else {
        // Fallback to analytic model
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
          const v = velocity * (r0*r0) / (r*r);
          const vMax = velocity * (r0*r0) / Math.pow(r0*(1-s), 2);
          let normV = (v - velocity) / (vMax - velocity || 1);
          normV = Math.max(0, Math.min(1, normV));
          tmpColor.lerpColors(colCyan, colBlue, normV);
        } else if (mode === 'pressure') {
          const v = velocity * (r0*r0) / (r*r);
          const vMax = velocity * (r0*r0) / Math.pow(r0*(1-s), 2);
          const pDrop = v*v - velocity*velocity;
          const pDropMax = vMax*vMax - velocity*velocity;
          let normP = pDrop / (pDropMax || 1);
          normP = Math.max(0, Math.min(1, normP));
          tmpColor.lerpColors(colPurple, colIndigo, normP);
        }
      }

      colors[i*3] = tmpColor.r;
      colors[i*3+1] = tmpColor.g;
      colors[i*3+2] = tmpColor.b;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.35}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
