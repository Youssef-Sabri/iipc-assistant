# IIPC Assistant

![IIPC Assistant Banner](iipc_banner.svg)

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178c6.svg)](https://www.typescriptlang.org/)

An AI-powered research assistant for exploring IIPC Web Archiving conference materials. Built with Retrieval-Augmented Generation (RAG), FAISS semantic search, and Gemini, this chatbot understands archival documents and metadata to deliver accurate, contextual answers. Designed for researchers, archivists, and digital preservationists.

## Features

- **Semantic Search & Chat** — Natural language queries over IIPC conference materials with AI-generated, source-grounded responses.
- **Rich Metadata Context** — Answers are enriched with metadata details such as titles, authors, dates, and institutional affiliations.
- **Diverse Retrieval** — Combines vector search with diversity filters to gather context across multiple presentations.
- **Comprehensive Archive Access** — Filter and browse posters, presentations, and transcripts with direct links to original documents.
- **Responsive View Modes** — Instantly toggle between visual grid and structured list layouts optimized dynamically for all viewports.
- **Performance & UX Refinements** — Debounced search inputs and opacity-dimmed page transitions prevent unnecessary database queries and visual layout flickering.
- **Modern User Experience** — Fluid interface optimized with responsive typography, dark-mode styling, and tactile active-shrink button scales for mobile devices.

## Architecture

```
                         ┌───────────────────────┐
                         │  Vercel               │
                         │  (SPA + /api/chat     │
                         │   serverless proxy)   │
                         └───┬──────────┬────────┘
                             │          │
                   /api/chat │          │ Supabase
                   (API key  │          │ (materials
                    proxy)   │          │  metadata)
                             ▼          ▼
                       ┌──────────────────┐
                       │  Flask Backend   │
                       │  (RAG Pipeline)  │
                       └──┬───────┬───────┘
                          │       │
                    FAISS │       │ Gemini /
                    (vec. │       │ Groq API
                    index)│       │ (LLM)
                          ▼       ▼
                   ┌──────────┐ ┌──────────┐
                   │Embeddings│ │  LLM     │
                   │  .pkl    │ │ Response │
                   └──────────┘ └──────────┘
```

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for development and bundling
- **Tailwind CSS** with shadcn/ui components
- **Supabase** for structured data and real-time queries
- **React Router** for client-side routing
- **Vercel** for deployment with serverless proxy

### Backend Stack
- **Flask** REST API with CORS
- **FAISS** for vector similarity search
- **Gemini / Groq** for LLM response generation
- **BGE-M3** embedding model (in-process PyTorch inference)

- **Docker** support for containerized deployment

## Quick Start


### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Youssef-Sabri/iipc-assistant.git
   cd iipc-assistant
   ```

2. **Backend setup**
   ```bash
   cd Backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

   Create a `.env` file at the project root with the following variables:

   ```env
   # AI API Keys
   GEMINI_API_KEY=
   GROQ_API_KEY=

   # Hugging Face Settings (Required by Frontend proxy if HF Space is Private)
   HF_TOKEN=

   # Supabase Credentials
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=

   # Local API configurations
   CHAT_API_URL=
   ```

3. **Frontend setup**
   ```bash
   cd ../Frontend
   npm install
   ```

   The frontend loads environment variables from the root `.env` file (`envDir: "../"` in Vite config).

### Running the Application

**Backend:**
```bash
cd Backend
python app.py
```
The API runs on `http://localhost:7860`.

**Frontend:**
```bash
cd Frontend
npm run dev
```
The UI runs on `http://localhost:8080`.

### Deployment on Hugging Face Spaces

The **Backend** is deployed as a single, all-in-one Docker-based Hugging Face Space hosting the Flask RAG pipeline, FAISS vector index, in-process PyTorch `BAAI/bge-m3` embedding inference, and Gemini/Groq LLM generation.

#### All-in-One Backend Setup
1. **Hugging Face Setup**: Create a new Space using the **Docker** SDK (blank template).
2. **Repository Files**: Upload the contents of [Backend/](file:///c:/Users/youss/Desktop/iipc-assistant/Backend) (`Dockerfile`, `requirements.txt`, `app.py`).
3. **Local Embeddings Storage**: Upload your `embeddings_v3.pkl` file directly to the Space repository under the `IIPC_data/` folder (so the path is `IIPC_data/embeddings_v3.pkl` relative to `app.py`). The container will load it on boot.
4. **Offline Model Cache**: The `Dockerfile` automatically pre-downloads and caches `BAAI/bge-m3` into `/app/hf_cache` during the Docker build stage, resulting in instant container startup and zero rate limits.
5. **Required Space Secrets**:
   Add the following variables in your Space's **Settings > Variables and secrets** tab:
   * `GEMINI_API_KEY` — Google Gemini API key
   * `GROQ_API_KEY` — Groq API key
   *(Note: `HF_TOKEN` is NOT needed inside the Space itself!)*

### Deployment on Vercel

The frontend is deployed on **Vercel** as a single-page application with a serverless proxy function.

* **Serverless Proxy** (`Frontend/api/chat.js`): Proxies `POST /api/chat` requests to the deployed Chat Backend. Forwards `HF_TOKEN` if your Hugging Face Space is set to **Private**.
* **Security Headers**: Configured in `Frontend/vercel.json` — includes CSP, HSTS, X-Frame-Options: DENY, and other hardening headers.
* **Environment Variables**: Set the following in Vercel project settings:
  * `CHAT_API_URL` — Deployed Chat Backend HF Space endpoint (`https://<username>-<space>.hf.space`)
  * `HF_TOKEN` — *(Required only if Space is Private)* Hugging Face access token for gateway authentication

---

### `POST /api/chat`

Client-facing endpoint. In production, this hits the Vercel serverless proxy (`Frontend/api/chat.js`) which forwards to the backend (and attaches `HF_TOKEN` Bearer authentication if your Hugging Face Space is Private).

**Request:**
```json
{ "query": "What are best practices for web crawling?" }
```

**Response:**
```json
{ "response": "Based on IIPC conference materials..." }
```

### `POST /chat`

Direct backend endpoint hosted on Flask. In local development, the Vite dev proxy forwards `/api/chat` calls here.

**Request:**
```json
{ "query": "What are best practices for web crawling?" }
```

**Response:**
```json
{ "response": "Based on IIPC conference materials..." }
```

## Project Structure

```
iipc-assistant/
├── Backend/
│   ├── app.py                    # Flask application entry point
│   ├── Dockerfile                # Backend container image
│   ├── requirements.txt          # Python dependencies
│   └── IIPC_data/                # Archival embeddings and metadata (gitignored)
├── Frontend/

│   ├── api/
│   │   └── chat.js               # Vercel serverless proxy (API key forwarding + origin check)
│   ├── src/
│   │   ├── App.tsx               # Router definition (5 routes)
│   │   ├── main.tsx              # Entry point
│   │   ├── components/
│   │   │   ├── browse/           # ViewModeToggle for grid/list views
│   │   │   ├── chat/             # ChatInput, ChatMessage
│   │   │   ├── home/             # RecentMaterialsCarousel
│   │   │   ├── sidebar/          # AppSidebar
│   │   │   └── ui/               # shadcn/ui components (button, card, badge, etc.)
│   │   ├── pages/                # Index, Chat, Browse, About, NotFound
│   │   ├── hooks/                # use-iipc-data, use-mobile
│   │   ├── lib/                  # supabase client, utils (cn), date-utils
│   │   ├── styles/               # Global CSS (index.css)
│   │   └── assets/               # iipc-logo.svg
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── vercel.json               # Vercel deployment config (security headers, SPA rewrites)
│   ├── tailwind.config.ts
│   └── tsconfig*.json
├── iipc_rag_pipeline/            # Jupyter notebooks for data processing
├── IIPC_data/                    # Source data files (gitignored)
├── Documents/                    # Project documents (gitignored)
├── .env                          # Environment variables (gitignored)
├── iipc_banner.svg
└── README.md
```

## Data Pipeline

Jupyter notebooks in `iipc_rag_pipeline/` document the complete data lifecycle:

| Notebook | Purpose |
|----------|---------|
| `harvest_iipc_metadata.ipynb` | Extract IIPC materials from UNT Digital Library via OAI-PMH |
| `preprocess_iipc_data.ipynb` | Clean and restructure text using Gemini AI |
| `build-embeddings-and-chatbot.ipynb` | Generate vector embeddings and build FAISS index |



## Acknowledgments

- **International Internet Preservation Consortium (IIPC)** for the archive materials
- **Google Gemini** and **Groq** for LLM capabilities
- **BAAI** for the BGE embedding models
- **Supabase** for database infrastructure
- **FAISS** for similarity search
