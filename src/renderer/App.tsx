import { useState, useEffect, useCallback, useRef } from 'react';
import type { FileNode, OpenTab, EditorSettings, Command, SidebarView, Problem, GitFile, PluginInfo, PatchAPI, PluginSidebarView } from './types';
import { DEFAULT_SETTINGS } from './types';
import FileExplorer from './components/FileExplorer';
import SearchPanel from './components/SearchPanel';
import OutlinePanel from './components/OutlinePanel';
import TabBar from './components/TabBar';
import Editor from './components/Editor';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette';
import SettingsPanel from './components/SettingsPanel';
import TerminalPanel from './components/TerminalPanel';
import ProblemsPanel from './components/ProblemsPanel';
import Breadcrumbs from './components/Breadcrumbs';
import AIPanel from './components/AIPanel';
import GitPanel from './components/GitPanel';
import PluginPanel from './components/PluginPanel';
import MarketplacePanel from './components/MarketplacePanel';
import { createPatchAPI, executePluginCode, executePluginModule } from './pluginApi';
import type { PluginHost } from './pluginApi';

export default function App() {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [diffCompare, setDiffCompare] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Ready');
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [sidebarView, setSidebarView] = useState<SidebarView>('explorer');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [editorLine, setEditorLine] = useState(1);
  const [editorColumn, setEditorColumn] = useState(1);
  const [zenMode, setZenMode] = useState(false);
  const [gitBranch, setGitBranch] = useState<string | null>(null);
  const [gitFiles, setGitFiles] = useState<GitFile[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pluginCommands, setPluginCommands] = useState<Command[]>([]);
  const autoSaveTimerRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const gitIntervalRef = useRef<any>(null);
  const dragCounter = useRef(0);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [pluginStates, setPluginStates] = useState<Record<string, boolean>>({});
  const [pluginViews, setPluginViews] = useState<PluginSidebarView[]>([]);
  const pluginHostRef = useRef<PluginHost | null>(null);
  const tabsRef = useRef(tabs);
  const activeTabPathRef = useRef(activeTabPath);
  const rootPathRef = useRef(rootPath);
  const fileTreeRef = useRef(fileTree);

  tabsRef.current = tabs;
  activeTabPathRef.current = activeTabPath;
  rootPathRef.current = rootPath;
  fileTreeRef.current = fileTree;

  const activeTab = tabs.find((t) => t.path === activeTabPath) || null;

  const addStatus = useCallback((text: string) => {
    setStatusText(text);
    setTimeout(() => setStatusText('Ready'), 3000);
  }, []);

  
  useEffect(() => {
    window.api.settings.load().then(async (s) => {
      const merged = { ...DEFAULT_SETTINGS, ...s, ai: { ...DEFAULT_SETTINGS.ai, ...(s.ai || {}) } };
      setSettings(merged);
      setShowHidden(merged.showHiddenFiles);
      const folders = s.workspaceFolders && s.workspaceFolders.length > 0 ? s.workspaceFolders : s.recentFolders;
      if (folders.length > 0) {
        const last = folders[0];
        setRootPath(last);
        const tree = await window.api.fs.getFileTree(last, s.showHiddenFiles);
        setFileTree(tree);
        addStatus(`Opened folder: ${last}`);
      }
    });
  }, []);

  
  const saveSettingsRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveSettingsRef.current) clearTimeout(saveSettingsRef.current);
    saveSettingsRef.current = setTimeout(() => {
      window.api.settings.save(settings);
    }, 300);
  }, [settings]);

  useEffect(() => {
    const name = activeTab ? activeTab.name : (rootPath ? rootPath.split('/').pop() || 'Patch' : 'Patch');
    window.api.app.setTitle(name + ' - Patch');
  }, [activeTab, rootPath]);

  useEffect(() => {
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-hc');
    document.documentElement.classList.add('theme-' + settings.uiTheme);
    document.documentElement.style.setProperty('--accent', settings.accentColor);
    document.documentElement.style.setProperty('--status-bar-bg', settings.accentColor);
  }, [settings.uiTheme, settings.accentColor]);

  useEffect(() => {
    if (rootPath) window.api.fs.watchFolder(rootPath);
  }, [rootPath]);

  useEffect(() => {
    (async () => {
      const list = await window.api.plugins.scan();
      setPlugins(list);
      const states: Record<string, boolean> = {};
      list.forEach((p) => { states[p.id] = true; });
      setPluginStates(states);

      const { api, host } = createPatchAPI({
        editorRef,
        tabsRef,
        activeTabPathRef,
        rootPathRef,
        addStatus,
        setCommands: setPluginCommands,
        fileTreeRef,
        openOutputTab,
        registerSidebarView,
      });
      pluginHostRef.current = host;

      (window as any).patch = api;

      for (const p of list) {
        if (!p.enabled) continue;
        const code = await window.api.plugins.read(p.path);
        if (!code) continue;
        if (p.type === 'init') {
          executePluginCode(code, api);
        } else {
          executePluginModule(code, api);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!rootPath) return;
    const poll = async () => {
      const [branch, files] = await Promise.all([
        window.api.git.branch(rootPath),
        window.api.git.status(rootPath),
      ]);
      setGitBranch(branch);
      setGitFiles(files);
    };
    poll();
    gitIntervalRef.current = setInterval(poll, 5000);
    return () => { if (gitIntervalRef.current) clearInterval(gitIntervalRef.current); };
  }, [rootPath]);

  const loadFolder = useCallback(async (path: string) => {
    setRootPath(path);
    const tree = await window.api.fs.getFileTree(path, showHidden);
    setFileTree(tree);
    setTabs([]);
    setActiveTabPath(null);
    setSettings((s) => {
      const recent = [path, ...s.recentFolders.filter((f) => f !== path)].slice(0, 10);
      const workspace = s.workspaceFolders.includes(path) ? s.workspaceFolders : [path, ...s.workspaceFolders.filter((f) => f !== path)].slice(0, 10);
      return { ...s, recentFolders: recent, workspaceFolders: workspace };
    });
    addStatus(`Opened folder: ${path}`);
  }, [addStatus, showHidden]);

  const openFolder = useCallback(async () => {
    const path = await window.api.dialog.openFolder();
    if (path) loadFolder(path);
  }, [loadFolder]);

  const refreshTree = useCallback(async () => {
    if (rootPath) {
      const tree = await window.api.fs.getFileTree(rootPath, showHidden);
      setFileTree(tree);
    }
  }, [rootPath, showHidden]);

  const openFile = useCallback(async (filePath: string) => {
    const existing = tabs.find((t) => t.path === filePath);
    if (existing) { setActiveTabPath(filePath); return; }
    const info = await window.api.fs.readFile(filePath);
    const newTab: OpenTab = {
      path: info.path, name: info.name, language: info.language,
      content: info.content, savedContent: info.content, isDirty: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabPath(filePath);
    pluginHostRef.current?.emit('file:open', filePath, info);
    addStatus(`Opened: ${info.name}`);
  }, [tabs, addStatus]);

  const openDiff = useCallback(async (originalPath: string, modifiedPath: string, title?: string) => {
    const diffPath = 'diff://' + originalPath + '|<|' + modifiedPath;
    const existing = tabs.find((t) => t.path === diffPath);
    if (existing) { setActiveTabPath(diffPath); return; }
    const [origInfo, modInfo] = await Promise.all([
      window.api.fs.readFile(originalPath),
      modifiedPath.startsWith('output://') ? { content: modifiedPath.replace('output://', ''), language: 'plaintext' } : window.api.fs.readFile(modifiedPath),
    ]);
    const name = title || (origInfo.name.split('/').pop() || 'file') + ' ↔ ' + (modInfo.name.split('/').pop() || 'file');
    const diffTab: OpenTab = {
      path: diffPath,
      name,
      language: 'diff',
      content: JSON.stringify({ original: origInfo.content, modified: modInfo.content, language: origInfo.language }),
      savedContent: JSON.stringify({ original: origInfo.content, modified: modInfo.content, language: origInfo.language }),
      isDirty: false,
    };
    setTabs((prev) => [...prev, diffTab]);
    setActiveTabPath(diffPath);
    addStatus(`Diff: ${name}`);
  }, [tabs, addStatus]);

  const addWorkspaceFolder = useCallback(async () => {
    const path = await window.api.dialog.openFolder();
    if (path && rootPath) {
      setSettings((s) => {
        const ws = s.workspaceFolders.includes(path) ? s.workspaceFolders : [...s.workspaceFolders, path];
        return { ...s, workspaceFolders: ws };
      });
      addStatus(`Added folder to workspace: ${path.split('/').pop()}`);
    } else if (path && !rootPath) {
      loadFolder(path);
    }
  }, [rootPath, loadFolder, addStatus]);

  const closeTab = useCallback(async (filePath: string, saveFirst?: boolean) => {
    const tab = tabs.find((t) => t.path === filePath);
    if (!tab) return;
    if (saveFirst) await window.api.fs.writeFile(filePath, tab.content);
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.path === filePath);
      const next = prev.filter((t) => t.path !== filePath);
      if (activeTabPath === filePath) {
        if (next.length === 0) setActiveTabPath(null);
        else if (idx < next.length) setActiveTabPath(next[idx].path);
        else setActiveTabPath(next[next.length - 1].path);
      }
      return next;
    });
  }, [tabs, activeTabPath]);

  const saveFile = useCallback(async () => {
    if (!activeTab) return;
    if (activeTab.path.startsWith('output://')) return;
    await window.api.fs.writeFile(activeTab.path, activeTab.content);
    setTabs((prev) => prev.map((t) =>
      t.path === activeTab.path ? { ...t, savedContent: t.content, isDirty: false } : t
    ));
    pluginHostRef.current?.emit('file:save', activeTab.path, activeTab.content);
    addStatus(`Saved: ${activeTab.name}`);
  }, [activeTab, addStatus]);

  const saveAllFiles = useCallback(async () => {
    const dirtyTabs = tabs.filter((t) => t.isDirty && !t.path.startsWith('output://'));
    for (const tab of dirtyTabs) {
      await window.api.fs.writeFile(tab.path, tab.content);
    }
    setTabs((prev) => prev.map((t) => ({ ...t, savedContent: t.content, isDirty: false })));
    addStatus(`Saved ${dirtyTabs.length} file(s)`);
  }, [tabs, addStatus]);

  const updateTabContent = useCallback((filePath: string, content: string) => {
    setTabs((prev) => {
      const updated = prev.map((t) =>
        t.path === filePath ? { ...t, content, isDirty: content !== t.savedContent } : t
      );
      const changed = updated.find((t) => t.path === filePath);
      if (changed && settings.autoSave && changed.isDirty) {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
          await window.api.fs.writeFile(filePath, content);
          setTabs((prev2) => prev2.map((t) =>
            t.path === filePath ? { ...t, savedContent: content, isDirty: false } : t
          ));
        }, settings.autoSaveDelay);
      }
      return updated;
    });
  }, [settings]);

  const goToLocation = useCallback((filePath: string, line?: number) => {
    openFile(filePath);
    if (line && editorRef.current) {
      setTimeout(() => {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
        editorRef.current.focus();
      }, 100);
    }
  }, [openFile]);

  const goToLine = useCallback((line: number) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
      editorRef.current.focus();
    }
  }, []);

  const createFile = useCallback(async (parentPath: string, name: string) => {
    const result = await window.api.fs.createFile(parentPath, name);
    await refreshTree();
    openFile(result.path);
    addStatus(`Created: ${name}`);
  }, [refreshTree, openFile, addStatus]);

  const createDirectory = useCallback(async (parentPath: string, name: string) => {
    await window.api.fs.createDirectory(parentPath, name);
    await refreshTree();
    addStatus(`Created directory: ${name}`);
  }, [refreshTree, addStatus]);

  const deleteEntry = useCallback(async (entryPath: string) => {
    await window.api.fs.deleteEntry(entryPath);
    setTabs((prev) => prev.filter((t) => t.path !== entryPath));
    if (activeTabPath === entryPath) {
      const remaining = tabs.filter((t) => t.path !== entryPath);
      setActiveTabPath(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
    }
    await refreshTree();
    addStatus('Deleted');
  }, [refreshTree, addStatus, tabs, activeTabPath]);

  const renameEntry = useCallback(async (oldPath: string, newName: string) => {
    const result = await window.api.fs.renameEntry(oldPath, newName);
    setTabs((prev) => prev.map((t) => t.path === oldPath ? { ...t, path: result.path, name: result.name } : t));
    if (activeTabPath === oldPath) setActiveTabPath(result.path);
    await refreshTree();
    addStatus(`Renamed to: ${result.name}`);
  }, [refreshTree, addStatus, activeTabPath]);

  const moveFile = useCallback(async (srcPath: string, destDir: string) => {
    const result = await window.api.fs.moveEntry(srcPath, destDir);
    setTabs((prev) => prev.map((t) => t.path === srcPath ? { ...t, path: result.path, name: result.name } : t));
    if (activeTabPath === srcPath) setActiveTabPath(result.path);
    await refreshTree();
    addStatus(`Moved: ${result.name}`);
  }, [refreshTree, addStatus, activeTabPath]);

  const toggleHidden = useCallback(() => {
    setShowHidden((v) => {
      const next = !v;
      setSettings((s) => ({ ...s, showHiddenFiles: next }));
      return next;
    });
  }, []);

  const refreshTreeWithHidden = useCallback(async () => {
    if (rootPath) {
      const tree = await window.api.fs.getFileTree(rootPath, showHidden);
      setFileTree(tree);
    }
  }, [rootPath, showHidden]);

  useEffect(() => { refreshTreeWithHidden(); }, [showHidden]);

  
  const closeActiveTab = useCallback(() => {
    if (activeTabPath) closeTab(activeTabPath);
  }, [activeTabPath, closeTab]);

  const openOutputTab = useCallback((name: string, content: string, language = 'plaintext') => {
    const path = 'output://' + name;
    setTabs((prev) => {
      const existing = prev.find((t) => t.path === path);
      if (existing) {
        const updated = prev.map((t) => t.path === path ? { ...t, content, savedContent: content, isDirty: false } : t);
        setActiveTabPath(path);
        return updated;
      }
      const tab: OpenTab = { path, name, language, content, savedContent: content, isDirty: false };
      setActiveTabPath(path);
      return [...prev, tab];
    });
  }, []);

  const openPluginTab = useCallback(async (plugin: PluginInfo) => {
    let readme = '';
    if (plugin.dirPath) {
      readme = await window.api.plugins.readme(plugin.dirPath) || '';
    }
    const data = JSON.stringify({ ...plugin, readme });
    const path = 'plugin-info://' + plugin.id;
    setTabs((prev) => {
      const existing = prev.find((t) => t.path === path);
      if (existing) {
        setActiveTabPath(path);
        return prev;
      }
      const tab: OpenTab = { path, name: plugin.name, language: 'plugin-info', content: data, savedContent: data, isDirty: false };
      setActiveTabPath(path);
      return [...prev, tab];
    });
  }, []);

  const registerSidebarView = useCallback((view: PluginSidebarView) => {
    setPluginViews((prev) => {
      if (prev.find((v) => v.id === view.id)) return prev;
      return [...prev, view];
    });
  }, []);

  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.shiftKey && (e.key === 'P' || e.key === 'p')) { e.preventDefault(); setShowCommandPalette(true); return; }
      if (isCtrl && e.shiftKey && (e.key === 'F' || e.key === 'f')) { e.preventDefault(); setSidebarView('search'); setSidebarVisible(true); return; }
      if (isCtrl && e.key === ',') { e.preventDefault(); setShowSettings(true); return; }
      if (isCtrl && e.key === '`') { e.preventDefault(); setShowTerminal((v) => !v); return; }
      if (isCtrl && e.key === 'g') { e.preventDefault(); const line = prompt('Go to line:'); if (line) goToLine(parseInt(line)); return; }
      if (isCtrl && e.shiftKey && (e.key === 'O' || e.key === 'o')) { e.preventDefault(); setSidebarView('outline'); setSidebarVisible(true); return; }
      if (isCtrl && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); setSidebarVisible((v) => !v); return; }
      if (isCtrl && e.key === 'w') { e.preventDefault(); closeActiveTab(); return; }
      if (isCtrl && e.shiftKey && (e.key === 'M' || e.key === 'm')) { e.preventDefault(); setShowProblems((v) => !v); return; }
      if (isCtrl && e.shiftKey && (e.key === 'J' || e.key === 'j')) { e.preventDefault(); setSidebarView('plugins'); setSidebarVisible(true); return; }
      if (isCtrl && e.key === 'k') { e.preventDefault(); const handler = (e2: KeyboardEvent) => { window.removeEventListener('keydown', handler); if (e2.key === 'i' || e2.key === 'I') setShowAI((v) => !v); else if (e2.key === 'h' || e2.key === 'H') setShowCommandPalette(true); }; window.addEventListener('keydown', handler); return; }
      if (e.key === 'Escape') { setShowCommandPalette(false); setShowSettings(false); setShowAI(false); return; }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToLine, closeActiveTab]);

  
  useEffect(() => {
    window.api.on('menu-open-folder', openFolder);
    window.api.on('menu-save', saveFile);
    window.api.on('menu-save-all', saveAllFiles);
    window.api.on('menu-close-tab', closeActiveTab);
    window.api.on('menu-new-file', () => {
      if (rootPath) { const name = prompt('Enter file name:'); if (name) createFile(rootPath, name); }
    });
    window.api.on('menu-open-settings', () => setShowSettings(true));
    window.api.on('menu-command-palette', () => setShowCommandPalette(true));
    window.api.on('menu-search-files', () => { setSidebarView('search'); setSidebarVisible(true); });
    window.api.on('menu-toggle-sidebar', () => setSidebarVisible((v) => !v));
    window.api.on('menu-toggle-terminal', () => setShowTerminal((v) => !v));
    window.api.on('menu-zen-mode', () => setZenMode((v) => !v));
    window.api.on('menu-show-problems', () => setShowProblems((v) => !v));
    window.api.on('menu-go-to-line', () => { const line = prompt('Go to line:'); if (line) goToLine(parseInt(line)); });
    window.api.on('menu-shortcuts', () => setShowCommandPalette(true));
    window.api.on('menu-ai-toggle', () => setShowAI((v) => !v));

    return () => {
      ['menu-open-folder', 'menu-save', 'menu-save-all', 'menu-close-tab', 'menu-new-file',
       'menu-open-settings', 'menu-command-palette', 'menu-search-files', 'menu-toggle-sidebar',
       'menu-toggle-terminal', 'menu-zen-mode', 'menu-show-problems', 'menu-go-to-line', 'menu-shortcuts',
       'menu-ai-toggle',
      ].forEach((ch) => window.api.removeAllListeners(ch));
    };
  }, [openFolder, saveFile, saveAllFiles, rootPath, createFile, closeActiveTab, goToLine]);

  
  useEffect(() => {
    const handler = () => refreshTree();
    window.api.on('fs-file-changed', handler);
    return () => window.api.removeAllListeners('fs-file-changed');
  }, [refreshTree]);

  
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer?.types.includes('Files')) setDragOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) { dragCounter.current = 0; setDragOver(false); }
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      try {
        const filePath = window.api.file.getPath(file);
        if (!filePath) return;

        const target = e.target as HTMLElement;
        const onSidebar = target.closest('.sidebar');

        if (rootPath && onSidebar) {
          const name = decodeURIComponent(filePath.split('/').pop() || 'untitled');
          const dest = rootPath.endsWith('/') ? rootPath + name : rootPath + '/' + name;
          await window.api.fs.copyFile(filePath, dest);
          await refreshTree();
          await openFile(dest);
          addStatus(`Copied: ${name}`);
        } else {
          try {
            await window.api.fs.getFileTree(filePath, true);
            loadFolder(filePath);
          } catch {
            openFile(filePath);
          }
        }
      } catch {}
    };
    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [loadFolder, openFile]);

  
  const commands: Command[] = [
    { id: 'open-folder', label: 'Open Folder', shortcut: 'Ctrl+O', action: openFolder },
    { id: 'save-file', label: 'Save File', shortcut: 'Ctrl+S', action: saveFile },
    { id: 'save-all', label: 'Save All Files', shortcut: 'Ctrl+Shift+S', action: saveAllFiles },
    { id: 'new-file', label: 'New File', shortcut: 'Ctrl+N', action: () => { if (rootPath) { const n = prompt('File name:'); if (n) createFile(rootPath, n); } } },
    { id: 'close-tab', label: 'Close Current Tab', shortcut: 'Ctrl+W', action: closeActiveTab },
    { id: 'search-files', label: 'Search in Files', shortcut: 'Ctrl+Shift+F', action: () => { setSidebarView('search'); setSidebarVisible(true); } },
    { id: 'open-settings', label: 'Open Settings', shortcut: 'Ctrl+,', action: () => setShowSettings(true) },
    { id: 'toggle-terminal', label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: () => setShowTerminal((v) => !v) },
    { id: 'toggle-sidebar', label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: () => setSidebarVisible((v) => !v) },
    { id: 'zen-mode', label: 'Toggle Zen Mode', shortcut: 'Ctrl+K Z', action: () => setZenMode((v) => !v) },
    { id: 'go-to-line', label: 'Go to Line', shortcut: 'Ctrl+G', action: () => { const l = prompt('Line:'); if (l) goToLine(parseInt(l)); } },
    { id: 'show-outline', label: 'Show Outline', shortcut: 'Ctrl+Shift+O', action: () => { setSidebarView('outline'); setSidebarVisible(true); } },
    { id: 'show-problems', label: 'Show Problems', shortcut: 'Ctrl+Shift+M', action: () => setShowProblems((v) => !v) },
    { id: 'toggle-ai', label: 'Toggle AI Chat', shortcut: 'Ctrl+K I', action: () => setShowAI((v) => !v) },
    { id: 'toggle-plugins', label: 'Toggle Plugins Panel', shortcut: 'Ctrl+Shift+J', action: () => { setSidebarView('plugins'); setSidebarVisible(true); } },
    { id: 'toggle-hidden', label: 'Toggle Hidden Files', action: toggleHidden },
    
    { id: 'uuid', label: 'Generate UUID', action: () => {
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
      if (activeTab && editorRef.current) {
        editorRef.current.executeEdits('uuid', [{ range: editorRef.current.getSelection(), text: uuid }]);
        editorRef.current.focus();
      } else { navigator.clipboard.writeText(uuid); addStatus('UUID copied to clipboard'); }
    }},
    { id: 'uppercase', label: 'Convert to UPPERCASE', action: () => {
      if (editorRef.current) {
        const sel = editorRef.current.getSelection();
        const text = editorRef.current.getModel().getValueInRange(sel);
        editorRef.current.executeEdits('case', [{ range: sel, text: text.toUpperCase() }]);
        editorRef.current.focus();
      }
    }},
    { id: 'lowercase', label: 'Convert to lowercase', action: () => {
      if (editorRef.current) {
        const sel = editorRef.current.getSelection();
        const text = editorRef.current.getModel().getValueInRange(sel);
        editorRef.current.executeEdits('case', [{ range: sel, text: text.toLowerCase() }]);
        editorRef.current.focus();
      }
    }},
    { id: 'titlecase', label: 'Convert to Title Case', action: () => {
      if (editorRef.current) {
        const sel = editorRef.current.getSelection();
        const text = editorRef.current.getModel().getValueInRange(sel);
        editorRef.current.executeEdits('case', [{ range: sel, text: text.replace(/\b\w/g, (c: string) => c.toUpperCase()) }]);
        editorRef.current.focus();
      }
    }},
    { id: 'word-count', label: 'Show Word Count', action: () => {
      if (activeTab) {
        const words = (activeTab.content.match(/\S+/g) || []).length;
        const chars = activeTab.content.length;
        addStatus(`Words: ${words}, Characters: ${chars}`);
      }
    }},
    { id: 'duplicate-line', label: 'Duplicate Line', action: () => {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.copyLinesDownAction')?.run();
        editorRef.current.focus();
      }
    }},
    { id: 'delete-line', label: 'Delete Line', action: () => {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.deleteLines')?.run();
        editorRef.current.focus();
      }
    }},
    { id: 'toggle-comment', label: 'Toggle Comment', shortcut: 'Ctrl+/', action: () => {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.commentLine')?.run();
        editorRef.current.focus();
      }
    }},
    { id: 'format-document', label: 'Format Document', shortcut: 'Shift+Alt+F', action: () => {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.formatDocument')?.run();
      }
    }},
    { id: 'toggle-minimap', label: 'Toggle Minimap', action: () => {
      setSettings((s) => ({ ...s, minimap: !s.minimap }));
    }},
    { id: 'add-workspace-folder', label: 'Add Folder to Workspace', action: addWorkspaceFolder },
    { id: 'clear-compare', label: 'Clear Compare Reference', action: () => { setDiffCompare(null); addStatus('Compare reference cleared'); }},
  ];

  const workspaceFolders: string[] = settings.workspaceFolders || [];
  const allRootFolders = rootPath ? [rootPath, ...workspaceFolders.filter((f) => f !== rootPath)] : [];

  if (!rootPath) {
    return (
      <div className="welcome-screen">
        <div className="welcome-content">
          <div className="welcome-logo">
            <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#007acc" strokeWidth="1.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1>Patch</h1>
          <p className="welcome-subtitle">Open a folder to get started</p>
          <button className="welcome-button" onClick={openFolder}>
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M.5 3.5a2 2 0 012-2h3.672a2 2 0 011.414.586l.828.828A2 2 0 009.828 3h3.672a2 2 0 012 2v7a2 2 0 01-2 2H2.5a2 2 0 01-2-2V3.5z" />
            </svg>
            Open Folder
          </button>
          {settings.recentFolders && settings.recentFolders.length > 0 && (
            <div className="recent-folders">
              <h3>Recent Folders</h3>
              {settings.recentFolders.map((folder) => (
                <div key={folder} className="recent-folder-item" onClick={() => loadFolder(folder)}>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="#dcb67a">
                    <path d="M.5 3.5a2 2 0 012-2h3.672a2 2 0 011.414.586l.828.828A2 2 0 009.828 3h3.672a2 2 0 012 2v7a2 2 0 01-2 2H2.5a2 2 0 01-2-2V3.5z" />
                  </svg>
                  <span>{folder.split('/').pop()}</span>
                </div>
              ))}
            </div>
          )}
          <div className="welcome-shortcuts">
            <span><kbd>Ctrl+O</kbd> Open folder</span>
            <span><kbd>Ctrl+N</kbd> New file</span>
            <span><kbd>Ctrl+S</kbd> Save file</span>
            <span><kbd>Ctrl+Shift+P</kbd> Command palette</span>
            <span><kbd>Ctrl+Shift+F</kbd> Search files</span>
            <span><kbd>Ctrl+`</kbd> Toggle terminal</span>
            <span><kbd>Ctrl+B</kbd> Toggle sidebar</span>
          </div>
        </div>
      </div>
    );
  }

  const sidebarWidth = sidebarVisible ? 260 : 0;
  const aiWidth = showAI ? 320 : 0;

  return (
    <div className={`app-layout ${zenMode ? 'zen-mode' : ''}`}>
      {dragOver && (
        <div className="drop-overlay">
          <div className="drop-overlay-content">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <p>Drop files or folders here</p>
          </div>
        </div>
      )}
      <CommandPalette commands={[...commands, ...pluginCommands]} isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      <SettingsPanel settings={settings} onChange={setSettings} isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <div className="sidebar" style={{ width: sidebarWidth }}>
        <div className="activity-bar">
          <div className="activity-bar-top">
            <button className={`activity-bar-btn ${sidebarView === 'explorer' ? 'active' : ''}`} onClick={() => setSidebarView('explorer')} title="Explorer">
              <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
                <path d="M.5 3.5a2 2 0 012-2h3.672a2 2 0 011.414.586l.828.828A2 2 0 009.828 3h3.672a2 2 0 012 2v7a2 2 0 01-2 2H2.5a2 2 0 01-2-2V3.5z" />
              </svg>
            </button>
            <button className={`activity-bar-btn ${sidebarView === 'search' ? 'active' : ''}`} onClick={() => setSidebarView('search')} title="Search">
              <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" />
              </svg>
            </button>
            <button className={`activity-bar-btn ${sidebarView === 'git' ? 'active' : ''}`} onClick={() => setSidebarView('git')} title="Source Control">
              <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
                <path d="M4.5 1a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm7 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-7 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0-1a2.5 2.5 0 002.5-2.5V4.5h1v3a2.5 2.5 0 002.5 2.5h.5v-2l3 3-3 3v-2h-.5a3.5 3.5 0 01-3.5-3.5V5.7a2.5 2.5 0 00-2-2.45V10z" />
              </svg>
            </button>
            <button className={`activity-bar-btn ${sidebarView === 'outline' ? 'active' : ''}`} onClick={() => setSidebarView('outline')} title="Outline">
              <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
                <path d="M2 2h12v2H2V2zm0 5h12v2H2V7zm0 5h12v2H2v-2z" />
              </svg>
            </button>
            <button className={`activity-bar-btn ${sidebarView === 'marketplace' ? 'active' : ''}`} onClick={() => setSidebarView('marketplace')} title="Extensions">
              <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
                <path d="M4.5 1A1.5 1.5 0 003 2.5v3A1.5 1.5 0 004.5 7h3A1.5 1.5 0 009 5.5v-3A1.5 1.5 0 007.5 1h-3zm0 1h3a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5zM8.5 9A1.5 1.5 0 007 10.5v3A1.5 1.5 0 008.5 15h3a1.5 1.5 0 001.5-1.5v-3A1.5 1.5 0 0011.5 9h-3zm0 1h3a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5zM1 10.5A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm1.5-.5a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5h-3zM9.5 1A1.5 1.5 0 0011 2.5v3A1.5 1.5 0 0012.5 7h3A1.5 1.5 0 0016 5.5v-3A1.5 1.5 0 0015.5 1h-3zm0 1h3a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5z"/>
              </svg>
            </button>
            <button className={`activity-bar-btn ${sidebarView === 'plugins' ? 'active' : ''}`} onClick={() => setSidebarView('plugins')} title="Plugins">
              <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
                <path fillRule="evenodd" d="M3.5 1A1.5 1.5 0 002 2.5v2A1.5 1.5 0 003.5 6h2A1.5 1.5 0 007 4.5v-2A1.5 1.5 0 005.5 1h-2zm0 1h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-2a.5.5 0 01.5-.5zM8.5 1A1.5 1.5 0 007 2.5v2A1.5 1.5 0 008.5 6h2A1.5 1.5 0 0012 4.5v-2A1.5 1.5 0 0010.5 1h-2zm0 1h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-2a.5.5 0 01.5-.5zM3.5 8A1.5 1.5 0 002 9.5v2A1.5 1.5 0 003.5 13h2A1.5 1.5 0 007 11.5v-2A1.5 1.5 0 005.5 8h-2zm0 1h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-2a.5.5 0 01.5-.5zM10.5 8A1.5 1.5 0 009 9.5v1.336l-1.5 1.5V11.5a.5.5 0 00-1 0v3a.5.5 0 00.5.5h3a.5.5 0 000-1h-.836l1.5-1.5H12.5A1.5 1.5 0 0014 11.5v-2A1.5 1.5 0 0012.5 8h-2zm0 1h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5v-2a.5.5 0 01.5-.5z" clipRule="evenodd" />
              </svg>
            </button>
            {pluginViews.map((pv) => (
              <button key={pv.id} className={`activity-bar-btn ${sidebarView === pv.id ? 'active' : ''}`} onClick={() => setSidebarView(pv.id)} title={pv.label}>
                <span dangerouslySetInnerHTML={{ __html: pv.icon }} />
              </button>
            ))}
          </div>
          <div className="activity-bar-bottom">
            <button className="activity-bar-btn" onClick={() => setShowSettings(true)} title="Settings">
              <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
                <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z" />
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.902 3.433 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 00-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 001.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 003.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.115l.094-.319z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="sidebar-content">
          {sidebarView === 'explorer' && (
            <div className="sidebar-header">
              <div className="sidebar-actions">
                <button className="icon-btn" onClick={() => createFile(rootPath, prompt('File name:') || '')} title="New File">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <path d="M9.5 2.5a.5.5 0 01.5.5v2h2a.5.5 0 010 1h-2v2a.5.5 0 01-1 0V6h-2a.5.5 0 010-1h2V3a.5.5 0 01.5-.5z" />
                    <path d="M2.5 1a1 1 0 00-1 1v12a1 1 0 001 1h11a1 1 0 001-1V5.5a.5.5 0 00-.146-.354l-3-3A.5.5 0 0011 2H2.5zm0 1h8.293L13 4.207V13H2.5V2z" />
                  </svg>
                </button>
                <button className="icon-btn" onClick={() => createDirectory(rootPath, prompt('Directory name:') || '')} title="New Folder">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <path d="M.5 3.5a2 2 0 012-2h3.672a2 2 0 011.414.586l.828.828A2 2 0 009.828 3h3.672a2 2 0 012 2v7a2 2 0 01-2 2H2.5a2 2 0 01-2-2V3.5z" />
                    <path d="M8.5 7.5a.5.5 0 01.5.5v1.5H10.5a.5.5 0 010 1H9v1.5a.5.5 0 01-1 0V10.5H6.5a.5.5 0 010-1H8V8a.5.5 0 01.5-.5z" />
                  </svg>
                </button>
                <button className={`icon-btn ${showHidden ? 'active' : ''}`} onClick={toggleHidden} title="Toggle Hidden Files">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 00-2.79.588l.77.771A5.944 5.944 0 018 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0114.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486z" />
                    <path d="M11.297 9.176a3.5 3.5 0 00-4.474-4.474l.823.823a2.5 2.5 0 012.829 2.829l.822.822z" />
                    <path d="M8.56 10.44a3.5 3.5 0 01-3.278-.527.5.5 0 01-.134-.155l-.838.838a4.434 4.434 0 001.393.939l-.84.84a.5.5 0 10.707.707l.84-.84c.535.167 1.1.245 1.66.245 4.5 0 7.122-3.88 7.122-3.88s-.604-.964-1.69-1.969l-.817.817c.53.4 1.05.88 1.44 1.416a10.142 10.142 0 01-2.555 2.205zM.5 8s1.587-2.487 4.372-3.727L4.2 5.845a3.5 3.5 0 004.776 4.776l-.793.793A7.615 7.615 0 018 11.5c-4 0-7-3.5-7-3.5z" />
                  </svg>
                </button>
                <button className="icon-btn" onClick={openFolder} title="Open Folder">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <path d="M1 3.5A1.5 1.5 0 012.5 2h2.764a1.5 1.5 0 011.06.44l1.06 1.06A.5.5 0 007.5 3.5H13a1 1 0 011 1v1.5H1V3.5z" />
                    <path d="M1 6v6.5A1.5 1.5 0 002.5 14h11a1.5 1.5 0 001.5-1.5V6H1z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          {sidebarView === 'plugins' ? (
            <PluginPanel
              plugins={plugins}
              pluginStates={pluginStates}
              onToggle={(id, enabled) => setPluginStates((prev) => ({ ...prev, [id]: enabled }))}
              onOpenPlugin={openPluginTab}
              onReload={async () => {
                const list = await window.api.plugins.scan();
                setPlugins(list);
                const states: Record<string, boolean> = {};
                list.forEach((p) => { states[p.id] = pluginStates[p.id] !== false; });
                setPluginStates(states);
                setPluginViews([]);
                setPluginCommands([]);
                const { api, host } = createPatchAPI({
                  editorRef, tabsRef, activeTabPathRef, rootPathRef, addStatus, setCommands: setPluginCommands, fileTreeRef, openOutputTab, registerSidebarView,
                });
                pluginHostRef.current = host;
                (window as any).patch = api;
                for (const p of list) {
                  if (pluginStates[p.id] === false) continue;
                  const code = await window.api.plugins.read(p.path);
                  if (!code) continue;
                  if (p.type === 'init') executePluginCode(code, api);
                  else executePluginModule(code, api);
                }
              }}
            />
          ) : sidebarView === 'explorer' ? (
            <FileExplorer
              nodes={fileTree} rootPath={rootPath} onOpenFile={openFile}
              onCreateFile={createFile} onCreateDirectory={createDirectory}
              onDelete={deleteEntry} onRename={renameEntry}
              onMoveFile={moveFile} onRefresh={refreshTree}
              activeFilePath={activeTabPath} gitFiles={gitFiles}
              workspaceFolders={allRootFolders} onSwitchRoot={loadFolder}
              onOpenDiff={openDiff} diffCompare={diffCompare}
              onSetDiffCompare={setDiffCompare}
            />
          ) : sidebarView === 'outline' ? (
            <OutlinePanel tab={activeTab} onGoToLine={goToLine} />
          ) : sidebarView === 'git' ? (
            <GitPanel rootPath={rootPath} gitFiles={gitFiles} gitBranch={gitBranch} onRefresh={async () => {
              const [branch, files] = await Promise.all([
                window.api.git.branch(rootPath),
                window.api.git.status(rootPath),
              ]);
              setGitBranch(branch);
              setGitFiles(files);
            }} />
          ) : sidebarView === 'search' ? (
            <SearchPanel rootPath={rootPath} onOpenFile={openFile} onGoToLocation={goToLocation} isActive={sidebarView === 'search'} />
          ) : sidebarView === 'marketplace' ? (
            <MarketplacePanel onRefreshPlugins={async () => {
              const list = await window.api.plugins.scan();
              setPlugins(list);
            }} onOpenPlugin={async (plugin) => {
              let readme = '';
              try {
                readme = await window.api.plugins.marketplaceReadme(plugin.repo, plugin.id) || '';
              } catch {}
              const installed = plugins.some((p) => p.id === plugin.id);
              const installedPlugin = plugins.find((p) => p.id === plugin.id);
              const data = JSON.stringify({
                isMarketplace: true,
                ...plugin,
                installed,
                dirPath: installedPlugin?.dirPath || '',
                readme,
              });
              const path = 'plugin-info://marketplace-' + plugin.id;
              setTabs((prev) => {
                const existing = prev.find((t) => t.path === path);
                if (existing) {
                  setActiveTabPath(path);
                  return prev.map((t) => t.path === path ? { ...t, content: data, savedContent: data, isDirty: false } : t);
                }
                const tab: OpenTab = { path, name: plugin.name, language: 'plugin-info', content: data, savedContent: data, isDirty: false };
                setActiveTabPath(path);
                return [...prev, tab];
              });
            }} />
          ) : (() => {
            const pluginView = pluginViews.find((v) => v.id === sidebarView);
            if (pluginView) {
              let html: string;
              try { html = pluginView.render(); } catch (e) { html = '<div style="padding:12px;color:#f85149;font-size:13px">Plugin error: ' + (e instanceof Error ? e.message : String(e)) + '</div>'; }
              return (
                <div className="plugin-sidebar-view" key={pluginView.id}>
                  <div className="sidebar-header">
                    <span>{pluginView.label}</span>
                  </div>
                  <div className="plugin-sidebar-content" dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>

      <div className="main-area" style={{ marginLeft: sidebarWidth, marginRight: aiWidth }}>
        {tabs.length > 0 ? (
          <>
            <TabBar tabs={tabs} activeTabPath={activeTabPath} onSelectTab={setActiveTabPath} onCloseTab={closeTab} />
            <Breadcrumbs path={activeTabPath || ''} rootPath={rootPath} onNavigate={(p) => {
              const stat = fileTree.find((f) => f.path === p);
              if (stat?.type === 'file') openFile(p);
            }} />
              <div className="editor-container">
                {activeTab ? (
                  <Editor
                    key={`${activeTab.path}`} tab={activeTab} onChange={updateTabContent}
                    settings={settings} editorRef={editorRef}
                    onCursorChange={(line, col) => { setEditorLine(line); setEditorColumn(col); }}
                    pluginStates={pluginStates}
                    onPluginToggle={(id, enabled) => setPluginStates((prev) => ({ ...prev, [id]: enabled }))}
                    onPluginUninstall={async (plugin) => {
                      if (!plugin.dirPath || !confirm(`Uninstall "${plugin.name}"?`)) return;
                      const ok = await window.api.plugins.uninstall(plugin.dirPath);
                      if (ok) {
                        const list = await window.api.plugins.scan();
                        setPlugins(list);
                        closeTab('plugin-info://' + plugin.id);
                      } else {
                        alert('Failed to uninstall plugin');
                      }
                    }}
                    onMarketplaceInstall={async (id, repo) => {
                      const result = await window.api.plugins.marketplaceInstall(id, repo);
                      if (result.success) {
                        const list = await window.api.plugins.scan();
                        setPlugins(list);
                        const path = 'plugin-info://marketplace-' + id;
                        setTabs((prev) => {
                          const tab = prev.find((t) => t.path === path);
                          if (tab) {
                            const data = JSON.stringify({ ...JSON.parse(tab.content), installed: true, dirPath: list.find((p) => p.id === id)?.dirPath || '' });
                            return prev.map((t) => t.path === path ? { ...t, content: data, savedContent: data } : t);
                          }
                          return prev;
                        });
                      } else {
                        alert('Install failed: ' + (result.error || ''));
                      }
                    }}
                  />
                ) : (
                  <div className="empty-editor"><p>Open a file from the explorer to start editing</p></div>
                )}
              </div>
          </>
        ) : (
          <div className="empty-editor">
            <p>Open a file from the explorer to start editing</p>
          </div>
        )}
        <TerminalPanel visible={showTerminal} onToggle={() => setShowTerminal(false)} />
        <ProblemsPanel problems={problems} onGoToLocation={goToLocation} visible={showProblems} onToggle={() => setShowProblems(false)} />
      </div>

      <div className="ai-sidebar" style={{ width: aiWidth }}>
        <AIPanel settings={settings.ai} rootPath={rootPath} onSettingsChange={(ai) => setSettings((s) => ({ ...s, ai }))} onInsertCode={(code) => {
          if (activeTab && editorRef.current) {
            const sel = editorRef.current.getSelection();
            editorRef.current.executeEdits('ai-insert', [{ range: sel, text: code }]);
            editorRef.current.focus();
          }
        }} />
      </div>

      <StatusBar
        statusText={statusText} tab={activeTab} rootPath={rootPath}
        line={editorLine} column={editorColumn} settings={settings} gitBranch={gitBranch}
        showAI={showAI} onToggleAI={() => setShowAI((v) => !v)}
        workspaceFolders={allRootFolders}
      />
    </div>
  );
}
