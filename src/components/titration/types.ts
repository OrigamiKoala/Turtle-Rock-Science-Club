import { ReagentDef } from './chem';

export type ModuleTrack = 'basic' | 'deeper';

export interface TitrationTrial {
  id: string;
  moduleId: string;
  sampleId: string;
  analyteName: string;
  analyteFormula: string;
  titrantName: string;
  titrantFormula: string;
  indicatorName: string;
  initialReadingMl: number;
  finalReadingMl: number;
  deliveredVolumeMl: number;
  finalPh: number;
  endpointColorHex: string;
  endpointColorName: string;
  studentCalculatedConc?: number;
  trueConc?: number;
  errorPercent?: number;
  passed?: boolean;
  timestamp: string;
}

export interface PredictOption {
  id: string;
  label: string;
  isCorrect: boolean;
  explanation: string;
}

export interface PredictStepDef {
  question: string;
  context: string;
  options: PredictOption[];
}

export interface ModuleSetup {
  analyte: ReagentDef;
  analyteConc: number; // M (true)
  analyteVolumeMl: number;
  titrant: ReagentDef;
  titrantConc: number; // M
  defaultIndicatorId: string;
  allowedIndicatorIds?: string[];
  autoReadDefault: boolean;
  showProbeDefault: boolean;
  allowProbeToggle: boolean;
  isMystery?: boolean;
  isFreeBench?: boolean;
  allowedUnknownPool?: ('strong_acid' | 'weak_acid' | 'strong_base' | 'weak_base')[];
}

export interface ModuleDef {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Mastery';
  xpReward: number;
  learningGoals: string[];
  setup: ModuleSetup;
  predict: PredictStepDef;
  deeperNotes?: {
    title: string;
    content: string;
    keyEquation?: string;
  };
}

export interface TitrationProgress {
  completedModules: string[];
  solvedUnknownSeeds: number[];
  bestErrorPercent: Record<string, number>;
  trials: TitrationTrial[];
  lastActiveModuleId: string;
  track: ModuleTrack;
}

export interface CurvePoint {
  volumeMl: number;
  pH: number;
  timestamp: number;
}
