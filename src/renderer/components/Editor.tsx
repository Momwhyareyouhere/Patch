import Editor from '@monaco-editor/react';
import type { OpenTab, EditorSettings } from '../types';
import ImagePreview from './ImagePreview';

interface Props {
  tab: OpenTab;
  onChange: (path: string, content: string) => void;
  settings: EditorSettings;
  onCursorChange?: (line: number, col: number) => void;
  editorRef?: React.MutableRefObject<any>;
}

export default function MonacoEditor({ tab, onChange, settings, onCursorChange, editorRef }: Props) {
  if (tab.language === 'image') {
    return <ImagePreview src={tab.content} name={tab.name} />;
  }

  return (
    <Editor
      key={tab.path + tab.language + settings.theme}
      theme={settings.theme}
      language={tab.language}
      value={tab.content}
      onChange={(value) => onChange(tab.path, value || '')}
      onMount={(editor) => {
        if (editorRef) editorRef.current = editor;
        if (onCursorChange) {
          editor.onDidChangeCursorPosition((e) => {
            onCursorChange(e.position.lineNumber, e.position.column);
          });
        }
      }}
      options={{
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        fontLigatures: true,
        lineNumbers: settings.lineNumbers,
        minimap: { enabled: settings.minimap, showSlider: 'mouseover' },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        renderLineHighlight: 'all',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        formatOnPaste: true,
        padding: { top: 8 },
      }}
    />
  );
}
