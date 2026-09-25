# AI Interview Prep Kit — Frontend

The frontend of **AI Interview Prep Kit** provides the user interface for creating and managing AI-powered interview preparation kits.

## 🚀 Live Demo

**Frontend:** https://ai-interview-prep-kit-three.vercel.app

**Backend:** https://ai-interview-prep-kit-q8u5.onrender.com

**Repository:** https://github.com/Sonukumar0009/ai-interview-prep-kit

---

## ✨ Features

- Create interview preparation kits from a job description and company URL
- View company information and job requirements
- View technical and behavioral interview questions
- Requirement-based question generation
- Interview flashcards
- Day-by-day study schedule
- Question editing, deletion, and reordering
- Manual question creation
- Category regeneration
- Coverage checking and gap filling
- Confidence-based Practice Mode
- Async generation status tracking

---

## 🛠️ Tech Stack

- Next.js
- TypeScript
- Tailwind CSS

---

## 📁 Project Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── kits/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── components/
│       └── Navbar.tsx
└── ...
```

---

## ⚡ Backend Integration

The frontend communicates with the deployed backend through:

```env
NEXT_PUBLIC_API_URL=https://ai-interview-prep-kit-q8u5.onrender.com
```

For local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 📦 Local Setup

### Prerequisites

- Node.js
- npm

### Install dependencies

```bash
cd frontend
npm install
```

### Configure environment

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Run the application

```bash
npm run dev
```

Frontend will be available at:

```text
http://localhost:3000
```

---

## 🚀 Deployment

The frontend is deployed using **Vercel**.

Production URL:

https://ai-interview-prep-kit-three.vercel.app
