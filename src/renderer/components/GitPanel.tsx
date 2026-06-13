import { useState, useEffect, useCallback, useRef } from 'react';
import type { GitFile } from '../types';

interface Props {
  rootPath: string;
  gitFiles: GitFile[];
  gitBranch: string | null;
  onRefresh: () => void;
}

export default function GitPanel({ rootPath, gitFiles, gitBranch, onRefresh }: Props) {
  const [diff, setDiff] = useState<Record<string, string>>({});
  const [diffOpen, setDiffOpen] = useState<string | null>(null);
  const [commitMsg, setCommitMsg] = useState('');
  const [statusText, setStatusText] = useState('');
  const [loadingDiff, setLoadingDiff] = useState<string | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout>>();

  const showStatus = useCallback((text: string) => {
    setStatusText(text);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatusText(''), 3000);
  }, []);

  const loadDiff = useCallback(async (filePath: string, staged: boolean) => {
    if (diffOpen === filePath + staged) { setDiffOpen(null); return; }
    setDiffOpen(filePath + staged);
    setLoadingDiff(filePath + staged);
    const result = await window.api.git.diff(rootPath, filePath, staged);
    setDiff((prev) => ({ ...prev, [filePath + staged]: result }));
    setLoadingDiff(null);
  }, [rootPath, diffOpen]);

  const toggleStage = useCallback(async (filePath: string, isStaged: boolean) => {
    const ok = isStaged
      ? await window.api.git.unstage(rootPath, filePath)
      : await window.api.git.add(rootPath, filePath);
    if (ok) {
      onRefresh();
      setDiff({});
      setDiffOpen(null);
    }
  }, [rootPath, onRefresh]);

  const doCommit = useCallback(async () => {
    if (!commitMsg.trim()) return;
    const result = await window.api.git.commit(rootPath, commitMsg.trim());
    showStatus(result);
    setCommitMsg('');
    onRefresh();
    setDiff({});
    setDiffOpen(null);
  }, [rootPath, commitMsg, onRefresh, showStatus]);

  const doPush = useCallback(async () => {
    showStatus('Pushing...');
    const result = await window.api.git.push(rootPath);
    showStatus(result);
  }, [rootPath, showStatus]);

  const doPull = useCallback(async () => {
    showStatus('Pulling...');
    const result = await window.api.git.pull(rootPath);
    showStatus(result);
  }, [rootPath, showStatus]);

  const staged = gitFiles.filter((f) => f.status !== '?' && f.status !== '!' && f.status !== 'U');
  const unstaged = gitFiles.filter((f) => f.status === '?' || f.status === '!' || f.status === 'U');

  const statusIcon = (s: string) => {
    if (s === '?') return <span className="git-status-u">U</span>;
    if (s === 'M') return <span className="git-status-m">M</span>;
    if (s === 'A') return <span className="git-status-a">A</span>;
    if (s === 'D') return <span className="git-status-d">D</span>;
    if (s === 'R') return <span className="git-status-r">R</span>;
    return <span className="git-status-m">M</span>;
  };

  return (
    <div className="git-panel">
      <div className="git-panel-header">
        <div className="git-branch-row">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M4.5 1a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm7 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-7 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0-1a2.5 2.5 0 002.5-2.5V4.5h1v3a2.5 2.5 0 002.5 2.5h.5v-2l3 3-3 3v-2h-.5a3.5 3.5 0 01-3.5-3.5V5.7a2.5 2.5 0 00-2-2.45V10z" />
          </svg>
          <span className="git-branch-name">{gitBranch || '(no repo)'}</span>
        </div>
        <div className="git-actions">
          <button className="icon-btn" onClick={doPull} title="Pull">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M8 1a.5.5 0 01.5.5v8.793l2.146-2.147a.5.5 0 01.708.708l-3 3a.5.5 0 01-.708 0l-3-3a.5.5 0 01.708-.708L7.5 10.293V1.5A.5.5 0 018 1z" />
              <path d="M1 11.5A1.5 1.5 0 002.5 13h11a1.5 1.5 0 001.5-1.5v-1a.5.5 0 00-1 0v1a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-1a.5.5 0 00-1 0v1z" />
            </svg>
          </button>
          <button className="icon-btn" onClick={doPush} title="Push">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M8 15a.5.5 0 01-.5-.5V5.707l-2.146 2.147a.5.5 0 01-.708-.708l3-3a.5.5 0 01.708 0l3 3a.5.5 0 01-.708.708L8.5 5.707V14.5a.5.5 0 01-.5.5z" />
              <path d="M1 4.5A1.5 1.5 0 012.5 3h11A1.5 1.5 0 0115 4.5v1a.5.5 0 01-1 0v-1a.5.5 0 00-.5-.5h-11a.5.5 0 00-.5.5v1a.5.5 0 01-1 0v-1z" />
            </svg>
          </button>
          <button className="icon-btn" onClick={onRefresh} title="Refresh">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M8 3a5 5 0 00-4.546 2.914.5.5 0 01-.908-.417A6 6 0 1114 8a.5.5 0 01-1 0 5 5 0 00-5-5z" />
              <path d="M8 4.5a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H6a.5.5 0 010-1h1.5V5a.5.5 0 01.5-.5z" />
            </svg>
          </button>
        </div>
      </div>

      {statusText && <div className="git-status-bar">{statusText}</div>}

      <div className="git-section">
        <div className="git-section-title">Staged ({staged.length})</div>
        {staged.length === 0 ? (
          <div className="git-empty">No staged changes</div>
        ) : (
          staged.map((f) => (
            <div key={f.path} className="git-file-item">
              <div className="git-file-row">
                <button className="git-stage-btn" onClick={() => toggleStage(f.path, true)} title="Unstage">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                    <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
                  </svg>
                </button>
                {statusIcon(f.status)}
                <span className="git-file-name" onClick={() => loadDiff(f.path, true)}>{f.path.split('/').pop()}</span>
              </div>
              {diffOpen === f.path + 'true' && (
                <pre className="git-diff-view">
                  {loadingDiff === f.path + 'true' ? 'Loading...' : diff[f.path + 'true'] || '(no diff)'}
                </pre>
              )}
            </div>
          ))
        )}
      </div>

      <div className="git-section">
        <div className="git-section-title">Changes ({unstaged.length})</div>
        {unstaged.length === 0 ? (
          <div className="git-empty">No changes</div>
        ) : (
          unstaged.map((f) => (
            <div key={f.path} className="git-file-item">
              <div className="git-file-row">
                <button className="git-stage-btn" onClick={() => toggleStage(f.path, false)} title="Stage">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                    <path d="M10.97 4.97a.75.75 0 011.06 0l3.5 3.5a.75.75 0 010 1.06l-3.5 3.5a.75.75 0 11-1.06-1.06l2.22-2.22H3.75a.75.75 0 010-1.5h9.44l-2.22-2.22a.75.75 0 010-1.06z" />
                  </svg>
                </button>
                {statusIcon(f.status)}
                <span className="git-file-name" onClick={() => loadDiff(f.path, false)}>{f.path.split('/').pop()}</span>
              </div>
              {diffOpen === f.path + 'false' && (
                <pre className="git-diff-view">
                  {loadingDiff === f.path + 'false' ? 'Loading...' : diff[f.path + 'false'] || '(no diff)'}
                </pre>
              )}
            </div>
          ))
        )}
      </div>

      <div className="git-commit-area">
        <textarea
          className="git-commit-input"
          placeholder="Commit message..."
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          rows={2}
        />
        <button
          className="git-commit-btn"
          onClick={doCommit}
          disabled={!commitMsg.trim() || gitFiles.length === 0}
        >
          Commit
        </button>
      </div>
    </div>
  );
}
