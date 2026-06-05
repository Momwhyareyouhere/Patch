import { useMemo } from 'react';
import type { OpenTab } from '../types';
import { parseOutline } from '../utils/outline';

interface Props {
  tab: OpenTab | null;
  onGoToLine: (line: number) => void;
}

export default function OutlinePanel({ tab, onGoToLine }: Props) {
  const symbols = useMemo(() => {
    if (!tab) return [];
    return parseOutline(tab.content, tab.language);
  }, [tab?.content, tab?.language]);

  if (!tab) {
    return (
      <div className="outline-panel">
        <div className="outline-empty">Open a file to view outline</div>
      </div>
    );
  }

  if (symbols.length === 0) {
    return (
      <div className="outline-panel">
        <div className="outline-empty">No symbols found</div>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    function: '#dcdcaa',
    class: '#4ec9b0',
    method: '#dcdcaa',
    variable: '#9cdcfe',
    interface: '#4ec9b0',
    enum: '#c586c0',
    import: '#c586c0',
  };

  return (
    <div className="outline-panel">
      {symbols.map((sym, i) => (
        <div
          key={`${sym.name}-${sym.line}-${i}`}
          className="outline-item"
          onClick={() => onGoToLine(sym.line)}
          title={`${sym.type}: ${sym.name} (line ${sym.line})`}
        >
          <span className="outline-icon" style={{ color: typeColors[sym.type] || '#d4d4d4' }}>
            {sym.icon}
          </span>
          <span className="outline-name">{sym.name}</span>
          <span className="outline-line">:{sym.line}</span>
        </div>
      ))}
    </div>
  );
}
