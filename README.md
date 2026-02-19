# 🔐🚪 Auth with LLM

### _The world’s first "Vibe-Based" Authentication Protocol._

Forget passwords. Forget 2FA. Forget actual security. Our new authentication system replaces your login screen with a judgmental, overworked LLM that decides if you're "worthy" based on vibes, excuses, and how much corporate jargon you use.

> "It’s not about _what_ you know, it’s about _how_ you lie." — _The Lead Architect (currently on administrative leave)_

---

## 🏗️ Project Structure

```text
auth-with-llm/
├── 🏢 frontend/   # The "Doorstep" (React + Vite)
│   └── Where users plead for access.
├── 🗄️ backend/    # The "Interrogation Room" (Express.js)
│   └── Where the LLM Bouncer judges your metadata.
├── PROJECT_PLAN.md # The manifest of bad ideas.
└── README.md       # This document.
```

## ⚡ Setup

### Prerequisites

- Node.js (v18+)
- A thick skin (The Bouncer can be mean)

### Local Development

1. **The Interrogation Room (Backend)**:

```bash
cd backend
cp .env.example .env
npm install
npm run dev

```

2. **The Doorstep (Frontend)**:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev

```

3. Visit `http://localhost:3000`. If it doesn't work, do not tell the Bouncer. It hates complainers.

---

## 🛠️ Environment Variables

**Backend** (`.env`):

- `OPENAI_API_KEY` - To make the Bouncer "smart."
- `GEMINI_API_KEY` - To make the Bouncer "analytical."
- `PRIMARY_LLM` - `chatgpt` (Sassy) or `gemini` (Depressed).
- `MAX_EXCHANGES` - How many chances they get before being banned. (Default: `6`)
- `SUPABASE_URL` / `KEY` - To remember exactly who annoyed the Bouncer last time.

**Frontend** (`.env`):

- `VITE_API_URL` - Where the frontend sends your pleas for help.

---

## 🎭 The Authentication Loop

1. **Identity Claim**: User enters a username (e.g., `Admin`).
2. **The Interrogation**: The Bouncer challenges the claim (_"Admin? Bold. I've seen three of you today. What makes you so special?"_).
3. **The Vibe Check**: User responds. The LLM analyzes for confidence, technical literacy, and general "sass."
4. **Access Granted**: If convinced, the user is logged in with a **Satirical Role** (e.g., _Senior Visionary of Imaginary Deadlines_).

---

## 🚀 Deployment

We recommend **Vercel** because it supports our "Serverless but Soul-crushing" architecture.

1. **Push to GitHub**: Send your code to the cloud.
2. **Deploy on Vercel**: Vercel auto-detects both frontend and backend.
3. **Set Env Vars**: Add your API keys in the Vercel dashboard.
4. **Update Frontend**: Ensure `VITE_API_URL` points to your deployed backend.

---

## 🛡️ Security Disclaimer

**Warning:** This is a satirical project. This is **not** real security. If you use this for a production banking app, you will likely be promoted to _Chief Officer of Future Lawsuits_. Use responsibly.

## 📜 License

MIT — Go ahead and use it. Just don't blame us when your users start crying.
