import { app, BrowserWindow, ipcMain, dialog, Menu, nativeImage, safeStorage } from 'electron';
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { watch, FSWatcher } from 'fs';
import { homedir } from 'os';
import { exec } from 'child_process';
import type { IPty } from 'node-pty';

let mainWindow: BrowserWindow | null = null;
let fileWatcher: FSWatcher | null = null;
let currentRootPath: string | null = null;

const SETTINGS_PATH = join(homedir(), '.patch-settings.json');
const AI_MESSAGES_PATH = join(homedir(), '.patch-ai-messages.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Patch',
    backgroundColor: '#1e1e1e',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(join(__dirname, 'renderer/index.html'));

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'Open Folder', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu-open-folder') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu-save') },
        { label: 'Save All', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('menu-save-all') },
        { type: 'separator' },
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-new-file') },
        { label: 'New Window', accelerator: 'CmdOrCtrl+Shift+N', click: () => mainWindow?.webContents.send('menu-new-window') },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => mainWindow?.webContents.send('menu-close-tab') },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('menu-open-settings') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Command Palette', accelerator: 'CmdOrCtrl+Shift+P', click: () => mainWindow?.webContents.send('menu-command-palette') },
        { label: 'Search in Files', accelerator: 'CmdOrCtrl+Shift+F', click: () => mainWindow?.webContents.send('menu-search-files') },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => mainWindow?.webContents.send('menu-toggle-sidebar') },
        { label: 'Toggle Terminal', accelerator: 'CmdOrCtrl+`', click: () => mainWindow?.webContents.send('menu-toggle-terminal') },
        { label: 'Zen Mode', accelerator: 'CmdOrCtrl+K Z', click: () => mainWindow?.webContents.send('menu-zen-mode') },
        { type: 'separator' },
        { label: 'Toggle AI Chat', accelerator: 'CmdOrCtrl+K I', click: () => mainWindow?.webContents.send('menu-ai-toggle') },
        { label: 'Problems', accelerator: 'CmdOrCtrl+Shift+M', click: () => mainWindow?.webContents.send('menu-show-problems') },
      ],
    },
    {
      label: 'Selection',
      submenu: [
        { label: 'Select All', role: 'selectAll' },
        { label: 'Expand Selection', accelerator: 'CmdOrCtrl+Shift+Right' },
        { label: 'Shrink Selection', accelerator: 'CmdOrCtrl+Shift+Left' },
        { type: 'separator' },
        { label: 'Go to Line', accelerator: 'CmdOrCtrl+G', click: () => mainWindow?.webContents.send('menu-go-to-line') },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About Patch', click: () => { dialog.showMessageBox(mainWindow!, { type: 'info', title: 'About Patch', message: 'Patch v1.0.0', detail: 'A lightweight code editor built with Electron, Monaco Editor, and React.\n\nCreated by Momwhyareyouhere.' }); } },
        { label: 'Keyboard Shortcuts', click: () => mainWindow?.webContents.send('menu-shortcuts') },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

async function getFileTree(dirPath: string, showHidden = false): Promise<any> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const result: any[] = [];
  for (const entry of entries) {
    if (!showHidden && entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules') continue;
    const fullPath = join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        result.push({
          name: entry.name,
          path: fullPath,
          type: 'directory',
          children: await getFileTree(fullPath, showHidden),
        });
      } else {
        result.push({ name: entry.name, path: fullPath, type: 'file' });
      }
    } catch {}
  }
  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return result;
}

function getLanguageFromExtension(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
    '.json': 'json', '.html': 'html', '.css': 'css', '.scss': 'scss', '.less': 'less',
    '.md': 'markdown', '.py': 'python', '.rs': 'rust', '.go': 'go', '.java': 'java',
    '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp', '.sql': 'sql', '.sh': 'shell',
    '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'plaintext', '.xml': 'xml', '.svg': 'xml',
    '.vue': 'html', '.svelte': 'html', '.php': 'php', '.rb': 'ruby', '.swift': 'swift',
    '.kt': 'kotlin', '.kts': 'kotlin', '.dart': 'dart', '.lua': 'lua', '.pl': 'perl', '.r': 'r',
    '.csv': 'plaintext', '.env': 'plaintext', '.gitignore': 'plaintext',
    '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image', '.ico': 'image',
    '.webp': 'image', '.bmp': 'image',
  };
  return map[ext] || 'plaintext';
}

