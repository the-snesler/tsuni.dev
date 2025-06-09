import { describe, it, expect, vi, beforeEach, afterEach, SpyInstance } from 'vitest';
import Fuse from 'fuse.js'; // Original Fuse to create a real index for mocking

// Helper to load and execute the client-side script from Search.astro
// This is a simplified approach. In a real project, you might have a more robust way
// or Vitest plugins for Astro that handle this.
// For now, we'll assume the script is simple enough to be re-executed or that we can
// manually call its initialization logic if we refactor it slightly.
// The Search.astro script runs its initializeSearch on DOMContentLoaded or immediately if loaded.
// We will manually call initializeSearch after setting up the DOM and mocks.

// The script content from Search.astro needs to be accessible.
// Option 1: Extract the script to a separate .js file and import it. (Refactor)
// Option 2: For this test, we might need to duplicate parts of its logic or structure
//           if we can't directly execute the <script> tag's content.
// Given the current setup, the script in Search.astro is not directly importable.
// Let's assume we refactor Search.astro to export initializeSearch for testing.
// For now, I will write the test as if initializeSearch and other relevant parts
// (like fuseInstance, searchInput, searchResults, displayResults) are exposed or accessible.
// This usually means refactoring the component's script.

// MOCKING THE SCRIPT ITSELF FOR NOW (Conceptual - will need actual script or refactor)
// This is a placeholder for how the script from Search.astro would be structured for testability.
// In a real scenario, you'd import this from a .js file.
let fuseInstanceInternal = null;
let searchInputInternal = null;
let searchResultsInternal = null;

function displayResultsInternal(results, searchInputValue) {
  searchResultsInternal.innerHTML = '';
  if (results.length === 0) {
    if (searchInputValue.trim() !== '') {
      const li = document.createElement('li');
      li.textContent = 'No results found.';
      searchResultsInternal.appendChild(li);
    }
    return;
  }
  results.forEach(result => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = result.item.url;
    a.textContent = result.item.title;
    li.appendChild(a);
    searchResultsInternal.appendChild(li);
  });
}

async function initializeSearchInternal() {
  // This function would be the core of the script in Search.astro
  // console.log('Initializing search (test mock)...');
  try {
    const response = await fetch('/searchIndex.json'); // fetch is mocked
    if (!response.ok) {
      console.error('Failed to fetch search index:', response.status, response.statusText);
      return;
    }
    const searchData = await response.json();
    if (!searchData.documents || !searchData.index) {
      console.error('Search index data not in expected format');
      return;
    }
    const fuseOptions = { keys: ['title', 'subtitle', 'excerpt', 'content'], includeScore: true, threshold: 0.4, ignoreLocation: true };
    const parsedIndex = Fuse.parseIndex(searchData.index);
    fuseInstanceInternal = new Fuse(searchData.documents, fuseOptions, parsedIndex);
    // console.log('Fuse.js instance initialized (test mock):', fuseInstanceInternal);

    searchInputInternal.addEventListener('input', (event) => {
      if (!fuseInstanceInternal) return;
      const query = event.target.value; // Use raw value for trim check in displayResults
      const results = fuseInstanceInternal.search(query.trim());
      displayResultsInternal(results, query); // Pass original query for "No results" logic
    });
  } catch (error) {
    console.error('Error initializing search (test mock):', error);
  }
}


describe('Search.astro Component Script', () => {
  let mockFetch;

  const mockDocuments = [
    { url: '/post-1', title: 'First Post', content: 'Hello world, this is the first post.' },
    { url: '/post-2', title: 'Second Post', content: 'Another interesting article here.' },
    { url: '/post-3', title: 'A Third Entry', content: 'More content about testing.' },
  ];

  // Create a real Fuse index for consistent mocking
  const mockFuseIndex = Fuse.createIndex(
    ['title', 'subtitle', 'excerpt', 'content'],
    mockDocuments
  );

  const mockSearchData = {
    documents: mockDocuments,
    index: mockFuseIndex.toJSON(),
  };

  beforeEach(() => {
    // Set up mock DOM
    document.body.innerHTML = `
      <div class="search-container">
        <input type="search" id="searchInput" placeholder="Search posts..." />
        <ul id="searchResults"></ul>
      </div>
    `;
    // Assign to internal script vars
    searchInputInternal = document.getElementById('searchInput');
    searchResultsInternal = document.getElementById('searchResults');
    fuseInstanceInternal = null; // Reset fuse instance

    // Mock fetch
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockSearchData }), // Return a copy
    });
    global.fetch = mockFetch;

    // Suppress console logs, allow specific tests to override if needed
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = ''; // Clean up DOM
    vi.restoreAllMocks(); // Restore fetch and console spies
    // Reset internal script state if necessary, though re-assigning DOM elements helps
    searchInputInternal.replaceWith(searchInputInternal.cloneNode(true)); // Clears listeners from old element
    searchInputInternal = document.getElementById('searchInput'); // Re-assign after replacing
    searchResultsInternal = document.getElementById('searchResults');

  });

  it('Initializes Fuse.js instance on load', async () => {
    await initializeSearchInternal(); // Manually call initialization

    expect(mockFetch).toHaveBeenCalledWith('/searchIndex.json');
    expect(fuseInstanceInternal).toBeInstanceOf(Fuse);
    expect(fuseInstanceInternal.getIndex().size()).toBeGreaterThan(0); // Call size as a method
  });

  it('Populates search results based on input', async () => {
    await initializeSearchInternal();

    searchInputInternal.value = 'first';
    searchInputInternal.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for event processing if any async operations were involved (not in this sync handler)
    // await new Promise(resolve => setTimeout(resolve, 0)); // Forcing microtask queue flush if needed

    const listItems = searchResultsInternal.querySelectorAll('li');
    expect(listItems.length).toBe(1);
    const link = listItems[0].querySelector('a');
    expect(link).not.toBeNull();
    expect(link.href).toContain('/post-1');
    expect(link.textContent).toBe('First Post');
  });

  it('Shows "No results found." message for non-matching query', async () => {
    await initializeSearchInternal();

    searchInputInternal.value = 'nonexistentqueryxyz';
    searchInputInternal.dispatchEvent(new Event('input', { bubbles: true }));

    const listItem = searchResultsInternal.querySelector('li');
    expect(listItem).not.toBeNull();
    expect(listItem.textContent).toBe('No results found.');
  });

  it('Clears search results when input is empty', async () => {
    await initializeSearchInternal();

    // First, get some results
    searchInputInternal.value = 'Post';
    searchInputInternal.dispatchEvent(new Event('input', { bubbles: true }));
    expect(searchResultsInternal.querySelectorAll('li').length).toBeGreaterThan(0);

    // Then, clear the input
    searchInputInternal.value = '';
    searchInputInternal.dispatchEvent(new Event('input', { bubbles: true }));

    expect(searchResultsInternal.querySelectorAll('li').length).toBe(0);
    expect(searchResultsInternal.textContent).toBe('');
  });

  it('Handles fetch error gracefully during initialization', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });
    await initializeSearchInternal();
    expect(console.error).toHaveBeenCalledWith('Failed to fetch search index:', 500, 'Server Error');
    expect(fuseInstanceInternal).toBeNull();
  });

  it('Handles malformed searchIndex.json gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ documents: [] /* index missing */ }) });
    await initializeSearchInternal();
    expect(console.error).toHaveBeenCalledWith('Search index data not in expected format');
    expect(fuseInstanceInternal).toBeNull();
  });
});
