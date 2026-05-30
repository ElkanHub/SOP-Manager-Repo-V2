import { Metadata } from 'next'
import { DocsHomeContent } from './docs-home-content'

export const metadata: Metadata = {
  title: 'QMS-MANAJA Documentation',
  description: 'Everything you need to use QMS-MANAJA confidently.',
}

export default function DocsHomePage() {
  return <DocsHomeContent />
}
