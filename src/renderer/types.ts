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
  beforeContext?: string[];
  afterContext?: string[];
}

export interface SearchOptions {
  isRegex?: boolean;
  matchCase?: boolean;
  wholeWord?: boolean;
  excludePattern?: string;
  contextLines?: number;
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
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    keyPlaceholder: 'AIza... from https://aistudio.google.com/app/apikey',
    noKeyRequired: false,
  },
  deepseek: {
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-flash-free'],
    keyPlaceholder: 'sk-... from https://platform.deepseek.com/api_keys',
    noKeyRequired: false,
  },
  ollama: {
    label: 'Ollama (Local)',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    models: ['llama3', 'llama3.1', 'mistral', 'codellama', 'deepseek-coder', 'mixtral', 'phi3'],
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
    provider: 'opencode',
    apiKey: '',
    endpoint: 'https://opencode.ai/zen/v1/chat/completions',
    model: 'deepseek-v4-flash-free',
    systemPrompt: 'You are a concise AI coding assistant. Do the task and reply in as few words as possible. Never include "how to run" instructions, feature lists, pleasantries, or follow-up questions like "let me know if you want changes". Just state what was done and show the relevant code if needed. Use markdown only for code blocks — no headings, no lists, no formatting fluff.',
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

export type SidebarView = string;

export interface PluginSidebarView {
  id: string;
  label: string;
  icon: string;
  render: () => string;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  path: string;
  dirPath?: string;
  type: 'init' | 'plugin';
  enabled: boolean;
}

export interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  repo: string;
  installed: boolean;
}

export interface PatchAPI {
  editor: {
    getActiveTab: () => OpenTab | null;
    getContent: () => string;
    setContent: (text: string) => void;
    getSelection: () => any;
    getMonacoEditor: () => any;
    createOutputTab: (name: string, content: string, language?: string) => void;
  };
  ui: {
    addStatus: (text: string) => void;
    registerSidebarView: (id: string, label: string, icon: string, render: () => string) => void;
  };
  commands: {
    register: (id: string, label: string, action: () => void, shortcut?: string) => void;
  };
  monaco: any;
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<boolean>;
    getFileTree: (dirPath: string, showHidden?: boolean) => Promise<FileNode[]>;
  };
  git: {
    status: (dir: string) => Promise<GitFile[]>;
    branch: (dir: string) => Promise<string | null>;
  };
  exec: (command: string) => Promise<string>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
  internal: {
    editorRef: any;
    rootPath: string | null;
    fileTree: FileNode[];
    tabs: OpenTab[];
    activeTabPath: string | null;
  };
}

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
  file: {
    getPath: (file: File) => string;
  };
  app: {
    setTitle: (title: string) => Promise<void>;
  };
  dialog: { openFolder: () => Promise<string | null> };
  fs: {
    getFileTree: (dirPath: string, showHidden?: boolean) => Promise<FileNode[]>;
    readFile: (filePath: string) => Promise<FileInfo>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    createFile: (dirPath: string, name: string) => Promise<{ path: string; name: string }>;
    createDirectory: (parentPath: string, name: string) => Promise<{ path: string; name: string }>;
    deleteEntry: (entryPath: string) => Promise<boolean>;
    renameEntry: (oldPath: string, newName: string) => Promise<{ path: string; name: string }>;
    moveEntry: (srcPath: string, destDir: string) => Promise<{ path: string; name: string }>;
    searchFiles: (rootPath: string, query: string, pattern: string, options?: SearchOptions) => Promise<SearchResult[]>;
    getFileContent: (filePath: string) => Promise<string>;
    copyFile: (src: string, dest: string) => Promise<boolean>;
    watchFolder: (dirPath: string) => Promise<boolean>;
  };
  git: {
    status: (dir: string) => Promise<GitFile[]>;
    branch: (dir: string) => Promise<string | null>;
    log: (dir: string) => Promise<{ hash: string; message: string }[]>;
    add: (dir: string, filePath: string) => Promise<boolean>;
    unstage: (dir: string, filePath: string) => Promise<boolean>;
    commit: (dir: string, message: string) => Promise<string>;
    diff: (dir: string, filePath: string, staged: boolean) => Promise<string>;
    push: (dir: string) => Promise<string>;
    pull: (dir: string) => Promise<string>;
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
  plugins: {
    scan: () => Promise<PluginInfo[]>;
    read: (pluginPath: string) => Promise<string | null>;
    exec: (command: string) => Promise<string>;
    readme: (dirPath: string) => Promise<string | null>;
    uninstall: (dirPath: string) => Promise<boolean>;
    marketplaceList: () => Promise<MarketplacePlugin[]>;
    marketplaceReadme: (repo: string, pluginId: string) => Promise<string | null>;
    marketplaceInstall: (id: string, repo?: string) => Promise<{ success: boolean; error?: string }>;
    marketplaceGetRepos: () => Promise<string[]>;
    marketplaceAddRepo: (repo: string) => Promise<{ success: boolean; error?: string }>;
    marketplaceRemoveRepo: (repo: string) => Promise<{ success: boolean; error?: string }>;
  };
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window { api: Api; }
}
