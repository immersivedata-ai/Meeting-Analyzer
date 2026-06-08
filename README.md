# Manthan AI

AI-powered meeting analysis — upload a recording, get transcripts, summaries, action items, and key decisions in under a minute.

## How it works

1. Upload an audio or video recording (MP3, WAV, M4A, MP4)
2. OpenAI Whisper transcribes it with speaker labels and timestamps
3. GPT extracts a summary, action items, and key decisions
4. Results are saved to your account for later review

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Python FastAPI, Motor (MongoDB async driver) |
| AI | OpenAI Whisper + GPT-4o-mini |
| Database | MongoDB Atlas |
| Auth | Custom session-based (pbkdf2_sha256) |
| Hosting | Vercel (frontend), Render (backend) |

## Project structure

```
├── Client/          # React frontend (Vite)
│   └── src/
│       ├── components/   # UI components
│       ├── pages/        # Route pages
│       ├── lib/api/      # API client modules
│       └── contexts/     # Auth context
├── Server/          # Python backend (FastAPI)
│   └── app/
│       ├── routers/      # API endpoints
│       ├── services/     # Audio processing + NLP
│       ├── models/       # Pydantic schemas
│       └── utils/        # Config, file handling, email
└── opencode.json    # OpenCode MCP config
```

## Getting started

### Backend

```bash
cd Server
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate    # macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file in `Server/`:

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB=manthan_ai
SESSION_SECRET=your-secret
OPENAI_API_KEY=sk-...
DEBUG=true
```

```bash
python run.py
```

Runs on `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd Client
npm install
npm run dev
```

Runs on `http://localhost:5173`. Proxies `/api` calls to the backend.

## API endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/forgot-password` | Request reset code |
| POST | `/api/auth/reset-password` | Reset password |

### Analysis
| Method | Path | Description |
|---|---|---|
| POST | `/api/analyze` | Upload and analyze a recording |
| GET | `/api/analyses` | List past analyses |
| GET | `/api/analyses/{id}` | Get a specific analysis |
| DELETE | `/api/analyses/{id}` | Delete an analysis |

## Supported formats

MP3, WAV, M4A, MP4 — up to 25 MB. Supports Hindi, English, and Hinglish transcription.

## License

MIT
