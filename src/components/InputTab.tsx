import React, { useCallback, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { UploadCloud, FileType, CheckCircle, Zap } from 'lucide-react';

export default function InputTab() {
  const { 
    age, setAge, sex, setSex, bp, setBp,
    totalCholesterol, setTotalCholesterol, hdl, setHdl,
    isSmoker, setIsSmoker, hasDiabetes, setHasDiabetes,
    dicomUploaded, setDicomUploaded,
    startExecution, isExecuting
  } = useAppStore();

  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    simulateUpload();
  };

  const simulateUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setDicomUploaded(true);
    }, 1500);
  };

  return (
    <div className="flex-1 flex overflow-y-auto bg-canvas-light">
      <div className="max-w-5xl mx-auto w-full p-8 py-12 flex gap-12">
        
        {/* Left Col: CT Upload */}
        <div className="flex-1 flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-extrabold text-text-primary">Medical Imaging Input</h2>
            <p className="text-text-secondary mt-2 text-sm">Upload a Cardiac CT scan to generate the 3D computational fluid dynamics mesh.</p>
          </div>

          <div 
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all duration-300 relative overflow-hidden ${
              dicomUploaded ? 'border-accent-emerald bg-accent-emerald/5' : 
              dragActive ? 'border-accent-blue bg-accent-blue/5 scale-[1.02]' : 'border-border-light bg-white hover:border-accent-blue/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {dicomUploaded ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <CheckCircle className="w-16 h-16 text-accent-emerald mb-4" />
                <h3 className="text-lg font-bold text-text-primary">Scan Processed Successfully</h3>
                <p className="text-sm text-text-secondary mt-1">Ready for Modulus Inference</p>
                <button onClick={() => setDicomUploaded(false)} className="mt-4 text-xs font-semibold text-accent-blue hover:underline">Upload a different scan</button>
              </div>
            ) : uploading ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-border-light border-t-accent-blue rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-bold text-text-primary">Extracting DICOM slices...</h3>
              </div>
            ) : (
              <>
                <UploadCloud className={`w-16 h-16 mb-4 transition-colors ${dragActive ? 'text-accent-blue' : 'text-gray-300'}`} />
                <h3 className="text-lg font-bold text-text-primary">Drag & Drop CCTA Scan</h3>
                <p className="text-sm text-text-secondary mt-1 mb-6">Supports .dcm folders or .zip archives (Max 2GB)</p>
                <label className="bg-white border border-border-light shadow-sm text-text-primary font-semibold px-6 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  Browse Files
                  <input type="file" className="hidden" onChange={simulateUpload} />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Right Col: AHA PREVENT Form */}
        <div className="w-96 flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-extrabold text-text-primary">AHA PREVENT Framework</h2>
            <p className="text-text-secondary mt-2 text-sm">Clinical parameters for 10-Yr MACE risk calibration.</p>
          </div>

          <div className="bg-white border border-border-light rounded-xl p-6 shadow-sm space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Age</label>
                <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full bg-canvas-light border border-border-light rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Sex</label>
                <select value={sex} onChange={(e) => setSex(e.target.value as 'M'|'F')} className="w-full bg-canvas-light border border-border-light rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all">
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Systolic BP (mmHg)</label>
              <input type="number" value={bp} onChange={(e) => setBp(Number(e.target.value))} className="w-full bg-canvas-light border border-border-light rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Total Chol.</label>
                <input type="number" value={totalCholesterol} onChange={(e) => setTotalCholesterol(Number(e.target.value))} className="w-full bg-canvas-light border border-border-light rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">HDL</label>
                <input type="number" value={hdl} onChange={(e) => setHdl(Number(e.target.value))} className="w-full bg-canvas-light border border-border-light rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasDiabetes} onChange={(e) => setHasDiabetes(e.target.checked)} className="w-4 h-4 text-accent-blue border-gray-300 rounded focus:ring-accent-blue" />
                <span className="text-sm font-medium text-text-primary">Diabetes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isSmoker} onChange={(e) => setIsSmoker(e.target.checked)} className="w-4 h-4 text-accent-blue border-gray-300 rounded focus:ring-accent-blue" />
                <span className="text-sm font-medium text-text-primary">Smoker</span>
              </label>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <button 
              onClick={startExecution}
              disabled={!dicomUploaded || isExecuting}
              className={`w-full font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all duration-300 ${
                !dicomUploaded ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' :
                isExecuting ? 'bg-accent-blue/50 text-white cursor-not-allowed' : 
                'bg-accent-blue text-white hover:bg-sky-500 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(14,165,233,0.3)]'
              }`}
            >
              {isExecuting ? (
                <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> GENERATING MODEL...</>
              ) : (
                <><FileType className="w-4 h-4" /> GENERATE ADVANCED MODEL</>
              )}
            </button>
            {!dicomUploaded && <p className="text-center text-xs text-text-secondary mt-3">Please upload a CT scan to continue.</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