async function searchInFiles(rootPath: string, query: string, pattern: string): Promise<any[]> {
  const results: any[] = [];
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const filePatternRegex = pattern ? new RegExp(pattern.replace(/\*/g, '.*'), 'i') : null;

  async function searchDir(dirPath: string) {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) { await searchDir(fullPath); }
        else {
          if (filePatternRegex && !filePatternRegex.test(entry.name)) continue;
          const content = await readFile(fullPath, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(lines[i])) !== null) {
              if (results.length >= 1000) return;
              results.push({
                path: fullPath, name: entry.name, line: i + 1,
                column: match.index + 1, lineContent: lines[i].trim(), matchLength: match[0].length,
              });
            }
          }
        }
      } catch {}
    }
  }
  await searchDir(rootPath);
  return results;
}

function setupFileWatcher(dirPath: string) {
  if (fileWatcher) fileWatcher.close();
  currentRootPath = dirPath;
  try {
    fileWatcher = watch(dirPath, { recursive: true }, (eventType, filename) => {
      if (filename && !filename.startsWith('.')) {
        mainWindow?.webContents.send('fs-file-changed');
      }
    });
  } catch {}
}

function encryptKey(key: string): string | null {
  try {
    if (!key || !safeStorage.isEncryptionAvailable()) return null;
    const buf = safeStorage.encryptString(key);
    return buf.toString('base64');
  } catch { return null; }
}

function decryptKey(encrypted: string): string | null {
  try {
    if (!encrypted || !safeStorage.isEncryptionAvailable()) return null;
    const buf = Buffer.from(encrypted, 'base64');
    return safeStorage.decryptString(buf);
  } catch { return null; }
}

async function loadSettings(): Promise<any> {
  try {
    const data = await readFile(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(data);
    if (settings.ai?._apiKeyEnc) {
      const decrypted = decryptKey(settings.ai._apiKeyEnc);
      if (decrypted !== null) settings.ai.apiKey = decrypted;
      else settings.ai.apiKey = '';
      delete settings.ai._apiKeyEnc;
    }
    return settings;
  } catch {
    return {
      fontSize: 14, fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      tabSize: 2, wordWrap: 'off', minimap: true, lineNumbers: 'on',
      autoSave: false, autoSaveDelay: 1000, theme: 'vs-dark',
      showHiddenFiles: false, recentFolders: [], zenMode: false,
      ai: {
        provider: 'opencode', apiKey: '',
        endpoint: 'https://opencode.ai/zen/v1/chat/completions', model: 'deepseek-v4-flash-free',
        systemPrompt: 'You are a helpful AI assistant integrated into a code editor. You have access to tools: read files, write files, run shell commands, list directories, delete files, launch apps, and search the web. Use tools when they would be helpful. Be concise and provide code examples when relevant.',
        temperature: 0.7, maxTokens: 4096, toolsEnabled: true,
      },
    };
  }
}

async function saveSettings(settings: any): Promise<void> {
  if (settings.ai?.apiKey) {
    const encrypted = encryptKey(settings.ai.apiKey);
    if (encrypted !== null) {
      settings.ai._apiKeyEnc = encrypted;
      delete settings.ai.apiKey;
    }
  }
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

function runGitCommand(dir: string, cmd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { cwd: dir }, (err, stdout) => resolve(err ? '' : stdout.trim()));
  });
}


async function readImageBase64(filePath: string): Promise<string | null> {
  try {
    const ext = extname(filePath).toLowerCase();
    const supported = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp'];
    if (!supported.includes(ext)) return null;
    const buffer = await readFile(filePath);
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
      '.webp': 'image/webp', '.bmp': 'image/bmp',
    };
    return `data:${mimeTypes[ext] || 'image/png'};base64,${buffer.toString('base64')}`;
  } catch { return null; }
}


ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, { properties: ['openDirectory'] });
  if (result.canceled) return null;
  const path = result.filePaths[0];
  setupFileWatcher(path);
  
  const settings = await loadSettings();
  const recents = [path, ...(settings.recentFolders || []).filter((f: string) => f !== path)].slice(0, 10);
  await saveSettings({ ...settings, recentFolders: recents });
  return path;
});

