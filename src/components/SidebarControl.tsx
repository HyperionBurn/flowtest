import React, { useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { UploadCloud, CheckCircle, Zap, Activity, FileDigit, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { extractDicomMetadata } from '../utils/dicomEngine';

export default function SidebarControl() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const { 
    age, bp, severity, velocity, sex, totalCholesterol, hdl, isSmoker, hasDiabetes,
    setAge, setSex, setBp, setTotalCholesterol, setHdl, setIsSmoker, setHasDiabetes,
    setSeverity, setVelocity, dicomUploaded, setDicomUploaded, dicomImageUrl, setDicomImageUrl,
    dicomFile, setDicomFile, startExecution, updateExecutionProgress, setBackendResults, finishExecution, isExecuting
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dicomError, setDicomError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDicomError(null);
    const metadata = await extractDicomMetadata(file);

    if (metadata.success) {
      if (metadata.age) setAge(metadata.age);
      if (metadata.sex) setSex(metadata.sex);
      if (metadata.imageUrl) setDicomImageUrl(metadata.imageUrl);
      setDicomFile(file);
      setDicomUploaded(true);
    } else {
      setDicomError(metadata.error || 'Failed to parse DICOM file');
    }
    
    // Reset input so the same file can be uploaded again if cleared
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <aside className="w-[420px] bg-[#121212]/95 backdrop-blur-xl border-r border-border-dark flex flex-col h-full shrink-0 z-10 relative">
      <div className="p-8 flex-1 flex flex-col gap-10 overflow-y-auto custom-scrollbar font-light">
        
        {/* Module A: DICOM Input */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <FileDigit className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-light text-cyan-400 uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              DICOM Ingestion
            </h3>
          </div>
          
          <div 
            onClick={() => !dicomUploaded && fileInputRef.current?.click()}
            className={`relative group cursor-pointer overflow-hidden rounded-xl border transition-all duration-500 flex flex-col items-center justify-center text-center 
              ${dicomUploaded 
                ? 'border-emerald-400/50 bg-emerald-950/20 shadow-[0_0_30px_rgba(52,211,153,0.15)] h-48' 
                : 'border-cyan-500/30 bg-[#1c1c1f] hover:border-cyan-400/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:bg-cyan-950/20 p-6'}`}
          >
            {/* Ambient background glow */}
            <div className={`absolute inset-0 opacity-20 blur-2xl transition-all duration-500 ${dicomUploaded ? 'bg-emerald-400' : 'bg-cyan-500 group-hover:opacity-40'}`} />
            
            {dicomUploaded ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black/50 overflow-hidden group">
                {dicomImageUrl ? (
                  <>
                    <img 
                      src={dicomImageUrl} 
                      alt="DICOM Slice" 
                      className="w-full h-full object-contain mix-blend-screen opacity-80 group-hover:opacity-100 transition-opacity" 
                    />
                    <div className="absolute top-2 right-2 bg-emerald-950/80 border border-emerald-500/50 px-2 py-1 rounded text-[9px] text-emerald-400 font-mono flex items-center gap-1 backdrop-blur-md">
                      <CheckCircle className="w-3 h-3" /> DICOM OK
                    </div>
                  </>
                ) : (
                  <div className="relative z-10 flex flex-col items-center">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mb-3" />
                    <span className="text-sm font-light tracking-widest text-emerald-100 uppercase">Sequence Loaded</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center">
                <UploadCloud className="w-10 h-10 text-cyan-500/70 group-hover:text-cyan-400 mb-3 transition-colors duration-300" />
                <span className="text-sm font-light tracking-widest text-cyan-100 uppercase">Initialize Stream</span>
                <span className="text-[10px] text-cyan-500/50 mt-2 font-mono tracking-widest uppercase">.dcm / .zip format</span>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
              </div>
            )}
          </div>
          
          {dicomError && (
            <div className="flex items-start gap-2 mt-2 text-red-400 bg-red-950/30 p-2.5 rounded-lg border border-red-900/50">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-[10px] font-mono tracking-wide">{dicomError}</span>
            </div>
          )}
        </div>

        {/* Module B: AHA PREVENT Profile */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-light text-cyan-400 uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              Clinical Telemetry
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 bg-[#1c1c1f] p-6 rounded-xl border border-border-dark shadow-inner">
            
            {/* Standard Inputs */}
            <div className="relative">
              <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="peer w-full bg-transparent border-b border-gray-700 px-1 py-2 text-lg font-mono font-light text-white focus:outline-none focus:border-cyan-400 transition-colors" placeholder=" " />
              <label className="absolute left-1 -top-3.5 text-[10px] text-gray-500 tracking-widest uppercase transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-[10px] peer-focus:text-cyan-400">Age</label>
            </div>

            <div className="relative">
              <label className="absolute left-1 -top-3.5 text-[10px] text-gray-500 tracking-widest uppercase">Sex</label>
              <div className="flex w-full mt-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
                <button onClick={() => setSex('M')} className={`flex-1 text-xs py-1.5 rounded-md transition-all ${sex === 'M' ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-gray-500 hover:text-gray-300'}`}>M</button>
                <button onClick={() => setSex('F')} className={`flex-1 text-xs py-1.5 rounded-md transition-all ${sex === 'F' ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)]' : 'text-gray-500 hover:text-gray-300'}`}>F</button>
              </div>
            </div>

            <div className="relative">
              <input type="number" value={totalCholesterol} onChange={(e) => setTotalCholesterol(Number(e.target.value))} className="peer w-full bg-transparent border-b border-gray-700 px-1 py-2 text-lg font-mono font-light text-white focus:outline-none focus:border-cyan-400 transition-colors" placeholder=" " />
              <label className="absolute left-1 -top-3.5 text-[10px] text-gray-500 tracking-widest uppercase transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-[10px] peer-focus:text-cyan-400">Tot. Chol</label>
            </div>

            <div className="relative">
              <input type="number" value={hdl} onChange={(e) => setHdl(Number(e.target.value))} className="peer w-full bg-transparent border-b border-gray-700 px-1 py-2 text-lg font-mono font-light text-white focus:outline-none focus:border-cyan-400 transition-colors" placeholder=" " />
              <label className="absolute left-1 -top-3.5 text-[10px] text-gray-500 tracking-widest uppercase transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-[10px] peer-focus:text-cyan-400">HDL</label>
            </div>

            <div className="relative col-span-2">
              <input type="number" value={bp} onChange={(e) => setBp(Number(e.target.value))} className="peer w-full bg-transparent border-b border-gray-700 px-1 py-2 text-lg font-mono font-light text-white focus:outline-none focus:border-cyan-400 transition-colors" placeholder=" " />
              <label className="absolute left-1 -top-3.5 text-[10px] text-gray-500 tracking-widest uppercase transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-[10px] peer-focus:text-cyan-400">Systolic Pressure (mmHg)</label>
            </div>

            {/* Binary Toggles */}
            <div className="col-span-2 flex gap-4 pt-2 border-t border-gray-800/50">
              <button 
                onClick={() => setHasDiabetes(!hasDiabetes)}
                className={`flex-1 py-2 px-3 rounded-lg border text-xs tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 ${hasDiabetes ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'border-gray-800 bg-transparent text-gray-500 hover:border-gray-600'}`}
              >
                <div className={`w-2 h-2 rounded-full ${hasDiabetes ? 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]' : 'bg-gray-700'}`} />
                Diabetes
              </button>
              <button 
                onClick={() => setIsSmoker(!isSmoker)}
                className={`flex-1 py-2 px-3 rounded-lg border text-xs tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 ${isSmoker ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'border-gray-800 bg-transparent text-gray-500 hover:border-gray-600'}`}
              >
                <div className={`w-2 h-2 rounded-full ${isSmoker ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-gray-700'}`} />
                Smoker
              </button>
            </div>
          </div>
        </div>

        {/* Module C: Physics Modifiers */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-500" />
            <h3 className="text-xs font-light text-gray-300 uppercase tracking-[0.2em]">
              Physics Constraints
            </h3>
          </div>
          
          <div className="bg-[#1c1c1f] p-6 rounded-xl border border-border-dark space-y-6">
            <div>
              <div className="flex justify-between mb-3">
                <label className="text-[10px] text-gray-500 tracking-widest uppercase">Lesion Constriction</label>
                <span className="text-[10px] font-mono text-gray-300">{severity}%</span>
              </div>
              <input 
                type="range" min="10" max="90" value={severity} 
                onChange={(e) => setSeverity(Number(e.target.value))} 
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
              />
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <label className="text-[10px] text-gray-500 tracking-widest uppercase">Aortic Velocity</label>
                <span className="text-[10px] font-mono text-gray-300">{velocity.toFixed(2)} m/s</span>
              </div>
              <input 
                type="range" min="0.10" max="0.80" step="0.01" value={velocity} 
                onChange={(e) => setVelocity(Number(e.target.value))} 
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
              />
            </div>
          </div>
        </div>

      </div>

      {/* Execution Button anchored at bottom */}
      <div className="p-6 border-t border-border-dark bg-[#121212]">
        <button 
          onClick={async () => {
            if (!dicomFile) return;
            startExecution();
            
            try {
              const formData = new FormData();
              formData.append("file", dicomFile);
              formData.append("patient_age", String(age));
              formData.append("patient_sex", sex);
              formData.append("bp_systolic", String(bp));
              formData.append("total_cholesterol", String(totalCholesterol));
              formData.append("hdl", String(hdl));
              formData.append("is_smoker", String(isSmoker));
              formData.append("has_diabetes", String(hasDiabetes));
              formData.append("lesion_severity", String(severity));
              formData.append("aortic_velocity", String(velocity));

              updateExecutionProgress(20, "Uploading to Physics Engine...");
              
              const res = await fetch(`${API_URL}/api/v1/analyze-scan`, {
                method: "POST",
                body: formData
              });
              
              if (!res.ok) throw new Error(`Backend error: ${res.status}`);
              
              updateExecutionProgress(60, "Running Navier-Stokes Solver...");
              const data = await res.json();
              
              updateExecutionProgress(90, "Compiling Results...");
              setTimeout(() => {
                setBackendResults(data);
              }, 800);

            } catch (err) {
              console.error(err);
              updateExecutionProgress(100, "Backend Connection Failed");
              setTimeout(() => finishExecution(null), 1500);
            }
          }}
          disabled={!dicomUploaded || isExecuting}
          className={`relative overflow-hidden w-full font-light tracking-[0.2em] py-4 rounded-xl flex items-center justify-center gap-3 text-sm transition-all duration-500 uppercase group ${
            !dicomUploaded ? 'bg-gray-900 border border-gray-800 text-gray-600 cursor-not-allowed' :
            isExecuting ? 'bg-cyan-950/50 border border-cyan-800 text-cyan-400 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600/20 to-emerald-600/20 border border-cyan-500/50 text-white hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]'
          }`}
        >
          {dicomUploaded && !isExecuting && (
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          )}

          {isExecuting ? (
             <><div className="w-5 h-5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" /> COMPILING MODEL...</>
          ) : (
             <><Zap className={`w-5 h-5 ${dicomUploaded ? 'text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-gray-600'}`} /> INITIATE INFERENCE</>
          )}
        </button>
      </div>
    </aside>
  );
}
