import { useEffect, useState } from 'react';
import type { PluginInfo } from '../types';

interface Props {
  plugin: PluginInfo;
  enabled: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onUninstall: (id: string) => void;
  onClose: () => void;
}

export default function PluginDetail({ plugin, enabled, onToggle, onUninstall, onClose }: Props) {
  const [readme, setReadme] = useState<string | null>(null);
  const [uninstalling, setUninstalling] = useState(false);

  useEffect(() => {
    if (plugin.dirPath) {
      window.api.plugins.readme(plugin.dirPath).then(setReadme);
    }
  }, [plugin.dirPath]);

  const handleUninstall = async () => {
    if (!plugin.dirPath || !confirm(`Uninstall "${plugin.name}"?`)) return;
    setUninstalling(true);
    const ok = await window.api.plugins.uninstall(plugin.dirPath);
    if (ok) {
      onUninstall(plugin.id);
      onClose();
    } else {
      alert('Failed to uninstall plugin');
      setUninstalling(false);
    }
  };

  const renderReadme = () => {
    if (!readme) return null;
    const html = readme
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    return <div className="plugin-readme" dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />;
  };

  return (
    <div className="plugin-detail">
      <div className="plugin-detail-header">
        <div className="plugin-detail-title-row">
          <div className="plugin-detail-icon">
            <svg viewBox="0 0 16 16" width="24" height="24" fill="currentColor">
              <path d="M8 1.5a.5.5 0 01.5.5v4.5h4.5a.5.5 0 010 1H8.5V12a.5.5 0 01-1 0V7.5H3a.5.5 0 010-1h4.5V2a.5.5 0 01.5-.5z" />
            </svg>
          </div>
          <div className="plugin-detail-title-info">
            <h1 className="plugin-detail-name">{plugin.name}</h1>
            <div className="plugin-detail-meta">
              <span className="plugin-badge">{plugin.type === 'init' ? 'Init Script' : `v${plugin.version}`}</span>
              {plugin.type !== 'init' && <span className="plugin-detail-id">{plugin.id}</span>}
            </div>
          </div>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
          </svg>
        </button>
      </div>

      {plugin.description && (
        <p className="plugin-detail-description">{plugin.description}</p>
      )}

      <div className="plugin-detail-actions">
        <label className="plugin-detail-toggle">
          <span>Enabled</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(plugin.id, e.target.checked)}
          />
          <span className="plugin-toggle-slider" />
        </label>

        {plugin.dirPath && (
          <button
            className="plugin-uninstall-btn"
            onClick={handleUninstall}
            disabled={uninstalling}
          >
            {uninstalling ? 'Uninstalling...' : 'Uninstall'}
          </button>
        )}
      </div>

      {plugin.type !== 'init' && (
        <div className="plugin-detail-section">
          <h2 className="plugin-detail-section-title">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M2.146 2.854a.5.5 0 11.708-.708L8 7.293l5.146-5.147a.5.5 0 01.708.708L8.707 8l5.147 5.146a.5.5 0 01-.708.708L8 8.707l-5.146 5.147a.5.5 0 01-.708-.708L7.293 8 2.146 2.854z" />
            </svg>
            README
          </h2>
          <div className="plugin-detail-readme-wrap">
            {readme === null ? (
              <p className="plugin-detail-no-readme">Loading...</p>
            ) : readme ? (
              renderReadme()
            ) : (
              <p className="plugin-detail-no-readme">No README.md found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
