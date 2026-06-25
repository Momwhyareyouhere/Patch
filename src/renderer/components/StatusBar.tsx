import { useState, useEffect } from 'react';
import type { OpenTab, EditorSettings } from '../types';

interface Props {
  statusText: string;
  tab: OpenTab | null;
  rootPath: string | null;
  line: number;
  column: number;
  settings: EditorSettings;
  gitBranch: string | null;
  showAI: boolean;
  onToggleAI: () => void;
  workspaceFolders?: string[];
}

export default function StatusBar({ statusText, tab, rootPath, line, column, settings, gitBranch, showAI, onToggleAI, workspaceFolders }: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const wordCount = tab ? (tab.content.match(/\S+/g) || []).length : 0;
  const charCount = tab ? tab.content.length : 0;

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item">{statusText}</span>
        {settings.autoSave && <><span className="status-separator" /><span className="status-item">Auto Save</span></>}
        {gitBranch && (
          <>
            <span className="status-separator" />
            <span className="status-item git-branch">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" style={{ marginRight: 4 }}>
                <path d="M11.93 5.05a3.5 3.5 0 10-1.6.12l-2.46 3.2a3.5 3.5 0 001.1 4.88 3.49 3.49 0 004.85-1.08 3.5 3.5 0 00-1.08-4.85 3.5 3.5 0 00-.8-.3L9.5 5.2a3.5 3.5 0 00.43-1.22l1.99-.06a3.5 3.5 0 00.01-1.12zM9.06 4.09a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM5.5 12.5a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z" />
              </svg>
              {gitBranch}
            </span>
          </>
        )}
      </div>
      <div className="status-right">
        {tab && (
          <>
            <span className="status-item">{tab.language}</span>
            {tab.language !== 'image' && (
              <>
                <span className="status-separator" />
                <span className="status-item">Ln {line}, Col {column}</span>
                <span className="status-separator" />
                <span className="status-item">Words: {wordCount}</span>
                <span className="status-separator" />
                <span className="status-item">Chars: {charCount}</span>
              </>
            )}
            <span className="status-separator" />
            <span className="status-item">UTF-8</span>
            <span className="status-separator" />
            <span className="status-item">Spaces: {settings.tabSize}</span>
            <span className="status-separator" />
            <span className="status-item">{settings.uiTheme === 'dark' ? 'Dark' : settings.uiTheme === 'light' ? 'Light' : 'HC'}</span>
            <span className="status-separator" />
            <span className="status-item" style={{ background: settings.accentColor + '22', color: settings.accentColor }}>{settings.accentColor}</span>
          </>
        )}
        {rootPath && (
          <>
            {tab && <span className="status-separator" />}
            <span className="status-item" title={rootPath}>{rootPath.split('/').pop()}{workspaceFolders && workspaceFolders.length > 1 ? ` +${workspaceFolders.length - 1}` : ''}</span>
          </>
        )}
        <span className="status-separator" />
        <button className={`status-btn ${showAI ? 'active' : ''}`} onClick={onToggleAI} title="Toggle AI Chat (Ctrl+K I)">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M12 2a10 10 0 00-7.07 17.07l-1.41 1.41a.5.5 0 00.35.85H12a10 10 0 100-20z" />
          </svg>
          AI
        </button>
        <span className="status-separator" />
        <span className="status-item">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
