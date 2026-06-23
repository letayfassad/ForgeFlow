# ForgeFlow

**ForgeFlow** is a personal AI Task Automator that converts natural-language task descriptions into structured desktop actions and executes them visibly on your Windows computer.

## Architecture

- **Web Dashboard** (`web/`) — Vite + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Local Runner** (`runner/`) — Python 3.11+ WebSocket server using pyautogui
- **Shared Schema** (`shared/`) — JSON action schema used by both components

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Windows** (desktop automation target)

## Installation

### 1. Clone and install web dependencies

```bash
cd ForgeFlow/web
npm install
```

### 2. Install Python runner dependencies

```bash
cd ForgeFlow/runner
pip install -r requirements.txt
```

### 3. (Optional) Configure AI planner API

For AI-powered planning (instead of rule-based fallback), create `web/.env.local`:

```env
VITE_AI_API_KEY=your-api-key
VITE_AI_API_URL=https://api.x.ai/v1/chat/completions
VITE_AI_MODEL=grok-3-mini
```

Without an API key, ForgeFlow uses a built-in rule-based planner for common tasks.

## Running ForgeFlow

You need **both** components running:

### Start the Python Runner (Terminal 1)

```bash
cd ForgeFlow/runner
python main.py
```

Or double-click `start-runner.bat`. The runner listens on `ws://localhost:8765`.

### Start the Web Dashboard (Terminal 2)

```bash
cd ForgeFlow/web
npm run dev
```

Or double-click `start-web.bat`. Open http://localhost:5173 in your browser.

The dashboard shows **Runner Connected** (green) when the Python server is running.

## Usage

1. **Describe a task** in the Create tab (plain English)
2. Click **Generate Action Plan** to convert it to desktop actions
3. **Preview and edit** steps — adjust mouse duration and typing intervals
4. Click **Run Automation** and confirm the safety dialog
5. Watch your mouse and keyboard execute the sequence in real time
6. **Save** automations to your Library for reuse
7. View **History** of past runs and re-run any sequence

## Example Automations

### Example 1: Open Notepad and Type

**Description:**
```
Open notepad, wait 2 seconds, type "Hello from ForgeFlow", then press enter
```

**Generated actions:**
- `open_application` → notepad
- `wait` → 2 seconds
- `type_text` → "Hello from ForgeFlow" (0.05s per character)
- `press_key` → enter

### Example 2: Click and Scroll

**Description:**
```
Move mouse to 500, 400, click, scroll down, wait 1 second
```

**Generated actions:**
- `move_mouse` → (500, 400) with 0.5s duration
- `click`
- `scroll` → -3 (down)
- `wait` → 1 second

## Action Types (v1)

| Type | Description |
|------|-------------|
| `move_mouse` | Move cursor to (x, y) with configurable duration |
| `click` | Left/right/middle click at optional coordinates |
| `double_click` | Double-click at optional coordinates |
| `right_click` | Right-click at optional coordinates |
| `type_text` | Type text with per-character interval |
| `press_key` | Press a single key (enter, tab, escape, etc.) |
| `hotkey` | Press key combination (ctrl+c, alt+tab, etc.) |
| `wait` | Pause for N seconds |
| `open_application` | Launch or focus an application |
| `scroll` | Scroll up (positive) or down (negative) |

## Safety

ForgeFlow controls your real mouse and keyboard. Use with caution:

- **Confirmation dialog** — Every run requires explicit approval
- **Emergency Stop** — Click the red "Emergency Stop" button during execution
- **Keyboard abort** — Press `Ctrl+Shift+Q` to stop immediately
- **PyAutoGUI failsafe** — Move mouse to any screen corner to abort (pyautogui built-in)
- **Speed limits** — Mouse duration capped at 30s, typing interval capped at 2s per character
- **Do not run** automations that could delete files, send messages, or perform irreversible actions without reviewing every step

### How to Emergency Stop

1. Click **Emergency Stop** in the dashboard, OR
2. Press **Ctrl+Shift+Q** on your keyboard, OR
3. Move your mouse quickly to any **corner of the screen** (pyautogui failsafe)

## Development

### Run tests

```bash
# Web (schema, persistence, planner)
cd web && npm test

# Python (schema, executor)
cd runner && python -m pytest tests/ -v
# or: python -m unittest discover -s tests
```

### Build for production

```bash
cd web && npm run build
```

## Project Structure

```
ForgeFlow/
├── shared/action-schema.json   # Canonical JSON schema
├── web/                        # React dashboard
│   └── src/
│       ├── lib/schema.ts       # TS validation
│       ├── lib/planner.ts      # AI + rule-based planner
│       ├── lib/persistence.ts  # localStorage library/history
│       └── lib/websocket.ts    # Runner client
├── runner/                     # Python automation server
│   ├── main.py                 # Entry point
│   └── forgeflow_runner/
│       ├── schema.py           # Python validation
│       ├── executor.py         # pyautogui execution
│       └── server.py           # WebSocket server
├── start-runner.bat
├── start-web.bat
└── README.md
```

## License

MIT