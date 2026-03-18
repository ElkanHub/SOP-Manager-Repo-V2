import React from 'react'
import { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import '@/app/globals.css'
import { DocsShell } from './docs-shell'

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
})

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-mono',
})

export const metadata: Metadata = {
  title: 'SOP-Guard Pro Documentation',
  description: 'The complete guide to using SOP-Guard Pro.',
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${dmSans.variable} ${dmMono.variable} font-sans min-h-screen bg-white`}>
      <DocsShell>{children}</DocsShell>
    </div>
  )
}
