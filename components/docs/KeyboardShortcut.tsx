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
      {keys.map((key, index) => {
        let displayKey = key
        if (key === 'Cmd' && !platform.includes('mac')) {
          displayKey = 'Ctrl'
        } else if (keyMap[key]) {
          displayKey = keyMap[key]
        }

        return (
          <React.Fragment key={key}>
            <kbd className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-11 font-mono text-slate-700 shadow-[0_1px_0_rgba(0,0,0,0.2)] inline-block">
              {displayKey}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-slate-400 text-11 mx-1">+</span>
            )}
          </React.Fragment>
        )
      })}
    </span>
  )
}
