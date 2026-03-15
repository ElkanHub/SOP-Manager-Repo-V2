import { create } from "zustand"

export interface SopTab {
  id: string
  sopNumber: string
  title: string
}

interface SopTabStore {
  tabs: SopTab[]
  activeTabId: string | null
  addTab: (tab: SopTab) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
}

const MAX_TABS = 8

export const useSopTabStore = create<SopTabStore>((set) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tab) =>
    set((state) => {
      const existingTab = state.tabs.find((t) => t.id === tab.id)
      if (existingTab) {
        return { activeTabId: tab.id }
      }

      let newTabs = [...state.tabs, tab]
      if (newTabs.length > MAX_TABS) {
        const oldestTab = newTabs[0]
        newTabs = newTabs.slice(1)
        if (state.activeTabId === oldestTab.id) {
          return { tabs: newTabs, activeTabId: tab.id }
        }
      }

      return { tabs: newTabs, activeTabId: tab.id }
    }),

  removeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id)
      let newActiveId = state.activeTabId

      if (state.activeTabId === id) {
        const index = state.tabs.findIndex((t) => t.id === id)
        if (newTabs.length > 0) {
          newActiveId = newTabs[Math.min(index, newTabs.length - 1)]?.id || null
        } else {
          newActiveId = null
        }
      }

      return { tabs: newTabs, activeTabId: newActiveId }
    }),

  setActiveTab: (id) => set({ activeTabId: id }),
}))
