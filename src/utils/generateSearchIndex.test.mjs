import { describe, it, expect, vi, beforeEach, afterEach, mock } from 'vitest';
import path from 'path';
// fsPromises is no longer directly imported if script uses `import fs from 'fs/promises'`
// We will access mocked fs methods via the imported module if needed, or trust the mock.
import Fuse from 'fuse.js';

// Mock dependencies
vi.mock('fs/promises', () => ({
  default: { // Provide a default export
    readdir: vi.fn().mockResolvedValue([]), // Default to empty dir to prevent undefined.filter
    readFile: vi.fn().mockResolvedValue(''), // Default to empty file content
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  }
}));
vi.mock('gray-matter');

// Import the module to be tested AFTER top-level mocks
// Now that fs/promises provides a default, the import in the SUT should work.
const { getAllMdxFiles, generateSearchIndex } = await import('./generateSearchIndex.mjs');
const matterMock = (await import('gray-matter')).default;
const fsMock = (await import('fs/promises')).default; // Get the mocked default export


// Constants used in the script and tests
const SCRIPT_POSTS_DIR = path.join(process.cwd(), 'posts'); // As defined in generateSearchIndex.mjs
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SEARCH_INDEX_FILE = path.join(PUBLIC_DIR, 'searchIndex.json');


