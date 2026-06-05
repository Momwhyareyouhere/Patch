import { useState, useRef, useEffect, useCallback } from 'react';
import type { AIChatMessage, AISettings, AIProvider } from '../types';
import { PROVIDER_PRESETS } from '../types';

interface Props {
  settings: AISettings;
  rootPath: string | null;
  onSettingsChange?: (settings: AISettings) => void;
  onInsertCode?: (code: string) => void;
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'OpenAI', anthropic: 'Anthropic', openrouter: 'OpenRouter', opencode: 'OpenCode', gemini: 'Gemini', deepseek: 'DeepSeek', ollama: 'Ollama', custom: 'Custom',
};

export default function AIPanel({ settings, rootPath, onSettingsChange, onInsertCode }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    window.api.ai.loadMessages().then((saved: any[]) => {
      setMessages(saved || []);
      setMessagesLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (messagesLoaded) {
      window.api.ai.saveMessages(messages);
    }
  }, [messages, messagesLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    window.api.ai.saveMessages([]);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError(null);

    const userMsg: any = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const response = await window.api.ai.chat(updated, settings, rootPath);
      const assistantMsg: any = { role: 'assistant', content: response || '(tool operations completed)' };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, settings]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleProviderChange = (provider: AIProvider) => {
    if (!onSettingsChange) return;
    const preset = PROVIDER_PRESETS[provider];
    onSettingsChange({
      ...settings,
      provider,
      endpoint: preset.endpoint,
      model: preset.models[0] || settings.model,
    });
  };

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <select
          className="ai-provider-select"
          value={settings.provider}
          onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
        >
          {(['openai', 'anthropic', 'openrouter', 'opencode', 'gemini', 'deepseek', 'ollama', 'custom'] as AIProvider[]).map((p) => (
            <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
          ))}
        </select>
        <div className="ai-panel-actions">
          <span className="ai-model-badge" title={settings.model}>{settings.model}</span>
          {messages.length > 0 && (
            <button className="icon-btn" onClick={clearChat} title="Clear Chat">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path d="M2.5 1a1 1 0 00-1 1v1a1 1 0 001 1H3v9a2 2 0 002 2h6a2 2 0 002-2V4h.5a1 1 0 001-1V2a1 1 0 00-1-1H10a1 1 0 00-1-1H7a1 1 0 00-1 1H2.5zm3 4a.5.5 0 01.5.5v7a.5.5 0 01-1 0v-7a.5.5 0 01.5-.5zM8 5a.5.5 0 01.5.5v7a.5.5 0 01-1 0v-7A.5.5 0 018 5zm3 .5v7a.5.5 0 01-1 0v-7a.5.5 0 011 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="ai-panel-messages">
        {messages.length === 0 && (
          <div className="ai-panel-empty">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <path d="M12 2a10 10 0 00-7.07 17.07l-1.41 1.41a.5.5 0 00.35.85H12a10 10 0 100-20z" />
              <path d="M8 10h8M8 14h5" strokeLinecap="round" />
            </svg>
            <p>Ask me anything about your code</p>
            {!settings.apiKey && settings.provider !== 'ollama' && settings.provider !== 'opencode' && settings.provider !== 'gemini' && (
              <p className="ai-panel-hint">
                Set your {PROVIDER_LABELS[settings.provider]} API key in Settings → AI Configuration
              </p>
            )}
            {settings.provider === 'ollama' && (
              <p className="ai-panel-hint">
                Make sure Ollama is running locally (ollama serve)
              </p>
            )}
            {settings.provider === 'opencode' && !settings.apiKey && (
              <p className="ai-panel-hint">
                Big Pickle — no key needed
              </p>
            )}
            {settings.provider === 'gemini' && !settings.apiKey && (
              <p className="ai-panel-hint">
                Get a free API key at https://aistudio.google.com/app/apikey
              </p>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`ai-message ai-message-${msg.role}`}>
            <div className="ai-message-avatar">
              {msg.role === 'user' ? (
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--accent)">
                  <path d="M12 2a10 10 0 00-7.07 17.07l-1.41 1.41a.5.5 0 00.35.85H12a10 10 0 100-20z" />
                </svg>
              )}
            </div>
            <div className="ai-message-content">
              <MessageContent content={msg.content} onCopy={copyCode} onInsert={onInsertCode} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="ai-message ai-message-assistant">
            <div className="ai-message-avatar">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--accent)">
                <path d="M12 2a10 10 0 00-7.07 17.07l-1.41 1.41a.5.5 0 00.35.85H12a10 10 0 100-20z" />
              </svg>
            </div>
            <div className="ai-message-content">
              <div className="ai-typing"><span /><span /><span /></div>
            </div>
          </div>
        )}
        {error && (
          <div className="ai-message ai-message-error">
            <div className="ai-message-avatar">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="var(--danger)">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7.5 4.5v4a.5.5 0 011 0v-4a.5.5 0 00-1 0zM8 11a.75.75 0 100-1.5A.75.75 0 008 11z" />
              </svg>
            </div>
            <div className="ai-message-content">
              <span style={{ color: 'var(--danger)' }}>{error}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-panel-input">
        <textarea
          ref={inputRef}
          className="ai-textarea"
          placeholder={settings.apiKey || settings.provider === 'ollama' ? 'Ask AI...' : 'Configure API key in Settings first...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={loading || (!settings.apiKey && settings.provider !== 'ollama' && settings.provider !== 'opencode')}
        />
        <button
          className="ai-send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || loading || (!settings.apiKey && settings.provider !== 'ollama' && settings.provider !== 'opencode')}
          title="Send (Enter)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M1 1l14 7L1 15V9.5L11 8 1 6.5V1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function MessageContent({ content, onCopy, onInsert }: { content: string; onCopy: (code: string) => void; onInsert?: (code: string) => void }) {
  const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', language: match[1] || 'plaintext', content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return (
    <>
      {parts.map((part, i) =>
        part.type === 'code' ? (
          <div key={i} className="ai-code-block">
            <div className="ai-code-header">
              <span className="ai-code-lang">{part.language || 'code'}</span>
              <div className="ai-code-actions">
                <button className="ai-code-btn" onClick={() => onCopy(part.content)} title="Copy">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                    <path d="M4 1.5A1.5 1.5 0 005.5 3h5A1.5 1.5 0 0012 1.5V1h.5A1.5 1.5 0 0114 2.5v11a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 13.5v-11A1.5 1.5 0 013.5 1H4v.5z" />
                  </svg>
                  Copy
                </button>
                {onInsert && (
                  <button className="ai-code-btn" onClick={() => onInsert(part.content)} title="Insert into Editor">
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                      <path d="M1 3.5A1.5 1.5 0 012.5 2h11A1.5 1.5 0 0115 3.5v9a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9zM2.5 3a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-11z" />
                      <path d="M6 5l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Insert
                  </button>
                )}
              </div>
            </div>
            <pre className="ai-code-pre"><code>{part.content}</code></pre>
          </div>
        ) : (
          <p key={i} className="ai-text-block">{part.content}</p>
        )
      )}
    </>
  );
}
