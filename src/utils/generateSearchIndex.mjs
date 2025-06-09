import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import Fuse from 'fuse.js';
import { toString } from 'mdast-util-to-string';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';

const POSTS_DIR = path.join(process.cwd(), 'posts');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SEARCH_INDEX_FILE = path.join(PUBLIC_DIR, 'searchIndex.json');

// Function to strip Markdown using mdast-util-to-string
const stripMarkdown = (markdownContent) => {
  const tree = remark().use(remarkGfm).parse(markdownContent);
  return toString(tree);
};

async function getAllMdxFiles() {
  try {
    const dirents = await fs.readdir(POSTS_DIR, { withFileTypes: true });
    const mdxFiles = await Promise.all(
      dirents
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.mdx'))
        .map(async (dirent) => {
          const filePath = path.join(POSTS_DIR, dirent.name);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const { data, content } = matter(fileContent);

          const plainContent = stripMarkdown(content);
          const slug = `/posts/${dirent.name.replace(/\.mdx$/, '')}`;

          return {
            url: slug,
            title: data.title || 'Untitled Post',
            subtitle: data.subtitle || '',
            excerpt: data.excerpt || plainContent.slice(0, 200), // Fallback to first 200 chars of content
            content: plainContent,
            rawContent: content, // Keep raw markdown content if needed for other purposes
            frontmatter: data, // Keep all frontmatter
            filePath: filePath, // For debugging or other uses
          };
        })
    );
    return mdxFiles;
  } catch (error) {
    console.error('Error reading MDX files:', error);
    if (error.code === 'ENOENT' && error.path === POSTS_DIR) {
      console.error(`Error: The directory '${POSTS_DIR}' was not found. Make sure the path is correct and the directory exists.`);
    }
    return []; // Return empty array on error
  }
}

async function generateSearchIndex() {
  console.log('Starting search index generation...');
  const documents = await getAllMdxFiles();

  if (documents.length === 0) {
    console.warn('No documents found to index. Skipping index generation.');
    return;
  }

  console.log(`Found ${documents.length} documents to index.`);

  const fuse = new Fuse(documents, {
    keys: ['title', 'subtitle', 'excerpt', 'content'],
    includeScore: true,
    threshold: 0.4, // Adjust threshold as needed
    ignoreLocation: true, // Useful for content-heavy search
  });

  const index = fuse.getIndex();

  // Combine documents and index for serialization
  const searchData = {
    documents: documents, // The original list of documents
    index: index.toJSON(),  // The Fuse.js index
  };

  const serializedData = JSON.stringify(searchData);

  try {
    await fs.mkdir(PUBLIC_DIR, { recursive: true });
    await fs.writeFile(SEARCH_INDEX_FILE, serializedData);
    console.log(`Search index successfully generated at ${SEARCH_INDEX_FILE}`);
  } catch (error) {
    console.error('Error writing search index file:', error);
  }
}

// Make the script runnable from the command line
if (process.argv[1] === path.resolve(process.argv[1])) {
  generateSearchIndex().catch(err => {
    console.error('Unhandled error during script execution:', err);
    process.exit(1);
  });
}

export { generateSearchIndex, getAllMdxFiles };
