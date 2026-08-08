# AI Voice Assistant — Full Quality Improvement Plan

## Project Overview

A React (TypeScript) + Flask (Python) AI Voice Assistant using Web Speech API for voice I/O, SQLite-backed todo persistence via the Flask backend, and a Python backend proxying weather, news, Wikipedia, dictionary, YouTube search/download, email, and maps APIs.

**Note:** The original design used Firebase Firestore for todos, but Firebase config is never provided in the codebase (globals `__firebase_config` etc. are declared but never injected). Per user decision, Firebase is removed entirely; todos are moved to the Flask backend with SQLite.

**Current state:** Non-tested, partially broken prototype. Build tooling is incompatible (react-scripts is a placeholder `^0.0.0`, TypeScript 4.9.5 is too old for React 19), Firebase config is never provided (removed; replaced with backend SQLite), core logic has a critical fallthrough bug in `processCommand`, speech recognition has a stale closure bug making todos/voices always see initial state, voice switching is broken, the existing test always fails, and the backend has security and reliability issues.

**Resolved decisions:**
- ✅ Firebase removed — todos moved to Flask backend with SQLite
- ✅ Build tooling: Vite migration (best option for React 19 SPA; CRA 5 doesn't officially support React 19, Next.js/Remix overkill)

---

## Phase 1: Fix Critical Blocking Issues

### 1.1 Migrate from CRA to Vite

**Problem:** `react-scripts: "^0.0.0"` and `typescript: "^4.9.5"` are incompatible with `react/react-dom ^19.1.0`. CRA 5 does not officially support React 19.

**Actions:**
- Install Vite stack: `vite`, `@vitejs/plugin-react-swc` (React SWC plugin), `vitest`, `@vitest/coverage-v8`
- Upgrade `typescript` to `^5.5.4` (minimum for React 19)
- Create `vite.config.ts` with React SWC plugin, Vitest test config, server proxy for backend
- Move `public/index.html` → `index.html` at project root, remove `%PUBLIC_URL%` (not needed in Vite)
- Update `tsconfig.json`: ensure `module: "ESNext"`, `types` includes vitest if used
- Create `src/env.d.ts` with Vite type declarations for `import.meta.env`
- Update `package.json` scripts:
  - `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`, `"test": "vitest"`, `"lint": "eslint . --ext .ts,.tsx"`, `"type-check": "tsc --noEmit"`
- Delete `react-scripts`, `react-app-env.d.ts`, `src/reportWebVitals.ts`
- Regenerate `package-lock.json` (current one has broken dependency tree)
- Fix `src/index.css`: replace deprecated `@import 'tailwindcss/base'` with `@tailwind base` etc.
- Configure dev server proxy in `vite.config.ts` to forward `/api/*` to backend during development
- Verify `npm run dev`, `npm run build`, `npm run test`, `npm run type-check` all succeed

**Files:** `package.json`, `vite.config.ts` (new), `package-lock.json` (regenerated), `index.html` (moved from `public/`), `src/env.d.ts` (new), `tsconfig.json` (updated), `src/index.css` (updated), delete `react-app-env.d.ts`, `src/reportWebVitals.ts`, `public/index.html`

### 1.2 Replace Firebase with Backend-Based Todo Storage

**Decision:** Firebase removed entirely. Todos will be managed by the Flask backend with SQLite. (User confirmed this over Firebase.)

**Problem:** `App.tsx:2-4,6-13,344-393,690-743` — Uses Firebase anonymous auth + Firestore for todos. The `__firebase_config`, `__app_id`, `__initial_auth_token` globals are never defined anywhere in the codebase (no `.env.local`, no env injection, no Firebase project setup). `firebaseConfig` resolves to `{}`, so `initializeApp({})` fails or silently produces no functional Firestore. All todo CRUD operations are non-functional.

**Actions:**
- Frontend: Remove all Firebase imports and auth flow. Remove `userId`, `isAuthReady`, `dbRef`, `authRef` state. Replace Firestore CRUD with HTTP API calls to backend todo endpoints.
- Backend: Add SQLite-based todo storage (`sqlite3` built-in module). Add REST endpoints:
  - `GET /api/todos` — list all todos
  - `POST /api/todos` — create todo (body: `{ "task": "string" }`)
  - `PUT /api/todos/<id>` — update todo (body: `{ "task": "string", "completed": bool }`)
  - `DELETE /api/todos/<id>` — delete todo
  - `GET /health` — health check
- Add `sqlite3` to `backend/requirements.txt` (no extra dependency needed — it's in Python stdlib)
- Update frontend todo display to poll backend or use simple fetch-and-refresh pattern
- Update `.gitignore` to add `backend/todos.db` (SQLite database file)

**Files:** `src/App.tsx` (remove Firebase), `backend/app.py` (rewritten — see Phase 2.0), `backend/requirements.txt` (add `flask-cors`, `pytest`, `python-dotenv`, `flask-limiter`), `backend/.env.example` (new), `.gitignore`

### 1.3 Fix processCommand Fallthrough Bug (CRITICAL)

**Problem:** `App.tsx:460-661`. When async commands (weather, news, Wikipedia, dictionary, YouTube, email, download) match, `response` stays `''`. After the API call function is invoked, execution falls through to `setAssistantResponse(response)` (line 659) and `speak(response)` (line 660), overwriting the response that the async function set with an empty string.

**Actions:**
- Add `return` statements after async command calls (like the voice-switch commands already do)
- OR refactor `processCommand` to use a strategy pattern with early returns
- Ensure each command branch that delegates to an async function returns immediately

**File:** `src/App.tsx:513-660`

### 1.4 Fix Stale Closure in Speech Recognition (CRITICAL)

**Problem:** `App.tsx:395-437`. The speech recognition `useEffect` has `[]` dependency array, meaning it runs once on mount and captures `processCommand` from the **first render**. On first render, all state has initial values: `todos=[]`, `availableVoices=[]`. This means even after the app loads and todos fetch from the backend, every spoken command processes with stale state — todo commands always see empty lists, voice switching always sees empty voices, and todo CRUD always fails because the closure has stale `todos`/`availableVoices` references.

This also causes voice switching (`App.tsx:619,628`) to always fail since `availableVoices` is `[]` in the captured closure, even though the `useEffect` at `App.tsx:63-74` updates it on subsequent renders.

**Actions:**
- Use a ref pattern: store the latest `processCommand` in a `processCommandRef` that is updated on every render, and have `recognition.onresult` call `processCommandRef.current(transcript)`
- OR use the `useCallback` pattern for `processCommand` with a ref-based approach
- The ref pattern is recommended for minimal disruption.

**File:** `src/App.tsx:395-437` (recognition effect), `src/hooks/useSpeechRecognition.ts` (refactored hook)

### 1.5 Fix Broken Test

**Problem:** `App.test.tsx:7` searches for "learn react link" text which doesn't exist in the app.

**Actions:**
- Rewrite `App.test.tsx` to test actual app functionality (e.g., renders "AI Voice Assistant" heading, or test the command parser)
- Add tests for `processCommand` logic with mocked functions

**File:** `src/App.test.tsx`

### 1.6 Fix Voice Switching Logic

**Problem:** `App.tsx:619,628` searches for voice names containing "female"/"male". No browser voice names contain these keywords. Chrome voices are like "Google US English", "Microsoft David", "Microsoft Zira". This is a **secondary** issue — the stale closure in 1.4 must be fixed first so `availableVoices` is even populated.

**Actions:**
- Replace name-based matching with a more robust approach:
  - Use voice `name` and `lang` to identify known US English voices
  - Allow user to select from a dropdown of available voices
  - Store preferred voice in localStorage
- Add a voice selection dropdown in the UI

**File:** `src/App.tsx:618-635`

### 1.7 Create Backend requirements.txt

**Problem:** README instructs users to create `requirements.txt` but no file exists in the repo.

**Actions:**
- Create `backend/requirements.txt` with all dependencies (use Flask 3.x, minimum versions tested with Python 3.9+):
  - `flask>=3.0.0` (Flask 3.x; fixes the Python 3.12 compatibility issues in 2.x)
  - `flask-cors>=4.0.0`
  - `flask-limiter>=3.5.0`
  - `python-dotenv>=1.0.0`
  - `requests>=2.31.0`
  - `wikipedia-api>=0.5.4`
  - `spellchecker>=0.7.0`
  - `ruff>=0.6.0` (linting)
  - `pytest>=8.0.0`
  - `pytest-cov>=5.0.0`
  - `pytest-flask>=1.3.0`
  - Note: `PyDictionary` removed (replaced by `dictionaryapi.dev` HTTP calls)
  - Note: `sqlite3` is Python stdlib, no package needed
  - Note: `yt-dlp` is a system binary, not a Python package

**File:** `backend/requirements.txt` (new)

### 1.8 Disable Flask Debug Mode

**Problem:** `app.py:461` — `debug=True` exposes the Werkzeug debugger (RCE vulnerability).

**Actions:**
- Change to `debug=False` or control via environment variable: `debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'`
- Add a proper health check endpoint at `/health`

**File:** `backend/app.py:461`

### 1.9 Remove Hardcoded API Keys

**Problem:** `backend/keys.py` contains real API keys in plaintext.

**Actions:**
- Remove or empty `backend/keys.py`
- Add `.env.example` for backend with all required environment variables
- Use `python-dotenv` to load `.env` file in `app.py`
- Update `.gitignore` to ignore `.env`

**Files:** `backend/keys.py`, `backend/.env.example` (new), `.gitignore`

### 1.10 Fix YouTube Download URL Extraction Bug

**Problem:** `App.tsx:599-603`. The YouTube download command regex `/download youtube video\s+(https?:\/\/...)/` captures the full match (including the "download youtube video" prefix) in `urlMatch[0]`. The code passes `urlMatch[0]` (which starts with "download youtube video ") as the video URL to the backend, producing a malformed URL that yt-dlp cannot process.

**Actions:**
- Construct the URL from capture groups: `urlMatch[1] + urlMatch[2]` (prefix + video ID)
- Or rewrite the regex to extract only the URL portion
- Add validation that the constructed URL matches a valid YouTube URL pattern

**File:** `src/App.tsx:599-603`

### 1.11 Fix Website "Dot" Translation Bug

**Problem:** `App.tsx:636-654`. The `open website` command regex `open website (.*?)(?:\.|$)` does not translate spoken "dot" to "." in domain names. If the user says "open website google dot com", the URL becomes `http://google dot com` which is invalid. Also, the non-greedy `.*?` stops at the first literal period, so even "google.com" would be truncated to just "google".

**Actions:**
- Pre-process the spoken command to replace " dot " with "." before URL matching
- Update the regex to capture the full domain name
- Handle common spoken forms: "dot com" → ".com", "dot org" → ".org"
- Validate the resulting URL has a valid TLD

**File:** `src/App.tsx:636-654`

### 1.12 Wire Up Maps Feature

**Problem:** Backend has `/maps/search` (and `GOOGLE_MAPS_API_KEY`) but frontend never calls it. Maps is not listed in the README features — the backend code appears to be unfinished future work.

**Actions:**
- Add `fetchMapsSearch` function in frontend API service layer
- Add voice command parsing: "find [place] near me" or "search for [query] on maps"
- Add `MapsResults` component to display map search results
- Add maps section to `processCommand`

**File:** `src/services/maps.ts` (new), `src/App.tsx` (command addition), `src/components/MapsResults.tsx` (new)

---

## Phase 2.0: Backend Restructure (Flask Blueprints)

**Problem:** Single-file `app.py` (461 lines) with identical 5-block `except` chains repeated in every endpoint, no separation of concerns, hard to test.

**Actions:**
- Create backend structure:
  - `backend/app.py` — minimal app factory + blueprint registration
  - `backend/config.py` — environment variable loading (with `python-dotenv`), API key constants
  - `backend/db.py` — SQLite initialization, todo database helpers
  - `backend/routes/todo_routes.py` — todo CRUD endpoints (`/api/todos`, `/api/todos/<id>`)
  - `backend/routes/weather_routes.py` — weather endpoint
  - `backend/routes/news_routes.py` — news endpoint
  - `backend/routes/wikipedia_routes.py` — Wikipedia endpoint
  - `backend/routes/dictionary_routes.py` — dictionary endpoint (using `dictionaryapi.dev` instead of PyDictionary)
  - `backend/routes/youtube_routes.py` — YouTube search + download endpoints
  - `backend/routes/email_routes.py` — email sending endpoint (with auth decorator)
  - `backend/routes/maps_routes.py` — maps search endpoint
  - `backend/routes/health.py` — `/health` endpoint
  - `backend/utils/error_handler.py` — shared error handling decorator/utility
  - `backend/utils/auth.py` — API key authentication decorator for sensitive endpoints
- Use `functools.wraps` decorator to wrap Flask routes with consistent error handling
- All endpoints under `/api/` prefix for REST consistency

**Files:** `backend/app.py` (rewritten), many new files under `backend/routes/`, `backend/utils/`

## Phase 2: Backend Hardening & Improvements

### 2.1 Add Request Timeouts to All API Calls

**Problem:** `app.py:64,126,270,412` — `requests.get()` calls have no timeout; can hang indefinitely.

**Actions:**
- Add `timeout=30` (or configurable) to all `requests.get()` and `requests.post()` calls
- Add consistent timeout to `subprocess.run()` for yt-dlp (e.g., `timeout=300`)

**File:** `backend/app.py`

### 2.2 Add Input Validation & Null Safety

**Problem:** `app.py:310` — `data.get('url')` will throw `AttributeError` if `request.get_json()` returns `None`. Same for email endpoint at `app.py:354`.

**Actions:**
- Add null check: `if data is None: return jsonify({"error": "Invalid JSON"}), 400`
- Validate URL format more strictly for YouTube download
- Validate email format with regex

**File:** `backend/app.py:307-311, 351-357`

### 2.3 Replace PyDictionary with dictionaryapi.dev (RESOLVED)

**Problem:** `app.py:6` — PyDictionary relies on defunct API endpoints; frequently returns empty results.

**Resolution:** Use free `dictionaryapi.dev` API (no auth, no Python package, reliable, actively maintained). Remove `PyDictionary` dependency entirely.

**Actions:**
- Remove `from PyDictionary import PyDictionary` and `dictionary = PyDictionary()`
- Dictionary endpoint calls `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` via `requests` with timeout
- Response format stays compatible with what the frontend expects (`definitions`, `original_word`, `corrected_word`, `suggestion`)
- Remove `PyDictionary` from `requirements.txt`

**File:** `backend/routes/dictionary_routes.py` (new, replaces code in `app.py:212-249`)

### 2.4 Add Rate Limiting

**Problem:** No rate limiting on any backend endpoint.

**Actions:**
- Install `flask-limiter`
- Apply rate limits (e.g., 60/minute for general, 10/minute for email/download)
- Add rate limit headers to responses

**File:** `backend/app.py` (app factory), `backend/requirements.txt`

### 2.5 Add Authentication for Sensitive Endpoints

**Problem:** Email sending and video download endpoints are completely unauthenticated.

**Actions:**
- Create `backend/utils/auth.py` — API key decorator that checks `X-API-Key` header against `AUTH_API_KEY` env var
- Apply to email route (`backend/routes/email_routes.py`) and download route (`backend/routes/youtube_routes.py`)
- Document `AUTH_API_KEY` env var in `.env.example`

**File:** `backend/utils/auth.py` (new), `backend/routes/email_routes.py`, `backend/routes/youtube_routes.py`, `backend/.env.example`

### 2.6 Fix Downloads Directory Path

**Problem:** `app.py:37` — Uses `os.getcwd()` which is fragile depending on how the server is started.

**Actions:**
- Use `os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')` for reliability

**File:** `backend/app.py:37` → `backend/config.py`, `backend/routes/youtube_routes.py`

### 2.7 Add Structured Logging & Error Handling

**Problem:** Uses `print()` for logging; no structured logging.

**Actions:**
- Replace `print()` with Python `logging` module (configured in `config.py`)
- Add request logging middleware
- Add structured error responses that don't leak internal details (e.g., no `repr(e)` in production)

**File:** `backend/config.py`, `backend/utils/error_handler.py`

---

## Phase 3: Frontend Architecture Refactor

### 3.1 Split Monolithic App.tsx into Components

**Problem:** `App.tsx` is 1064 lines — single file contains everything.

**Actions:**
- Create `src/components/` directory with:
  - `VoiceControl.tsx` — start/stop buttons, voice status
  - `AssistantDisplay.tsx` — assistant response display
  - `WeatherCard.tsx` — weather display
  - `NewsList.tsx` — news articles
  - `WikipediaCard.tsx` — Wikipedia results
  - `DictionaryCard.tsx` — dictionary results
  - `YouTubePlayer.tsx` — video player + search results
  - `TodoList.tsx` — todo list with add/toggle/delete
  - `EmailStatus.tsx` — email status display
  - `DownloadStatus.tsx` — download status display
  - `VoiceSelector.tsx` — voice selection dropdown
- Create `src/services/` directory with:
  - `api.ts` — centralized fetch client with error handling
  - `weather.ts`, `news.ts`, `wikipedia.ts`, `dictionary.ts`, `youtube.ts`, `email.ts` — feature-specific API services
- Create `src/hooks/` directory with:
  - `useSpeechRecognition.ts` — voice recognition hook
  - `useSpeechSynthesis.ts` — text-to-speech hook
  - `useTodos.ts` — todo CRUD operations (backend API calls with polling)
  - `useCommandProcessor.ts` — command parsing logic
- Create `src/types/` directory with:
  - `Weather.ts`, `News.ts`, `Wikipedia.ts`, `Dictionary.ts`, `YouTube.ts`, `Todo.ts` — type definitions

**Files:** `src/App.tsx` (refactored), many new files in `src/components/`, `src/services/`, `src/hooks/`, `src/types/`

### 3.2 Create Centralized API Client (src/services/api.ts)

**Problem:** API calls are scattered, no centralized error handling or retry logic.

**Actions:**
- Create `api.ts` with:
  - Base URL from `import.meta.env.VITE_BACKEND_URL` (Vite prefix `VITE_`, not `REACT_APP_`)
  - Consistent error handling wrapper
  - Retry logic with exponential backoff for transient failures
  - Request/response logging in development
  - Timeout handling

**File:** `src/services/api.ts` (new)

### 3.3 Fix Backend URL Configuration

**Problem:** `App.tsx:29` — `BACKEND_URL` hardcoded to `http://127.0.0.1:5000`.

**Actions:**
- Use `import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'` (Vite env prefix is `VITE_`, not `REACT_APP_`)
- Create `.env.example` with `VITE_BACKEND_URL=http://127.0.0.1:5000`

**Files:** `src/services/api.ts` (new), `.env.example` (new at root)

### 3.4 Replace `any` Types with Proper Interfaces

**Problem:** Extensive use of `any` throughout `App.tsx`.

**Actions:**
- Define TypeScript interfaces for all API response types and component props
- Remove all `any` usage

**Files:** `src/types/*.ts` (new), refactored across components

### 3.5 Load Inter Font

**Problem:** `font-inter` CSS class used but Inter font never loaded.

**Actions:**
- Add Google Fonts `<link>` for Inter in `index.html`
- OR import Inter in `index.css` via `@import url('https://fonts.googleapis.com/...')`
- Ensure `tailwind.config.js` font definition matches

**Files:** `public/index.html`, `src/index.css`, `tailwind.config.js`

---

## Phase 4: Voice Recognition & TTS Improvements

### 4.1 Fix Stale Closure in Speech Recognition (CRITICAL — ref section)

**Problem:** `App.tsx:395-437` and `App.tsx:412-416` — The speech recognition `useEffect` has `[]` dependency array, capturing `processCommand` from the first render. This closure has stale `todos`, `availableVoices`, etc. — every spoken command runs against initial render state.

**Actions:**
- In the `useSpeechRecognition` hook, store `processCommand` in a ref updated on every render:
  ```ts
  const processCommandRef = useRef(processCommand);
  useEffect(() => { processCommandRef.current = processCommand; });
  ```
- `recognition.onresult` calls `processCommandRef.current(transcript)` instead of the captured `processCommand`
- Pass `processCommand` as a dependency to the hook, or accept it via ref from the parent component

**File:** `src/hooks/useSpeechRecognition.ts`

### 4.2 Add Recognition Restart Logic

**Problem:** `App.tsx:401` — `recognition.continuous = false` means it stops after each command.

**Actions:**
- Add `onend` handler that automatically restarts recognition (with debouncing to avoid rapid restart loops on errors)
- Add a state toggle for continuous vs single-shot listening mode

**File:** `src/hooks/useSpeechRecognition.ts`

### 4.3 Add State Guard for startListening

**Problem:** `App.tsx:664-670` — Starting recognition when already running throws `InvalidStateError`.

**Actions:**
- Check `recognitionRef.current` state before calling `.start()`
- Catch and handle the error gracefully
- The stale closure fix in 4.1 ensures the latest `startListening` is used

**File:** `src/hooks/useSpeechRecognition.ts`

### 4.4 Fix Voice Selection

**Problem:** Voice switching by name keyword is broken (see 1.6).

**Actions:**
- Move voice management to `useSpeechSynthesis` hook
- Persist preferred voice in `localStorage`
- Provide dropdown UI for voice selection
- Handle `onvoiceschanged` properly to wait for voices to load

**File:** `src/hooks/useSpeechSynthesis.ts`, `src/components/VoiceSelector.tsx`

### 4.5 Add SpeechSynthesis Error Recovery

**Problem:** `App.tsx:96` — `speak()` doesn't handle the case where synthesis is interrupted (e.g., tab switching, browser throttle).

**Actions:**
- Add `onend` handler to utterances to track completion
- Add abort queue for interrupted speech
- Handle visibility change events to pause/resume

**File:** `src/hooks/useSpeechSynthesis.ts`

---

## Phase 5: Testing & Quality Assurance

### 5.1 Fix Frontend Tests

**Actions:**
- Fix existing `App.test.tsx` to test actual rendered content
- Add tests for:
  - `processCommand` logic (test command parsing for each supported command type)
  - Command parser logic (regex extraction for each command type)
  - API service functions (mock `fetch`)
  - Component rendering (WeatherCard, NewsList, DictionaryCard, etc.)
  - Todo CRUD hook with mocked backend API
  - Voice selection hook behavior

**Files:** `src/App.test.tsx`, new test files in `src/`

### 5.2 Add Backend Tests

**Actions:**
- Install `pytest` and `pytest-flask`
- Create `backend/tests/` directory with tests for:
  - Weather endpoint (with mocked `requests.get`)
  - News endpoint
  - Wikipedia endpoint
  - Dictionary endpoint
  - YouTube search endpoint
  - Email endpoint (with mocked `smtplib`)
  - Download endpoint (with mocked `subprocess.run`)
  - Maps search endpoint
  - Error handling cases

**Files:** `backend/tests/test_*.py` (new)

### 5.3 Add TypeScript Type Checking

**Actions:**
- Add `tsc --noEmit` as a build step / lint script
- Fix any type errors discovered

**File:** `package.json` scripts

### 5.4 Add Linting

**Actions:**
- Install ESLint 9+`eslint`, `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
- Create `eslint.config.js` (flat config, ESLint 9+) — removes old `eslintConfig` from `package.json`
- Delete `eslintConfig` block from `package.json` (currently extends `react-app` which is CRA-specific)
- Add `eslint:fix` script to `package.json`
- Add `backend/ruff.toml` for Python linting config
- Add `ruff check backend/` to backend test/lint pipeline

**Files:** `eslint.config.js` (new), `package.json` (remove eslintConfig, add lint script), `backend/ruff.toml` (new)

---

## Phase 6: Infrastructure & CI/CD

### 6.1 Add GitHub Actions CI

**Actions:**
- Create `.github/workflows/ci.yml` that runs:
  - Frontend: `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npx vitest run`
  - Backend: `pip install -r backend/requirements.txt`, `pytest --cov=. backend/`, `ruff check backend/`

**Files:** `.github/workflows/ci.yml` (new)

### 6.2 Add Dockerfile for Backend

**Actions:**
- Create `backend/Dockerfile` for reproducible backend deployment
- Create `backend/.dockerignore`

**Files:** `backend/Dockerfile` (new), `backend/.dockerignore` (new)

### 6.3 Improve .gitignore

**Actions:**
- Add `.env` (currently only `.env.local` etc. are listed)
- Add `backend/__pycache__/`
- Add `backend/*.pyc`
- Add `backend/.env`

**File:** `.gitignore`

---

## Phase 7: Security Hardening

### 7.1 Backend Security

- Ensure Flask debug mode is off in production
- Add rate limiting (Phase 2.4)
- Add authentication for sensitive endpoints (Phase 2.5)
- Remove hardcoded API keys (Phase 1.8)
- Add `Content-Type` validation on POST endpoints

### 7.2 Frontend Security

- Sanitize all API responses before rendering (already partially done with `sanitizeText`)
- Ensure `dangerouslySetInnerHTML` is never used with unsanitized content
- Add CSP headers via the backend
- Ensure no console.log/console.error in production builds

### 7.3 Dependency Security

- Run `npm audit` and fix vulnerabilities
- Pin all dependency versions in `package.json`

---

## Phase 8: UX & Feature Improvements (Post-Stabilization)

### 8.1 Add Progress Indicators

- Add progress status for video download (poll the backend or use WebSocket)
- Add loading spinners for all async operations

### 8.2 Add Keyboard Shortcuts

- Add keyboard shortcuts as an alternative to voice commands (e.g., Ctrl+K to activate)

### 8.3 Wire Up Maps Feature

- This is moved to Phase 1 as item 1.12 (higher priority — it's a partially-built feature)
- Add maps search voice command ("find coffee shops near me")
- Add maps results component

### 8.4 Add Command History

- Store recent commands and responses in localStorage
- Allow user to review conversation history

### 8.5 Add Error Boundaries

- Add React error boundaries to gracefully handle component crashes
- Add backend error handling that doesn't leak internal details

---

## Data Flow & Failure Modes

### Todo Data Flow (Post-Firebase-Removal)
```
User speaks → SpeechRecognition.onresult →
processCommandRef.current(transcript) →
useTodos() hook → fetch(VITE_BACKEND_URL/api/todos) →
Flask Blueprint (todo_routes.py) → SQLite →
Response → React state update → UI re-render
```
- Todos are fetched on app mount and re-fetched after create/update/delete
- No real-time updates (Firestore `onSnapshot` removed); polling or manual refresh used instead

### Command Data Flow (All API Commands)
```
Voice command → processCommand → service function (e.g. fetchWeather) →
api.ts fetch wrapper → Flask endpoint →
requests.get(external API, timeout=30) →
Response parsed → type-checked → UI state update
```

### Failure Modes Addressed
| Failure | Handling |
|---------|----------|
| Backend down | `api.ts` catches `TypeError` (network failure), shows user-friendly message, offers retry |
| External API key not set | Backend returns 500 with clear "API key not configured" message; frontend shows it to user |
| External API rate limited | Backend returns 429; frontend shows "please wait" message |
| yt-dlp not installed | Backend catches `FileNotFoundError`, returns 500; frontend shows actionable message |
| yt-dlp download timeout | `subprocess.run(timeout=300)` kills process; backend returns timeout error |
| Speech recognition denied (mic) | `recognition.onerror` fires with `notallowed`; UI shows permission request message |
| Speech recognition timeout (no speech) | `recognition.onerror` fires with `no-speech`; UI prompts user to try again |
| Empty command | `processCommand` returns default "I didn't understand" response |
| Voice list empty on load | `useSpeechSynthesis` waits for `onvoiceschanged` before enabling voice features |
| SQLite database locked | SQLite WAL mode enabled; retry with backoff on `database is locked` error |

---

## Validation Plan

1. **Build verification:** `npm run build` succeeds with no errors
2. **Type checking:** `npx tsc --noEmit` passes with zero errors
3. **Linting:** `npm run lint` and `ruff check backend/` pass with zero warnings
4. **Frontend tests:** `npx vitest run` — all tests pass (no skipped tests)
5. **Backend tests:** `pytest --cov=. backend/` — 80%+ coverage on all backend modules
6. **Manual smoke test:**
   - App loads and renders "AI Voice Assistant" heading
   - Backend todo API works (create/read/update/delete) via `VITE_BACKEND_URL`
   - Weather/news/Wikipedia/dictionary/YouTube commands work
   - Voice switching works via dropdown
   - Email sending works (with valid credentials + API key)
   - YouTube download works
   - Maps search works via voice command
   - No console errors in browser
7. **Backend security:** `debug=False`, rate limiting active, auth required for sensitive endpoints
8. **No sensitive data:** No API keys in committed files

---

## Open Questions

1. ❌ RESOLVED — Firebase removed; todos moved to Flask + SQLite
2. ❌ RESOLVED — Vite migration (React team recommends Vite for React 19; CRA 5 has no official React 19 support)
3. ❌ RESOLVED — Backend structure: Refactor single `app.py` (461 lines) into Flask Blueprints with separated routes/services/db for testability and to eliminate repeated error handling boilerplate. See new Phase 2.0.
4. ❌ RESOLVED — PyDictionary replacement: Use free `dictionaryapi.dev` API (no auth, no third-party Python package, reliable, actively maintained)
5. ❌ RESOLVED — Maps feature: Wire up `/maps/search` to frontend UI
6. **Deployment:** Is there a target deployment platform (Vercel, Heroku, etc.) that affects backend URL configuration?
