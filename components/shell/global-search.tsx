"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Loader2, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils/cn"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useSopTabStore } from "@/store/sop-tabs"
import { DeptBadge } from "@/components/ui/dept-badge"

interface SearchResult {
  id: string
  sop_number: string
  title: string
  department: string
  departments?: { colour: string }
}

export function GlobalSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const { addTab } = useSopTabStore()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const searchSops = async () => {
      if (query.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("sops")
          .select("id, sop_number, title, department, departments(colour)")
          .eq("status", "active")
          .or(`title.ilike.%${query}%,sop_number.ilike.%${query}%`)
          .limit(20)

        if (error) throw error
        const formatted = (data || []).map((d: any) => ({
          ...d,
          departments: Array.isArray(d.departments) ? d.departments[0] : d.departments,
        }))
        setResults(formatted)
        setSelectedIndex(0)
      } catch (err) {
        console.error("Search error:", err)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(searchSops, 300)
    return () => clearTimeout(debounce)
  }, [query, supabase])

  const handleSelect = (result: SearchResult) => {
    addTab({
      id: result.id,
      sopNumber: result.sop_number,
      title: result.title,
    })
    router.push(`/library/${result.id}`)
    setIsOpen(false)
    setQuery("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/50" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search SOPs..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-9 w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30 focus-visible:border-white/40 pl-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-white/50 animate-spin" />
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[400px] overflow-y-auto z-50"
        >
          {results.length === 0 && !isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              No SOPs found
            </div>
          ) : (
            <>
              <div className="sticky top-0 px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                Cross-department search
              </div>
              {results.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50",
                    index === selectedIndex && "bg-slate-50"
                  )}
                >
                  <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="font-mono text-xs text-slate-500 w-24 truncate">
                    {result.sop_number}
                  </span>
                  <span className="text-sm text-slate-800 flex-1 truncate">
                    {result.title}
                  </span>
                  <DeptBadge
                    department={result.department}
                    colour={result.departments?.colour}
                    size="sm"
                  />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
