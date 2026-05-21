import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '../store/useAppStore';

const NUM_POINTS = 7200;

export default function ArteryModel() {
  const pointsRef = useRef<THREE.Points>(null);
  const { severity, velocity, mode } = useAppStore();

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

  // Update logic matching our physical constraints
  useFrame(() => {
    if (!geometry) return;
    
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;

    const s = severity / 100.0;
    const r0 = 10;

    // Base FFR
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

      const r = r0 * (1 - s * Math.exp(-(z*z)/150));
      
      positions[i*3] = r * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(theta);
      positions[i*3+2] = z;

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
