import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const docsDir = 'e:/Projects/sop-manager-v2/content/docs';

function getDocs(dir, section = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let docs = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      docs = docs.concat(getDocs(fullPath, entry.name));
    } else if (entry.name.endsWith('.mdx')) {
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      docs.push({
        slug: `${section}/${entry.name.replace('.mdx', '')}`,
        title: data.title || entry.name.replace('.mdx', ''),
        section: data.section || section,
        order: data.order || 0,
        role: data.role || 'All'
      });
    }
  }
  return docs;
}

const allDocs = getDocs(docsDir);
console.log(JSON.stringify(allDocs, null, 2));
