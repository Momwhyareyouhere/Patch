import { useState, useCallback, useRef, useEffect } from 'react';
import type { SearchResult, SearchOptions } from '../types';

interface Props {
  rootPath: string;
  onOpenFile: (path: string) => void;
  onGoToLocation: (path: string, line: number) => void;
  isActive: boolean;
}

function buildSearchRegex(query: string, opts: SearchOptions): RegExp {
  let q = query;
  if (!opts.isRegex) q = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (opts.wholeWord) q = '\\b' + q + '\\b';
  return new RegExp(q, opts.matchCase ? 'g' : 'gi');
}

export default function SearchPanel({ rootPath, onOpenFile, onGoToLocation }: Props) {
  const [query, setQuery] = useState('');
  const [pattern, setPattern] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [replaceText, setReplaceText] = useState('');
  const [replacing, setReplacing] = useState<string | null>(null);

  const [isRegex, setIsRegex] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [excludePattern, setExcludePattern] = useState('');
  const [contextLines, setContextLines] = useState(0);

  const debounceRef = useRef<any>(null);

  const optsRef = useRef<SearchOptions>({});
  optsRef.current = { isRegex, matchCase, wholeWord, excludePattern, contextLines };

  const performSearch = useCallback(async (q: string, p: string, opts: SearchOptions) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await window.api.fs.searchFiles(rootPath, q, p, opts);
      setResults(res);
    } catch {
      setResults([]);
    }
    setIsSearching(false);
  }, [rootPath]);

  const scheduleSearch = useCallback((q: string, p: string, opts: SearchOptions) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(q, p, opts), 300);
  }, [performSearch]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    scheduleSearch(value, pattern, optsRef.current);
  }, [pattern, scheduleSearch]);

  const handlePatternChange = useCallback((value: string) => {
    setPattern(value);
    scheduleSearch(query, value, optsRef.current);
  }, [query, scheduleSearch]);

  const triggerSearch = useCallback(() => {
    performSearch(query, pattern, optsRef.current);
  }, [query, pattern, performSearch]);

  const replaceInFile = useCallback(async (filePath: string) => {
    if (!query.trim() || !replaceText.trim()) return;
    setReplacing(filePath);
    try {
      const content = await window.api.fs.getFileContent(filePath);
      const regex = buildSearchRegex(query, optsRef.current);
      const newContent = content.replace(regex, replaceText);
      if (newContent !== content) {
        await window.api.fs.writeFile(filePath, newContent);
        const res = await window.api.fs.searchFiles(rootPath, query, pattern, optsRef.current);
        setResults(res);
      }
    } catch {}
    setReplacing(null);
  }, [query, replaceText, rootPath, pattern]);

  const replaceAll = useCallback(async () => {
    if (!query.trim() || !replaceText.trim()) return;
    const files = Object.keys(groupedResults);
    setReplacing('all');
    try {
      const regex = buildSearchRegex(query, optsRef.current);
      for (const filePath of files) {
        const content = await window.api.fs.getFileContent(filePath);
        const newContent = content.replace(regex, replaceText);
        if (newContent !== content) {
          await window.api.fs.writeFile(filePath, newContent);
        }
      }
      const res = await window.api.fs.searchFiles(rootPath, query, pattern, optsRef.current);
      setResults(res);
    } catch {}
    setReplacing(null);
  }, [query, replaceText, rootPath, pattern]);

  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.path]) acc[r.path] = [];
    acc[r.path].push(r);
    return acc;
  }, {});

  const ToggleBtn = ({ active, title, onClick, label }: { active: boolean; title: string; onClick: () => void; label: string }) => (
    <button className={`search-opt-btn${active ? ' active' : ''}`} onClick={onClick} title={title}>{label}</button>
  );

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
            onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
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

        <div className="search-opt-row">
          <ToggleBtn active={isRegex} title="Use Regex" onClick={() => { setIsRegex(!isRegex); scheduleSearch(query, pattern, { ...optsRef.current, isRegex: !isRegex }); }} label=".*" />
          <ToggleBtn active={matchCase} title="Match Case" onClick={() => { setMatchCase(!matchCase); scheduleSearch(query, pattern, { ...optsRef.current, matchCase: !matchCase }); }} label="Aa" />
          <ToggleBtn active={wholeWord} title="Whole Word" onClick={() => { setWholeWord(!wholeWord); scheduleSearch(query, pattern, { ...optsRef.current, wholeWord: !wholeWord }); }} label="ab|" />
          <button
            className={`search-replace-toggle${showReplace ? ' active' : ''}`}
            onClick={() => setShowReplace((v) => !v)}
            title="Toggle Replace"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" style={{ transform: showReplace ? 'rotate(90deg)' : undefined }}>
              <path d="M4.646 1.646a.5.5 0 01.708 0l6 6a.5.5 0 010 .708l-6 6a.5.5 0 01-.708-.708L10.293 8 4.646 2.354a.5.5 0 010-.708z" />
            </svg>
          </button>
        </div>

        <div className="search-input-wrapper">
          <input
            className="search-input"
            type="text"
            placeholder="Exclude pattern (e.g. *.log, dist/)"
            value={excludePattern}
            onChange={(e) => { setExcludePattern(e.target.value); scheduleSearch(query, pattern, { ...optsRef.current, excludePattern: e.target.value }); }}
          />
          <select
            className="search-context-select"
            value={contextLines}
            onChange={(e) => { const v = Number(e.target.value); setContextLines(v); scheduleSearch(query, pattern, { ...optsRef.current, contextLines: v }); }}
            title="Context lines"
          >
            <option value={0}>No context</option>
            <option value={1}>1 line</option>
            <option value={2}>2 lines</option>
            <option value={3}>3 lines</option>
            <option value={5}>5 lines</option>
          </select>
        </div>

        {showReplace && (
          <div className="search-replace-row">
            <input
              className="search-input"
              type="text"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && replaceAll()}
            />
            <button
              className="search-replace-btn"
              onClick={replaceAll}
              disabled={!query.trim() || !replaceText.trim() || results.length === 0 || replacing !== null}
            >
              {replacing === 'all' ? '...' : 'Replace All'}
            </button>
          </div>
        )}
      </div>

      <div className="search-results">
        {isSearching && <div className="search-status">Searching...</div>}
        {!isSearching && hasSearched && results.length === 0 && <div className="search-status">No results found</div>}
        {!isSearching && Object.keys(groupedResults).map((filePath) => (
          <div key={filePath} className="search-file-group">
            <div className="search-file-header" onClick={() => onOpenFile(filePath)}>
              <span className="search-file-name">{filePath.split('/').pop()}</span>
              <span className="search-file-path">{filePath.replace(rootPath, '')}</span>
              <span className="search-file-count">{groupedResults[filePath].length}</span>
            </div>
            {groupedResults[filePath].slice(0, 10).map((r, i) => (
              <div key={`${r.path}-${r.line}-${i}`}>
                {(r.beforeContext?.length ?? 0) > 0 && (
                  <div className="search-context-lines">
                    {r.beforeContext!.map((line, ci) => (
                      <div key={`b${ci}`} className="search-context-line">
                        <span className="search-context-line-num">{r.line - (r.beforeContext!.length - ci)}</span>
                        <span className="search-context-line-content">{line}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="search-result-item" onClick={() => onGoToLocation(r.path, r.line)}>
                  <span className="search-result-line">{r.line}</span>
                  <span className="search-result-content">{r.lineContent}</span>
                </div>
                {(r.afterContext?.length ?? 0) > 0 && (
                  <div className="search-context-lines">
                    {r.afterContext!.map((line, ci) => (
                      <div key={`a${ci}`} className="search-context-line">
                        <span className="search-context-line-num">{r.line + ci + 1}</span>
                        <span className="search-context-line-content">{line}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {groupedResults[filePath].length > 10 && (
              <div className="search-more">+{groupedResults[filePath].length - 10} more matches</div>
            )}
            {showReplace && (
              <button
                className="search-replace-file-btn"
                onClick={() => replaceInFile(filePath)}
                disabled={replacing !== null}
              >
                {replacing === filePath ? 'Replacing...' : `Replace ${groupedResults[filePath].length} match${groupedResults[filePath].length > 1 ? 'es' : ''}`}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
