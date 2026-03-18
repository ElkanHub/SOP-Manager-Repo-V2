import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { DocPageContent } from './doc-page-content'

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
}

interface DocFrontmatter {
  title: string
  description: string
  section: string
  order: number
  role?: string
}

interface DocPageProps {
  params: Promise<{ slug: string[] }>
}

export async function generateStaticParams() {
  const docsDir = path.join(process.cwd(), 'content', 'docs')
  const params: { slug: string[] }[] = []
  
  if (!fs.existsSync(docsDir)) return params
  
  const sections = fs.readdirSync(docsDir)
  
  for (const section of sections) {
    const sectionDir = path.join(docsDir, section)
    if (!fs.statSync(sectionDir).isDirectory()) continue
    
    const files = fs.readdirSync(sectionDir)
    for (const file of files) {
      if (file.endsWith('.mdx')) {
        params.push({ slug: [section, file.replace('.mdx', '')] })
      }
    }
  }
  
  return params
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { slug } = await params
  const docPath = path.join(process.cwd(), 'content', 'docs', slug[0], `${slug[1]}.mdx`)
  
  if (!fs.existsSync(docPath)) {
    return { title: 'Not Found' }
  }
  
  const fileContents = fs.readFileSync(docPath, 'utf8')
  const parsed = matter(fileContents) as unknown as { data: DocFrontmatter }
  const data = parsed.data
  
  return {
    title: `${data.title} - SOP-Guard Pro Documentation`,
    description: data.description,
  }
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params
  const docPath = path.join(process.cwd(), 'content', 'docs', slug[0], `${slug[1]}.mdx`)
  
  if (!fs.existsSync(docPath)) {
    notFound()
  }
  
  const fileContents = fs.readFileSync(docPath, 'utf8')
  const parsed = matter(fileContents) as unknown as { data: DocFrontmatter; content: string }
  const data = parsed.data
  const content = parsed.content
  
  return <DocPageContent frontmatter={data} content={content} />
}
