import { create } from 'zustand';

export interface CurvePoint {
  x: number;
  value: number;
}

export interface PinnTrainingSnapshot {
  epoch: number;
  loss: number;
  pde_loss: number;
  floor_loss: number;
  min_ffr: number;
  ffr_curve: number[];
  pressure_curve: number[];
  velocity_curve: number[];
  residual: number;
}

export interface DicomMetadata {
  patient_id?: string;
  patient_age?: number;
  patient_sex?: string;
  slice_count?: number;
}

export interface PatientClinicalData {
  age: number;
  sex: string;
  bp_systolic: number;
  total_cholesterol: number;
  hdl: number;
  is_smoker: boolean;
  has_diabetes: boolean;
  lesion_severity: number;
  aortic_velocity: number;
}

export interface SimulationResults {
  min_ffr_value: number;
  stenosis_location: number;
  ffr_curve: CurvePoint[];
  velocity_curve: CurvePoint[];
  pressure_curve: CurvePoint[];
  mesh_nodes_calculated: number;
  pinn_residual: number;
  training_history: PinnTrainingSnapshot[] | null;
}

export interface AnalyzeResponse {
  success: boolean;
  results: SimulationResults;
  metadata: DicomMetadata;
  clinical: PatientClinicalData;
  processing_time_sec: number;
  error?: string | null;
}

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
  backendResults: AnalyzeResponse | null;
  pinnHistory: PinnTrainingSnapshot[] | null;
  currentPlaybackEpoch: number;
  isPlaybackPlaying: boolean;
  playbackSpeed: number;

  // Stenting State
  stentApplied: boolean;
  isStentExecuting: boolean;
  postStentResults: AnalyzeResponse | null;
  
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
  
  setPinnHistory: (history: PinnTrainingSnapshot[] | null) => void;
  setCurrentPlaybackEpoch: (epoch: number) => void;
  setIsPlaybackPlaying: (val: boolean) => void;
  setPlaybackSpeed: (val: number) => void;
  
  startExecution: () => void;
  updateExecutionProgress: (progress: number, msg: string) => void;
  setBackendResults: (results: AnalyzeResponse) => void;
  finishExecution: (results: AnalyzeResponse) => void;
  resetExecution: () => void;
  
  setStentApplied: (val: boolean) => void;
  setPostStentResults: (results: AnalyzeResponse | null) => void;
  setIsStentExecuting: (val: boolean) => void;
  triggerStenting: () => Promise<void>;
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
  pinnHistory: null,
  currentPlaybackEpoch: 200,
  isPlaybackPlaying: false,
  playbackSpeed: 50,
  
  stentApplied: false,
  isStentExecuting: false,
  postStentResults: null,

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

  setPinnHistory: (pinnHistory) => set({ pinnHistory }),
  setCurrentPlaybackEpoch: (currentPlaybackEpoch) => set({ currentPlaybackEpoch }),
  setIsPlaybackPlaying: (isPlaybackPlaying) => set({ isPlaybackPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

  setStentApplied: (stentApplied) => set({ stentApplied }),
  setPostStentResults: (postStentResults) => set({ postStentResults }),
  setIsStentExecuting: (isStentExecuting) => set({ isStentExecuting }),
  triggerStenting: async () => {
    const { dicomFile, age, sex, bp, totalCholesterol, hdl, isSmoker, hasDiabetes, velocity } = useAppStore.getState();
    if (!dicomFile) return;

    set({ isStentExecuting: true });
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://highlighted-prev-elected-isolated.trycloudflare.com';
      const formData = new FormData();
      formData.append("file", dicomFile);
      formData.append("patient_age", String(age));
      formData.append("patient_sex", sex);
      formData.append("bp_systolic", String(bp));
      formData.append("total_cholesterol", String(totalCholesterol));
      formData.append("hdl", String(hdl));
      formData.append("is_smoker", String(isSmoker));
      formData.append("has_diabetes", String(hasDiabetes));
      formData.append("lesion_severity", "10"); // stent expands vessel (10% residual stenosis)
      formData.append("aortic_velocity", String(velocity));

      const res = await fetch(`${API_URL}/api/v1/analyze-scan`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error(`Backend error: ${res.status}`);
      const data = await res.json();
      set({ postStentResults: data, stentApplied: true, isStentExecuting: false });
    } catch (err) {
      console.error("Virtual stenting failed:", err);
      set({ isStentExecuting: false });
    }
  },

  startExecution: () => {
    set({ isExecuting: true, pipelineProgress: 0, pipelineStatus: 'Uploading DICOM to FastAPI Engine...' });
  },
  
  updateExecutionProgress: (pipelineProgress, pipelineStatus) => {
    set({ pipelineProgress, pipelineStatus });
  },

  setBackendResults: (results) => {
    const history = results?.results?.training_history || null;
    set({
      backendResults: results,
      pinnHistory: history
    });
  },

  finishExecution: (results) => {
    const history = results?.results?.training_history || null;
    const finalEpoch = history ? history[history.length - 1].epoch : 200;
    set({ 
      isExecuting: false, 
      activePhase: 'simulation', 
      backendResults: results, 
      pinnHistory: history,
      currentPlaybackEpoch: finalEpoch,
      pipelineProgress: 100 
    });
  },

  resetExecution: () => set({ 
    isExecuting: false, 
    pipelineProgress: 0, 
    activePhase: 'input', 
    dicomUploaded: false, 
    dicomFile: null, 
    backendResults: null,
    pinnHistory: null,
    currentPlaybackEpoch: 200,
    isPlaybackPlaying: false,
    stentApplied: false,
    isStentExecuting: false,
    postStentResults: null
  })
}));
