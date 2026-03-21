import { create } from 'zustand'

interface MessagesStore {
  activeConversationId: string | null;
  setActive: (id: string | null) => void;
}

export const useMessagesStore = create<MessagesStore>((set) => ({
  activeConversationId: null,
  setActive: (id) => set({ activeConversationId: id }),
}))
