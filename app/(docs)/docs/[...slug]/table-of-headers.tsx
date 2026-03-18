"use client"
import { useEffect } from 'react'

export function TableOfHeaders({ content }: { content: string }) {
  useEffect(() => {
    const headingElements = document.querySelectorAll('.prose h2, .prose h3')
    const extractedHeadings = Array.from(headingElements).map((el) => ({
      id: el.id || el.textContent?.toLowerCase().replace(/\s+/g, '-') || '',
      text: el.textContent || '',
      level: el.tagName === 'H2' ? 2 : 3,
    }))
    
    // If you have a global state or store for TOC, update it here.
    // Example: window.dispatchEvent(new CustomEvent('headings-updated', { detail: extractedHeadings }))
    console.log("Headings Sync:", extractedHeadings)
  }, [content])

  return null
}