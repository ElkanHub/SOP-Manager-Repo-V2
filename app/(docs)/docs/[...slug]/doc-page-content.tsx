import React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { cn } from '@/lib/utils/cn'

// Internal Client Component to handle heading extraction without breaking SSR
import { TableOfHeaders } from './table-of-headers' 

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
  h2: (props: any) => <h2 id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} className="text-xl font-semibold text-slate-800 mt-10 mb-3 pb-2 border-b border-slate-200" {...props} />,
  h3: (props: any) => <h3 id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} className="text-base font-semibold text-slate-700 mt-6 mb-2" {...props} />,
  p: (props: any) => <p className="text-[15px] text-slate-700 leading-[1.75] mb-4" {...props} />,
  a: (props: any) => <a className="text-[#1A5EA8] hover:underline" {...props} />,
  ul: (props: any) => <ul className="text-[15px] text-slate-700 leading-[1.75] mb-4 list-disc list-inside" {...props} />,
  ol: (props: any) => <ol className="text-[15px] text-slate-700 leading-[1.75] mb-4 list-decimal list-inside" {...props} />,
  li: (props: any) => <li className="mb-1" {...props} />,
  strong: (props: any) => <strong className="font-medium text-slate-900" {...props} />,
  code: (props: any) => <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props} />,
  pre: (props: any) => <pre className="bg-slate-900 text-slate-100 rounded-xl p-5 overflow-x-auto text-[13px] mb-4" {...props} />,
  table: (props: any) => <div className="overflow-x-auto mb-4"><table className="w-full border-collapse" {...props} /></div>,
  th: (props: any) => <th className="border border-slate-200 bg-slate-50 px-4 py-2 text-left text-sm font-medium text-slate-700" {...props} />,
  td: (props: any) => <td className="border border-slate-200 px-4 py-2 text-sm text-slate-700" {...props} />,
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
    employee: 'bg-slate-100 text-slate-700',
    manager: 'bg-blue-50 text-blue-700',
    qa: 'bg-indigo-50 text-indigo-700',
    admin: 'bg-purple-50 text-purple-700',
  }

  return (
    <article className="prose prose-slate max-w-none">
      {/* This invisible component handles the DOM side-effects for your TOC */}
      <TableOfHeaders content={content} />

      {/* Page Header */}
      {frontmatter.role && frontmatter.role !== 'all' && (
        <span className={cn(
          'text-12 px-3 py-1 rounded-full font-medium inline-block mb-3',
          roleBadgeColors[frontmatter.role] || roleBadgeColors.employee
        )}>
          {frontmatter.role.charAt(0).toUpperCase() + frontmatter.role.slice(1)}
        </span>
      )}
      
      <h1 className="font-[var(--font-dm-sans)] text-[30px] font-medium text-slate-900 leading-tight mb-2">
        {frontmatter.title}
      </h1>
      <p className="text-16 text-slate-500 mt-2 mb-8 pb-8 border-b border-slate-200">
        {frontmatter.description}
      </p>

      {/* MDX Content */}
      <div className="prose">
        <MDXRemote source={content} components={components} />
      </div>

      {/* Page Footer */}
      <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-center">
        <Link href="/docs" className="text-13 text-[#1A5EA8] hover:underline flex items-center">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to docs
        </Link>
      </div>
    </article>
  )
}