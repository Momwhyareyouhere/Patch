import { useState, useCallback, useRef, useEffect } from 'react';
import type { SearchResult } from '../types';

interface Props {
  rootPath: string;
  onOpenFile: (path: string) => void;
  onGoToLocation: (path: string, line: number) => void;
  isActive: boolean;
}

export default function SearchPanel({ rootPath, onOpenFile, onGoToLocation, isActive }: Props) {
  const [query, setQuery] = useState('');
  const [pattern, setPattern] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<any>(null);

  const performSearch = useCallback(async (q: string, p: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await window.api.fs.searchFiles(rootPath, q, p);
      setResults(res);
    } catch {
      setResults([]);
    }
    setIsSearching(false);
  }, [rootPath]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value, pattern), 300);
  }, [pattern, performSearch]);

  const handlePatternChange = useCallback((value: string) => {
    setPattern(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query, value), 300);
  }, [query, performSearch]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.path]) acc[r.path] = [];
    acc[r.path].push(r);
    return acc;
  }, {});

  return (
    <div className="search-panel">
      <div className="search-inputs">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="var(--text-muted)" className="search-icon">
            <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search files..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch(query, pattern)}
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); setResults([]); setHasSearched(false); }}>
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
              </svg>
            </button>
          )}
        </div>
        <div className="search-pattern-wrapper">
          <input
            className="search-input"
            type="text"
            placeholder="File pattern (e.g. *.ts)"
            value={pattern}
            onChange={(e) => handlePatternChange(e.target.value)}
          />
        </div>
      </div>

      <div className="search-results">
        {isSearching && (
          <div className="search-status">Searching...</div>
        )}
        {!isSearching && hasSearched && results.length === 0 && (
          <div className="search-status">No results found</div>
        )}
        {!isSearching && Object.keys(groupedResults).map((filePath) => (
          <div key={filePath} className="search-file-group">
            <div
              className="search-file-header"
              onClick={() => onOpenFile(filePath)}
            >
              <span className="search-file-name">{filePath.split('/').pop()}</span>
              <span className="search-file-path">{filePath.replace(rootPath, '')}</span>
              <span className="search-file-count">{groupedResults[filePath].length}</span>
            </div>
            {groupedResults[filePath].slice(0, 10).map((r, i) => (
              <div
                key={`${r.path}-${r.line}-${i}`}
                className="search-result-item"
                onClick={() => onGoToLocation(r.path, r.line)}
              >
                <span className="search-result-line">{r.line}</span>
                <span className="search-result-content">{r.lineContent}</span>
              </div>
            ))}
            {groupedResults[filePath].length > 10 && (
              <div className="search-more">+{groupedResults[filePath].length - 10} more matches</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
