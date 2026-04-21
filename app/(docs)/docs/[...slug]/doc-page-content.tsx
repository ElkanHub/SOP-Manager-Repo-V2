import React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { cn } from '@/lib/utils/cn'

// Internal Client Component to handle heading extraction without breaking SSR
import { TableOfHeaders } from './table-of-headers' 
import { Breadcrumbs } from '@/components/docs/Breadcrumbs'

// MDX Components
import remarkGfm from 'remark-gfm'
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
      className="text-[26px] md:text-[28px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-navy to-brand-blue dark:from-brand-teal dark:to-brand-blue mt-14 mb-6 pb-4 border-b border-border/50 tracking-tight leading-tight"
      {...props} 
    />
  ),
  h3: (props: any) => (
    <h3 
      id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} 
      className="text-[20px] font-bold text-foreground/90 mt-10 mb-4 tracking-tight" 
      {...props} 
    />
  ),
  h4: (props: any) => (
    <h4 
      id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} 
      className="text-[16px] font-bold text-foreground/80 mt-8 mb-3 uppercase tracking-wider" 
      {...props} 
    />
  ),
  p: (props: any) => <p className="text-[16px] text-muted-foreground leading-[1.85] mb-6 font-sans font-medium" {...props} />,
  a: (props: any) => {
    const isInternal = props.href?.startsWith('/') || props.href?.startsWith('./') || props.href?.startsWith('../')
    if (isInternal) {
      return (
        <Link 
          className="text-brand-teal font-semibold decoration-brand-teal/30 underline-offset-4 hover:underline hover:decoration-brand-teal transition-all" 
          {...props} 
        />
      )
    }
    return (
      <a 
        className="text-brand-blue font-semibold decoration-brand-blue/30 underline-offset-4 hover:underline hover:decoration-brand-blue transition-all" 
        target="_blank" 
        rel="noopener noreferrer" 
        {...props} 
      />
    )
  },
  ul: (props: any) => <ul className="text-[16px] text-muted-foreground leading-[1.8] mb-6 list-none pl-2 space-y-3 font-medium" {...props} />,
  ol: (props: any) => <ol className="text-[16px] text-muted-foreground leading-[1.8] mb-6 list-decimal pl-6 space-y-3 font-medium marker:text-brand-navy dark:marker:text-brand-teal marker:font-bold" {...props} />,
  li: (props: any) => (
    <li className="relative pl-6" {...props}>
      {/* Target un-ordered lists by seeing if their parent is a ul (this is a simple hack via CSS below, but we can just let tailwind handle it if we scope the marker). Instead, we'll use a custom before: pseudo element if it's inside UL. */}
      <span className="absolute left-0 top-2.5 w-2 h-2 bg-gradient-to-br from-brand-teal to-brand-blue rounded-full shadow-sm" />
      {props.children}
    </li>
  ),
  strong: (props: any) => <strong className="font-bold text-foreground" {...props} />,
  code: (props: any) => (
    <code className="bg-muted px-1.5 py-0.5 rounded-lg text-[0.85em] font-mono font-medium text-brand-navy dark:text-brand-teal border border-border/80 shadow-sm" {...props} />
  ),
  pre: (props: any) => (
    <pre className="bg-brand-navy text-slate-100 rounded-2xl p-6 overflow-x-auto text-[13px] mb-8 shadow-soft border border-slate-800/50" {...props} />
  ),
  table: (props: any) => (
    <div className="overflow-x-auto mb-8 rounded-2xl border border-border shadow-sm bg-card w-full">
      <table className="w-full min-w-[600px] border-collapse table-auto" {...props} />
    </div>
  ),
  thead: (props: any) => (
    <thead {...props} />
  ),
  tbody: (props: any) => (
    <tbody className="divide-y divide-border/40" {...props} />
  ),
  tr: (props: any) => (
    <tr className="even:bg-muted/20" {...props} />
  ),
  th: (props: any) => (
    <th className="bg-muted/50 px-5 py-3 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border whitespace-nowrap" {...props} />
  ),
  td: (props: any) => (
    <td className="px-5 py-3.5 text-[14px] text-muted-foreground leading-relaxed" {...props} />
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
    employee: 'bg-muted text-muted-foreground border-border',
    manager: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20',
    qa: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20',
    admin: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/20',
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
        <MDXRemote 
          source={content} 
          components={components} 
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
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