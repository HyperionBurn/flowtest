import React from 'react';
import { Cpu, Server, Activity } from 'lucide-react';

export default function SystemDiagnostics() {
  return (
    <div className="flex-1 p-8 bg-canvas-dark overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Server className="w-8 h-8 text-accent-blue" />
          <h2 className="text-3xl font-bold">Modulus Infrastructure Status</h2>
        </div>
        
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-panel-dark border border-border-dark rounded-xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            </div>
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Active GPU Nodes</div>
            <div className="text-4xl font-light font-mono">128<span className="text-lg text-gray-500 ml-2">H100s</span></div>
          </div>
          
          <div className="bg-panel-dark border border-border-dark rounded-xl p-6 shadow-lg">
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Network Latency</div>
            <div className="text-4xl font-light font-mono">14<span className="text-lg text-gray-500 ml-2">ms</span></div>
          </div>

          <div className="bg-panel-dark border border-border-dark rounded-xl p-6 shadow-lg">
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Current TPS</div>
            <div className="text-4xl font-light font-mono">4,892<span className="text-lg text-gray-500 ml-2">inf/s</span></div>
          </div>
        </div>

        <div className="bg-panel-dark border border-border-dark rounded-xl p-8 shadow-lg">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-blue" /> Live Node Logs
          </h3>
          <div className="bg-canvas-dark rounded-lg p-4 font-mono text-xs text-gray-400 h-64 overflow-y-auto space-y-2 border border-border-dark shadow-inner">
            <p><span className="text-accent-emerald">[OK]</span> Node 0x7A2 initialized graph memory.</p>
            <p><span className="text-accent-emerald">[OK]</span> Checkpoint loaded: SIREN_weights_v4.2.pt</p>
            <p><span className="text-accent-blue">[INFO]</span> Incoming inference request from client CAD-9842...</p>
            <p><span className="text-accent-emerald">[OK]</span> PDE Residual converged to 4.12e-7.</p>
            <p><span className="text-accent-blue">[INFO]</span> Awaiting new requests...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
