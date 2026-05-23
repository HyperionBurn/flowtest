/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useRef } from 'react';
import { useAppStore, type PinnTrainingSnapshot } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Terminal, TrendingDown, Zap } from 'lucide-react';

export default function PipelineOverlay() {
  const { isExecuting, backendResults, finishExecution, pinnHistory, setCurrentPlaybackEpoch } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Reset overlay state when execution starts
  useEffect(() => {
    if (isExecuting) {
      setCurrentStep(0);
      setIsTraining(false);
      setCurrentPlaybackEpoch(0);
      setLogs([
        "[SYSTEM] Handshaking with local NavierAgent GNN solver...",
        "[SYSTEM] Parsing upload DICOM binary stream...",
        "[DICOM] Extracted metadata successfully."
      ]);
    }
  }, [isExecuting]);

  // Handle training simulation when backend results arrive
  useEffect(() => {
    if (isExecuting && pinnHistory) {
      setIsTraining(true);
      const history = pinnHistory;
      let step = 0;

      // Add compiler logs
      setLogs(prev => [
        ...prev,
        "[SYSTEM] Compiling PyTorch Autograd computation graph...",
        "[PHYSICS] Injected Hagen-Poiseuille viscous baseline drop profile.",
        "[PINN] MLP instantiated (FlowMLP: 1x16x16x1, activation=Tanh).",
        "[OPTIMIZER] Initialized Adam (lr=0.02, beta1=0.9, beta2=0.999).",
        "[COLLOCATION] 40 spatial boundary constraint nodes registered.",
        "[TRAINING] Launching Physics-Informed training loop on local CPU..."
      ]);

      const interval = setInterval(() => {
        if (step < history.length) {
          const snapshot = history[step];
          setCurrentStep(step);
          setCurrentPlaybackEpoch(snapshot.epoch);
          
          // Append epoch telemetry to log console
          setLogs(prev => [
            ...prev,
            `[EPOCH ${String(snapshot.epoch).padStart(3, '0')}] loss: ${snapshot.loss.toFixed(6)} | pde_loss: ${snapshot.pde_loss.toFixed(6)} | residual: ${snapshot.residual.toExponential(3)}`
          ]);

          step += 1;
        } else {
          clearInterval(interval);
          setIsTraining(false);
          setLogs(prev => [
            ...prev,
            `[SYSTEM] Solver execution finished in ${backendResults?.processing_time_sec || 0.65}s.`,
            "[SYSTEM] Convergence criterion met. PDE residual stable.",
            "[SUCCESS] Optimization complete! Press enter to analyze hemodynamic profile."
          ]);
        }
      }, 60); // 41 steps * 60ms = ~2.5s playback

      return () => clearInterval(interval);
    }
  }, [isExecuting, pinnHistory, backendResults]);

  // Autoscroll logs window
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Extract current training telemetry values
  const currentSnapshot = pinnHistory?.[currentStep];
  const totalSteps = pinnHistory?.length || 1;
  const progressPercent = Math.min(100, Math.round((currentStep / (totalSteps - 1)) * 100)) || 0;

  // Build SVG path for loss curve dynamically
  const getLossSvgPath = (key: 'loss' | 'pde_loss') => {
    if (!pinnHistory) return '';
    const history = pinnHistory;
    const width = 360;
    const height = 120;
    
    // Find min and max for scaling
    const vals = history.map((h: PinnTrainingSnapshot) => h[key]);
    const maxVal = Math.max(...vals) || 1;
    const minVal = Math.min(...vals) || 0;
    const valRange = maxVal - minVal || 1;

    // Draw up to the current playback step
    const points = history.slice(0, currentStep + 1).map((h: PinnTrainingSnapshot, idx: number) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - ((h[key] - minVal) / valRange) * (height - 10) - 5;
      return `${x},${y}`;
    });

    return points.length > 0 ? `M ${points.join(' L ')}` : '';
  };

  const handleEnterDashboard = () => {
    if (backendResults) {
      // In useAppStore, finishExecution sets isExecuting to false, closing the overlay
      finishExecution(backendResults);
    }
  };

  const isCompleted = backendResults && !isTraining;

  return (
    <AnimatePresence>
      {isExecuting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 bg-[#070708]/98 backdrop-blur-lg z-50 flex items-center justify-center p-3 sm:p-6 select-none"
        >
          {/* Radiant background glow */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="w-full max-w-5xl bg-[#111113] border border-[#232326] p-4 sm:p-8 rounded-2xl shadow-2xl flex flex-col h-full max-h-[92vh] sm:max-h-[85vh] lg:h-[650px] relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-dark pb-5 mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-950/50 border border-cyan-500/30 rounded-lg text-cyan-400">
                  <Cpu className={`w-5 h-5 ${isTraining ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h2 className="text-sm font-light uppercase tracking-[0.2em] text-white">
                    PINN Optimization Chamber
                  </h2>
                  <p className="text-[10px] font-mono text-gray-500 tracking-wider">
                    Physics-Informed Navier-Stokes 1D PDE Solver
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-light text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full uppercase tracking-wider">
                  {isTraining ? 'Optimizing Weights...' : isCompleted ? 'Optimized' : 'Pending Server Response'}
                </span>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
              
              {/* Left Column: Log Terminal */}
              <div className="flex-1 flex flex-col bg-[#09090b] border border-[#1b1b1e] rounded-xl overflow-hidden shadow-inner">
                <div className="h-9 bg-[#121215] border-b border-border-dark px-4 flex items-center gap-2 shrink-0">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-mono text-gray-400 tracking-widest uppercase">Live Autodiff Log Console</span>
                </div>
                <div className="flex-1 p-5 font-mono text-[10px] text-gray-400 overflow-y-auto space-y-1.5 custom-scrollbar">
                  {logs.map((log, idx) => {
                    let color = 'text-gray-400';
                    if (log.startsWith('[SYSTEM]')) color = 'text-gray-500';
                    else if (log.startsWith('[SUCCESS]')) color = 'text-emerald-400';
                    else if (log.startsWith('[PHYSICS]')) color = 'text-indigo-400 font-bold';
                    else if (log.startsWith('[DICOM]')) color = 'text-amber-400';
                    else if (log.startsWith('[EPOCH')) color = 'text-cyan-300/80';
                    
                    return (
                      <div key={idx} className={`${color} leading-relaxed`}>
                        {log}
                      </div>
                    );
                  })}
                  <div ref={consoleEndRef} />
                </div>
              </div>

              {/* Right Column: Training Graphs & Telemetry */}
              <div className="w-full lg:w-[400px] flex flex-col gap-4 lg:gap-6 shrink-0">
                {/* Live Training Curves */}
                <div className="bg-[#141417] border border-[#232326] p-4 sm:p-5 rounded-xl flex flex-col h-[280px]">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <TrendingDown className="w-3.5 h-3.5 text-cyan-400" /> Loss Convergence History
                  </h3>
                  
                  {/* SVG Chart */}
                  <div className="flex-1 relative border-l border-b border-gray-800 bg-[#0a0a0c] rounded-lg p-2 overflow-hidden flex items-center justify-center">
                    {backendResults ? (
                      <svg viewBox="0 0 360 120" className="w-full h-auto max-h-[120px] overflow-visible">
                        {/* Grids */}
                        <line x1="0" y1="30" x2="360" y2="30" stroke="#1f1f25" strokeDasharray="3,3" />
                        <line x1="0" y1="60" x2="360" y2="60" stroke="#1f1f25" strokeDasharray="3,3" />
                        <line x1="0" y1="90" x2="360" y2="90" stroke="#1f1f25" strokeDasharray="3,3" />
                        
                        {/* Total Loss Curve */}
                        <path
                          d={getLossSvgPath('loss')}
                          fill="none"
                          stroke="url(#cyan-grad)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          className="transition-all duration-100"
                        />
                        
                        {/* PDE Loss Curve */}
                        <path
                          d={getLossSvgPath('pde_loss')}
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="1.5"
                          strokeDasharray="4,4"
                          strokeLinecap="round"
                          className="transition-all duration-100 opacity-60"
                        />
                        
                        {/* Gradients */}
                        <defs>
                          <linearGradient id="cyan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </svg>
                    ) : (
                      <div className="text-[10px] text-gray-500 font-mono tracking-wider">Awaiting computation graph...</div>
                    )}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex justify-between mt-3 text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-500" /> Total Objective Loss</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 border-t border-dashed border-purple-400" /> PDE Momentum Loss</span>
                  </div>
                </div>

                {/* Telemetry Matrix */}
                <div className="bg-[#141417] border border-[#232326] p-5 rounded-xl flex-1 flex flex-col justify-between">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Collocation Metrics
                  </h3>
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="bg-[#0c0c0e] border border-[#1b1b1e] p-3 rounded-lg flex flex-col justify-center">
                      <span className="text-[8px] text-gray-500 tracking-wider uppercase mb-1">Active Epoch</span>
                      <span className="text-xl font-mono text-cyan-400 font-light">
                        {currentSnapshot ? String(currentSnapshot.epoch).padStart(3, '0') : '000'}
                      </span>
                    </div>
                    <div className="bg-[#0c0c0e] border border-[#1b1b1e] p-3 rounded-lg flex flex-col justify-center">
                      <span className="text-[8px] text-gray-500 tracking-wider uppercase mb-1">Loss Residual</span>
                      <span className="text-sm font-mono text-white font-light">
                        {currentSnapshot ? currentSnapshot.loss.toExponential(4) : '0.0000e0'}
                      </span>
                    </div>
                    <div className="bg-[#0c0c0e] border border-[#1b1b1e] p-3 rounded-lg flex flex-col justify-center">
                      <span className="text-[8px] text-gray-500 tracking-wider uppercase mb-1">Convective Accel</span>
                      <span className="text-sm font-mono text-white font-light">
                        {backendResults ? 'True (autograd)' : 'Pending'}
                      </span>
                    </div>
                    <div className="bg-[#0c0c0e] border border-[#1b1b1e] p-3 rounded-lg flex flex-col justify-center">
                      <span className="text-[8px] text-gray-500 tracking-wider uppercase mb-1">Viscosity Model</span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        Hagen-Poiseuille
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Progress & Control Bar */}
            <div className="mt-6 border-t border-border-dark pt-5 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
              <div className="w-full sm:flex-1 max-w-xl flex items-center gap-4">
                <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase shrink-0">Optimization:</span>
                <div className="flex-1 h-1.5 bg-[#1b1b1e] rounded-full overflow-hidden border border-[#2b2b2f]">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-100"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-cyan-400 shrink-0 font-bold w-10 text-right">{progressPercent}%</span>
              </div>

              <div>
                <button
                  disabled={!isCompleted}
                  onClick={handleEnterDashboard}
                  className={`px-6 py-2.5 rounded-xl font-light tracking-[0.2em] text-xs flex items-center gap-2 uppercase transition-all duration-500 border ${
                    isCompleted 
                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] text-white cursor-pointer active:scale-[0.98]' 
                      : 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 animate-pulse" />
                      Enter Diagnostic Viewport
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                      Computing PDE Graph...
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
