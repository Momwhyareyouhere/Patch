interface Props {
  path: string;
  rootPath: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumbs({ path, rootPath, onNavigate }: Props) {
  if (!path || !rootPath || path.startsWith('output://')) return null;

  const relative = path.replace(rootPath, '') || '/';
  const parts = relative.split('/').filter(Boolean);

  const segments = [{ name: '•', path: rootPath }];
  let currentPath = rootPath;
  for (const part of parts) {
    currentPath += '/' + part;
    segments.push({ name: part, path: currentPath });
  }

  return (
    <div className="breadcrumbs">
      {segments.map((seg, i) => (
        <span key={seg.path} className="breadcrumb-segment">
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          <span
            className={`breadcrumb-item ${i === segments.length - 1 ? 'active' : ''}`}
            onClick={() => onNavigate(seg.path)}
          >
            {seg.name}
          </span>
        </span>
      ))}
    </div>
  );
}
