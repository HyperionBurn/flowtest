import { create } from 'zustand';

type ViewMode = 'ffr' | 'velocity' | 'pressure';
type AppPhase = 'input' | 'simulation';

interface AppState {
  activePhase: 'input' | 'simulation';
  dicomUploaded: boolean;
  dicomImageUrl: string | null;
  dicomFile: File | null;
  
  // Patient / AHA PREVENT Data
  patientId: string;
  age: number;
  sex: 'M' | 'F';
  bp: number;
  totalCholesterol: number;
  hdl: number;
  isSmoker: boolean;
  hasDiabetes: boolean;

  // Simulation Controls
  severity: number;
  velocity: number;
  mode: 'ffr' | 'velocity' | 'pressure';
  isExecuting: boolean;
  pipelineProgress: number;
  pipelineStatus: string;
  
  // Backend Results
  backendResults: any | null;
  
  // Actions
  setPhase: (phase: 'input' | 'simulation') => void;
  setDicomUploaded: (val: boolean) => void;
  setDicomImageUrl: (val: string | null) => void;
  setDicomFile: (val: File | null) => void;
  setPatientId: (val: string) => void;
  setAge: (val: number) => void;
  setSex: (val: 'M' | 'F') => void;
  setBp: (bp: number) => void;
  setTotalCholesterol: (val: number) => void;
  setHdl: (val: number) => void;
  setIsSmoker: (val: boolean) => void;
  setHasDiabetes: (val: boolean) => void;

  setSeverity: (severity: number) => void;
  setVelocity: (velocity: number) => void;
  setMode: (mode: 'ffr' | 'velocity' | 'pressure') => void;
  
  startExecution: () => void;
  updateExecutionProgress: (progress: number, msg: string) => void;
  finishExecution: (results: any) => void;
  resetExecution: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePhase: 'input',
  dicomUploaded: false,
  dicomImageUrl: null,
  dicomFile: null,
  
  patientId: 'CAD-9842-PREVENT',
  age: 62,
  sex: 'M',
  bp: 135,
  totalCholesterol: 210,
  hdl: 45,
  isSmoker: false,
  hasDiabetes: false,

  severity: 55,
  velocity: 0.25,
  mode: 'ffr',
  isExecuting: false,
  pipelineProgress: 0,
  pipelineStatus: 'Initializing Tensor Cores...',
  backendResults: null,

  setPhase: (activePhase) => set({ activePhase }),
  setDicomUploaded: (dicomUploaded) => set({ dicomUploaded }),
  setDicomImageUrl: (dicomImageUrl) => set({ dicomImageUrl }),
  setDicomFile: (dicomFile) => set({ dicomFile }),
  setPatientId: (patientId) => set({ patientId }),
  setAge: (age) => set({ age }),
  setSex: (sex) => set({ sex }),
  setBp: (bp) => set({ bp }),
  setTotalCholesterol: (totalCholesterol) => set({ totalCholesterol }),
  setHdl: (hdl) => set({ hdl }),
  setIsSmoker: (isSmoker) => set({ isSmoker }),
  setHasDiabetes: (hasDiabetes) => set({ hasDiabetes }),

  setSeverity: (severity) => set({ severity }),
  setVelocity: (velocity) => set({ velocity }),
  setMode: (mode) => set({ mode }),

  startExecution: () => {
    set({ isExecuting: true, pipelineProgress: 0, pipelineStatus: 'Uploading DICOM to FastAPI Engine...' });
  },
  
  updateExecutionProgress: (pipelineProgress, pipelineStatus) => {
    set({ pipelineProgress, pipelineStatus });
  },

  finishExecution: (results) => {
    set({ isExecuting: false, activePhase: 'simulation', backendResults: results, pipelineProgress: 100 });
  },

  resetExecution: () => set({ isExecuting: false, pipelineProgress: 0, activePhase: 'input', dicomUploaded: false, dicomFile: null, backendResults: null })
}));
