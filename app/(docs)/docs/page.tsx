import { Metadata } from 'next'
import { DocsHomeContent } from './docs-home-content'

export const metadata: Metadata = {
  title: 'SOP-Guard Pro Documentation',
  description: 'Everything you need to use SOP-Guard Pro confidently.',
}

export default function DocsHomePage() {
  return <DocsHomeContent />
}
