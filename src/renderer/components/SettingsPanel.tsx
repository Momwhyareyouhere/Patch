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
            <label className="settings-label">Theme</label>
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
        </div>
      </div>
    </div>
  );
}
