import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ArteryModel from './ArteryModel';
import { useAppStore } from '../store/useAppStore';
import PinnController from './PinnController';

export default function Viewport3D() {
  const { mode, setMode } = useAppStore();

  return (
    <div className="flex-1 min-h-[400px] lg:min-h-0 relative cursor-move bg-gradient-to-b from-canvas-dark to-[#0a0a0a] overflow-hidden">
      
      {/* Tab Controls */}
      <div className="absolute top-6 right-6 z-10 flex p-1 bg-panel-dark/80 backdrop-blur-md border border-border-dark rounded-lg shadow-xl">
        <button 
          onClick={() => setMode('ffr')}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-300 ${mode === 'ffr' ? 'bg-accent-blue/20 text-accent-blue shadow-[0_0_10px_rgba(14,165,233,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          FFR Matrix Map
        </button>
        <button 
          onClick={() => setMode('velocity')}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-300 ${mode === 'velocity' ? 'bg-accent-blue/20 text-accent-blue shadow-[0_0_10px_rgba(14,165,233,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Velocity Vectors
        </button>
        <button 
          onClick={() => setMode('pressure')}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-300 ${mode === 'pressure' ? 'bg-accent-blue/20 text-accent-blue shadow-[0_0_10px_rgba(14,165,233,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Pressure Profile
        </button>
      </div>

      {/* WebGL Canvas */}
      <Canvas camera={{ position: [35, 20, 50], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={['#121212']} />
        <fogExp2 attach="fog" args={['#121212', 0.015]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <ArteryModel />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          enablePan={false} 
          minDistance={20} 
          maxDistance={120} 
        />
      </Canvas>

      {/* Timeline Scrubbing Overlay */}
      <PinnController />
    </div>
  );
}
