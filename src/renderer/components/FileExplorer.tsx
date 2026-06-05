import { useState } from 'react';
import type { FileNode, GitFile } from '../types';

interface Props {
  nodes: FileNode[];
  rootPath: string;
  onOpenFile: (path: string) => void;
  onCreateFile: (parentPath: string, name: string) => void;
  onCreateDirectory: (parentPath: string, name: string) => void;
  onDelete: (path: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  activeFilePath: string | null;
  gitFiles: GitFile[];
}

const iconColor: Record<string, string> = {
  ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#f7df1e',
  json: '#f5a623', html: '#e34f26', css: '#1572b6', scss: '#c6538c',
  py: '#3572A5', rs: '#dea584', go: '#00ADD8', java: '#b07219',
  c: '#555555', cpp: '#f34b7d', cs: '#178600', rb: '#cc0000',
  php: '#777bb3', swift: '#f05138', kt: '#7f52ff', dart: '#00d2b8',
  lua: '#000080', sh: '#89e051', yaml: '#cb171e', yml: '#cb171e',
  md: '#083fa1', vue: '#41b883', svelte: '#ff3e00', sql: '#e38c00',
  graphql: '#e535ab', sass: '#c6538c', less: '#1d365d',
  dockerfile: '#2496ed', conf: '#6a6a6a', lock: '#7a7a7a',
  toml: '#7a7a7a', xml: '#f16529', svg: '#ffb13b',
};

const iconText: Record<string, string> = {
  ts: 'T', tsx: 'T', js: 'J', jsx: 'J', json: '{',
  html: 'H', css: '#', scss: 'S', py: 'P', rs: 'R',
  go: 'G', java: 'J', c: 'C', cpp: '+', cs: 'C#',
  rb: 'R', php: 'P', swift: 'S', kt: 'K', dart: 'D',
  lua: 'L', sh: '>', yaml: 'Y', yml: 'Y', md: 'M',
  vue: 'V', svelte: 'S', sql: 'Q', graphql: 'G',
  dockerfile: 'D', conf: '#', toml: 'T', xml: 'X', svg: 'S',
};

function FileIcon({ name, type }: { name: string; type: string }) {
  if (type === 'directory') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" fill="#dcb67a">
        <path d="M.5 3.5a2 2 0 012-2h3.672a2 2 0 011.414.586l.828.828A2 2 0 009.828 3h3.672a2 2 0 012 2v7a2 2 0 01-2 2H2.5a2 2 0 01-2-2V3.5z" />
      </svg>
    );
  }

  const ext = name.split('.').pop()?.toLowerCase();
  if (ext && iconText[ext]) {
    return (
      <span style={{ color: iconColor[ext] || '#7a7a7a', fontWeight: 'bold', fontSize: '11px', width: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {iconText[ext]}
      </span>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="#7a7a7a">
      <path d="M9.5 2.5a.5.5 0 01.5.5v2h2a.5.5 0 010 1h-2v2a.5.5 0 01-1 0V6h-2a.5.5 0 010-1h2V3a.5.5 0 01.5-.5z" />
      <path d="M2.5 1a1 1 0 00-1 1v12a1 1 0 001 1h11a1 1 0 001-1V5.5a.5.5 0 00-.146-.354l-3-3A.5.5 0 0011 2H2.5zm0 1h8.293L13 4.207V13H2.5V2z" />
    </svg>
  );
}

function getGitStatus(path: string, gitFiles: GitFile[], rootPath: string): string {
  const relative = path.replace(rootPath, '').replace(/^\//, '');
  const file = gitFiles.find((f) => f.path === relative || f.path.endsWith('/' + relative));
  return file ? file.status : '';
}

const statusColors: Record<string, string> = {
  M: '#4ec9b0', A: '#4ec9b0', D: '#f44747', R: '#4ec9b0',
  C: '#4ec9b0', U: '#cca700', '?': '#cca700', '!!': '#f44747',
};

function GitStatusIcon({ status }: { status: string }) {
  if (!status) return null;
  const label: Record<string, string> = {
    M: 'M', A: 'U', D: 'D', R: 'R', C: 'C', U: 'U', '?': '?', '!!': '!',
  };
  return (
    <span className="git-status-icon" style={{ color: statusColors[status] || '#cca700' }}>
      {label[status] || status}
    </span>
  );
}

function TreeNode({
  node, depth, onOpenFile, onCreateFile, onCreateDirectory, onDelete, onRename,
  activeFilePath, rootPath, gitFiles,
}: {
  node: FileNode; depth: number; onOpenFile: (path: string) => void;
  onCreateFile: (parentPath: string, name: string) => void;
  onCreateDirectory: (parentPath: string, name: string) => void;
  onDelete: (path: string) => void; onRename: (oldPath: string, newName: string) => void;
  activeFilePath: string | null; rootPath: string; gitFiles: GitFile[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [creating, setCreating] = useState<'file' | 'dir' | null>(null);
  const [newName, setNewName] = useState('');
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const isActive = activeFilePath === node.path;
  const gitStatus = node.type === 'file' ? getGitStatus(node.path, gitFiles, rootPath) : '';

  const paddingLeft = 12 + depth * 16;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
    window.addEventListener('click', () => setShowMenu(false), { once: true });
  };

  const handleRename = async () => {
    if (editName && editName !== node.name) await onRename(node.path, editName);
    setEditing(false);
  };

  const handleCreate = async () => {
    if (!newName) return;
    if (creating === 'file') await onCreateFile(node.type === 'directory' ? node.path : rootPath, newName);
    else await onCreateDirectory(node.type === 'directory' ? node.path : rootPath, newName);
    setCreating(null); setNewName(''); setExpanded(true);
  };

  return (
    <div>
      <div
        className={`tree-node ${isActive ? 'active' : ''}`}
        style={{ paddingLeft }}
        onDoubleClick={() => node.type === 'file' && onOpenFile(node.path)}
        onContextMenu={handleContextMenu}
      >
        <span className={`tree-arrow ${expanded ? 'expanded' : ''}`} onClick={() => node.type === 'directory' && setExpanded(!expanded)}>
          {node.type === 'directory' && (
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M6 4l4 4-4 4" /></svg>
          )}
        </span>
        <span className="tree-icon">
          {editing ? (
            <input className="inline-input" value={editName} onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename} onKeyDown={(e) => e.key === 'Enter' && handleRename()} autoFocus onClick={(e) => e.stopPropagation()} />
          ) : (
            <>
              <FileIcon name={node.name} type={node.type} />
              <span className="tree-label">{node.name}</span>
              {gitStatus && <GitStatusIcon status={gitStatus} />}
            </>
          )}
        </span>
        {showMenu && (
          <div className="context-menu" style={{ left: menuPos.x, top: menuPos.y }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setEditing(true); setShowMenu(false); }}>Rename</button>
            <button onClick={() => { onDelete(node.path); setShowMenu(false); }}>Delete</button>
            {node.type === 'directory' && (
              <>
                <div className="menu-divider" />
                <button onClick={() => { setCreating('file'); setShowMenu(false); }}>New File</button>
                <button onClick={() => { setCreating('dir'); setShowMenu(false); }}>New Folder</button>
              </>
            )}
          </div>
        )}
      </div>
      {node.type === 'directory' && expanded && node.children && (
        <>
          {creating && (
            <div className="tree-node" style={{ paddingLeft: paddingLeft + 16 }}>
              <span className="tree-icon">
                <FileIcon name={creating === 'dir' ? 'folder' : 'file'} type={creating === 'dir' ? 'directory' : 'file'} />
                <input className="inline-input" value={newName} onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleCreate} onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder={creating === 'file' ? 'filename.ext' : 'folder name'} autoFocus onClick={(e) => e.stopPropagation()} />
              </span>
            </div>
          )}
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1}
              onOpenFile={onOpenFile} onCreateFile={onCreateFile} onCreateDirectory={onCreateDirectory}
              onDelete={onDelete} onRename={onRename} activeFilePath={activeFilePath} rootPath={rootPath} gitFiles={gitFiles} />
          ))}
        </>
      )}
    </div>
  );
}

export default function FileExplorer(props: Props) {
  return (
    <div className="file-explorer">
      {props.nodes.length === 0 ? (
        <div className="empty-tree">No files in directory</div>
      ) : (
        props.nodes.map((node) => (
          <TreeNode key={node.path} node={node} depth={0}
            onOpenFile={props.onOpenFile} onCreateFile={props.onCreateFile}
            onCreateDirectory={props.onCreateDirectory} onDelete={props.onDelete} onRename={props.onRename}
            activeFilePath={props.activeFilePath} rootPath={props.rootPath} gitFiles={props.gitFiles} />
        ))
      )}
    </div>
  );
}
