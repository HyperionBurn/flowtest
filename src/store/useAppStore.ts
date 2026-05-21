import { create } from 'zustand';

type ViewMode = 'ffr' | 'velocity' | 'pressure';
type AppPhase = 'input' | 'simulation';

interface AppState {
  activePhase: AppPhase;
  dicomUploaded: boolean;
  dicomImageUrl: string | null;
  
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
  mode: ViewMode;
  isExecuting: boolean;
  pipelineProgress: number;
  pipelineStatus: string;
  
  // Actions
  setPhase: (phase: AppPhase) => void;
  setDicomUploaded: (val: boolean) => void;
  setDicomImageUrl: (val: string | null) => void;
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
  setMode: (mode: ViewMode) => void;
  
  startExecution: () => void;
  resetExecution: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePhase: 'input',
  dicomUploaded: false,
  dicomImageUrl: null,
  
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

  setPhase: (activePhase) => set({ activePhase }),
  setDicomUploaded: (dicomUploaded) => set({ dicomUploaded }),
  setDicomImageUrl: (dicomImageUrl) => set({ dicomImageUrl }),
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
    set({ isExecuting: true, pipelineProgress: 0, pipelineStatus: 'Initializing Tensor Cores...' });
    
    const stages = [
      { p: 25, msg: "Ingesting Multimodal Patient CCTA DICOM Clusters..." },
      { p: 50, msg: "Running Convolutional Attention U-Net Segmentation Sub-layers..." },
      { p: 75, msg: "Compiling Continuous Mesh-Free Point Clouds (Ω Domains)..." },
      { p: 100, msg: "Evaluating Navier-Stokes Loss Minimization via Graph Autodiff..." }
    ];

    let currentStage = 0;
    
    const runNextStage = () => {
      if (currentStage >= stages.length) {
        setTimeout(() => {
          set({ isExecuting: false, activePhase: 'simulation' });
        }, 600);
        return;
      }
      const stage = stages[currentStage];
      set({ pipelineProgress: stage.p, pipelineStatus: stage.msg });
      currentStage++;
      setTimeout(runNextStage, 600);
    };

    setTimeout(runNextStage, 400);
  },

  resetExecution: () => set({ isExecuting: false, pipelineProgress: 0, activePhase: 'input', dicomUploaded: false })
}));
