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
        
        <nav className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar py-1 shrink-0">
          <NavLink to="/" className={({isActive}) => `px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-light tracking-wide transition-colors shrink-0 ${isActive ? 'bg-canvas-dark text-white' : 'text-gray-400 hover:text-white'}`}>Dashboard</NavLink>
          <NavLink to="/cohort" className={({isActive}) => `px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-light tracking-wide transition-colors shrink-0 ${isActive ? 'bg-canvas-dark text-white' : 'text-gray-400 hover:text-white'}`}>Cohort</NavLink>
          <NavLink to="/diagnostics" className={({isActive}) => `px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-light tracking-wide transition-colors shrink-0 ${isActive ? 'bg-canvas-dark text-white' : 'text-gray-400 hover:text-white'}`}>Diagnostics</NavLink>
          {/* Pitch Link Removed */}
        </nav>
      </div>

      {/* Right-side elements (HSIL and NVIDIA Modulus) removed */}
    </header>
  );
}
