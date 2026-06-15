import Editor from '@monaco-editor/react';
import type { OpenTab, EditorSettings, PluginInfo } from '../types';
import ImagePreview from './ImagePreview';

interface Props {
  tab: OpenTab;
  onChange: (path: string, content: string) => void;
  settings: EditorSettings;
  onCursorChange?: (line: number, col: number) => void;
  editorRef?: React.MutableRefObject<any>;
  pluginStates?: Record<string, boolean>;
  onPluginToggle?: (id: string, enabled: boolean) => void;
  onPluginUninstall?: (plugin: PluginInfo) => void;
  onMarketplaceInstall?: (id: string, repo: string) => Promise<void>;
}

function renderMarkdown(text: string) {
  const html = text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d\. (.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr>')
    .split('\n\n').map((b) => `<p>${b.replace(/\n/g, '<br>')}</p>`).join('');
  return `<div class="md-content">${html}</div>`;
}

export default function MonacoEditor({ tab, onChange, settings, onCursorChange, editorRef, pluginStates, onPluginToggle, onPluginUninstall, onMarketplaceInstall }: Props) {
  if (tab.language === 'image') {
    return <ImagePreview src={tab.content} name={tab.name} />;
  }

  if (tab.path.startsWith('plugin-info://')) {
    let plugin: PluginInfo | null = null;
    let readme = '';
    let isMarketplace = false;
    let marketplaceInstalled = false;
    let marketplaceRepo = '';
    try {
      const data = JSON.parse(tab.content);
      isMarketplace = data.isMarketplace === true;
      marketplaceInstalled = data.installed === true;
      marketplaceRepo = data.repo || '';
      plugin = data as PluginInfo;
      readme = data.readme || '';
    } catch {}
    if (plugin) {
      const enabled = pluginStates?.[plugin.id] !== false;
      return (
        <div className="plugin-detail">
          <div className="plugin-detail-header">
            <div>
              <h2 className="plugin-detail-name">{plugin.name}</h2>
              <div className="plugin-detail-meta">
                <span className="plugin-badge">v{plugin.version}</span>
                {isMarketplace && <span className="plugin-badge" style={{ background: 'var(--accent)', color: '#fff' }}>marketplace</span>}
              </div>
            </div>
          </div>
          {isMarketplace && (plugin as any).author && <p className="plugin-detail-description">Author: {(plugin as any).author}</p>}
          {plugin.description && <p className="plugin-detail-description">{plugin.description}</p>}
          <div className="plugin-detail-actions">
            {isMarketplace && !marketplaceInstalled ? (
              <button className="marketplace-install-btn" onClick={() => onMarketplaceInstall?.(plugin!.id, marketplaceRepo)}>
                Install
              </button>
            ) : (
              <>
                <label className="plugin-detail-toggle">
                  <span>{enabled ? 'Enabled' : 'Disabled'}</span>
                  <input type="checkbox" checked={enabled} onChange={(e) => onPluginToggle?.(plugin!.id, e.target.checked)} />
                  <span className="plugin-toggle-slider" />
                </label>
                {plugin.dirPath && (
                  <button className="plugin-uninstall-btn" onClick={() => onPluginUninstall?.(plugin!)}>
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                      <path d="M6.5 1h3a.5.5 0 01.5.5v1H6v-1a.5.5 0 01.5-.5zM11 2.5v-1A1.5 1.5 0 009.5 0h-3A1.5 1.5 0 005 1.5v1H2.506a.58.58 0 00-.01 0H1.5a.5.5 0 000 1h.538l.853 10.66A2 2 0 004.885 16h6.23a2 2 0 001.994-1.84l.853-10.66h.538a.5.5 0 000-1h-1.5a.58.58 0 00-.01 0H11zm1.958 1l-.846 10.58a1 1 0 01-.997.92h-6.23a1 1 0 01-.997-.92L3.042 3.5h9.916zm-7.487 1a.5.5 0 01.528.47l.5 8.5a.5.5 0 01-.998.06L5 5.03a.5.5 0 01.47-.53zm5.058 0a.5.5 0 01.47.53l-.5 8.5a.5.5 0 11-.998-.06l.5-8.5a.5.5 0 01.528-.47z" />
                    </svg>
                    Uninstall
                  </button>
                )}
              </>
            )}
          </div>
          <div className="plugin-detail-section">
            {readme ? (
              <div className="plugin-detail-readme-wrap plugin-readme">
                <div
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(readme) }}
                />
              </div>
            ) : (
              <p className="plugin-detail-no-readme">No README available</p>
            )}
          </div>
        </div>
      );
    }
  }

  const isOutput = tab.path.startsWith('output://');

  if (isOutput && tab.language === 'markdown') {
    return (
      <div
        className="md-preview"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(tab.content) }}
      />
    );
  }

  return (
    <Editor
      key={tab.path + tab.language + settings.theme}
      theme={settings.theme}
      language={tab.language}
      value={tab.content}
      onChange={(value) => {
        if (!isOutput) onChange(tab.path, value || '');
      }}
      onMount={(editor) => {
        if (editorRef) editorRef.current = editor;
        if (onCursorChange) {
          editor.onDidChangeCursorPosition((e) => {
            onCursorChange(e.position.lineNumber, e.position.column);
          });
        }
      }}
      options={{
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        fontLigatures: true,
        lineNumbers: settings.lineNumbers,
        minimap: { enabled: settings.minimap, showSlider: 'mouseover' },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        renderLineHighlight: 'all',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        formatOnPaste: true,
        padding: { top: 8 },
        readOnly: isOutput,
        domReadOnly: isOutput,
      }}
    />
  );
}
