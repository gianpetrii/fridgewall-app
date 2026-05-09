import { create } from 'zustand';
import { createGroup, joinGroupByCode, getUserGroups } from '@/lib/groups';
import type { Group } from '@/types';

interface GroupsStore {
  groups: Group[];
  activeGroupId: string | null;
  isLoading: boolean;
  fetchGroups: (userId: string) => Promise<void>;
  createGroup: (name: string, userId: string) => Promise<Group>;
  joinGroup: (code: string, userId: string) => Promise<Group>;
  setActiveGroup: (groupId: string) => void;
}

export const useGroupsStore = create<GroupsStore>((set, get) => ({
  groups: [],
  activeGroupId: null,
  isLoading: false,

  fetchGroups: async (userId) => {
    set({ isLoading: true });
    try {
      const groups = await getUserGroups(userId);
      set({
        groups,
        activeGroupId: get().activeGroupId ?? groups[0]?.id ?? null,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  createGroup: async (name, userId) => {
    set({ isLoading: true });
    try {
      const group = await createGroup(name, userId);
      set((state) => ({
        groups: [group, ...state.groups],
        activeGroupId: state.activeGroupId ?? group.id,
      }));
      return group;
    } finally {
      set({ isLoading: false });
    }
  },

  joinGroup: async (code, userId) => {
    set({ isLoading: true });
    try {
      const group = await joinGroupByCode(code, userId);
      set((state) => {
        const exists = state.groups.some((g) => g.id === group.id);
        return {
          groups: exists ? state.groups : [group, ...state.groups],
          activeGroupId: state.activeGroupId ?? group.id,
        };
      });
      return group;
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),
}));
