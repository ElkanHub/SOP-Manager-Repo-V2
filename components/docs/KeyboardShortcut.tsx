"use client"
import React, { useEffect, useState } from 'react'

interface KeyboardShortcutProps {
  keys: string[]
}

const keyMap: Record<string, string> = {
  Cmd: '⌘',
  Ctrl: 'Ctrl',
  Shift: '⇧',
  Enter: '↵',
  Escape: 'Esc'
}

export function KeyboardShortcut({ keys }: KeyboardShortcutProps) {
  const [platform, setPlatform] = useState<string>('')

  useEffect(() => {
    setPlatform(navigator.platform.toLowerCase())
  }, [])

  return (
    <span className="inline-flex items-center mx-1">
      {Array.isArray(keys) && keys.map((key, index) => {
        let displayOne = key
        if (key === 'Cmd') {
          displayOne = platform.includes('mac') ? (keyMap[key] || '⌘') : 'Ctrl'
        } else if (keyMap[key]) {
          displayOne = keyMap[key]
        }

        return (
          <React.Fragment key={key + index}>
            <kbd className="bg-muted border border-border/50 rounded px-1.5 py-0.5 text-[10px] font-mono text-foreground shadow-sm inline-block">
              {displayOne}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-muted-foreground/40 text-[10px] mx-1">+</span>
            )}
          </React.Fragment>
        )
      })}
    </span>
  )
}
