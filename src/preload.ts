import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  },
  fs: {
    getFileTree: (dirPath: string, showHidden?: boolean) => ipcRenderer.invoke('fs:getFileTree', dirPath, showHidden),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    createFile: (dirPath: string, name: string) => ipcRenderer.invoke('fs:createFile', dirPath, name),
    createDirectory: (parentPath: string, name: string) => ipcRenderer.invoke('fs:createDirectory', parentPath, name),
    deleteEntry: (entryPath: string) => ipcRenderer.invoke('fs:deleteEntry', entryPath),
    renameEntry: (oldPath: string, newName: string) => ipcRenderer.invoke('fs:renameEntry', oldPath, newName),
    searchFiles: (rootPath: string, query: string, pattern: string) => ipcRenderer.invoke('fs:searchFiles', rootPath, query, pattern),
    getFileContent: (filePath: string) => ipcRenderer.invoke('fs:getFileContent', filePath),
  },
  git: {
    status: (dir: string) => ipcRenderer.invoke('git:status', dir),
    branch: (dir: string) => ipcRenderer.invoke('git:branch', dir),
    log: (dir: string) => ipcRenderer.invoke('git:log', dir),
  },
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  },
  terminal: {
    create: (id: string) => ipcRenderer.invoke('terminal:create', id),
    write: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    kill: (id: string) => ipcRenderer.invoke('terminal:kill', id),
    onOutput: (id: string, callback: (data: string) => void) => {
      const handler = (_event: any, dataId: string, data: string) => { if (dataId === id) callback(data); };
      ipcRenderer.on('terminal-output', handler);
      return () => ipcRenderer.removeListener('terminal-output', handler);
    },
    onExit: (id: string, callback: () => void) => {
      const handler = (_event: any, dataId: string) => { if (dataId === id) callback(); };
      ipcRenderer.on('terminal-exit', handler);
      return () => ipcRenderer.removeListener('terminal-exit', handler);
    },
  },
  ai: {
    chat: (messages: any[], aiSettings: any, rootPath?: string | null) => ipcRenderer.invoke('ai:chat', messages, aiSettings, rootPath),
    loadMessages: () => ipcRenderer.invoke('ai:loadMessages'),
    saveMessages: (messages: any[]) => ipcRenderer.invoke('ai:saveMessages', messages),
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'menu-open-folder', 'menu-save', 'menu-save-all', 'menu-new-file', 'menu-new-window',
      'menu-close-tab', 'menu-open-settings', 'menu-command-palette', 'menu-search-files',
      'menu-toggle-sidebar', 'menu-toggle-terminal', 'menu-zen-mode', 'menu-show-problems',
      'menu-go-to-line', 'menu-shortcuts', 'menu-about', 'menu-ai-toggle',
      'fs-file-changed', 'theme-changed',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },
  removeAllListeners: (channel: string) => { ipcRenderer.removeAllListeners(channel); },
});
