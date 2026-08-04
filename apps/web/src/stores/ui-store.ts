import { createStore } from 'zustand/vanilla';
import { createAgentSlice, type AgentSlice } from './slices/agent-slice';
import { createJobsSlice, type JobsSlice } from './slices/jobs-slice';
import { createShellSlice, type ShellSlice } from './slices/shell-slice';

export type UiStore = ShellSlice & AgentSlice & JobsSlice;

export type UiStoreInit = Partial<
  Pick<UiStore, 'sidebarOpen' | 'isMobile' | 'agentOpen' | 'workspaceThreadId' | 'generationJobs'>
>;

export const createUiStore = (init: UiStoreInit = {}) => {
  return createStore<UiStore>()((...args) => ({
    ...createShellSlice(...args),
    ...createAgentSlice(...args),
    ...createJobsSlice(...args),
    ...init,
  }));
};
