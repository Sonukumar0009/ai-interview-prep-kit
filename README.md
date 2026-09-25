# AI Interview Prep Kit

AI Interview Prep Kit turns a **job description + company website URL** into a structured interview preparation kit.

It uses a multi-step AI pipeline to collect company information, extract job requirements, generate interview questions, create flashcards, and build a study schedule.

## 🚀 Live Demo

**Frontend:** `<VERCEL_URL_HERE>`

**Backend:** https://ai-interview-prep-kit-q8u5.onrender.com

**Repository:** https://github.com/Sonukumar0009/ai-interview-prep-kit

---

## ✨ Features

- Company brief generation
- Job requirement extraction
- Technical and behavioral questions
- Requirement-based question generation
- Interview flashcards
- Day-by-day study schedule
- Question editing, deletion, and reordering
- Manual question creation
- Category regeneration
- Coverage checking and gap filling
- Confidence-based Practice Mode
- Async background generation
- Duplicate request detection
- Zod-based output validation

---

## 🏗️ Architecture

```text
Job Description + Company URL
              │
              ▼
      Website Crawling
              │
              ▼
   Interview Discussion Search
              │
              ▼
   Requirement Extraction
              │
              ▼
      Company Brief
              │
              ▼
    Question Generation
              │
              ▼
     Coverage Checking
              │
              ▼
       Gap Filling
              │
              ▼
    Flashcard Generation
              │
              ▼
     Schedule Generation
              │
              ▼
       Final Validation
```

The pipeline is orchestrated through `kitOrchestrator.ts`.

---

## 🛠️ Tech Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express.js
- TypeScript

### Database
- MongoDB Atlas
- Mongoose

### AI
- Groq
- `openai/gpt-oss-120b`

### Search & Scraping
- Tavily
- `node-fetch`
- Cheerio
- `robots-parser`
- Custom crawler

### Validation & Testing
- Zod
- Vitest

### Deployment
- Vercel
- Render
- MongoDB Atlas

---

## 📁 Project Structure

```text
frontend/
└── Next.js application

backend/
└── src/
    ├── config/
    ├── models/
    ├── routes/
    ├── controllers/
    ├── middleware/
    ├── services/
    │   ├── retrieval/
    │   ├── extraction/
    │   ├── generation/
    │   ├── scheduling/
    │   └── validation/
    ├── kitOrchestrator.ts
    ├── kitMutations.ts
    └── scripts/
        └── evaluate.ts
```

---

## 🔎 Retrieval

The application collects information from:

### Company Website

The crawler starts from the homepage and prioritizes links related to:

- Careers
- Jobs
- Hiring
- Engineering
- Interview
- Handbook
- Team
- About

It:

- Respects `robots.txt`
- Uses rate limiting and retries
- Checks content type and response size
- Rejects private/loopback URLs in production
- Reports unreachable pages instead of failing the whole pipeline

The crawl is limited to one level from the homepage.

### Interview Discussions

Tavily searches public interview-related information for the company.

If no results are found, the kit is still generated without discussion data.

---

## 🧠 Generation Pipeline

The project uses multiple AI calls instead of one large prompt.

1. Extract requirements from the job description.
2. Generate a company brief.
3. Generate questions for each requirement.
4. Check coverage of `must` requirements.
5. Regenerate only uncovered requirements.
6. Generate flashcards.
7. Build the study schedule.
8. Validate the final kit with Zod.

The coverage loop runs for a maximum of **3 total passes**.

---

## ✏️ Editing & Regeneration

Generated questions and flashcards have one of three states:

```text
generated
edited
manual
```

- **generated** — created by the AI
- **edited** — modified by the user
- **manual** — added by the user

When a category is regenerated:

- Generated items can be replaced.
- Edited items are preserved.
- Manual items are preserved.
- Other categories are not changed.

The schedule is rebuilt after question changes so it always matches the current question set.

---

## 📅 Study Schedule

The schedule is generated deterministically.

Questions are ordered by:

1. Requirement priority
2. Difficulty

Higher-priority and harder questions are placed earlier.

If there are more study days than questions, the remaining days become review/practice days.

---

## 🎮 Practice Mode

Practice Mode uses confidence ratings:

```text
1 → Low confidence
2 → Medium confidence
3 → High confidence
```

Unreviewed cards and lower-confidence cards are shown earlier in the next practice session.

---

## ⚡ Async Generation

Creating a kit can take around **20–45 seconds**.

Instead of keeping the request open, the backend returns immediately:

```text
POST /api/kits
        ↓
202 Accepted
        ↓
pending
        ↓
generating
        ↓
completed / failed
```

The frontend polls the kit status until generation is complete.

---

## 🛡️ Error Handling

The application handles:

- Invalid or unreachable company URLs
- Short job descriptions
- Missing interview discussions
- Invalid LLM output
- API rate limits
- Duplicate submissions
- Long study schedules

LLM output is validated using Zod before being used by the application.

---

## 🧪 Testing

Run:

```bash
cd backend
npm test
```

The project includes **13 automated tests** covering:

- Schedule allocation
- Priority and difficulty ordering
- One-day schedules
- Long schedules
- Coverage checking
- `must` vs `nice-to-have` requirements

---

## 📦 Local Setup

### Prerequisites

- Node.js
- npm
- MongoDB Atlas
- Groq API key
- Tavily API key

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Add your environment variables and run:

```bash
npm run dev
```

Backend:

```text
http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Run:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

## 🔑 Environment Variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection |
| `SESSION_SECRET` | Session cookie signing |
| `GROQ_API_KEY` | Groq API access |
| `TAVILY_API_KEY` | Interview search |
| `FRONTEND_URL` | CORS configuration |
| `NODE_ENV` | Application environment |
| `NEXT_PUBLIC_API_URL` | Backend API URL |

---

## 📊 Batch Evaluation

Run:

```bash
cd backend
npm run evaluate -- --input <cases.json> --output <kits.json>
```

The script supports positional arguments as a fallback for npm argument-forwarding issues:

```text
first argument  → input file
second argument → output file
```

---

## 🚧 Known Limitations

- Company crawling is limited to one level.
- Some deeply nested company pages may be missed.
- Review days can repeat questions when there is limited content.
- Practice Mode uses simple confidence-based ordering instead of full spaced repetition.
- Render's free tier can cause cold-start delays.
- Provider free-tier limits may change over time.

---

## 🤖 AI-Assisted Development

AI assistance using **Claude** was used for architecture planning, implementation, debugging, and code review.

The project was tested and refined during development, including fixes for:

- URL link-scoring issues
- Duplicate question generation
- npm argument forwarding

---
 
