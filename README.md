# Patch

A lightweight code editor built with Electron, Monaco Editor, and React.

## Features

- File tree explorer with search and outline views
- Multi-tab editing with Monaco (VS Code's editor)
- AI chat integration (OpenAI, Anthropic, Gemini, DeepSeek, OpenCode, Ollama)
- Built-in terminal (xterm.js + node-pty)
- Git integration (status, branch, log)
- Image preview
- Settings persistence with encrypted API key storage
- Keyboard shortcut: `Ctrl+P` command palette, `Ctrl+K I` toggle AI, `Ctrl+K H` keyboard shortcuts

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
