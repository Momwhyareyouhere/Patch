import type { Problem } from '../types';

interface Props {
  problems: Problem[];
  onGoToLocation: (path: string, line: number) => void;
  visible: boolean;
  onToggle: () => void;
}

export default function ProblemsPanel({ problems, onGoToLocation, visible, onToggle }: Props) {
  if (!visible) return null;

  const errors = problems.filter((p) => p.severity === 'error');
  const warnings = problems.filter((p) => p.severity === 'warning');

  return (
    <div className="problems-panel visible">
      <div className="problems-header">
        <span className="problems-title">PROBLEMS</span>
        <div className="problems-counts">
          <span className="problems-count errors">{errors.length} errors</span>
          <span className="problems-count warnings">{warnings.length} warnings</span>
        </div>
        <div className="problems-actions">
          <button className="icon-btn" onClick={onToggle} title="Close Problems">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="problems-body">
        {problems.length === 0 ? (
          <div className="problems-empty">No problems detected</div>
        ) : (
          problems.map((p, i) => (
            <div
              key={`${p.filePath}-${p.line}-${p.column}-${i}`}
              className="problem-item"
              onClick={() => onGoToLocation(p.filePath, p.line)}
            >
              <span className={`problem-severity ${p.severity}`}>
                {p.severity === 'error' ? '✕' : '⚠'}
              </span>
              <span className="problem-message">{p.message}</span>
              <span className="problem-location">
                {p.filePath.split('/').pop()}:{p.line}:{p.column}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