ipcMain.handle('fs:getFileTree', async (_event, dirPath: string, showHidden?: boolean) => {
  return getFileTree(dirPath, showHidden);
});

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  const ext = extname(filePath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.bmp'].includes(ext)) {
    const dataUrl = await readImageBase64(filePath);
    if (dataUrl) return { content: dataUrl, language: 'image', path: filePath, name: basename(filePath) };
  }
  const content = await readFile(filePath, 'utf-8');
  const lang = getLanguageFromExtension(filePath);
  return { content, language: lang, path: filePath, name: basename(filePath) };
});

ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  await writeFile(filePath, content, 'utf-8');
  return true;
});

ipcMain.handle('fs:createFile', async (_event, dirPath: string, name: string) => {
  const filePath = join(dirPath, name);
  await writeFile(filePath, '', 'utf-8');
  return { path: filePath, name };
});

ipcMain.handle('fs:createDirectory', async (_event, parentPath: string, name: string) => {
  const dirPath = join(parentPath, name);
  await mkdir(dirPath, { recursive: true });
  return { path: dirPath, name };
});

ipcMain.handle('fs:deleteEntry', async (_event, entryPath: string) => {
  const { rm } = await import('fs/promises');
  await rm(entryPath, { recursive: true, force: true });
  return true;
});

ipcMain.handle('fs:renameEntry', async (_event, oldPath: string, newName: string) => {
  const { rename } = await import('fs/promises');
  const dir = dirname(oldPath);
  const newPath = join(dir, newName);
  await rename(oldPath, newPath);
  return { path: newPath, name: newName };
});

ipcMain.handle('fs:searchFiles', async (_event, rootPath: string, query: string, pattern: string) => {
  return searchInFiles(rootPath, query, pattern);
});

ipcMain.handle('fs:getFileContent', async (_event, filePath: string) => {
  return readFile(filePath, 'utf-8');
});


ipcMain.handle('git:status', async (_event, dir: string) => {
  try {
    const output = await runGitCommand(dir, 'git status --porcelain');
    const files = output.split('\n').filter(Boolean).map((line: string) => ({
      path: line.substring(3).trim(),
      status: line.substring(0, 2).trim(),
    }));
    return files;
  } catch { return []; }
});

ipcMain.handle('git:branch', async (_event, dir: string) => {
  try {
    const branch = await runGitCommand(dir, 'git rev-parse --abbrev-ref HEAD');
    return branch || null;
  } catch { return null; }
});

ipcMain.handle('git:log', async (_event, dir: string) => {
  try {
    const output = await runGitCommand(dir, 'git log --oneline -10');
    return output.split('\n').filter(Boolean).map((line: string) => {
      const [hash, ...msg] = line.split(' ');
      return { hash, message: msg.join(' ') };
    });
  } catch { return []; }
});


const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file at the given absolute path.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Absolute path to the file' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file. Creates the file if it does not exist, overwrites if it does.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file' },
          content: { type: 'string', description: 'Content to write to the file' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Run a shell command. The user will be asked to approve execution.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Shell command to execute' } },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List files and directories in a given path.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Directory path to list' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Delete a file or empty directory at the given path. Requires user confirmation.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Absolute path to the file or directory to delete' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'launch_app',
      description: 'Launch a desktop application by name (e.g. firefox, code, terminal).',
      parameters: {
        type: 'object',
        properties: { app: { type: 'string', description: 'Application name to launch' } },
        required: ['app'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web by opening the default browser with the query.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search terms' } },
        required: ['query'],
      },
    },
  },
];

