import React from 'react'

interface ScreenCaptionProps {
  text: string
}

export function ScreenCaption({ text }: ScreenCaptionProps) {
  return (
    <span className="text-12 text-muted-foreground text-center mt-[-12px] mb-6 italic block">
      {text}
    </span>
  )
}
