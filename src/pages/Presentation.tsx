import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, Play, Pause, Maximize2, 
  Cpu, Zap, Heart, TrendingDown, Layers, CheckCircle2, AlertTriangle, Monitor, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Slide structure type
interface Slide {
  id: number;
  title: string;
  subtitle: string;
  component: React.ReactNode;
}

export default function Presentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const presentationRef = useRef<HTMLDivElement>(null);

  // Slides configuration
  const slidesCount = 5;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, isFullscreen]);

  // Autoplay loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 7000); // 7 seconds per slide
    return () => clearInterval(interval);
  }, [isPlaying, currentSlide]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slidesCount);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slidesCount) % slidesCount);
  };

  const toggleFullscreen = () => {
    if (!presentationRef.current) return;
    if (!isFullscreen) {
      if (presentationRef.current.requestFullscreen) {
        presentationRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 1D FFR Simulator State (Slide 3 Interactive Element)
  const [severity, setSeverity] = useState(65);
  const [inletVelocity, setInletVelocity] = useState(0.25);
  const [simMode, setSimMode] = useState<'ffr' | 'velocity' | 'pressure'>('ffr');

  // Compute 1D simulation curves on-the-fly for Slide 3
  const simData = React.useMemo(() => {
    const N = 60;
    const L = 10.0; // cm
    const r0 = 0.20; // cm (2mm)
    const s = severity / 100.0;
    const x_c = L / 2.0;
    const sigma = 0.6; // stenosis width
    const rho = 1.05; // g/cm^3
    const mu = 0.035; // poise (g/cm/s)
    const p_inlet = 90.0 * 1333.22; // barye (dyn/cm^2)

    const points = [];
    
    // Step 1: Calculate radius and area profile
    const r = [];
    const A = [];
    const v = [];
    const x = [];
    
    for (let i = 0; i < N; i++) {
      const x_val = (i / (N - 1)) * L;
      x.push(x_val);
      const rad = r0 * (1.0 - s * Math.exp(-Math.pow(x_val - x_c, 2) / (2 * Math.pow(sigma, 2))));
      r.push(rad);
      const area = Math.PI * Math.pow(rad, 2);
      A.push(area);
      
      const Q = Math.PI * Math.pow(r0, 2) * (inletVelocity * 100); // cm^3/s
      v.push(Q / area); // cm/s
    }

    // Find min area for separation loss
    const minA = Math.min(...A);
    const Q_val = Math.PI * Math.pow(r0, 2) * (inletVelocity * 100);

    // Step 2: Integrate Pressure Drops along centerline
    const p = [p_inlet];
    const dx = L / (N - 1);

    for (let i = 1; i < N; i++) {
      const r_avg = (r[i] + r[i-1]) / 2.0;
      const A_avg = (A[i] + A[i-1]) / 2.0;
      
      // Viscous loss
      const dp_visc = - (8 * mu * dx * Q_val) / (Math.PI * Math.pow(r_avg, 4));
      
      // Bernoulli inertial loss
      const dp_bern = 0.5 * rho * (Math.pow(v[i-1], 2) - Math.pow(v[i], 2));
      
      // Separation loss (only downstream of throat and in expansion zone)
      let dp_sep = 0.0;
      if (x[i] > x_c && A[i] > A[i-1]) {
        const total_sep = (rho * 1.52 / (2 * Math.pow(A[0], 2))) * Math.pow((A[0] / minA) - 1.0, 2) * Math.pow(Q_val, 2);
        // Distribute downstream using a simple envelope
        const phi = Math.exp(-Math.pow(x[i] - (x_c + 1.0), 2) / (2 * Math.pow(0.8, 2)));
        dp_sep = - total_sep * phi * dx * 1.2;
      }

      const next_p = p[i-1] + dp_visc + dp_bern + dp_sep;
      // Clamp to floor
      p.push(Math.max(5.0 * 1333.22, next_p));
    }

    // Convert curves
    for (let i = 0; i < N; i++) {
      const press_mmHg = p[i] / 1333.22;
      const ffr_val = press_mmHg / (p_inlet / 1333.22);
      points.push({
        x: x[i],
        radius: r[i] * 10, // mm
        ffr: ffr_val,
        velocity: v[i] / 100, // m/s
        pressure: press_mmHg
      });
    }

    return points;
  }, [severity, inletVelocity]);

  // Framer Motion Animation Variants
  const slideVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95
    }),
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -1000 : 1000,
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
    })
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' }
    })
  };

  // Slides components
  const renderSlideContent = () => {
    switch (currentSlide) {
      case 0:
        return (
          <div className="flex flex-col lg:flex-row items-center justify-between h-full w-full gap-8 px-6 lg:px-12 relative overflow-hidden">
            <div className="flex-1 text-left z-10">
              <motion.div 
                custom={1} initial="hidden" animate="visible" variants={textVariants}
                className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-mono tracking-widest uppercase mb-6"
              >
                <Sparkles className="w-3.5 h-3.5 animate-spin-slow" /> Hackathon Submission Pitch
              </motion.div>
              <motion.h1 
                custom={2} initial="hidden" animate="visible" variants={textVariants}
                className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-none mb-6"
              >
                CardioFlow <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500">AI</span>
              </motion.h1>
              <motion.p 
                custom={3} initial="hidden" animate="visible" variants={textVariants}
                className="text-lg lg:text-xl font-light text-gray-400 max-w-xl leading-relaxed mb-8"
              >
                Next-generation, real-time clinical hemodynamics driven by 1D Physics-Informed Neural Networks <span className="font-mono text-cyan-400 text-sm">(PINNs)</span>.
              </motion.p>
              
              <motion.div 
                custom={4} initial="hidden" animate="visible" variants={textVariants}
                className="flex items-center gap-6 font-mono text-xs text-gray-500"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-gray-600">Computation Time</span>
                  <span className="text-white font-light text-base mt-0.5">&lt; 0.75 Seconds</span>
                </div>
                <div className="w-px h-8 bg-gray-800" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-gray-600">Hardware Requirements</span>
                  <span className="text-white font-light text-base mt-0.5">Standard CPU / Tablet</span>
                </div>
              </motion.div>
            </div>
            
            <div className="flex-1 relative w-full max-w-lg aspect-square flex items-center justify-center">
              {/* Spinning backdrop graphics */}
              <div className="absolute w-[110%] h-[110%] border border-dashed border-cyan-500/10 rounded-full animate-spin-slow pointer-events-none" />
              <div className="absolute w-[90%] h-[90%] border border-dashed border-indigo-500/10 rounded-full animate-spin-reverse pointer-events-none" />
              
              {/* Generated Image Cover */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="w-full h-full rounded-2xl overflow-hidden border border-[#232326] shadow-2xl relative bg-[#09090b]"
              >
                <img 
                  src="/coronary_stenosis.png" 
                  alt="Coronary Artery Stenosis Visualization"
                  className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 bg-[#111113]/80 backdrop-blur-md border border-[#232326] p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-gray-300 uppercase tracking-widest">centerline pressure projection</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded uppercase">active mesh</span>
                </div>
              </motion.div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col lg:flex-row items-center justify-between h-full w-full gap-8 px-6 lg:px-12">
            <div className="flex-1 text-left z-10">
              <motion.span 
                custom={1} initial="hidden" animate="visible" variants={textVariants}
                className="text-[10px] font-mono uppercase tracking-[0.2em] text-indigo-400 mb-2 block"
              >
                Clinical Context & Challenge
              </motion.span>
              <motion.h2 
                custom={2} initial="hidden" animate="visible" variants={textVariants}
                className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-6"
              >
                The Diagnostics Bottle-neck
              </motion.h2>
              
              <div className="space-y-5 mt-8">
                {[
                  {
                    icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
                    title: "Invasive Corrosive Procedures",
                    desc: "Fractional Flow Reserve (FFR) is the clinical gold standard, but requires feeding a pressure wire through the coronary artery, carrying risk of stroke and dissection."
                  },
                  {
                    icon: <Layers className="w-5 h-5 text-amber-400" />,
                    title: "Heavy Compute Requirements",
                    desc: "Standard non-invasive 3D CFD solutions take 4 to 6 hours of high-performance GPU cluster computing, rendering them useless for active surgical decision-making."
                  },
                  {
                    icon: <Cpu className="w-5 h-5 text-cyan-400" />,
                    title: "Hardware Dependency",
                    desc: "Hospitals must upload patient scans to centralized cloud networks, raising security compliance flags and incurring high subscription costs."
                  }
                ].map((item, idx) => (
                  <motion.div 
                    key={idx} custom={idx + 3} initial="hidden" animate="visible" variants={textVariants}
                    className="flex gap-4 p-4 bg-[#141417]/40 border border-[#232326]/50 rounded-xl hover:border-gray-700 transition-all duration-300"
                  >
                    <div className="p-2 bg-[#1b1b1f] rounded-lg shrink-0 h-10 w-10 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <div className="flex-1 w-full max-w-md bg-[#111113] border border-[#232326] rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
              
              {/* Interactive Stenosis Graphic */}
              <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-6">dynamic stenosis simulation</h3>
              
              <div className="h-40 bg-[#09090b] border border-[#1b1b1e] rounded-xl relative p-4 flex items-center justify-center overflow-hidden mb-6">
                <svg className="w-full h-full overflow-visible">
                  {/* Artery Boundary Outline */}
                  <path
                    d={`M 0,20 Q 150,${20 + severity * 0.25} 300,20 L 300,60 Q 150,${60 - severity * 0.25} 0,60 Z`}
                    fill="url(#artery-glow)"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    className="transition-all duration-300"
                  />
                  {/* Fluid particle flow animations */}
                  <circle cx="20" cy="40" r="2.5" fill="#38bdf8">
                    <animate attributeName="cx" values="20;140;150;160;280" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="cy" values="40;40;40;40;40" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="50" cy="35" r="2.5" fill="#38bdf8">
                    <animate attributeName="cx" values="50;140;150;160;280" dur="1.7s" repeatCount="indefinite" />
                    <animate attributeName="cy" values="35;38;38;42;42" dur="1.7s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="80" cy="45" r="2.5" fill="#38bdf8">
                    <animate attributeName="cx" values="80;140;150;160;280" dur="2.3s" repeatCount="indefinite" />
                    <animate attributeName="cy" values="45;42;42;38;38" dur="2.3s" repeatCount="indefinite" />
                  </circle>
                  <defs>
                    <linearGradient id="artery-glow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.08" />
                      <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.08" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute top-2 right-2 text-[9px] font-mono text-gray-500 uppercase">shear stress threshold</div>
              </div>
              
              {/* Slider Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-400 uppercase">Stenosis severity:</span>
                  <span className="text-rose-400 font-bold">{severity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-rose-500 border border-[#232326]"
                />
                
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-2 border-t border-[#1b1b1e]">
                  <span>Vessel Length: 10cm</span>
                  <span>Estimated Pressure Drop: {Math.pow(severity/100, 2).toFixed(2)}x baseline</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col lg:flex-row items-center justify-between h-full w-full gap-8 px-6 lg:px-12">
            <div className="flex-1 text-left z-10">
              <motion.span 
                custom={1} initial="hidden" animate="visible" variants={textVariants}
                className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 mb-2 block"
              >
                Mathematical Mechanics
              </motion.span>
              <motion.h2 
                custom={2} initial="hidden" animate="visible" variants={textVariants}
                className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-4"
              >
                Physics-Informed Navier-Stokes
              </motion.h2>
              
              <motion.p 
                custom={3} initial="hidden" animate="visible" variants={textVariants}
                className="text-sm text-gray-400 leading-relaxed mb-6"
              >
                CardioFlow solves the exact fluid mechanics inside the neural network's backpropagation graph. Rather than learning purely from data, the model optimizes weights using the Navier-Stokes residual formulation as the loss function.
              </motion.p>
              
              <div className="space-y-4">
                <motion.div 
                  custom={4} initial="hidden" animate="visible" variants={textVariants}
                  className="p-4 bg-[#09090b] border border-[#1b1b1e] rounded-xl text-xs text-center"
                >
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">Momentum Conservation PDE Residual</div>
                  <div className="text-white text-lg overflow-x-auto py-2 flex items-center justify-center gap-1 font-serif select-all">
                    {/* dP / dx */}
                    <div className="inline-flex flex-col items-center align-middle mx-1.5">
                      <span className="border-b border-gray-600 px-1 pb-0.5 italic">dP</span>
                      <span className="pt-0.5 italic">dx</span>
                    </div>
                    <span className="text-cyan-400/80 mx-1">+</span>
                    {/* rho * v * dv / dx */}
                    <span className="text-teal-400 italic text-xl select-none">ρ</span>
                    <span className="italic text-base">v</span>
                    <div className="inline-flex flex-col items-center align-middle mx-1.5">
                      <span className="border-b border-gray-600 px-1 pb-0.5 italic">dv</span>
                      <span className="pt-0.5 italic">dx</span>
                    </div>
                    <span className="text-cyan-400/80 mx-1">+</span>
                    {/* 8 * pi * mu * v / A */}
                    <div className="inline-flex flex-col items-center align-middle mx-1.5">
                      <span className="border-b border-gray-600 px-1 pb-0.5 italic">8πμv</span>
                      <span className="pt-0.5 italic">A</span>
                    </div>
                    <span className="text-cyan-400/80 mx-1">+</span>
                    <span className="text-rose-400 italic">f<sub className="text-[9px]">sep</sub></span>
                    <span className="text-gray-400 mx-1.5">=</span>
                    <span>0</span>
                  </div>
                </motion.div>
                
                <motion.div 
                  custom={5} initial="hidden" animate="visible" variants={textVariants}
                  className="p-4 bg-[#09090b] border border-[#1b1b1e] rounded-xl text-xs"
                >
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">Viscous Baseline Physics-Guided Ansatz</div>
                  <div className="text-white text-lg text-center py-2 flex items-center justify-center gap-1 font-serif select-all">
                    <span className="italic">P</span><span className="text-sm">(x)</span>
                    <span className="text-gray-400 mx-1.5">=</span>
                    <span className="italic">P</span><sub className="text-[10px] text-gray-400">base</sub><span className="text-sm">(x)</span>
                    <span className="text-cyan-400/80 mx-1.5">-</span>
                    <span className="italic">x</span>
                    <span className="text-gray-400 mx-1.5">·</span>
                    <span className="text-cyan-400 italic">P̂</span><sub className="text-[10px] text-cyan-500/80">δ</sub><span className="text-sm">(x)</span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 mt-2 leading-relaxed text-center">
                    Guarantees inlet boundary condition is satisfied exactly: <code className="text-cyan-400">P(0) = P_inlet</code>.
                  </div>
                </motion.div>
              </div>
            </div>
            
            <div className="flex-1 w-full max-w-lg relative flex items-center justify-center">
              {/* Generated Image cover for PINN schema */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="w-full h-full rounded-2xl overflow-hidden border border-[#232326] shadow-2xl relative bg-[#09090b] aspect-video"
              >
                <img 
                  src="/pinn_schematic.png" 
                  alt="PINN Schematic Diagram"
                  className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 bg-[#111113]/80 backdrop-blur-md border border-[#232326] p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-mono text-gray-300 uppercase tracking-widest">Collocation Loss Optimization</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400">Autograd Enabled</span>
                </div>
              </motion.div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col lg:flex-row items-center justify-between h-full w-full gap-8 px-6 lg:px-12">
            <div className="flex-1 text-left z-10">
              <motion.span 
                custom={1} initial="hidden" animate="visible" variants={textVariants}
                className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 mb-2 block"
              >
                Interactive Diagnostics
              </motion.span>
              <motion.h2 
                custom={2} initial="hidden" animate="visible" variants={textVariants}
                className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-4"
              >
                Real-Time FFR Analysis
              </motion.h2>
              
              <motion.p 
                custom={3} initial="hidden" animate="visible" variants={textVariants}
                className="text-xs text-gray-400 leading-relaxed mb-6"
              >
                Manipulate stenosis geometry and input boundary conditions below to see how the mathematical solver evaluates pressure drop, flow velocity, and Fractional Flow Reserve along the coronary line.
              </motion.p>
              
              {/* Live interactive sliders */}
              <motion.div 
                custom={4} initial="hidden" animate="visible" variants={textVariants}
                className="bg-[#141417]/50 border border-[#232326] p-5 rounded-xl space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-gray-400 uppercase">Stenosis severity:</span>
                    <span className="text-cyan-400 font-bold">{severity}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="90"
                    value={severity}
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-cyan-500 border border-[#232326]"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-gray-400 uppercase">Aortic inflow velocity:</span>
                    <span className="text-cyan-400 font-bold">{inletVelocity.toFixed(2)} m/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.60"
                    step="0.05"
                    value={inletVelocity}
                    onChange={(e) => setInletVelocity(Number(e.target.value))}
                    className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-cyan-500 border border-[#232326]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#232326]">
                  {(['ffr', 'velocity', 'pressure'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSimMode(mode)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all duration-300 ${
                        simMode === mode 
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' 
                          : 'bg-[#1b1b1f] border border-transparent text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
            
            <div className="flex-1 w-full max-w-lg bg-[#111113] border border-[#232326] p-6 rounded-2xl shadow-2xl relative flex flex-col h-[320px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Hemodynamic Profile</span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Solved
                </span>
              </div>
              
              {/* Dynamic SVG Plotting */}
              <div className="flex-1 bg-[#09090b] border border-[#1b1b1e] rounded-xl p-4 relative overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="100%" y2="20" stroke="#1f1f25" strokeDasharray="3,3" />
                  <line x1="0" y1="80" x2="100%" y2="80" stroke="#1f1f25" strokeDasharray="3,3" />
                  <line x1="0" y1="140" x2="100%" y2="140" stroke="#1f1f25" strokeDasharray="3,3" />
                  
                  {/* Plot Path */}
                  <path
                    d={(() => {
                      const width = 360;
                      const height = 160;
                      const points = simData.map((d, idx) => {
                        const x_coord = (idx / (simData.length - 1)) * width;
                        let y_val = 0;
                        if (simMode === 'ffr') {
                          y_val = height - (d.ffr * (height - 30)) - 15;
                        } else if (simMode === 'velocity') {
                          // Scale velocity
                          const normV = (d.velocity - 0.1) / (2.5 - 0.1);
                          y_val = height - (normV * (height - 30)) - 15;
                        } else if (simMode === 'pressure') {
                          // Scale pressure
                          const normP = (d.pressure - 5) / (90 - 5);
                          y_val = height - (normP * (height - 30)) - 15;
                        }
                        return `${x_coord},${y_val}`;
                      });
                      return `M ${points.join(' L ')}`;
                    })()}
                    fill="none"
                    stroke={simMode === 'ffr' ? '#06b6d4' : simMode === 'velocity' ? '#a855f7' : '#f59e0b'}
                    strokeWidth="2"
                    className="transition-all duration-300"
                  />
                </svg>
                
                {/* Float Min FFR Indicator */}
                {simMode === 'ffr' && (
                  <div className="absolute bottom-4 right-4 bg-[#141417]/85 border border-[#232326] p-2.5 rounded-lg font-mono text-[10px]">
                    <div className="text-gray-500 uppercase tracking-widest">minimum ffr</div>
                    <div className={`text-base font-bold mt-0.5 ${
                      simData[simData.length - 1].ffr < 0.80 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {simData[simData.length - 1].ffr.toFixed(3)}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-3 text-[9px] font-mono text-gray-500 uppercase">
                <span>Inlet (x = 0)</span>
                <span>Stenosis Throat (x = 5cm)</span>
                <span>Outlet (x = 10cm)</span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col items-center justify-center h-full w-full text-center px-6 max-w-4xl mx-auto">
            <motion.div 
              custom={1} initial="hidden" animate="visible" variants={textVariants}
              className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-mono tracking-widest uppercase mb-6"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Hackathon Value Proposition
            </motion.div>
            <motion.h2 
              custom={2} initial="hidden" animate="visible" variants={textVariants}
              className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6"
            >
              Why CardioFlow AI Wins
            </motion.h2>
            <motion.p 
              custom={3} initial="hidden" animate="visible" variants={textVariants}
              className="text-base text-gray-400 max-w-2xl leading-relaxed mb-10"
            >
              CardioFlow is the only clinical platform that brings real-time, non-invasive, physics-informed coronary diagnostics straight to the ICU clinic laptop without requiring cloud dependencies.
            </motion.p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {[
                {
                  title: "Real-time Convergence",
                  value: "< 0.75s",
                  desc: "Traditional CFD solvers take hours. Our 1D Navier-Stokes PINN optimizes in milliseconds, permitting interactive on-the-spot clinical evaluations."
                },
                {
                  title: "Physics-Grounded",
                  value: "Zero Bias",
                  desc: "Unlike standard black-box machine learning networks, our network enforces actual mass and momentum conservation, preventing invalid extrapolations."
                },
                {
                  title: "DICOM Interoperable",
                  value: "Universal",
                  desc: "Fully integrates into current medical workflows. Drop any DICOM file, instantly parse Patient cohort metadata, and project patient-specific hemodynamic profiles."
                }
              ].map((card, idx) => (
                <motion.div 
                  key={idx} custom={idx + 4} initial="hidden" animate="visible" variants={textVariants}
                  className="bg-[#111113] border border-[#232326] p-6 rounded-2xl text-left relative overflow-hidden flex flex-col justify-between hover:border-cyan-500/40 transition-colors duration-500"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{card.title}</span>
                    <div className="text-2xl font-bold font-mono text-white mt-2 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">{card.value}</div>
                    <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-[#070708] flex flex-col items-center justify-center p-6 select-none overflow-hidden relative min-h-screen">
      {/* Dynamic blurred backdrop circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow-reverse" />

      {/* Presentation Container */}
      <div 
        ref={presentationRef}
        className={`w-full max-w-6xl aspect-[16/9] bg-[#111113]/85 backdrop-blur-lg border border-[#232326] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative ${
          isFullscreen ? 'w-screen h-screen rounded-none border-none' : ''
        }`}
      >
        
        {/* Top bar with back-to-dashboard and controls */}
        <div className="h-14 border-b border-[#232326]/60 px-6 flex items-center justify-between shrink-0 bg-[#121215]/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-px h-4 bg-gray-800" />
            <span className="text-[10px] font-mono text-gray-400 tracking-widest uppercase">CardioFlow Pitch Deck</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-2 rounded-lg transition-colors ${isPlaying ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/30' : 'text-gray-500 hover:text-white'}`}
              title={isPlaying ? "Pause Autoplay" : "Play Autoplay"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-500 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Slides Content Frame */}
        <div className="flex-1 relative overflow-hidden bg-[#0a0a0c]/40 flex items-center justify-center p-8">
          <AnimatePresence mode="wait" custom={1}>
            <motion.div
              key={currentSlide}
              custom={1}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full h-full flex items-center justify-center"
            >
              {renderSlideContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Slide Index Strip */}
        <div className="h-16 border-t border-[#232326]/60 px-6 flex items-center justify-between shrink-0 bg-[#121215]/50 backdrop-blur-md font-mono text-[10px]">
          <button 
            onClick={prevSlide}
            className="px-3 py-1.5 bg-[#1b1b1f] border border-[#2d2d33] rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-3 h-3" /> Prev
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-2.5">
            {Array.from({ length: slidesCount }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  currentSlide === idx 
                    ? 'w-8 bg-cyan-400 shadow-[0_0_10px_#22d3ee]' 
                    : 'w-2.5 bg-gray-800 hover:bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button 
            onClick={nextSlide}
            className="px-3 py-1.5 bg-[#1b1b1f] border border-[#2d2d33] rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            Next <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>
    </div>
  );
}
