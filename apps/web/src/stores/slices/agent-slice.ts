import type { StateCreator } from 'zustand';
import type { UiStore } from '../ui-store';

export type AgentSlice = {
  agentOpen: boolean;
  workspaceThreadId: string | undefined;
  openAgent: () => void;
  closeAgent: () => void;
  setAgentOpen: (open: boolean) => void;
  setWorkspaceThreadId: (threadId: string | undefined) => void;
};

export const createAgentSlice: StateCreator<UiStore, [], [], AgentSlice> = (set) => ({
  agentOpen: false,
  workspaceThreadId: undefined,
  openAgent: () => set({ agentOpen: true }),
  closeAgent: () => set({ agentOpen: false }),
  setAgentOpen: (open) => set({ agentOpen: open }),
  setWorkspaceThreadId: (threadId) => set({ workspaceThreadId: threadId }),
});
