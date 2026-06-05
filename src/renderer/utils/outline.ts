export interface Symbol {
  name: string;
  type: 'function' | 'class' | 'method' | 'variable' | 'interface' | 'enum' | 'import';
  line: number;
  icon: string;
}

const PATTERNS: Record<string, RegExp[]> = {
  typescript: [
    /export\s+(default\s+)?(async\s+)?function\s+(\w+)/g,
    /export\s+(default\s+)?class\s+(\w+)/g,
    /export\s+(default\s+)?interface\s+(\w+)/g,
    /export\s+(default\s+)?enum\s+(\w+)/g,
    /(async\s+)?function\s+(\w+)\s*\(/g,
    /class\s+(\w+)/g,
    /interface\s+(\w+)/g,
    /enum\s+(\w+)/g,
    /import\s+.*\s+from\s+/g,
    /(?:const|let|var)\s+(\w+)\s*[:=]\s*(?:async\s*)?\(/g,
    /(?:const|let|var)\s+(\w+)\s*[:=]\s*function/g,
  ],
  javascript: [
    /export\s+(default\s+)?(async\s+)?function\s+(\w+)/g,
    /export\s+(default\s+)?class\s+(\w+)/g,
    /(async\s+)?function\s+(\w+)\s*\(/g,
    /class\s+(\w+)/g,
    /import\s+.*\s+from\s+/g,
    /(?:const|let|var)\s+(\w+)\s*[:=]\s*(?:async\s*)?\(/g,
    /(?:const|let|var)\s+(\w+)\s*[:=]\s*function/g,
  ],
  python: [
    /(?:async\s+)?def\s+(\w+)\s*\(/g,
    /class\s+(\w+)/g,
    /import\s+(\w+)/g,
    /from\s+(\w+)\s+import/g,
  ],
  java: [
    /(?:public|private|protected)?\s*(?:static\s+)?(?:class|interface|enum)\s+(\w+)/g,
    /(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(?:<[^>]+>\s+)?(\w+)\s*\([^)]*\)\s*(?:\{|throws)/g,
  ],
  default: [
    /function\s+(\w+)\s*\(/g,
    /class\s+(\w+)/g,
    /interface\s+(\w+)/g,
  ],
};

export function parseOutline(content: string, language: string): Symbol[] {
  const symbols: Symbol[] = [];
  const patterns = PATTERNS[language] || PATTERNS.default;

  for (const regex of patterns) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      regex.lastIndex = 0;
      const match = regex.exec(lines[i]);
      if (match) {
        const text = match[0];
        let name = match[3] || match[2] || match[1] || '';
        let type: Symbol['type'] = 'function';

        if (text.includes('class ')) type = 'class';
        else if (text.includes('interface ')) type = 'interface';
        else if (text.includes('enum ')) type = 'enum';
        else if (text.includes('import ')) type = 'import';
        else if (text.includes('function ')) type = 'function';

        if (name) {
          symbols.push({
            name,
            type,
            line: i + 1,
            icon: type === 'class' ? 'C' : type === 'interface' ? 'I' : type === 'enum' ? 'E' : type === 'import' ? '→' : 'ƒ',
          });
        }
      }
    }
  }

  
  const seen = new Set<string>();
  return symbols.filter((s) => {
    const key = `${s.name}:${s.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
