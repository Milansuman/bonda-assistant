# Bonda Assistant - AI Coding Instructions

## Project Architecture

This is a **hybrid Electron + Python desktop AI assistant** that combines cross-platform desktop capabilities with AI-powered command execution. The project uses a modern Electron + Vite + React stack with TypeScript for the desktop interface and Python with FastAPI/LangChain for AI processing.

### Key Components

- **Main Process** (`src/main/`): Electron's main process handling window management and system integration
- **Renderer Process** (`src/renderer/`): React-based UI with transparent window styling
- **Preload Script** (`src/preload/`): Security bridge between main and renderer processes  
- **AI Engine** (`src/main/lib/ai/`): Groq-powered agent with system command execution capabilities
- **Python Backend** (`main.py`, `pyproject.toml`): FastAPI + LangChain for additional AI processing

## Development Workflows

### Starting Development
```bash
npm run dev          # Electron + React hot reload
```

### Building for Distribution
```bash
npm run build:win    # Windows build
npm run build:mac    # macOS build  
npm run build:linux  # Linux build
```

### Type Checking
The project uses separate TypeScript configs:
- `tsconfig.node.json` - Main/preload processes
- `tsconfig.web.json` - Renderer process
- Use `npm run typecheck` to validate all configs

## AI System Patterns

### Agent Configuration (`src/main/lib/ai/bonda.ts`)
- Uses **Groq's Kimi model** (`moonshotai/kimi-k2-instruct`) as the main LLM
- Implements AI SDK's `Experimental_Agent` with tool calling capabilities
- **Critical**: Agent has shell command execution via `runCommand` tool - security implications for system access
- OS-aware system prompts with platform-specific guidance (Linux/Windows)

### Environment Variables
- Main process: `GROQ_API_KEY` for AI client authentication
- Renderer process: `VITE_GROQ_API_KEY` for Vite builds
- API key validation happens in `src/main/lib/ai/client.ts`

### Security Model
- Uses Electron's `contextIsolated` preload pattern for secure IPC
- Main window has `sandbox: false` - implies privileged access needed for AI commands
- Agent has 20-step execution limit (`stepCountIs(20)`)

## Cross-Platform Considerations

### Window Styling
- `titleBarStyle: 'hidden'` + `transparent: true` for custom UI
- Platform-specific icon handling (Linux requires explicit icon)
- `autoHideMenuBar: true` for clean interface

### Command Execution
The AI agent has OS-specific command patterns:
- **Linux**: Uses `xdg-open`, `pkexec` for sudo (never direct sudo), `yes` utility for prompts
- **Windows**: PowerShell-based commands
- File organization requires information gathering before actions

## Development Patterns

### IPC Communication
- Basic ping/pong pattern established (`ipcMain.on('ping')`)
- Extend in `src/preload/index.ts` and main process for AI communication

### Dependencies Management
- Uses `uv` for Python dependency management (`uv.lock`)
- Node dependencies managed via npm with Electron-specific packages
- AI dependencies: `@ai-sdk/groq`, `ai` package for streaming responses

### File Structure Conventions
- Renderer assets use `?asset` suffix for Vite processing (`icon.png?asset`)
- Alias `@renderer` configured for clean imports in renderer code
- External deps automatically externalized via `externalizeDepsPlugin()`

## Integration Points

### AI-to-System Bridge
The `BondaAgent.runCommand` tool is the primary system integration point - it executes shell commands with full system access. When extending AI capabilities, consider:
- Command validation/sanitization
- Platform compatibility (Linux/Windows/macOS)
- Security implications of shell access

### Dual Backend Approach
Both TypeScript (Electron main) and Python backends suggest different AI processing paths:
- Electron main: Real-time chat/assistance
- Python FastAPI: Potentially batch processing or specialized AI tasks

When adding features, consider which backend best fits the use case and maintain consistency in AI model usage across both.