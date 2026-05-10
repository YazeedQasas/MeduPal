# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (run from Medupal/)
npm run dev       # Start Vite dev server (localhost:5173)
npm run build     # Production build → dist/
npm run lint      # ESLint check
npm run preview   # Preview production build

# Python AI server (run from Medupal/server/)
python -m venv .venv
.venv\Scripts\Activate.ps1       # Windows
source .venv/bin/activate         # macOS/Linux
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

## Environment Variables

Create `.env.local` in `Medupal/` (project root, not `server/`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_STT_API_URL=http://localhost:8000      # Enables voice STT (Whisper)
VITE_PATIENT_REPLY_URL=http://localhost:8000 # Enables AI patient replies (Groq/Ollama)
```

The Python server reads its own `server/.env` for `OPENAI_API_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `WHISPER_MODEL`, etc.

## Architecture

### Routing

There is **no React Router**. Navigation is entirely state-based: `activeTab` (a string) lives in `App.jsx` and is passed as `setActiveTab` props throughout the tree. `MainLayout` decides whether to show the sidebar based on `activeTab`. Two URLs bypass this system and render standalone pages directly: `/practice-history` and `/patient-testing`.

### Auth & Roles

`AuthContext` (`src/context/AuthContext.jsx`) wraps the app and exposes `user`, `profile`, `role`, `loading`. The Supabase `profiles` table stores `role` (`admin` | `instructor` | `student`). Role determines which dashboard renders at `activeTab="dashboard"` (admin → `AdminDashboard`, instructor → `InstructorDashboard`) and locks student-only pages.

New users go through onboarding: `RoleSelectPage` → `StudentUsageSetup`. Pending onboarding is tracked with `localStorage.medupal_onboarding_pending`.

### Layout

`MainLayout` renders differently by context:
- **Landing / auth / onboarding:** no chrome, natural document scroll
- **Dashboard:** fixed-height flex with `Sidebar` + scrollable `main`
- **Student practice:** full-screen, no `MainLayout` at all

### Student Practice Flow

`StudentPracticeFlow` is the core interactive feature — a multi-step OSCE session:
1. Case Selection
2. History Taking (voice + text chat with AI patient)
3. History Evaluation (AI scoring)
4. Physical Examination
5. Physical Evaluation

Voice uses `MediaRecorder` → POST to `/stt` (Whisper). AI patient replies use POST to `/patient-reply` (Groq or Ollama/llama3.2). TTS uses OpenAI if `OPENAI_API_KEY` is set, otherwise browser speech.

### Python AI Server (`server/main.py`)

FastAPI server with three endpoints:
- `POST /stt` — audio file → transcribed text (OpenAI Whisper via FFmpeg)
- `POST /patient-reply` — case context + student question → patient response (Groq primary, Ollama fallback, canned replies if neither available)
- `POST /tts` — text → audio/mpeg (OpenAI TTS; requires `OPENAI_API_KEY`)

Requires **FFmpeg on PATH** for audio conversion.

### Data Layer

- `src/lib/supabase.js` — singleton Supabase client (session persisted in localStorage)
- `src/data/patients.js` — patient personas for OSCE cases (`selectPatientForCase`)
- `src/lib/sttFasterWhisper.js` — browser-side MediaRecorder + STT API helpers
- `src/lib/utils.js` — `cn()` (clsx + tailwind-merge)

### Styling

Tailwind CSS v4. Design tokens are CSS variables in `src/index.css` (HSL format, dark-theme only). Key tokens: `--background` (black), `--primary` (teal `hsl(160,25%,53%)`). The accent color used throughout inline styles and glows is `rgba(100,170,145,*)`.

Animation utility classes from `index.css`: `animate-element`, `animate-slide-right`, `animate-testimonial` combined with `animate-delay-{100..1400}`.

The `@` alias resolves to `src/` (configured in `vite.config.js`).
