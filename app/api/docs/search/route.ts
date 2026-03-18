import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const DOCS_PATH = path.join(process.cwd(), 'content/docs')

export async function GET() {
  try {
    const documents: any[] = []

    const readDir = (dir: string) => {
      const files = fs.readdirSync(dir)

      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)

        if (stat.isDirectory()) {
          readDir(filePath)
        } else if (file.endsWith('.mdx')) {
          const fileContents = fs.readFileSync(filePath, 'utf8')
          const { data, content } = matter(fileContents)
          
          // Get relative path for slug
          const relativePath = path.relative(DOCS_PATH, filePath)
          const slug = relativePath
            .replace(/\.mdx$/, '')
            .replace(/\\/g, '/') // Windows support
            .split('/')
            .map(part => part.replace(/^\d+-/, '')) // Remove order numbers
            .join('/')

          documents.push({
            title: data.title || '',
            description: data.description || '',
            section: data.section || '',
            role: data.role || 'all',
            slug: slug,
            content: content.replace(/<[^>]*>?/gm, '').slice(0, 10000) // Basic cleanup and limit
          })
        }
      }
    }

    readDir(DOCS_PATH)

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Search API Error:', error)
    return NextResponse.json({ error: 'Failed to index documentation' }, { status: 500 })
  }
}
