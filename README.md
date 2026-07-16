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
- **BGE-M3** embedding model via remote API
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
   # API Keys
   GEMINI_API_KEY=
   GROQ_API_KEY=

    # Hugging Face Settings
    EMBEDDING_API_URL=
    HF_TOKEN=

   # Supabase Credentials
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=

   # Local API configurations
   CHAT_API_URL=

   # Backend Authentication
   BACKEND_API_KEY=
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

Both the **Chat Backend** and the **Embedding API** are designed to be deployed as Docker-based Hugging Face Spaces.

#### 1. Chat Backend (Flask + RAG Pipeline)
This container hosts the RAG queries, manages Gemini/Groq completions, and holds the FAISS similarity index.
* **Hugging Face Setup**: Create a new Space using the **Docker** SDK (blank template).
* **Local Embeddings Storage**: Upload your `embeddings_v3.pkl` file directly to the Space repository under the `IIPC_data/` folder (so the path is `IIPC_data/embeddings_v3.pkl` relative to `app.py`). The container will load it directly on boot, resulting in instant startup times.
* **Required Space Secrets**:
  Add the following variables in your Space's **Settings > Variables and secrets** tab:
  * `GEMINI_API_KEY` — Google Gemini API key
  * `GROQ_API_KEY` — Groq API key
  * `EMBEDDING_API_URL` — Deployed Hugging Face Embedding API endpoint URL
  * `HF_TOKEN` — Hugging Face fine-grained access token (with `read` permissions to query your private embedding space)
  * `BACKEND_API_KEY` — Shared secret for authenticating incoming chat requests

#### 2. Embedding API (FastAPI + BGE-M3 model)
This container hosts local PyTorch inference for the `BAAI/bge-m3` model to compute query vectors locally without rate limits.
* **Hugging Face Setup**: Create a new Space using the **Docker** SDK, upload files from [Backend/huggingface_space](file:///c:/Users/youss/Desktop/Projects/IIPC-Assistant/Backend/huggingface_space), and expose port `7860`.
* The container creates a model cache directory at `/app/hf_cache` to store the tokenizer and model weights safely.

### Deployment on Vercel

The frontend is deployed on **Vercel** as a single-page application with a serverless proxy function.

* **Serverless Proxy** (`Frontend/api/chat.js`): Proxies `POST /api/chat` requests to the deployed Chat Backend. Forwards a server-side API key for backend authentication.
* **Security Headers**: Configured in `Frontend/vercel.json` — includes CSP, HSTS, X-Frame-Options: DENY, and other hardening headers.
* **Environment Variables**: Set the following in Vercel project settings:
  * `CHAT_API_URL` — Deployed Chat Backend HF Space endpoint
  * `BACKEND_API_KEY` — Shared secret for backend authentication (must match the backend's `BACKEND_API_KEY`)

---

### `POST /api/chat`

Client-facing endpoint. In production, this hits the Vercel serverless proxy which forwards to the backend with an API key.

**Request:**
```json
{ "query": "What are best practices for web crawling?" }
```

**Response:**
```json
{ "response": "Based on IIPC conference materials..." }
```

### `POST /chat`

Direct backend endpoint (used in local development via Vite proxy). Requires `Authorization: Bearer <BACKEND_API_KEY>` header if `BACKEND_API_KEY` is set.

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
│   ├── huggingface_space/        # Embedding API for Hugging Face Spaces
│   │   ├── Dockerfile
│   │   ├── main.py               # FastAPI embedding server
│   │   └── requirements.txt
│   └── IIPC_data/                # Created & uploaded directly to HF Space (gitignored)
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
