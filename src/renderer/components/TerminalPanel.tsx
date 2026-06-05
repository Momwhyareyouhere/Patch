import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

interface Props {
  visible: boolean;
  onToggle: () => void;
}

let termIdCounter = 0;

export default function TerminalPanel({ visible, onToggle }: Props) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const termIdRef = useRef<string>('');

  useEffect(() => {
    if (!visible || !terminalRef.current) return;
    if (termInstanceRef.current) return;

    const termId = `term-${++termIdCounter}`;
    termIdRef.current = termId;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11b8bd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    term.open(terminalRef.current);
    setTimeout(() => fitAddon.fit(), 50);

    const resizeHandler = () => fitAddon.fit();
    window.addEventListener('resize', resizeHandler);

    term.onData((data: string) => {
      window.api.terminal.write(termId, data);
    });

    window.api.terminal.create(termId).then(() => {
      term.write('\x1b[32mTerminal ready\x1b[0m\r\n');
    });

    const cleanup = window.api.terminal.onOutput(termId, (data: string) => {
      term.write(data);
    });

    window.api.terminal.onExit(termId, () => {
      term.write('\r\n\x1b[31mProcess exited\x1b[0m\r\n');
    });

    termInstanceRef.current = term;

    return () => {
      window.removeEventListener('resize', resizeHandler);
      cleanup();
      window.api.terminal.kill(termId);
      term.dispose();
      termInstanceRef.current = null;
    };
  }, [visible]);

  useEffect(() => {
    if (visible && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current.fit(), 50);
    }
  }, [visible]);

  return (
    <div className={`terminal-panel ${visible ? 'visible' : 'hidden'}`}>
      <div className="terminal-header">
        <span className="terminal-title">TERMINAL</span>
        <div className="terminal-actions">
          <button className="icon-btn" onClick={onToggle} title="Close Terminal">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={terminalRef} className="terminal-xterm" />
    </div>
  );
}
