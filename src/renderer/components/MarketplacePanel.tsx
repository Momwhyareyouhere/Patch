import { useState, useEffect } from 'react';
import type { MarketplacePlugin } from '../types';

interface Props {
  onRefreshPlugins: () => void;
  onOpenPlugin: (plugin: MarketplacePlugin) => void;
}

export default function MarketplacePanel({ onRefreshPlugins, onOpenPlugin }: Props) {
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [repos, setRepos] = useState<string[]>([]);
  const [newRepo, setNewRepo] = useState('');
  const [showRepoInput, setShowRepoInput] = useState(false);

  useEffect(() => {
    load();
    loadRepos();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const list = await window.api.plugins.marketplaceList();
      setPlugins(list);
    } catch {}
    setLoading(false);
  }

  async function loadRepos() {
    try {
      const list = await window.api.plugins.marketplaceGetRepos();
      setRepos(list);
    } catch {}
  }

  async function handleInstall(id: string, repo?: string) {
    setInstalling(id);
    try {
      const result = await window.api.plugins.marketplaceInstall(id, repo);
      if (result.success) {
        setPlugins((prev) => prev.map((p) => p.id === id ? { ...p, installed: true } : p));
        onRefreshPlugins();
      } else {
        alert(`Install failed: ${result.error}`);
      }
    } catch {}
    setInstalling(null);
  }

  async function handleAddRepo() {
    const trimmed = newRepo.trim();
    if (!trimmed) return;
    const result = await window.api.plugins.marketplaceAddRepo(trimmed);
    if (result.success) {
      setNewRepo('');
      setShowRepoInput(false);
      loadRepos();
      setPlugins([]);
      load();
    } else {
      alert(result.error || 'Failed to add repo');
    }
  }

  async function handleRemoveRepo(repo: string) {
    await window.api.plugins.marketplaceRemoveRepo(repo);
    loadRepos();
    setPlugins([]);
    load();
  }

  return (
    <div className="marketplace-panel">
      <div className="marketplace-header">
        <h3>Extensions</h3>
        <button className="icon-btn" onClick={() => load()} title="Refresh">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path fillRule="evenodd" d="M8 3a5 5 0 00-5 5 .5.5 0 01-1 0 6 6 0 1111.627-2.206.5.5 0 11-.93.364A5 5 0 008 3zm2.854 5.146a.5.5 0 01.708 0A5 5 0 115 8a.5.5 0 111 0 4 4 0 106.146-3.416.5.5 0 11.708-.708A4.983 4.983 0 0116 8a5 5 0 01-4.854 5.146.5.5 0 01-.708-.708A4 4 0 009.5 6.207V7.5a.5.5 0 01-1 0V5.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-.793a5 5 0 012.146 2.146z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="marketplace-status">Loading...</div>
      ) : plugins.length === 0 ? (
        <div className="marketplace-status">No extensions available</div>
      ) : (
        <div className="marketplace-list">
          {plugins.map((p) => (
            <div key={p.id} className="marketplace-card" onClick={() => onOpenPlugin(p)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onOpenPlugin(p); }}>
              <div className="marketplace-card-body">
                <div className="marketplace-card-name">{p.name}</div>
                <div className="marketplace-card-meta">
                  <span className="marketplace-card-author">{p.author}</span>
                  <span className="marketplace-card-version">v{p.version}</span>
                </div>
                <div className="marketplace-card-desc">{p.description}</div>
              </div>
              <div className="marketplace-card-actions" onClick={(e) => e.stopPropagation()}>
                {p.installed ? (
                  <button className="marketplace-installed-btn" disabled>Installed</button>
                ) : (
                  <button
                    className="marketplace-install-btn"
                    onClick={() => handleInstall(p.id, p.repo)}
                    disabled={installing === p.id}
                  >
                    {installing === p.id ? '...' : 'Install'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="marketplace-bottom">
        <div className="marketplace-bottom-header" onClick={() => setShowRepoInput(!showRepoInput)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setShowRepoInput(!showRepoInput); }}>
          <span>Repositories</span>
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" style={{ transform: showRepoInput ? 'rotate(90deg)' : undefined, transition: 'transform 0.1s' }}>
            <path d="M4.646 1.646a.5.5 0 01.708 0l6 6a.5.5 0 010 .708l-6 6a.5.5 0 01-.708-.708L10.293 8 4.646 2.354a.5.5 0 010-.708z" />
          </svg>
        </div>
        {showRepoInput && (
          <div className="marketplace-repo-section">
            <div className="marketplace-repo-input-row">
              <input
                className="search-input"
                type="text"
                placeholder="user/repo/branch"
                value={newRepo}
                onChange={(e) => setNewRepo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRepo()}
              />
              <button className="marketplace-repo-add-btn" onClick={handleAddRepo} disabled={!newRepo.trim()}>Add</button>
            </div>
            {repos.length > 0 && (
              <div className="marketplace-repo-list">
                {repos.map((r) => (
                  <div key={r} className="marketplace-repo-item">
                    <span className="marketplace-repo-name">{r}</span>
                    <button className="marketplace-repo-remove" onClick={() => handleRemoveRepo(r)} title="Remove">
                      <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                        <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
