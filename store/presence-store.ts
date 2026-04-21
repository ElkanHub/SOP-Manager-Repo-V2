import { create } from "zustand"

interface OnlineUser {
  user_id: string
  department: string | null
}

interface PresenceStore {
  /** true once we've received the first sync from the presence channel */
  synced: boolean
  onlineUsers: OnlineUser[]
  setOnlineUsers: (users: OnlineUser[]) => void
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  synced: false,
  onlineUsers: [],
  setOnlineUsers: (users) => set({ synced: true, onlineUsers: users }),
}))