async function executeToolCall(toolCall: any, rootPath?: string | null): Promise<{ output: string; success: boolean }> {
  const args = JSON.parse(toolCall.function.arguments || '{}');
  const name = toolCall.function.name;

  
  if (args.path && rootPath && !args.path.startsWith('/')) {
    args.path = join(rootPath, args.path);
  }

  try {
    switch (name) {
      case 'read_file': {
        const { readFile } = await import('fs/promises');
        const content = await readFile(args.path, 'utf-8');
        const lines = content.split('\n');
        const truncated = lines.length > 500 ? [...lines.slice(0, 500), `... (${lines.length - 500} more lines)`] : lines;
        return { success: true, output: truncated.join('\n') };
      }
      case 'write_file': {
        const { writeFile, mkdir } = await import('fs/promises');
        const { dirname } = await import('path');
        await mkdir(dirname(args.path), { recursive: true });
        await writeFile(args.path, args.content, 'utf-8');
        return { success: true, output: `Written ${args.content.length} bytes to ${args.path}` };
      }
      case 'run_command': {
        const { dialog } = await import('electron');
        const { exec } = await import('child_process');
        const result = await dialog.showMessageBox(mainWindow!, {
          type: 'warning',
          title: 'Run Command?',
          message: 'The AI wants to run this command:',
          detail: args.command,
          buttons: ['Deny', 'Allow'],
          defaultId: 0,
          cancelId: 0,
        });
        if (result.response !== 1) return { success: false, output: 'Command execution denied by user.' };
        const cmdResult = await new Promise<string>((resolve) => {
          exec(args.command, { cwd: rootPath || currentRootPath || process.cwd(), timeout: 30000 },
            (err, stdout, stderr) => {
              if (err) resolve(`Exit code: ${err.code || 1}\n${stderr || err.message}`);
              else resolve(stdout || '(no output)');
            }
          );
        });
        const maxLen = 2000;
        return { success: true, output: cmdResult.length > maxLen ? cmdResult.slice(0, maxLen) + `\n... (truncated ${cmdResult.length - maxLen} chars)` : cmdResult };
      }
      case 'list_directory': {
        const { readdir } = await import('fs/promises');
        const entries = await readdir(args.path, { withFileTypes: true });
        const listing = entries.map((e: any) => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
        return { success: true, output: listing || '(empty directory)' };
      }
      case 'delete_file': {
        const { dialog } = await import('electron');
        const { rm } = await import('fs/promises');
        const result = await dialog.showMessageBox(mainWindow!, {
          type: 'warning',
          title: 'Delete?',
          message: 'The AI wants to delete this path:',
          detail: args.path,
          buttons: ['Cancel', 'Delete'],
          defaultId: 0,
          cancelId: 0,
        });
        if (result.response !== 1) return { success: false, output: 'Deletion cancelled by user.' };
        await rm(args.path, { recursive: true, force: true });
        return { success: true, output: `Deleted: ${args.path}` };
      }
      case 'launch_app': {
        const { exec } = await import('child_process');
        const platform = process.platform;
        let cmd: string;
        if (platform === 'win32') {
          cmd = `start "" "${args.app}"`;
        } else if (platform === 'darwin') {
          cmd = `open -a "${args.app}"`;
        } else {
          cmd = args.app.includes('/') ? args.app : `${args.app}`;
        }
        exec(cmd, (err) => {
          if (err) exec(`xdg-open "${args.app}"`, () => {});
        });
        return { success: true, output: `Launched: ${args.app}` };
      }
      case 'web_search': {
        const { exec } = await import('child_process');
        const query = encodeURIComponent(args.query);
        const platform = process.platform;
        if (platform === 'win32') {
          exec(`start https://www.google.com/search?q=${query}`);
        } else if (platform === 'darwin') {
          exec(`open https://www.google.com/search?q=${query}`);
        } else {
          exec(`xdg-open https://www.google.com/search?q=${query}`);
        }
        return { success: true, output: `Opened browser search for: ${args.query}` };
      }
      default:
        return { success: false, output: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { success: false, output: `Error: ${err.message}` };
  }
}

async function callAPI(endpoint: string, headers: Record<string, string>, body: any): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${errText}`);
    }
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    throw err;
  }
}

ipcMain.handle('ai:chat', async (_event, messages: any[], aiSettings: any, rootPath?: string | null) => {
  try {
    const isAnthropic = aiSettings.provider === 'anthropic';
    const isOpenCode = aiSettings.provider === 'opencode';
    const isGemini = aiSettings.provider === 'gemini';

    if (!aiSettings.apiKey && aiSettings.provider !== 'ollama' && aiSettings.provider !== 'opencode') {
      if (isGemini) {
        return 'Gemini requires a free API key. Get one at https://aistudio.google.com/app/apikey';
      }
      return 'Please configure your API key in Settings → AI Configuration to use this provider.';
    }

    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let endpoint = aiSettings.endpoint;

    if (isGemini) {
      headers['Authorization'] = `Bearer ${aiSettings.apiKey}`;
    } else if (isOpenCode) {
      if (aiSettings.apiKey) headers['Authorization'] = `Bearer ${aiSettings.apiKey}`;
      headers['HTTP-Referer'] = 'http://localhost:5173';
      headers['X-Title'] = 'Patch AI';
    } else if (isAnthropic) {
      headers['x-api-key'] = aiSettings.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${aiSettings.apiKey}`;
    }

    
    if (isOpenCode && !aiSettings.apiKey) {
      aiSettings.model = 'deepseek-v4-flash-free';
    }

    const buildPayload = (msgs: any[], useTools: boolean) => {
      if (isAnthropic) {
        const systemMsg = msgs.find((m: any) => m.role === 'system');
        const chatMessages = msgs.filter((m: any) => m.role !== 'system');
        return {
          model: aiSettings.model,
          max_tokens: aiSettings.maxTokens || 4096,
          temperature: aiSettings.temperature ?? 0.7,
          system: systemMsg?.content || aiSettings.systemPrompt || '',
          messages: chatMessages,
        };
      }
      const allMessages = [...msgs];
      let systemPrompt = aiSettings.systemPrompt || '';
      if (rootPath) {
        systemPrompt = `Current workspace: ${rootPath}\n\n${systemPrompt}`;
      }
      if (systemPrompt && !allMessages.some((m: any) => m.role === 'system')) {
        allMessages.unshift({ role: 'system', content: systemPrompt });
      }
      return {
        model: aiSettings.model,
        messages: allMessages,
        temperature: aiSettings.temperature ?? 0.7,
        max_tokens: aiSettings.maxTokens || 4096,
        ...(useTools && aiSettings.toolsEnabled !== false ? { tools: AI_TOOLS } : {}),
      };
    };

    
    const payload = buildPayload(messages, true);
    const data = await callAPI(endpoint, headers, payload);

    
    if (isAnthropic) {
      return data.content?.[0]?.text || '(no response)';
    }

    const choice = data.choices?.[0];
    if (!choice) return '(no response)';

    const toolCalls = choice.message?.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return choice.message?.content || '(no response)';
    }

    
    const assistantMsg = { role: 'assistant', content: choice.message?.content || null, tool_calls: toolCalls };
    const updatedMessages = [...messages, assistantMsg];

    for (const tc of toolCalls) {
      const result = await executeToolCall(tc, rootPath);
      updatedMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result.output,
      });
    }

    
    const payload2 = buildPayload(updatedMessages, false);
    const data2 = await callAPI(endpoint, headers, payload2);
    return data2.choices?.[0]?.message?.content || '(no response)';
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('401') || msg.includes('Authentication') || msg.includes('API key')) {
      if (isOpenCode) {
        throw new Error('OpenCode models: deepseek-v4-flash-free works without a key. For Big Pickle get a free key at https://opencode.ai');
      }
      throw new Error('Authentication failed. Check your API key in Settings → AI Configuration');
    }
    throw new Error(err.message || 'AI request failed');
  }
});




