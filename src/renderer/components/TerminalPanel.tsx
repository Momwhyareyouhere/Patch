import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

interface Props {
  visible: boolean;
  onToggle: () => void;
}

interface TermTab {
  id: string;
  name: string;
  term: Terminal;
  fitAddon: FitAddon;
  container: HTMLDivElement;
  alive: boolean;
  cleanup?: () => void;
  resizeHandler?: () => void;
}

let termIdCounter = 0;

export default function TerminalPanel({ visible, onToggle }: Props) {
  const [tabs, setTabs] = useState<TermTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<TermTab[]>([]);

  const spawnTermProcess = useCallback((tab: TermTab) => {
    window.api.terminal.create(tab.id).then(() => {
      tab.term.write('\x1b[38;5;83mTerminal ready\x1b[0m\r\n');
    });

    const outputCleanup = window.api.terminal.onOutput(tab.id, (data: string) => {
      tab.term.write(data);
    });

    const exitCleanup = window.api.terminal.onExit(tab.id, () => {
      tab.alive = false;
      tab.term.write('\r\n\x1b[38;5;243mProcess exited\x1b[0m\r\n');
    });

    if (tab.cleanup) tab.cleanup();
    tab.cleanup = () => { outputCleanup(); exitCleanup(); };
  }, []);

  const createTermTab = useCallback(async (name?: string) => {
    const id = `term-${++termIdCounter}`;
    const container = document.createElement('div');
    container.style.cssText = 'height:100%;display:none';
    if (containerRef.current) containerRef.current.appendChild(container);

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'underline',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
      allowProposedApi: true,
      minimumContrastRatio: 4.5,
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#e6edf3',
        cursorAccent: '#0d1117',
        selectionBackground: '#3b5998',
        selectionInactiveBackground: '#2a2a2a',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    requestAnimationFrame(() => fitAddon.fit());

    const tab: TermTab = {
      id, name: name || `Terminal ${tabsRef.current.length + 1}`,
      term, fitAddon, container, alive: true,
    };

    const resizeHandler = () => fitAddon.fit();
    window.addEventListener('resize', resizeHandler);
    tab.resizeHandler = resizeHandler;

    tabsRef.current = [...tabsRef.current, tab];
    setTabs(tabsRef.current);
    setActiveId(id);

    term.onData((data: string) => {
      window.api.terminal.write(id, data);
    });

    spawnTermProcess(tab);

    return tab;
  }, [spawnTermProcess]);

  useEffect(() => {
    if (!visible) return;
    if (tabsRef.current.length === 0) createTermTab();
  }, [visible, createTermTab]);

  const fitActive = useCallback(() => {
    const active = tabsRef.current.find((t) => t.id === activeId);
    if (active) requestAnimationFrame(() => active.fitAddon.fit());
  }, [activeId]);

  useEffect(() => {
    tabsRef.current.forEach((t) => {
      t.container.style.display = t.id === activeId ? 'block' : 'none';
    });
    fitActive();
  }, [activeId, fitActive]);

  useEffect(() => {
    if (visible) fitActive();
  }, [visible, fitActive]);

  const closeTab = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab) return;
    if (tab.cleanup) tab.cleanup();
    if (tab.resizeHandler) window.removeEventListener('resize', tab.resizeHandler);
    window.api.terminal.kill(id);
    tab.term.dispose();
    tab.container.remove();
    tabsRef.current = tabsRef.current.filter((t) => t.id !== id);
    setTabs(tabsRef.current);
    if (activeId === id) {
      setActiveId(tabsRef.current.length > 0 ? tabsRef.current[tabsRef.current.length - 1].id : null);
    }
  }, [activeId]);

  return (
    <div className={`terminal-panel ${visible ? 'visible' : 'hidden'}`}>
      <div className="terminal-header">
        <div className="terminal-tabs">
          {tabs.map((t) => (
            <div
              key={t.id}
              className={`terminal-tab ${t.id === activeId ? 'active' : ''} ${t.alive ? '' : 'dead'}`}
              onClick={() => setActiveId(t.id)}
            >
              <span className="terminal-tab-name">{t.name}</span>
              {!t.alive && <span className="terminal-tab-status">●</span>}
              <button className="terminal-tab-close" onClick={(e) => closeTab(e, t.id)}>
                <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                  <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div className="terminal-actions">
          <button className="icon-btn" onClick={() => createTermTab()} title="New Terminal">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z" />
            </svg>
          </button>
          <button className="icon-btn" onClick={onToggle} title="Close Terminal Panel">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={containerRef} className="terminal-xterm" />
    </div>
  );
}
