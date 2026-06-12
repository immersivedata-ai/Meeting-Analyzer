# AGENTS.md — Manthan AI

## What is this?

Manthan AI is an AI-powered meeting analysis tool. Users upload audio/video recordings and get back speaker-labeled transcripts, summaries, action items, and key decisions — all in English output from Hindi/English/Hinglish audio.

## Current Tech Stack (production)

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 8, Tailwind CSS 3, shadcn/ui |
| Backend | Python FastAPI 0.104, Uvicorn 0.24 |
| DB | MongoDB Atlas via Motor (async) |
| STT + Diarization | Deepgram Nova-3 (primary), Gemini 2.5 Flash (fallback) |
| NLP / Analysis | Google Gemini 2.5 Flash |
| Audio processing | Pydub + ffmpeg (fallback), ffmpeg via GCS pipeline |
| Storage | Google Cloud Storage (GCS) |
| Auth | Custom session-based (pbkdf2_sha256), HTTP-only cookies |
| Hosting | Google Cloud Run (both frontend via Nginx, backend via Python) |
| CI/CD | Google Cloud Build via `cloudbuild.yaml` |

## Directory Structure

```
├── cloudbuild.yaml              # GCP CI/CD pipeline
├── AGENTS.md                    # This file — project context for AI agents
├── opencode.json                # MCP config
│
├── Client/                      # React frontend (Vite)
│   ├── Dockerfile               # Multi-stage: node:20-alpine build → nginx:alpine serve
│   ├── nginx.conf               # Port 8080, SPA fallback, gzip
│   ├── package.json             # Scripts: dev, build, build:dev, lint, preview
│   ├── vite.config.ts           # Port 8080, /api → localhost:8000 proxy
│   └── src/
│       ├── main.tsx             # Entry: StrictMode > AuthProvider > App
│       ├── App.tsx              # QueryClient + ThemeProvider + BrowserRouter + AuthGuard + routes
│       ├── components/
│       │   ├── FileUpload.tsx    # Drag-drop, GCS direct upload (no size limit)
│       │   ├── ResultsSection.tsx# Tabs: Transcript, Summary, Actions, Decisions + translation
│       │   ├── Header.tsx       # Nav + user avatar dropdown
│       │   ├── auth/            # AuthGuard.tsx
│       │   └── ui/              # shadcn/ui components
│       ├── contexts/
│       │   └── AuthContext.tsx   # Auth state + login/register/logout methods
│       ├── lib/
│       │   └── api/
│       │       ├── client.ts    # Base apiFetch() with credentials: 'include'
│       │       ├── auth.ts      # Auth endpoints
│       │       ├── analysis.ts  # Upload + analyze (GCS direct, streaming)
│       │       └── analyses.ts  # History CRUD
│       └── pages/               # HomePage, HistoryPage, ResultsPage, LoginPage, etc.
│
└── Server/                      # Python FastAPI backend
    ├── Dockerfile               # python:3.11-slim + ffmpeg + requirements → uvicorn
    ├── requirements.txt         # 14 deps
    ├── run.py                   # Dev: uvicorn with reload on port 8000
    ├── .env                     # Secrets (not committed in production)
    └── app/
        ├── main.py              # App factory: CORS, lifespan, exception handlers, routers
        ├── database.py          # MongoDB Motor client, 5 collections, lazy init
        ├── routers/
        │   ├── analyze.py       # /analyze/stream, /upload/init, /upload/chunk, /playback-url, history CRUD
        │   ├── auth.py          # Session-based auth (register, login, logout, forgot/reset password)
        │   └── meta.py          # Health, info, debug, root
        ├── services/
        │   ├── audio_processor.py   # Pydub: stereo→mono, 16kHz resample, normalize, MP3 64kbps (fallback only)
        │   ├── gcs_handler.py       # GCS signed URL generation, ffmpeg audio extraction, upload/download
        │   ├── nlp_analyzer.py      # Gemini 2.5 Flash: transcript analysis (summary, actions, decisions)
        │   └── speech_diarizer.py   # Deepgram Nova-3: speaker diarization, GCS URL transcription
        ├── models/
        │   └── schemas.py       # Pydantic v2: TranscriptSegment, ActionItem, KeyDecision, etc.
        └── utils/
            ├── config.py        # Settings (plain class, no Pydantic)
            ├── file_handler.py  # File validation, temp dirs, cleanup
            └── email.py         # Gmail SMTP sender

## Data Flow (current production)

```
Browser upload → GCS (direct, signed URL)
        ↓