ipcMain.handle('settings:load', async () => loadSettings());
ipcMain.handle('settings:save', async (_event, settings: any) => {
  await saveSettings(settings);
  if (settings.theme) {
    mainWindow?.webContents.send('theme-changed', settings.theme);
  }
});


ipcMain.handle('ai:loadMessages', async () => {
  try {
    const data = await readFile(AI_MESSAGES_PATH, 'utf-8');
    return JSON.parse(data);
  } catch { return []; }
});
ipcMain.handle('ai:saveMessages', async (_event, messages: any[]) => {
  await writeFile(AI_MESSAGES_PATH, JSON.stringify(messages, null, 2), 'utf-8');
});


const terminals = new Map<string, IPty>();

ipcMain.handle('terminal:create', async (_event, id: string) => {
  const os = await import('os');
  const ptyModule = await import('node-pty');
  const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/bash');
  const term = ptyModule.spawn(shell, [], {
    name: 'xterm-256color', cols: 80, rows: 24,
    cwd: currentRootPath || process.cwd(), env: process.env as any,
  });
  term.onData((data: string) => mainWindow?.webContents.send('terminal-output', id, data));
  term.onExit(() => { mainWindow?.webContents.send('terminal-exit', id); terminals.delete(id); });
  terminals.set(id, term);
  return true;
});

ipcMain.handle('terminal:write', (_event, id: string, data: string) => {
  const term = terminals.get(id);
  if (term) term.write(data);
  return true;
});

ipcMain.handle('terminal:resize', (_event, id: string, cols: number, rows: number) => {
  const term = terminals.get(id);
  if (term) term.resize(cols, rows);
  return true;
});

ipcMain.handle('terminal:kill', (_event, id: string) => {
  const term = terminals.get(id);
  if (term) { term.kill(); terminals.delete(id); }
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (fileWatcher) fileWatcher.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
