import type { OpenTab } from '../types';

interface Props {
  tabs: OpenTab[];
  activeTabPath: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string, saveFirst?: boolean) => void;
}

export default function TabBar({ tabs, activeTabPath, onSelectTab, onCloseTab }: Props) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.path}
          className={`tab ${tab.path === activeTabPath ? 'active' : ''}`}
          onClick={() => onSelectTab(tab.path)}
          onMouseDown={(e) => {
            if (e.button === 1) {
              e.preventDefault();
              onCloseTab(tab.path);
            }
          }}
        >
          <span className="tab-label">
            {tab.isDirty && <span className="tab-dirty" />}
            {tab.name}
          </span>
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(tab.path, false);
            }}
            title="Close"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
