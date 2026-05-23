import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ArteryModel from './ArteryModel';
import { useAppStore } from '../store/useAppStore';
import PinnController from './PinnController';
import { Sparkles, Activity, CheckCircle2 } from 'lucide-react';

export default function Viewport3D() {
  const { 
    mode, 
    setMode, 
    backendResults, 
    stentApplied, 
    setStentApplied, 
    isStentExecuting, 
    triggerStenting, 
    postStentResults 
  } = useAppStore();

  return (
    <div className="flex-1 min-h-[400px] max-h-[60vh] lg:max-h-none lg:min-h-0 relative cursor-move bg-gradient-to-b from-canvas-dark to-[#0a0a0a] overflow-hidden">
      
      {/* Virtual Stenting Planner Console (visible after initial GNN results are back) */}
      {backendResults && (
        <div className="absolute top-6 left-6 z-10 w-72 p-5 bg-[#121212]/90 backdrop-blur-md border border-border-dark rounded-xl shadow-2xl flex flex-col gap-4 font-light text-white select-none">
          <div className="flex items-center gap-2 border-b border-border-dark pb-2.5 mb-1">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h4 className="text-xs font-mono font-semibold tracking-wider uppercase text-gray-300">Stenosis Planner</h4>
          </div>

          <div className="text-[10px] text-gray-405 leading-relaxed font-mono">
            Deploy a virtual stent (restoring vessel diameter to healthy baseline) to evaluate post-treatment hemodynamic recovery.
          </div>

          <div className="space-y-3">
            <button
              onClick={async () => {
                if (isStentExecuting) return;
                if (stentApplied) {
                  setStentApplied(false);
                } else {
                  await triggerStenting();
                }
              }}
              disabled={isStentExecuting}
              className={`w-full py-2.5 px-4 rounded-lg font-mono text-[9px] uppercase tracking-wider transition-all duration-500 border flex items-center justify-center gap-2 cursor-pointer ${
                stentApplied 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.25)] hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-450' 
                  : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:text-white'
              }`}
            >
              {isStentExecuting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
                  GNN Running...
                </>
              ) : stentApplied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Stent Deployed (Reset)
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  Deploy Virtual Stent
                </>
              )}
            </button>

            {stentApplied && postStentResults && (
              <div className="flex items-center gap-2 p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-[9px] font-mono text-emerald-400 uppercase tracking-widest justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" /> Functional Flow Restored
              </div>
            )}
          </div>
        </div>
      )}

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
      <Canvas camera={{ position: [35, 20, 50], fov: 45 }} gl={{ antialias: true, alpha: true }} style={{ touchAction: 'pan-y' }}>
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
