interface Props {
  src: string;
  name: string;
}

export default function ImagePreview({ src, name }: Props) {
  return (
    <div className="image-preview">
      <div className="image-preview-header">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M6.002 6a2 2 0 11-4 0 2 2 0 014 0z" />
          <path d="M.5 3a2 2 0 012-2h11a2 2 0 012 2v10a2 2 0 01-2 2h-11a2 2 0 01-2-2V3zm1 0v5.5l2.5-2.5 3 3 3-3 3.5 3.5V3a1 1 0 00-1-1h-11a1 1 0 00-1 1zm10 7l-3-3-2.5 2.5L3.5 9l-2 2V13a1 1 0 001 1h11a1 1 0 001-1v-1.5l-3-2.5z" />
        </svg>
        <span>{name}</span>
      </div>
      <div className="image-preview-body">
        <img src={src} alt={name} className="image-preview-img" />
      </div>
    </div>
  );
}
