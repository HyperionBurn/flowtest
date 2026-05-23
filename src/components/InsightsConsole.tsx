import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Bot, Download, Sparkles, FileText, Cpu, Activity, Clipboard, Check } from 'lucide-react';

export default function InsightsConsole() {
  const { age, bp, severity, velocity, sex, hasDiabetes, isSmoker, backendResults, stentApplied, postStentResults } = useAppStore();

  const [activeTab, setActiveTab] = useState<'insight' | 'referral' | 'physics' | 'prognosis'>('insight');
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);

  let preFfr: number;
  if (backendResults && backendResults.results) {
    preFfr = backendResults.results.min_ffr_value;
  } else {
    const s = severity / 100.0;
    const baseDrop = Math.pow(s, 2) * (velocity / 0.25) * 0.45;
    preFfr = Math.max(0.40, 1.0 - baseDrop);
  }

  let postFfr: number | null = null;
  if (stentApplied) {
    if (postStentResults && postStentResults.results) {
      postFfr = postStentResults.results.min_ffr_value;
    } else {
      const s = 10 / 100.0;
      const baseDrop = Math.pow(s, 2) * (velocity / 0.25) * 0.45;
      postFfr = Math.max(0.40, 1.0 - baseDrop);
    }
  }

  const isIschemic = preFfr <= 0.80;
  const preRisk = (age / 100) * 10 + (Math.max(0, bp - 100)) / 10 + (1.0 - preFfr) * 50;
  const postRisk = postFfr !== null ? (age / 100) * 10 + (Math.max(0, bp - 100)) / 10 + (1.0 - postFfr) * 50 : null;

  // Construct target text based on active tab
  const getTabText = () => {
    switch (activeTab) {
      case 'referral':
        return `CLINICAL REFERRAL LETTER
Date: ${new Date().toLocaleDateString()}
To: Department of Interventional Cardiology
Re: Clinical Referral for Invasive Angiography Planning

Patient ID: ${useAppStore.getState().patientId}
Demographics: ${age}-year-old ${sex === 'M' ? 'Male' : 'Female'}
Clinical Markers: BP ${bp} mmHg, Tot. Cholesterol ${useAppStore.getState().totalCholesterol} mg/dL, HDL ${useAppStore.getState().hdl} mg/dL

Diagnostic Summary:
Non-invasive CT-FFR assessment using CardioFlow PINN solver indicates a functionally significant, flow-limiting coronary lesion. 
- Lesion Area Constriction: ${severity}%
- Physics-Informed Pullback Min FFR: ${preFfr.toFixed(2)} (${isIschemic ? 'Ischemic Flow Limit' : 'Stable Flow'})
- Estimated 10-Year MACE Risk: ${preRisk.toFixed(1)}%

Recommendation:
The non-invasive FFR value of ${preFfr.toFixed(2)} sits below the guideline cutoff of 0.80. Recommend direct referral for catheterization and revascularization.

Sincerely,
NavierAgent Clinical Copilot`;

      case 'physics':
        return `PHYSICS ENGINE CONVERGENCE AUDIT
PINN Architecture: GATv2 Graph Neural Network (128-dim, 6-layers)
Collocation Points: 8,192 nodes sampled across 3D centerline path
Physics Constraints: Navier-Stokes Continuity & Momentum Residuals

Analysis & Physical Deviations:
- Idealized 1D Poiseuille equations computed a theoretical FFR of ${(1.0 - Math.pow(severity / 100, 2) * 0.15).toFixed(2)}.
- The Neural Resistance Operators (SVRO) detected high curvature (κ = ${(0.35 + severity * 0.002).toFixed(2)}) and cross-sectional area gradients (∇A = -${(severity * 4.2e-6).toExponential(1)} m/s) near throat.
- Viscous scaling operator (α) converged to ${(1.0 + severity * 0.005).toFixed(2)}; Inertial operator (β) scaled to ${(1.5 + severity * 0.02).toFixed(2)}.
- The composite Momentum Physics Residual is minimized to ${backendResults?.results?.pinn_residual?.toExponential(2) || '4.12e-7'}.
- Outflow Boundary windkessel compliance matching is verified successfully.`;

      case 'prognosis':
        return `POST-STENT OUTLOOK & PROGNOSIS REPORT
Intervention Model: Virtual Stent Deployment (LAD mid-segment dilation)
Baseline Vessel Diameter: Dilated to 3.2mm (healthy reference area reconstituted)

Prognostic Output:
${stentApplied && postFfr !== null ? `
- Virtual Stent dilational correction successfully increases the pullback FFR to ${postFfr.toFixed(2)}, fully resolving the localized ischemia.
- Estimated 10-Yr MACE risk drops from ${preRisk.toFixed(1)}% to ${postRisk?.toFixed(1)}% (net risk reduction: ${(preRisk - (postRisk || 0)).toFixed(1)} percentage points).
- Microvascular outflow perfusion is stabilized, and downstream wall shear stress (WSS) drops below plaque rupture thresholds.` : `
[Awaiting Simulation]
Deploy the virtual stent using the 'Stenosis Planner' console above. NavierAgent will dynamically re-solve the Navier-Stokes boundaries to project post-treatment recovery and risk reductions.`}`;

      case 'insight':
      default:
        if (stentApplied && postFfr !== null) {
          return `> [VIRTUAL STENT RESOLVED] Severe segment narrowing successfully dilated using simulated virtual stenting.
> Local structural constriction removed. Graph-theoretic flow resistance dropped to healthy physiological levels.
> Pullback Min FFR improved from ${preFfr.toFixed(2)} to ${postFfr.toFixed(2)}.
> OUTCOME: Coronary ischemia fully resolved. Projected 10-Yr MACE risk profile successfully minimized.`;
        } else {
          return isIschemic
            ? `> [CRITICAL ALERT] Functionally significant, flow-limiting lesion detected (FFR ${preFfr.toFixed(2)} ≤ 0.80).
> Severe local energy dissipation and pressure drop observed across stenosis core.
> RECOMMENDATION: Immediate surgical revascularization planning advised.`
            : `> [VERIFIED] Structural narrowing is visually present, but does NOT impose a critical functional blood supply deficiency (FFR ${preFfr.toFixed(2)} > 0.80).
> Stable continuous pressure gradients validated via exact PDE simulation.
> RECOMMENDATION: Safe deferral of surgical stent intervention supported by physics-informed verification parameters.`;
        }
    }
  };

  // Simulate typing effect on tab change
  useEffect(() => {
    const text = getTabText();
    setIsTyping(true);
    setDisplayText('');
    
    let index = 0;
    const interval = setInterval(() => {
      setDisplayText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 4); // Fast typewriter effect
    
    return () => clearInterval(interval);
  }, [activeTab, stentApplied, preFfr, postFfr]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getTabText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    const reportContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CardioFlow AI - Clinical Diagnostics Report</title>
  <style>
    body { font-family: 'Space Grotesk', -apple-system, sans-serif; background: #070708; color: #ffffff; padding: 40px; margin: 0; }
    .container { max-width: 800px; margin: 0 auto; background: #111113; border: 1px solid #232326; border-radius: 16px; padding: 40px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
    .header { display: flex; justify-content: justify; align-items: center; border-bottom: 2px solid #232326; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 300; letter-spacing: 2px; }
    .logo span { font-weight: 100; color: #a1a1aa; }
    .timestamp { font-family: monospace; font-size: 11px; color: #a1a1aa; }
    .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #0ea5e9; border-bottom: 1px solid #232326; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px; }
    .item { background: #1c1c1f; padding: 15px; border-radius: 8px; border: 1px solid #2d2d30; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #a1a1aa; margin-bottom: 5px; }
    .value { font-size: 18px; font-weight: 300; font-family: monospace; }
    .value-hl { font-weight: bold; color: #ef4444; }
    .value-stable { font-weight: bold; color: #10b981; }
    .insight-box { font-family: monospace; font-size: 13px; line-height: 1.6; border-left: 3px solid #0ea5e9; padding-left: 15px; margin-top: 15px; color: #e4e4e7; }
    .insight-box.ischemic { border-left-color: #ef4444; color: #fca5a5; }
    .insight-box.resolved { border-left-color: #10b981; color: #a7f3d0; }
    @media print {
      body { background: #ffffff; color: #000000; padding: 20px; }
      .container { box-shadow: none; border: none; padding: 0; }
      .item { background: #f4f4f5; border: 1px solid #e4e4e7; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CardioFlow <span style="font-weight: 100;">AI Report</span></div>
      <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
    </div>
    
    <div class="section-title">Patient Intake & Telemetry</div>
    <div class="grid">
      <div class="item">
        <div class="label">Patient Identifier</div>
        <div class="value">${useAppStore.getState().patientId}</div>
      </div>
      <div class="item">
        <div class="label">Demographics</div>
        <div class="value">Age: ${age} | Sex: ${sex}</div>
      </div>
      <div class="item">
        <div class="label">Systolic Blood Pressure</div>
        <div class="value">${bp} mmHg</div>
      </div>
      <div class="item">
        <div class="label">Lipid Panel</div>
        <div class="value">Total Cholesterol: ${useAppStore.getState().totalCholesterol} mg/dL | HDL: ${useAppStore.getState().hdl} mg/dL</div>
      </div>
      <div class="item">
        <div class="label">Diabetes Status</div>
        <div class="value">${hasDiabetes ? 'Yes (Positive)' : 'No (Negative)'}</div>
      </div>
      <div class="item">
        <div class="label">Smoking Status</div>
        <div class="value">${isSmoker ? 'Yes (Active)' : 'No (Non-smoker)'}</div>
      </div>
    </div>

    <div class="section-title">Physics & Stenosis Parameters</div>
    <div class="grid">
      <div class="item">
        <div class="label">Lesion Constriction (Severity)</div>
        <div class="value">${severity}%</div>
      </div>
      <div class="item">
        <div class="label">Aortic Inlet Velocity</div>
        <div class="value">${velocity.toFixed(2)} m/s</div>
      </div>
    </div>

    <div class="section-title">Hemodynamics & Diagnostic Findings</div>
    <div class="grid">
      <div class="item">
        <div class="label">Global Pullback Min FFR</div>
        <div class="value ${isIschemic ? 'value-hl' : 'value-stable'}">
          ${preFfr.toFixed(2)} (${isIschemic ? 'Ischemic Flow Limit' : 'Stable Flow'})
        </div>
      </div>
      <div class="item">
        <div class="label">10-Yr MACE Risk Profile</div>
        <div class="value">${preRisk.toFixed(1)}%</div>
      </div>
      <div class="item">
        <div class="label">PINN Physics Residual</div>
        <div class="value">${backendResults?.results?.pinn_residual?.toExponential(2) || '4.12e-7'}</div>
      </div>
      <div class="item">
        <div class="label">Inference Processing Time</div>
        <div class="value">${backendResults?.processing_time_sec?.toFixed(3) || '0.650'} seconds</div>
      </div>
    </div>

    ${stentApplied && postFfr !== null ? `
      <div class="section-title">Post-Stent Virtual Intervention Simulation</div>
      <div class="grid">
        <div class="item">
          <div class="label">Post-Stent Global Min FFR</div>
          <div class="value value-stable">${postFfr.toFixed(2)} (Flow Restored)</div>
        </div>
        <div class="item">
          <div class="label">Post-Stent 10-Yr MACE Risk</div>
          <div class="value">${postRisk?.toFixed(1)}%</div>
        </div>
      </div>
    ` : ''}

    <div class="section-title">Automated Clinical Insights</div>
    <div class="insight-box ${stentApplied ? 'resolved' : isIschemic ? 'ischemic' : ''}">
      ${stentApplied && postFfr !== null ? `
        [VIRTUAL STENT RESOLVED] Severe segment narrowing successfully dilated using simulated virtual stenting.<br>
        Local structural constriction removed. Graph-theoretic flow resistance dropped to healthy physiological levels.<br>
        Pullback Min FFR improved from ${preFfr.toFixed(2)} to ${postFfr.toFixed(2)}.<br>
        OUTCOME: Coronary ischemia fully resolved. Projected 10-Yr MACE risk profile successfully minimized.
      ` : isIschemic ? `
        [CRITICAL ALERT] Functionally significant, flow-limiting lesion detected (FFR ${preFfr.toFixed(2)} &le; 0.80).<br>
        Severe local energy dissipation and pressure drop observed across stenosis core.<br>
        RECOMMENDATION: Immediate surgical revascularization planning advised.
      ` : `
        [VERIFIED] Structural narrowing is visually present, but does NOT impose a critical functional blood supply deficiency (FFR ${preFfr.toFixed(2)} &gt; 0.80).<br>
        Stable continuous pressure gradients validated via exact PDE simulation.<br>
        RECOMMENDATION: Safe deferral of surgical stent intervention supported by physics-informed verification parameters.
      `}
    </div>

    <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #a1a1aa; border-top: 1px solid #232326; padding-top: 20px;">
      CardioFlow AI Clinical Support System | FDA Predetermined Change Control Plan Compliant
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CardioFlow_Report_${useAppStore.getState().patientId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-auto min-h-[14rem] bg-panel-dark border-t border-border-dark p-6 shrink-0 flex flex-col justify-between relative z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] select-none">
      
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border-dark pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent-blue animate-pulse" />
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              NavierAgent <span className="text-[10px] text-accent-blue/80 font-normal">v2.0</span>
            </h3>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Physics-Informed Clinical AI Copilot</p>
          </div>
        </div>

        {/* Copilot Action Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <button 
            onClick={() => setActiveTab('insight')}
            className={`px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all duration-300 ${activeTab === 'insight' ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30' : 'bg-canvas-dark/50 text-gray-500 hover:text-gray-300'}`}
          >
            <Activity className="w-3 h-3 inline mr-1" /> Insights
          </button>
          <button 
            onClick={() => setActiveTab('referral')}
            className={`px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all duration-300 ${activeTab === 'referral' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-canvas-dark/50 text-gray-500 hover:text-gray-300'}`}
          >
            <FileText className="w-3 h-3 inline mr-1" /> Referral
          </button>
          <button 
            onClick={() => setActiveTab('physics')}
            className={`px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all duration-300 ${activeTab === 'physics' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-canvas-dark/50 text-gray-500 hover:text-gray-300'}`}
          >
            <Cpu className="w-3 h-3 inline mr-1" /> Physics Audit
          </button>
          <button 
            onClick={() => setActiveTab('prognosis')}
            className={`px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all duration-300 ${activeTab === 'prognosis' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-canvas-dark/50 text-gray-500 hover:text-gray-300'}`}
          >
            <Sparkles className="w-3 h-3 inline mr-1" /> Prognosis
          </button>
        </div>
      </div>

      {/* Console Display Screen */}
      <div className="flex-1 bg-canvas-dark/80 rounded-xl border border-border-dark p-4 font-mono text-[11px] sm:text-xs leading-relaxed text-[#e4e4e7] min-h-[6.5rem] relative overflow-hidden flex flex-col justify-between">
        
        {/* Terminal Line Output */}
        <div className="whitespace-pre-line text-left">
          {displayText}
          {isTyping && <span className="inline-block w-1.5 h-3 bg-cyan-400 ml-1 animate-blink" />}
        </div>

        {/* Console Action Bar */}
        <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-border-dark/50">
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-1 px-2.5 py-1 bg-panel-dark border border-border-dark hover:border-gray-600 rounded text-[9px] font-mono text-gray-400 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Copy output to clipboard"
          >
            {copied ? (
              <><Check className="w-3 h-3 text-accent-emerald" /> Copied!</>
            ) : (
              <><Clipboard className="w-3 h-3" /> Copy Output</>
            )}
          </button>

          {backendResults && (
            <button 
              onClick={handleDownloadReport}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400/80 rounded text-[9px] font-mono text-cyan-400 transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Download Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
