# AI Voice Assistant

A React + Flask voice-controlled assistant with Web Speech API, SQLite-backed todos, and integrations for weather, news, Wikipedia, dictionary, YouTube, email, and maps.

## Features

- **Voice Commands & TTS** — Speak naturally; the assistant responds aloud
- **To-Do List** — Add, complete, and delete todos; persisted in SQLite via Flask backend
- **Weather** — Current conditions for any city
- **News** — Top headlines or topic-specific search
- **Wikipedia** — Concise summaries for general knowledge queries
- **Dictionary & Spell Check** — Word definitions with spelling correction
- **YouTube Search & Playback** — Search and play videos inline
- **YouTube Downloader** — Download videos via yt-dlp
- **Email** — Send emails via voice commands
- **Website Opening** — Open URLs by voice
- **Maps Search** — Find places and view results on Google Maps
- **Voice Customization** — Switch between system voices

## Tech Stack

### Frontend
- **React 19** + **TypeScript 5.5**
- **Vite 6** with `@vitejs/plugin-react-swc`
- **Tailwind CSS 3.4**
- **Web Speech API** (SpeechRecognition + SpeechSynthesis)
- **Vitest** + `@testing-library/react`

### Backend
- **Python 3.11** + **Flask 3.x**
- **Flask Blueprints** — separated route modules
- **Flask-CORS** + **Flask-Limiter** (rate limiting)
- **SQLite** for todo persistence
- **Requests** for external API calls
- **wikipedia-api**, **spellchecker**
- **dictionaryapi.dev** for dictionary definitions
- **smtplib** for email sending
- **yt-dlp** for YouTube downloads

## Project Structure

```
.
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── eslint.config.js
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── package.json
├── .env.example
├── .github/workflows/ci.yml
├── src/
│   ├── env.d.ts
│   ├── index.tsx
│   ├── index.css
│   ├── App.tsx
│   ├── App.test.tsx
│   ├── setupTests.ts
│   ├── types/
│   │   └── index.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── api.test.ts
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts
│   │   ├── useSpeechRecognition.test.ts
│   │   ├── useSpeechSynthesis.ts
│   │   ├── useSpeechSynthesis.test.ts
│   │   └── useTodos.ts
│   ├── components/
│   │   ├── VoiceControl.tsx
│   │   ├── AssistantDisplay.tsx
│   │   ├── WeatherCard.tsx
│   │   ├── NewsList.tsx
│   │   ├── WikipediaCard.tsx
│   │   ├── DictionaryCard.tsx
│   │   ├── YouTubePlayer.tsx
│   │   ├── TodoList.tsx
│   │   ├── EmailStatus.tsx
│   │   ├── DownloadStatus.tsx
│   │   ├── MapsResults.tsx
│   │   ├── VoiceSelector.tsx
│   │   └── ErrorBoundary.tsx
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── db.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   ├── routes/
│   │   ├── todo_routes.py
│   │   ├── weather_routes.py
│   │   ├── news_routes.py
│   │   ├── wikipedia_routes.py
│   │   ├── dictionary_routes.py
│   │   ├── youtube_routes.py
│   │   ├── email_routes.py
│   │   ├── maps_routes.py
│   │   └── health.py
│   ├── utils/
│   │   ├── auth.py
│   │   └── error_handler.py
│   ├── tests/
│   │   └── test_app.py
│   └── downloads/
└── .kilo/
```

## Setup

### Prerequisites

- **Python 3.11+**
- **Node.js 20+** and **yarn**
- **yt-dlp** system binary

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Configure `backend/.env` with your API keys:
- `OPENWEATHER_API_KEY`
- `NEWS_API_KEY`
- `YOUTUBE_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `SENDER_EMAIL`, `SENDER_PASSWORD`, `SMTP_SERVER`, `SMTP_PORT`
- `AUTH_API_KEY` — required for email and download endpoints

Run the backend:
```bash
python app.py
# or: flask run
```

Backend runs at `http://127.0.0.1:5000`.

### 2. Frontend

```bash
yarn install
cp .env.example .env
```

Run the frontend:
```bash
yarn dev
```

Frontend runs at `http://localhost:3000`. API requests to `/api/*` are proxied to the backend during development.

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start Vite dev server |
| `yarn build` | Production build |
| `yarn preview` | Preview production build |
| `yarn test` | Run Vitest tests |
| `yarn lint` | Run ESLint |
| `yarn type-check` | Run TypeScript compiler |

## Voice Commands

- "What time is it?"
- "Add a todo buy groceries"
- "Show my todo list"
- "Mark todo as complete number 1"
- "Delete todo number 2"
- "What is the weather in London?"
- "Tell me the news"
- "Tell me the news about technology"
- "Tell me about Artificial Intelligence"
- "Define ubiquitous"
- "Play Never Gonna Give You Up"
- "Search YouTube for funny cat videos"
- "Download YouTube video <url>"
- "Send an email to john@example.com with subject Hello and message Hi there"
- "Open website google dot com"
- "Find coffee shops near me"
- "Switch to female voice" / "Switch to male voice"

**Keyboard shortcut:** Press `Ctrl+K` / `Cmd+K` to toggle voice recognition.

## Deployment

### Docker

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000` (nginx)
- Backend: `http://localhost:5000`

### CI/CD

GitHub Actions workflow runs on push/PR to `main`:
- Frontend: `yarn install`, `yarn type-check`, `yarn lint`, `yarn test`
- Backend: `pip install -r requirements.txt`, `pytest --cov=.`

## Security

- Flask debug mode disabled by default
- Rate limiting: 60 requests/minute general, 10/minute for email/download
- API key required for email sending (`X-API-Key` header) and YouTube download
- Content-Security-Policy and security headers enabled
- No hardcoded API keys — all loaded from environment variables

## License

MIT
