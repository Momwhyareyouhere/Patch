import type { PatchAPI, OpenTab, FileNode, GitFile, Command, PluginSidebarView } from './types';

export interface PluginHost {
  on: (event: string, cb: (...args: any[]) => void) => () => void;
  emit: (event: string, ...args: any[]) => void;
}

export function createPatchAPI(opts: {
  editorRef: React.MutableRefObject<any>;
  tabsRef: React.MutableRefObject<OpenTab[]>;
  activeTabPathRef: React.MutableRefObject<string | null>;
  rootPathRef: React.MutableRefObject<string | null>;
  addStatus: (text: string) => void;
  setCommands: React.Dispatch<React.SetStateAction<Command[]>>;
  fileTreeRef: React.MutableRefObject<FileNode[]>;
  openOutputTab: (name: string, content: string, language?: string) => void;
  registerSidebarView: (view: PluginSidebarView) => void;
}): { api: PatchAPI; host: PluginHost } {
  const listeners: Record<string, Set<(...args: any[]) => void>> = {};

  const host: PluginHost = {
    on: (event, cb) => {
      if (!listeners[event]) listeners[event] = new Set();
      listeners[event].add(cb);
      return () => listeners[event]?.delete(cb);
    },
    emit: (event, ...args) => {
      listeners[event]?.forEach((cb) => {
        try { cb(...args); } catch {}
      });
    },
  };

  const api: PatchAPI = {
    editor: {
      getActiveTab: () => {
        const tab = opts.tabsRef.current.find((t) => t.path === opts.activeTabPathRef.current);
        return tab || null;
      },
      getContent: () => {
        const editor = opts.editorRef.current;
        if (editor) {
          const model = editor.getModel();
          return model ? model.getValue() : '';
        }
        return '';
      },
      setContent: (text: string) => {
        const editor = opts.editorRef.current;
        if (editor) {
          const model = editor.getModel();
          if (model) model.setValue(text);
        }
      },
      getSelection: () => {
        const editor = opts.editorRef.current;
        return editor ? editor.getSelection() : null;
      },
      getMonacoEditor: () => opts.editorRef.current,
      createOutputTab: (name, content, language) => opts.openOutputTab(name, content, language),
    },
    ui: {
      addStatus: opts.addStatus,
      registerSidebarView: (id, label, icon, render) => {
        opts.registerSidebarView({ id, label, icon, render });
      },
    },
    commands: {
      register: (id, label, action, shortcut) => {
        opts.setCommands((prev) => {
          if (prev.find((c) => c.id === id)) return prev;
          return [...prev, { id, label, shortcut, action }];
        });
      },
    },
    get monaco() {
      return (window as any).monaco || null;
    },
    fs: {
      readFile: (path) => window.api.fs.readFile(path).then((r) => r.content),
      writeFile: (path, content) => window.api.fs.writeFile(path, content),
      getFileTree: (dirPath, showHidden) => window.api.fs.getFileTree(dirPath, showHidden),
    },
    git: {
      status: (dir) => window.api.git.status(dir),
      branch: (dir) => window.api.git.branch(dir),
    },
    exec: (command) => window.api.plugins.exec(command),
    on: (event, cb) => { host.on(event, cb); },
    off: (event, cb) => { listeners[event]?.delete(cb); },
    internal: {
      get editorRef() { return opts.editorRef; },
      get rootPath() { return opts.rootPathRef.current; },
      get fileTree() { return opts.fileTreeRef.current; },
      get tabs() { return opts.tabsRef.current; },
      get activeTabPath() { return opts.activeTabPathRef.current; },
    },
  };

  return { api, host };
}

export function executePluginCode(code: string, api: PatchAPI): boolean {
  try {
    const fn = new Function('patch', code);
    fn(api);
    return true;
  } catch (e) {
    console.error('Plugin execution error:', e);
    return false;
  }
}

export function executePluginModule(code: string, api: PatchAPI): boolean {
  try {
    const stripped = code.replace(/^export\s+/gm, '');
    const fn = new Function('patch', `
      var module = { exports: {} };
      var exports = module.exports;
      ${stripped};
      var activate = (typeof activate !== 'undefined') ? activate : (module.exports.activate || module.exports.default);
      if (typeof activate === 'function') activate(patch);
    `);
    fn(api);
    return true;
  } catch (e) {
    console.error('Plugin module execution error:', e);
    return false;
  }
}
