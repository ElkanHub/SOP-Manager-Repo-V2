"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Search as SearchIcon, Command, X, FileText, ChevronRight } from 'lucide-react'
import FlexSearch from 'flexsearch'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

interface SearchDoc {
  title: string
  description: string
  slug: string
  section: string
  content: string
  role: string
}

interface SearchProps {
  variant?: 'default' | 'large'
}

export function Search({ variant = 'default' }: SearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchDoc[]>([])
  const [docs, setDocs] = useState<SearchDoc[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  
  const searchIndex = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Shortcut ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      if (docs.length === 0) {
        loadDocs()
      }
    }
  }, [isOpen])

  const loadDocs = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/docs/search')
      const data = await res.json()
      setDocs(data)
      
      // Initialize FlexSearch
      const index = new FlexSearch.Index({
        tokenize: 'forward'
      })
      
      data.forEach((doc: SearchDoc, i: number) => {
        // Index title, description and content
        index.add(i, `${doc.title} ${doc.description} ${doc.content}`)
      })
      
      searchIndex.current = index
    } catch (err) {
      console.error('Failed to load search index', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!query || !searchIndex.current) {
      setResults([])
      return
    }

    const searchResults = searchIndex.current.search(query, { limit: 10 })
    const matchedDocs = searchResults.map((idx: number) => docs[idx])
    setResults(matchedDocs)
    setSelectedIndex(0)
  }, [query, docs])

  const handleSelect = (doc: SearchDoc) => {
    router.push(`/docs/${doc.slug}`)
    setIsOpen(false)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex])
    }
  }

  return (
    <div className={cn("relative w-full", variant === 'large' ? "max-w-lg mx-auto" : "max-w-sm")}>
      <button 
        onClick={() => setIsOpen(true)}
        className={cn(
          "w-full flex items-center justify-between transition-all group shadow-sm bg-white border border-slate-200",
          variant === 'large' 
            ? "h-12 px-5 py-3 rounded-xl text-slate-500 text-15 hover:ring-2 hover:ring-[#00C2A8]/30" 
            : "h-9 px-3 py-2 rounded-xl text-slate-400 text-sm hover:border-indigo-300 bg-slate-50/50 hover:bg-white"
        )}
      >
        <div className="flex items-center gap-2">
          <SearchIcon size={variant === 'large' ? 18 : 14} className={cn("transition-colors", variant === 'large' ? "text-slate-400 group-hover:text-[#00C2A8]" : "group-hover:text-indigo-500")} />
          <span className={variant === 'large' ? "text-15" : "text-13"}>
            {variant === 'large' ? "Search the documentation..." : "Search documented features..."}
          </span>
        </div>
        <div className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-400 transition-all",
          variant === 'large' ? "opacity-100" : "hidden md:flex group-hover:border-indigo-200 group-hover:text-indigo-500"
        )}>
          <span className="text-11">⌘</span>K
        </div>
      </button>


      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-[101] border border-slate-200/60 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center gap-4">
              <SearchIcon size={20} className="text-[#1A5EA8]" />
              <input 
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What can we help you find today?"
                className="flex-1 bg-transparent border-none outline-none text-16 text-slate-800 placeholder:text-slate-400 py-2"
              />
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2" ref={resultsRef}>
              {isLoading ? (
                <div className="py-20 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#1A5EA8] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                  <p className="mt-4 text-13 text-slate-500">Indexing the knowledge base...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Documentation Results ({results.length})
                  </div>
                  {results.map((doc, i) => (
                    <button
                      key={doc.slug}
                      onMouseEnter={() => setSelectedIndex(i)}
                      onClick={() => handleSelect(doc)}
                      className={cn(
                        "w-full flex items-start gap-4 p-3.5 rounded-2xl text-left transition-all group",
                        i === selectedIndex ? "bg-indigo-50/80 shadow-soft" : "hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        i === selectedIndex ? "bg-white text-[#1A5EA8] shadow-sm" : "bg-slate-100 text-slate-400"
                      )}>
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn(
                            "text-14 font-bold transition-colors",
                            i === selectedIndex ? "text-[#0D2B55]" : "text-slate-700"
                          )}>
                            {doc.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase tracking-wide">
                            {doc.section.replace('-', ' ')}
                          </span>
                        </div>
                        <p className={cn(
                          "text-13 line-clamp-1 transition-colors",
                          i === selectedIndex ? "text-slate-600" : "text-slate-500"
                        )}>
                          {doc.description || "Learn more about this feature in the documentation."}
                        </p>
                      </div>
                      <ChevronRight size={16} className={cn(
                        "mt-3 transition-all",
                        i === selectedIndex ? "text-[#1A5EA8] translate-x-0" : "text-slate-300 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                      )} />
                    </button>
                  ))}
                </div>
              ) : query ? (
                <div className="py-20 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-slate-50 text-slate-300 mb-4">
                    <SearchIcon size={32} />
                  </div>
                  <h3 className="text-16 font-bold text-slate-900 mb-1">No results matching "{query}"</h3>
                  <p className="text-14 text-slate-500">Try searching for broader terms like "SOP" or "Profile".</p>
                </div>
              ) : (
                <div className="py-12 px-6">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Recommended sections
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Getting Started', 'SOP Library', 'The Pulse', 'Settings'].map(item => (
                      <button 
                        key={item}
                        onClick={() => setQuery(item.toLowerCase())}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:text-[#1A5EA8] transition-all text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-indigo-200 group-hover:text-indigo-500 transition-colors">
                          <ChevronRight size={14} />
                        </div>
                        <span className="text-13 font-semibold">{item}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white shadow-sm font-sans">⏎</kbd>
                  <span>to select</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white shadow-sm font-sans">↑↓</kbd>
                  <span>to navigate</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white shadow-sm font-sans">ESC</kbd>
                <span>to close</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
