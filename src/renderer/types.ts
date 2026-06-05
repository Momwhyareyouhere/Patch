export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface OpenTab {
  path: string;
  name: string;
  language: string;
  content: string;
  savedContent: string;
  isDirty: boolean;
}

export interface FileInfo {
  content: string;
  language: string;
  path: string;
  name: string;
}

export interface SearchResult {
  path: string;
  name: string;
  line: number;
  column: number;
  lineContent: string;
  matchLength: number;
}

export type AIProvider = 'openai' | 'anthropic' | 'openrouter' | 'opencode' | 'gemini' | 'deepseek' | 'ollama' | 'custom';

export interface AIProviderPreset {
  label: string;
  endpoint: string;
  models: string[];
  keyPlaceholder: string;
  anthropicFormat?: boolean;
  noKeyRequired?: boolean;
}

export const PROVIDER_PRESETS: Record<AIProvider, AIProviderPreset> = {
  openai: {
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    keyPlaceholder: 'sk-...',
  },
  anthropic: {
    label: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20240620'],
    keyPlaceholder: 'sk-ant-...',
    anthropicFormat: true,
  },
  openrouter: {
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    models: ['openai/gpt-4o', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5', 'meta-llama/llama-3.1-70b', 'opencode/big-pickle'],
    keyPlaceholder: 'sk-or-...',
  },
  opencode: {
    label: 'OpenCode',
    endpoint: 'https://opencode.ai/zen/v1/chat/completions',
    models: ['big-pickle'],
    keyPlaceholder: 'Free — no key needed',
    noKeyRequired: true,
  },
  gemini: {
    label: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    keyPlaceholder: 'AIza... from https://aistudio.google.com/app/apikey',
    noKeyRequired: false,
  },
  deepseek: {
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    keyPlaceholder: 'sk-... from https://platform.deepseek.com/api_keys',
    noKeyRequired: false,
  },
  ollama: {
    label: 'Ollama (Local)',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    keyPlaceholder: 'Not needed for local',
  },
  custom: {
    label: 'Custom',
    endpoint: '',
    models: ['custom'],
    keyPlaceholder: 'API key',
  },
};

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  endpoint: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  toolsEnabled: boolean;
}

export interface AIToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export type ToolResult = {
  tool_call_id: string;
  name: string;
  success: boolean;
  output: string;
};

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: 'off' | 'on' | 'wordWrapColumn';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  autoSave: boolean;
  autoSaveDelay: number;
  theme: 'vs-dark' | 'vs-light' | 'hc-black';
  showHiddenFiles: boolean;
  recentFolders: string[];
  zenMode: boolean;
  ai: AISettings;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  tabSize: 2,
  wordWrap: 'off',
  minimap: true,
  lineNumbers: 'on',
  autoSave: false,
  autoSaveDelay: 1000,
  theme: 'vs-dark',
  showHiddenFiles: false,
  recentFolders: [],
  zenMode: false,
  ai: {
    provider: 'openai',
    apiKey: '',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    systemPrompt: 'You are a helpful programming assistant. Provide concise, correct answers with code examples when relevant. You can also read, write files, list directories, and run shell commands to help the user.',
    temperature: 0.7,
    maxTokens: 4096,
    toolsEnabled: true,
  },
};

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

export type SidebarView = 'explorer' | 'search' | 'outline';

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatState {
  messages: AIChatMessage[];
  loading: boolean;
  error: string | null;
}

export interface Problem {
  filePath: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface GitFile {
  path: string;
  status: string;
}

export interface Api {
  dialog: { openFolder: () => Promise<string | null> };
  fs: {
    getFileTree: (dirPath: string, showHidden?: boolean) => Promise<FileNode[]>;
    readFile: (filePath: string) => Promise<FileInfo>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    createFile: (dirPath: string, name: string) => Promise<{ path: string; name: string }>;
    createDirectory: (parentPath: string, name: string) => Promise<{ path: string; name: string }>;
    deleteEntry: (entryPath: string) => Promise<boolean>;
    renameEntry: (oldPath: string, newName: string) => Promise<{ path: string; name: string }>;
    searchFiles: (rootPath: string, query: string, pattern: string) => Promise<SearchResult[]>;
    getFileContent: (filePath: string) => Promise<string>;
  };
  git: {
    status: (dir: string) => Promise<GitFile[]>;
    branch: (dir: string) => Promise<string | null>;
    log: (dir: string) => Promise<{ hash: string; message: string }[]>;
  };
  settings: {
    load: () => Promise<EditorSettings>;
    save: (settings: EditorSettings) => Promise<void>;
  };
  terminal: {
    create: (id: string) => Promise<boolean>;
    write: (id: string, data: string) => Promise<boolean>;
    resize: (id: string, cols: number, rows: number) => Promise<boolean>;
    kill: (id: string) => Promise<boolean>;
    onOutput: (id: string, callback: (data: string) => void) => () => void;
    onExit: (id: string, callback: () => void) => () => void;
  };
  ai: {
    chat: (messages: AIChatMessage[], settings: AISettings, rootPath?: string | null) => Promise<string>;
    loadMessages: () => Promise<any[]>;
    saveMessages: (messages: any[]) => Promise<void>;
  };
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window { api: Api; }
}
