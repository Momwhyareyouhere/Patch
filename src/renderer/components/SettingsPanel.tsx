import { useState, useEffect, useRef } from 'react';
import type { EditorSettings, AISettings, AIProvider } from '../types';
import { PROVIDER_PRESETS } from '../types';

interface Props {
  settings: EditorSettings;
  onChange: (settings: EditorSettings) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function SettingsPanel({ settings, onChange, onClose, isOpen }: Props) {
  if (!isOpen) return null;

  const update = (key: keyof EditorSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  const updateAI = (key: keyof AISettings, value: any) => {
    onChange({ ...settings, ai: { ...settings.ai, [key]: value } });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
            </svg>
          </button>
        </div>
        <div className="settings-body">
          <div className="settings-group">
            <label className="settings-label">UI Theme</label>
            <select
              className="settings-select"
              value={settings.uiTheme}
              onChange={(e) => update('uiTheme', e.target.value)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="hc">High Contrast</option>
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label">Editor Theme</label>
            <select
              className="settings-select"
              value={settings.theme}
              onChange={(e) => update('theme', e.target.value)}
            >
              <option value="vs-dark">Dark</option>
              <option value="vs-light">Light</option>
              <option value="hc-black">High Contrast</option>
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label">Accent Color</label>
            <div className="settings-accent-row">
              <input
                type="color"
                className="settings-color-input"
                value={settings.accentColor}
                onChange={(e) => update('accentColor', e.target.value)}
              />
              <span className="settings-accent-hex">{settings.accentColor}</span>
              <div className="theme-preset-row" style={{ marginLeft: 'auto' }}>
                {['#007acc', '#c5a5c5', '#4ec9b0', '#f44747', '#cca700', '#6fc3df'].map((c) => (
                  <button
                    key={c}
                    className={`theme-preset-btn ${settings.accentColor === c ? 'active' : ''}`}
                    style={{ borderLeftColor: c, borderLeftWidth: 3 }}
                    onClick={() => update('accentColor', c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label">Font Size</label>
            <div className="settings-range-wrapper">
              <input
                type="range"
                min="10"
                max="30"
                step="1"
                className="settings-range"
                value={settings.fontSize}
                onChange={(e) => update('fontSize', parseInt(e.target.value))}
              />
              <span className="settings-range-value">{settings.fontSize}px</span>
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label">Tab Size</label>
            <select
              className="settings-select"
              value={settings.tabSize}
              onChange={(e) => update('tabSize', parseInt(e.target.value))}
            >
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label">Word Wrap</label>
            <select
              className="settings-select"
              value={settings.wordWrap}
              onChange={(e) => update('wordWrap', e.target.value)}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
              <option value="wordWrapColumn">Word Wrap Column</option>
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label">Line Numbers</label>
            <select
              className="settings-select"
              value={settings.lineNumbers}
              onChange={(e) => update('lineNumbers', e.target.value)}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
              <option value="relative">Relative</option>
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label">
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={settings.minimap}
                onChange={(e) => update('minimap', e.target.checked)}
              />
              Minimap
            </label>
          </div>

          <div className="settings-group">
            <label className="settings-label">
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={settings.autoSave}
                onChange={(e) => update('autoSave', e.target.checked)}
              />
              Auto Save
            </label>
            {settings.autoSave && (
              <div className="settings-range-wrapper">
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="500"
                  className="settings-range"
                  value={settings.autoSaveDelay}
                  onChange={(e) => update('autoSaveDelay', parseInt(e.target.value))}
                />
                <span className="settings-range-value">{settings.autoSaveDelay}ms</span>
              </div>
            )}
          </div>

          <div className="settings-group-title">AI Configuration</div>

          <div className="settings-group">
            <label className="settings-label">Provider</label>
            <select
              className="settings-select"
              value={settings.ai.provider}
              onChange={(e) => {
                const provider = e.target.value as AIProvider;
                const preset = PROVIDER_PRESETS[provider];
                updateAI('provider', provider);
                updateAI('endpoint', preset.endpoint);
                if (preset.models.length > 0) {
                  updateAI('model', preset.models[0]);
                }
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="openrouter">OpenRouter</option>
              <option value="gemini">Google Gemini</option>
              <option value="deepseek">DeepSeek</option>
              <option value="opencode">OpenCode (via OpenRouter)</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="settings-group">
            <label className="settings-label">API Endpoint</label>
            <input
              type="text"
              className="settings-text-input"
              value={settings.ai.endpoint}
              onChange={(e) => updateAI('endpoint', e.target.value)}
              placeholder={PROVIDER_PRESETS[settings.ai.provider]?.endpoint || 'https://api.example.com/v1/chat/completions'}
            />
          </div>

          <div className="settings-group">
            <label className="settings-label">API Key</label>
            <input
              type="password"
              className="settings-text-input"
              value={settings.ai.apiKey}
              onChange={(e) => updateAI('apiKey', e.target.value)}
              placeholder={PROVIDER_PRESETS[settings.ai.provider]?.keyPlaceholder || 'sk-...'}
            />
          </div>

          <div className="settings-group">
            <label className="settings-label">Model</label>
            <div className="settings-model-row">
              <input
                type="text"
                className="settings-text-input settings-model-input"
                value={settings.ai.model}
                onChange={(e) => updateAI('model', e.target.value)}
                list="ai-models"
              />
              <datalist id="ai-models">
                {PROVIDER_PRESETS[settings.ai.provider]?.models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label">
              Temperature: {settings.ai.temperature.toFixed(1)}
            </label>
            <div className="settings-range-wrapper">
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                className="settings-range"
                value={settings.ai.temperature}
                onChange={(e) => updateAI('temperature', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label">
              Max Tokens: {settings.ai.maxTokens}
            </label>
            <div className="settings-range-wrapper">
              <input
                type="range"
                min="256"
                max="16384"
                step="256"
                className="settings-range"
                value={settings.ai.maxTokens}
                onChange={(e) => updateAI('maxTokens', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label">System Prompt</label>
            <textarea
              className="settings-textarea"
              rows={3}
              value={settings.ai.systemPrompt}
              onChange={(e) => updateAI('systemPrompt', e.target.value)}
              placeholder="You are a helpful programming assistant..."
            />
          </div>

          <div className="settings-group-title">AI Tools</div>

          <div className="settings-group">
            <label className="settings-label">
              <input
                type="checkbox"
                className="settings-checkbox"
                checked={settings.ai.toolsEnabled}
                onChange={(e) => updateAI('toolsEnabled', e.target.checked)}
              />
              Enable Tools (read/write files, run commands)
            </label>
            {settings.ai.toolsEnabled && (
              <p className="settings-hint">
                The AI can read/write files and list directories automatically.
                Running shell commands requires your approval each time.
              </p>
            )}
          </div>

          <div className="settings-group-title">Workspace Folders</div>

          <WorkspaceFoldersSection folders={settings.workspaceFolders} onChange={(folders) => update('workspaceFolders', folders)} />

          <div className="settings-group-title">Marketplace Repositories</div>

          <MarketplaceReposSection />
        </div>
      </div>
    </div>
  );
}

function WorkspaceFoldersSection({ folders, onChange }: { folders: string[]; onChange: (folders: string[]) => void }) {
  const [newFolder, setNewFolder] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addFolder = async () => {
    const trimmed = newFolder.trim();
    if (!trimmed) {
      const path = await window.api.dialog.openFolder();
      if (path) {
        onChange([...folders, path]);
      }
      return;
    }
    onChange([...folders, trimmed]);
    setNewFolder('');
    inputRef.current?.focus();
  };

  const removeFolder = (folder: string) => {
    onChange(folders.filter((f) => f !== folder));
  };

  return (
    <div className="settings-repo-section">
      <div className="settings-repo-input-row">
        <input
          ref={inputRef}
          type="text"
          className="settings-text-input"
          placeholder="Folder path or click Add to browse..."
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addFolder()}
        />
        <button className="marketplace-repo-add-btn" onClick={addFolder}>Add</button>
      </div>
      <div className="settings-repo-list">
        {folders.length === 0 ? (
          <p className="settings-hint" style={{ margin: '4px 0' }}>No additional workspace folders</p>
        ) : (
          folders.map((f) => (
            <div key={f} className="settings-repo-item">
              <span className="settings-repo-name">{f.split('/').pop()} — <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f}</span></span>
              <button className="settings-repo-remove-btn" onClick={() => removeFolder(f)} title="Remove">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                  <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MarketplaceReposSection() {
  const [repos, setRepos] = useState<string[]>([]);
  const [newRepo, setNewRepo] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadRepos(); }, []);

  async function loadRepos() {
    try { setRepos(await window.api.plugins.marketplaceGetRepos()); } catch {}
  }

  async function addRepo() {
    const trimmed = newRepo.trim();
    if (!trimmed) return;
    setAdding(true);
    const result = await window.api.plugins.marketplaceAddRepo(trimmed);
    setAdding(false);
    if (result.success) {
      setNewRepo('');
      loadRepos();
    } else {
      alert(result.error || 'Failed to add repo');
    }
  }

  async function removeRepo(repo: string) {
    await window.api.plugins.marketplaceRemoveRepo(repo);
    loadRepos();
  }

  return (
    <div className="settings-repo-section">
      <div className="settings-repo-input-row">
        <input
          type="text"
          className="settings-text-input"
          placeholder="user/repo/branch"
          value={newRepo}
          onChange={(e) => setNewRepo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRepo()}
        />
        <button className="marketplace-repo-add-btn" onClick={addRepo} disabled={!newRepo.trim() || adding}>
          {adding ? '...' : 'Add'}
        </button>
      </div>
      <div className="settings-repo-list">
        {repos.length === 0 ? (
          <p className="settings-hint" style={{ margin: '4px 0' }}>No custom repositories added</p>
        ) : (
          repos.map((r) => (
            <div key={r} className="settings-repo-item">
              <span className="settings-repo-name">{r}</span>
              <button className="settings-repo-remove-btn" onClick={() => removeRepo(r)} title="Remove">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                  <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