describe('generateSearchIndex.mjs', () => {

  beforeEach(() => {
    // Reset mocks before each test
    // Reset mocks before each test
    vi.mocked(fsMock.readdir).mockReset();
    vi.mocked(fsMock.readFile).mockReset();
    vi.mocked(fsMock.mkdir).mockReset();
    vi.mocked(fsMock.writeFile).mockReset();
    matterMock.mockReset();

    // Suppress console logs during tests unless specifically testing for them
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restore spies, including console
  });

  describe('getAllMdxFiles', () => {
    it('should correctly read and process MDX files', async () => {
      const mockFiles = [
        { name: 'first-post.mdx', isFile: () => true },
        { name: 'second-post.mdx', isFile: () => true },
        { name: 'not-mdx.txt', isFile: () => true },
        { name: 'subdirectory', isFile: () => false },
      ];
      vi.mocked(fsMock.readdir).mockResolvedValue(mockFiles);

      matterMock
        .mockReturnValueOnce({
          data: { title: 'First Post', subtitle: 'Subtitle 1', excerpt: 'Excerpt 1' },
          content: '# Hello\nContent 1',
        })
        .mockReturnValueOnce({
          data: { title: 'Second Post' }, // No subtitle or excerpt
          content: '## World\nContent 2 with **bold** and _italic_. ![image](url)',
        });

      vi.mocked(fsMock.readFile).mockResolvedValue('dummy file content');

      const documents = await getAllMdxFiles();

      expect(vi.mocked(fsMock.readdir)).toHaveBeenCalledWith(SCRIPT_POSTS_DIR, { withFileTypes: true });
      expect(vi.mocked(fsMock.readFile)).toHaveBeenCalledTimes(2); // Only for .mdx files
      expect(matterMock).toHaveBeenCalledTimes(2);

      expect(documents).toHaveLength(2);

      // Test first document
      expect(documents[0]).toEqual({
        url: '/posts/first-post',
        title: 'First Post',
        subtitle: 'Subtitle 1',
        excerpt: 'Excerpt 1',
        content: 'HelloContent 1', // Markdown stripped
        rawContent: '# Hello\nContent 1',
        frontmatter: { title: 'First Post', subtitle: 'Subtitle 1', excerpt: 'Excerpt 1' },
        filePath: path.join(SCRIPT_POSTS_DIR, 'first-post.mdx'),
      });

      // Test second document (markdown stripping, default excerpt)
      expect(documents[1]).toEqual({
        url: '/posts/second-post',
        title: 'Second Post',
        subtitle: '', // Default
        content: 'WorldContent 2 with bold and italic. image', // Markdown stripped
        excerpt: 'WorldContent 2 with bold and italic. image'.slice(0, 200), // Default excerpt
        rawContent: '## World\nContent 2 with **bold** and _italic_. ![image](url)',
        frontmatter: { title: 'Second Post' },
        filePath: path.join(SCRIPT_POSTS_DIR, 'second-post.mdx'),
      });
    });

    it('should return empty array and log error if posts directory not found', async () => {
      const error = new Error(`ENOENT: no such file or directory, scandir '${SCRIPT_POSTS_DIR}'`);
      error.code = 'ENOENT';
      error.path = SCRIPT_POSTS_DIR;
      vi.mocked(fsMock.readdir).mockRejectedValue(error);
      // const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Already spied

      const documents = await getAllMdxFiles();

      expect(documents).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error reading MDX files:', error);
      expect(console.error).toHaveBeenCalledWith(`Error: The directory '${SCRIPT_POSTS_DIR}' was not found. Make sure the path is correct and the directory exists.`);

      // consoleErrorSpy.mockRestore(); // Restored in afterEach
    });
  });

  describe('generateSearchIndex', () => {
    it('should generate and write search index correctly', async () => {
      const mockDocs = [
        { url: '/posts/test', title: 'Test Post', content: 'Test content' },
      ];


      // To test generateSearchIndex, we need to ensure that the `getAllMdxFiles` it calls
      // is the one from its own module, but we want to control its output for this test.
      // This is tricky because it's an internal function call.
      // The best way is to refactor generateSearchIndex to accept getAllMdxFiles as a parameter (dependency injection)
      // OR to mock it at the module level when generateSearchIndex itself is imported.
      // For now, we'll rely on the fact that getAllMdxFiles is already tested,
      // and we'll provide fs mocks that getAllMdxFiles would use.

      // Simulate getAllMdxFiles returning mockDocs by setting up fs mocks accordingly:
      const mockFileDirents = mockDocs.map(doc => ({ name: `${doc.title.toLowerCase().replace(' ', '-')}.mdx`, isFile: () => true }));
      vi.mocked(fsMock.readdir).mockResolvedValue(mockFileDirents);

      mockDocs.forEach(doc => {
        matterMock.mockReturnValueOnce({
          data: { title: doc.title },
          content: doc.content,
        });
      });
      vi.mocked(fsMock.readFile).mockResolvedValue('---title: test---\ncontent');


      await generateSearchIndex(); // Use the imported generateSearchIndex

      expect(vi.mocked(fsMock.mkdir)).toHaveBeenCalledWith(PUBLIC_DIR, { recursive: true });
      expect(vi.mocked(fsMock.writeFile)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(fsMock.writeFile)).toHaveBeenCalledWith(
        SEARCH_INDEX_FILE,
        expect.any(String) // We'll check the content of the string
      );

      const writtenData = JSON.parse(vi.mocked(fsMock.writeFile).mock.calls[0][1]);
      // We need to reconstruct the expected documents as getAllMdxFiles would create them
      const expectedDocsWritten = mockDocs.map(doc => ({
        url: `/posts/${doc.title.toLowerCase().replace(' ', '-')}`,
        title: doc.title,
        subtitle: '',
        excerpt: doc.content.slice(0,200),
        content: doc.content,
        rawContent: doc.content, // Assuming rawContent is same as content post-stripping for this mock
        frontmatter: {title: doc.title},
        filePath: path.join(SCRIPT_POSTS_DIR, `${doc.title.toLowerCase().replace(' ', '-')}.mdx`),
      }));
      expect(writtenData.documents).toEqual(expectedDocsWritten);

      // Check if the index seems like a valid Fuse.js index structure
      const fuseIndex = Fuse.parseIndex(writtenData.index);
      expect(fuseIndex).toBeDefined();
      // This check depends on Fuse.js internals if it always produces a size > 0 for one doc.
      // A more robust check might be to ensure the index can be used by a Fuse instance.
      const tempFuse = new Fuse(expectedDocsWritten, { keys: ['title', 'content']}, fuseIndex);
      expect(tempFuse.search('Test').length).toBeGreaterThan(0);

    });

    it('should warn if no documents are found', async () => {
      // Simulate getAllMdxFiles returning empty array
      vi.mocked(fsMock.readdir).mockResolvedValue([]); // No files in dir

      // console.warn is spied upon in beforeEach and restored in afterEach

      await generateSearchIndex();

      expect(console.warn).toHaveBeenCalledWith('No documents found to index. Skipping index generation.');
      expect(vi.mocked(fsMock.writeFile)).not.toHaveBeenCalled();

      // Removed duplicated calls
      // consoleWarnSpy.mockRestore(); // Restored in afterEach
    });
  });
});
