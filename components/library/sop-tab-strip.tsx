"use client"

import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSopTabStore } from "@/store/sop-tabs"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils/cn"

export function SopTabStrip() {
  const { tabs, activeTabId, removeTab, setActiveTab, addTab } = useSopTabStore()
  const router = useRouter()

  if (tabs.length === 0) return null

  return (
    <div className="flex items-end gap-1 px-3 py-2 bg-white border border-b-0 border-slate-200 rounded-t-lg">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => {
            setActiveTab(tab.id)
            router.push(`/library/${tab.id}`)
          }}
          className={cn(
            "flex items-center gap-1.5 h-9 px-3 rounded-t-md border border-b-0 cursor-pointer transition-colors max-w-[160px]",
            activeTabId === tab.id
              ? "bg-white border-slate-200 font-semibold text-slate-800"
              : "bg-slate-50/50 border-transparent text-slate-500 hover:bg-slate-100"
          )}
        >
          <span className="font-mono text-[11px] text-slate-400 truncate">
            {tab.sopNumber}
          </span>
          <span className="text-xs truncate">{tab.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeTab(tab.id)
              if (activeTabId === tab.id && tabs.length > 1) {
                const remainingTabs = tabs.filter((t) => t.id !== tab.id)
                const nextTab = remainingTabs[remainingTabs.length - 1]
                router.push(`/library/${nextTab.id}`)
              } else if (tabs.length === 1) {
                router.push("/library")
              }
            }}
            className="ml-1 p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => router.push("/library")}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
