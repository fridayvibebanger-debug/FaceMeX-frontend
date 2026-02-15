import { create } from 'zustand';

export interface AvatarCustomization {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  outfit: string;
  accessories: string[];
}

export interface Avatar {
  id: string;
  userId: string;
  customization: AvatarCustomization;
  emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'excited';
  rpmModelUrl?: string;
}

interface AvatarState {
  currentAvatar: Avatar | null;
  setAvatar: (avatar: Avatar) => void;
  updateCustomization: (customization: Partial<AvatarCustomization>) => void;
  setEmotion: (emotion: Avatar['emotion']) => void;
  setRpmModelUrl: (url: string) => void;
}

export const useAvatarStore = create<AvatarState>((set) => ({
  currentAvatar: {
    id: '1',
    userId: '1',
    customization: {
      skinTone: '#f5d5c5',
      hairStyle: 'short',
      hairColor: '#4a3728',
      eyeColor: '#4a90e2',
      outfit: 'casual',
      accessories: [],
    },
    emotion: 'neutral',
  },
  setAvatar: (avatar) => set({ currentAvatar: avatar }),
  updateCustomization: (customization) =>
    set((state) => ({
      currentAvatar: state.currentAvatar
        ? {
            ...state.currentAvatar,
            customization: { ...state.currentAvatar.customization, ...customization },
          }
        : null,
    })),
  setEmotion: (emotion) =>
    set((state) => ({
      currentAvatar: state.currentAvatar ? { ...state.currentAvatar, emotion } : null,
    })),
  setRpmModelUrl: (url) =>
    set((state) => ({
      currentAvatar: state.currentAvatar ? { ...state.currentAvatar, rpmModelUrl: url } : null,
    })),
}));