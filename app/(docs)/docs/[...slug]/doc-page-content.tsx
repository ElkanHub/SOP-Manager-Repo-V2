import React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { cn } from '@/lib/utils/cn'

// Internal Client Component to handle heading extraction without breaking SSR
import { TableOfHeaders } from './table-of-headers' 
import { Breadcrumbs } from '@/components/docs/Breadcrumbs'

// MDX Components
import { Callout, RoleBadge, RoleAccess, StepList, Step, KeyboardShortcut, StatusBadge, ScreenCaption, QuickNav, PermissionsTable } from '@/components/docs'

const components = {
  Callout,
  RoleBadge,
  RoleAccess,
  StepList,
  Step,
  KeyboardShortcut,
  StatusBadge,
  ScreenCaption,
  QuickNav,
  PermissionsTable,
  h2: (props: any) => (
    <h2 
      id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} 
      className="text-22 font-bold text-foreground mt-12 mb-5 pb-3 border-b border-border/60 tracking-tight leading-tight" 
      {...props} 
    />
  ),
  h3: (props: any) => (
    <h3 
      id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} 
      className="text-18 font-bold text-foreground/90 mt-8 mb-3 tracking-tight" 
      {...props} 
    />
  ),
  p: (props: any) => <p className="text-[16px] text-muted-foreground leading-[1.8] mb-6 font-sans" {...props} />,
  a: (props: any) => {
    const isInternal = props.href?.startsWith('/') || props.href?.startsWith('./') || props.href?.startsWith('../')
    if (isInternal) {
      return (
        <Link 
          className="text-brand-blue font-medium decoration-brand-blue/30 underline-offset-4 hover:underline hover:decoration-brand-blue" 
          {...props} 
        />
      )
    }
    return (
      <a 
        className="text-brand-blue font-medium decoration-brand-blue/30 underline-offset-4 hover:underline hover:decoration-brand-blue" 
        target="_blank" 
        rel="noopener noreferrer" 
        {...props} 
      />
    )
  },
  ul: (props: any) => <ul className="text-[16px] text-muted-foreground leading-[1.8] mb-6 list-disc pl-5 space-y-2" {...props} />,
  ol: (props: any) => <ol className="text-[16px] text-muted-foreground leading-[1.8] mb-6 list-decimal pl-5 space-y-2" {...props} />,
  li: (props: any) => <li className="pl-1" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-foreground" {...props} />,
  code: (props: any) => (
    <code className="bg-muted/80 text-foreground px-1.5 py-0.5 rounded-md text-[0.9em] font-mono border border-border/50" {...props} />
  ),
  pre: (props: any) => (
    <pre className="bg-brand-navy text-slate-100 rounded-2xl p-6 overflow-x-auto text-[13px] mb-8 shadow-soft border border-slate-800/50" {...props} />
  ),
  table: (props: any) => (
    <div className="overflow-x-auto mb-8 rounded-2xl border border-border shadow-sm bg-card">
      <table className="w-full border-collapse" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th className="bg-muted/50 px-4 py-3 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border" {...props} />
  ),
  td: (props: any) => (
    <td className="px-4 py-3.5 text-[14px] text-muted-foreground border-b border-border/40 last:border-0" {...props} />
  ),
}

interface DocPageContentProps {
  frontmatter: {
    title: string
    description: string
    section: string
    order: number
    role?: string
  }
  content: string
}

export async function DocPageContent({ frontmatter, content }: DocPageContentProps) {
  const roleBadgeColors: Record<string, string> = {
    employee: 'bg-slate-100 text-slate-600 border-slate-200',
    manager: 'bg-blue-50 text-blue-700 border-blue-100',
    qa: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    admin: 'bg-purple-50 text-purple-700 border-purple-100',
  }

  return (
    <article className="max-w-none font-sans">
      {/* This invisible component handles the DOM side-effects for your TOC */}
      <TableOfHeaders content={content} />

      {/* Breadcrumbs */}
      <Breadcrumbs section={frontmatter.section} title={frontmatter.title} />

      {/* Page Header */}
      <div className="mb-12">
        {frontmatter.role && frontmatter.role !== 'all' && (
          <span className={cn(
            'text-[10px] px-2.5 py-1 rounded-lg font-bold inline-block mb-4 uppercase tracking-widest border shadow-sm',
            roleBadgeColors[frontmatter.role] || roleBadgeColors.employee
          )}>
            Permission Level: {frontmatter.role}
          </span>
        )}
        
        <h1 className="text-[36px] md:text-[44px] font-bold text-foreground tracking-tight leading-[1.15] mb-6">
          {frontmatter.title}
        </h1>
        <p className="text-18 md:text-20 text-muted-foreground leading-relaxed max-w-2xl font-medium">
          {frontmatter.description}
        </p>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-border/60 via-border/40 to-transparent mb-12" />

      {/* MDX Content */}
      <div className="prose-slate max-w-none">
        <MDXRemote source={content} components={components} />
      </div>

      {/* Page Footer */}
      <div className="mt-20 pt-10 border-t border-border flex justify-between items-center group">
        <Link 
          href="/docs" 
          className="text-14 font-semibold text-brand-blue hover:text-foreground flex items-center transition-all group-hover:-translate-x-1"
        >
          <ChevronLeft className="h-4 w-4 mr-2" /> 
          <span>Return to Documentation Library</span>
        </Link>
      </div>
    </article>
  )
}