GCS object.finalized → Cloud Run downloads + processes
        ├── ffmpeg extract audio (if video)
        ├── Deepgram via GCS signed URL (transcription + diarization)
        ├── Gemini 2.5 Flash (analysis: summary, actions, decisions)
        └── Results → MongoDB (user history)

Frontend polls/SSE for results
```

## Key Conventions

### Frontend
- **Path alias**: `@/` → `Client/src/`
- **API pattern**: All API calls go through `analysis.ts` → `fetch()` with `credentials: 'include'`
- **Auth guard**: `AuthGuard.tsx` wraps all routes, redirects to `/login` if unauthenticated
- **Streaming**: NDJSON via `ReadableStream` reader, events have `{ status: "progress" | "complete" | "error" }`
- **GCS upload**: Browser → PUT signed GCS URL (XHR with progress), then POST `/analyze/stream` with `gcs_path`
- **No file size limit**: GCS handles up to 5TB

### Backend
- **Config**: Plain `Settings` class in `app/utils/config.py` — NOT Pydantic
- **DB connection**: Lazy init in `app/database.py`
- **Auth pattern**: `get_current_user` dependency → reads session cookie → MongoDB session lookup
- **Session cookies**: `manthan_session`, HTTP-only, `SameSite=None`, `Secure=True`
- **CORS**: Uses `allow_origin_regex=r"https://.*\.run\.app"` for Cloud Run cross-domain
- **File handling**: Raw file → GCS (browser direct), server only downloads when processing

### Both
- **No test files exist** — there are zero test files in the codebase
- **No type-check command** for Python; ESLint for frontend (`npm run lint` in `Client/`)

## Environment Variables

### Backend
| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `DEEPGRAM_API_KEY` | No | Deepgram API key (falls back to Gemini if missing) |
| `SESSION_SECRET` | Yes | HMAC key for session cookies |
| `GCS_BUCKET` | Yes | GCS bucket name for file storage |
| `DEBUG` | No | Enable debug mode + /docs |

### Frontend
| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | API base URL (proxied in dev, absolute in prod) |

## Commands

```bash
# Backend
cd Server
pip install -r requirements.txt
python run.py                          # Dev server (port 8000, reload)

# Frontend
cd Client
npm install
npm run dev                            # Dev server (port 8080)
npm run build                          # Production build
npm run lint                           # ESLint

# Docker builds
docker build -t manthan-api ./Server
docker build -t manthan-web ./Client

# Cloud Build deploy (auto on push to main)
```

## Gotchas

1. **Deepgram SDK v7** — API is `client.listen.v1.media.transcribe_file(request=bytes|iterator)` and `transcribe_url(url=...)`. Not the old pattern.
2. **GCS signed URLs** — Need `access_token` + `service_account_email` for IAM signBlob. Service account needs `roles/iam.serviceAccountTokenCreator`.
3. **Cloud Run 32MB limit** — Bypassed by GCS direct upload. Browser uploads directly to GCS, server only processes.
4. **Session clearing** — Every server restart clears all sessions from MongoDB.
5. **Audio processing** — Pydub only used for Gemini fallback. Deepgram processes raw files directly.
6. **npm install needs `--legacy-peer-deps`** in Docker due to dependency conflicts.
