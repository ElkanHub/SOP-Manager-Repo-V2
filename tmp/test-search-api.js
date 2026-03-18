const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const DOCS_PATH = path.join(process.cwd(), 'content/docs');

function testIndexing() {
  try {
    const documents = [];
    
    function readDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          readDir(filePath);
        } else if (file.endsWith('.mdx')) {
          const fileContents = fs.readFileSync(filePath, 'utf8');
          const { data, content } = matter(fileContents);
          const relativePath = path.relative(DOCS_PATH, filePath);
          const slug = relativePath
            .replace(/\.mdx$/, '')
            .replace(/\\/g, '/')
            .split('/')
            .map(part => part.replace(/^\d+-/, ''))
            .join('/');
          documents.push({
            title: data.title || '',
            slug: slug
          });
        }
      }
    }

    readDir(DOCS_PATH);
    console.log(`Indexed ${documents.length} docs.`);
    console.log('Sample docs:', JSON.stringify(documents.slice(0, 3), null, 2));
    
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

testIndexing();
