import { create } from 'zustand';
import type { ActionSequence, ExecutionRecord, ForgeAction, RunnerStatus, SavedAutomation } from '../types/actions';

interface AppState {
  taskDescription: string;
  currentSequence: ActionSequence | null;
  isPlanning: boolean;
  planningError: string | null;
  runnerStatus: RunnerStatus;
  currentExecutionId: string | null;
  library: SavedAutomation[];
  history: ExecutionRecord[];
  activeTab: 'create' | 'library' | 'history';

  setTaskDescription: (text: string) => void;
  setCurrentSequence: (seq: ActionSequence | null) => void;
  setIsPlanning: (v: boolean) => void;
  setPlanningError: (err: string | null) => void;
  setRunnerStatus: (status: RunnerStatus) => void;
  setCurrentExecutionId: (id: string | null) => void;
  updateAction: (index: number, action: ForgeAction) => void;
  setLibrary: (items: SavedAutomation[]) => void;
  setHistory: (items: ExecutionRecord[]) => void;
  setActiveTab: (tab: 'create' | 'library' | 'history') => void;
}

export const useAppStore = create<AppState>((set) => ({
  taskDescription: '',
  currentSequence: null,
  isPlanning: false,
  planningError: null,
  runnerStatus: { connected: false, executing: false },
  currentExecutionId: null,
  library: [],
  history: [],
  activeTab: 'create',

  setTaskDescription: (text) => set({ taskDescription: text }),
  setCurrentSequence: (seq) => set({ currentSequence: seq }),
  setIsPlanning: (v) => set({ isPlanning: v }),
  setPlanningError: (err) => set({ planningError: err }),
  setRunnerStatus: (status) => set({ runnerStatus: status }),
  setCurrentExecutionId: (id) => set({ currentExecutionId: id }),
  updateAction: (index, action) =>
    set((state) => {
      if (!state.currentSequence) return state;
      const actions = [...state.currentSequence.actions];
      actions[index] = action;
      return { currentSequence: { ...state.currentSequence, actions } };
    }),
  setLibrary: (items) => set({ library: items }),
  setHistory: (items) => set({ history: items }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));