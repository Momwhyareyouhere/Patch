# Patch

A lightweight code editor built with Electron, Monaco Editor, and React.

## Features

- File tree explorer with search, outline views, and file operations (copy/cut/paste/rename/delete)
- Multi-tab editing with Monaco (VS Code's editor)
- AI chat integration (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, OpenCode, Ollama, plus custom providers)
- AI tool calling — read/write files, run commands, web search, and more
- Built-in terminal (xterm.js + node-pty)
- Git integration (status, branch, log, stage, unstage, commit, push, pull, inline diff)
- Search & replace across files with glob pattern filtering
- Image preview
- Plugin system with extensible API
- Command palette (`Ctrl+Shift+P`), go to line (`Ctrl+G`), Zen mode
- Problems panel for errors and warnings
- File watcher with auto-refresh on external changes
- Drag-and-drop file/folder import
- Breadcrumbs navigation
- Welcome screen with recent folders
- Rich status bar (language, position, word count, encoding, Git branch, clock)
- Auto-save with configurable delay
- Text transformations (uppercase, lowercase, title case, UUID generation, format document)
- Minimap and relative line numbers toggle
- Hidden files toggle
- Font customization (family, size, ligatures)
- Multi-window support
- Settings persistence with encrypted API key storage
- Keyboard shortcuts: `Ctrl+P` command palette, `Ctrl+G` go to line, `Ctrl+Shift+P` command palette, `Ctrl+K I` toggle AI, `Ctrl+K H` keyboard shortcuts

## Download

Pre-built binaries are available on the [Releases](https://github.com/Momwhyareyouhere/Patch/releases) page.

- **Linux**: `.AppImage`

> Windows and macOS builds not currently provided — run `npm run dist:win` on Windows or `npm run dist:mac` on macOS to build them.

## Usage

```bash
# Install dependencies
npm install

# Build and run
npm start

# Package into binary
npm run dist
```

### Platform-specific builds

```bash
npm run dist:linux   # AppImage
npm run dist:win     # Windows installer
npm run dist:mac     # macOS DMG (requires macOS)
```

## Tech Stack

- **Framework**: Electron 42
- **Editor**: Monaco Editor (via `@monaco-editor/react`)
- **UI**: React 19
- **Terminal**: xterm.js + node-pty
- **Build**: esbuild, electron-builder

## License

MIT
