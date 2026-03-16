import { create } from 'zustand'

interface ReportFilters {
  dateFrom: string | null
  dateTo: string | null
  setDateRange: (from: string | null, to: string | null) => void
  clearFilters: () => void
}

export const useReportStore = create<ReportFilters>((set) => ({
  dateFrom: null,
  dateTo: null,
  setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo }),
  clearFilters: () => set({ dateFrom: null, dateTo: null }),
}))
