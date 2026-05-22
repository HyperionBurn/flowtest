import React from 'react';
import { Activity, Cpu, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="h-16 border-b border-border-dark flex items-center justify-between px-6 bg-panel-dark/80 backdrop-blur-md z-20 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 mr-4">
          <Activity className="w-6 h-6 animate-pulse text-accent-blue drop-shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
          <h1 className="text-xl font-light tracking-widest text-white">
            CardioFlow <span className="font-thin text-gray-400">AI</span>
          </h1>
        </div>
        
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" className={({isActive}) => `px-4 py-2 rounded-md text-sm font-light tracking-wide transition-colors ${isActive ? 'bg-canvas-dark text-white' : 'text-gray-400 hover:text-white'}`}>Dashboard</NavLink>
          <NavLink to="/cohort" className={({isActive}) => `px-4 py-2 rounded-md text-sm font-light tracking-wide transition-colors ${isActive ? 'bg-canvas-dark text-white' : 'text-gray-400 hover:text-white'}`}>Patient Cohort</NavLink>
          <NavLink to="/diagnostics" className={({isActive}) => `px-4 py-2 rounded-md text-sm font-light tracking-wide transition-colors ${isActive ? 'bg-canvas-dark text-white' : 'text-gray-400 hover:text-white'}`}>System Diagnostics</NavLink>
          <NavLink to="/presentation" className={({isActive}) => `px-4 py-2 rounded-md text-sm font-light tracking-wide transition-all duration-300 flex items-center gap-1.5 ${isActive ? 'bg-canvas-dark text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]' : 'text-gray-400 hover:text-white'}`}>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Pitch Deck</span>
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase hidden md:block">
          2026 HSIL CLINICAL INTERFACE
        </div>
        <div className="flex items-center gap-2.5 bg-canvas-dark border border-border-dark px-4 py-1.5 rounded-full shadow-inner">
          <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          <Cpu className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] font-mono font-light text-gray-300 tracking-wider">NVIDIA Modulus Core Active</span>
        </div>
      </div>
    </header>
  );
}
