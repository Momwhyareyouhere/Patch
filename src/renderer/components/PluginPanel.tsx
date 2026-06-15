import type { PluginInfo } from '../types';

interface Props {
  plugins: PluginInfo[];
  pluginStates: Record<string, boolean>;
  onToggle: (id: string, enabled: boolean) => void;
  onReload: () => void;
  onOpenPlugin: (plugin: PluginInfo) => void;
}

export default function PluginPanel({ plugins, pluginStates, onToggle, onReload, onOpenPlugin }: Props) {
  return (
    <div className="plugin-panel">
      <div className="plugin-panel-header">
        <span className="plugin-panel-title">Plugins</span>
        <button className="icon-btn" onClick={onReload} title="Reload plugins">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path fillRule="evenodd" d="M8 3a5 5 0 00-5 5 .5.5 0 01-1 0 6 6 0 1111.627-2.206.5.5 0 11-.93.364A5 5 0 008 3zm2.854 5.146a.5.5 0 01.708 0A5 5 0 115 8a.5.5 0 111 0 4 4 0 106.146-3.416.5.5 0 11.708-.708A4.983 4.983 0 0116 8a5 5 0 01-4.854 5.146.5.5 0 01-.708-.708A4 4 0 009.5 6.207V7.5a.5.5 0 01-1 0V5.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-.793a5 5 0 012.146 2.146z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {plugins.length === 0 ? (
        <div className="plugin-empty">
          <p>No plugins found</p>
          <p className="plugin-hint">
            Create <code>~/.patch/init.js</code> to customize Patch or add plugins to <code>~/.patch/plugins/</code>
          </p>
        </div>
      ) : (
        <div className="plugin-list">
          {plugins.map((p) => (
            <div key={p.id} className="plugin-item" onClick={() => onOpenPlugin(p)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onOpenPlugin(p); }}>
              <label className="plugin-toggle" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={pluginStates[p.id] !== false} onChange={(e) => onToggle(p.id, e.target.checked)} />
                <span className="plugin-toggle-slider" />
              </label>
              <div className="plugin-info">
                <div className="plugin-name">{p.name}</div>
                <div className="plugin-meta">
                  <span className="plugin-badge">{p.type === 'init' ? 'init' : 'v' + p.version}</span>
                  {p.description && <span className="plugin-desc">{p.description}</span>}
                </div>
              </div>
              <svg className="plugin-chevron" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path d="M6.646 4.646a.5.5 0 01.708 0L10 7.293a.5.5 0 010 .708l-2.646 2.646a.5.5 0 01-.708-.708L8.793 7.5 6.646 5.354a.5.5 0 010-.708z" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
