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
- **Modern User Experience** — Responsive interface optimized for desktop, tablet, and mobile.

## Architecture

```
                        ┌──────────────────┐
                        │  React Frontend   │
                        │  (Vite + TS +     │
                        │   Tailwind)       │
                        └──────┬──────┬─────┘
                               │      │
                     HTTP POST │      │ Supabase
                      /chat    │      │ (materials
                               │      │  metadata)
                               ▼      ▼
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
- **TanStack Query** for data fetching

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
    VITE_EMBEDDING_API_URL=
    HF_USERNAME=
    HF_DATASET_NAME=
    HF_TOKEN=

   # Supabase Credentials
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=

   # Local API configurations
   VITE_CHAT_API_URL=
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
* **Auto-Downloading Embeddings**: On boot, the container automatically downloads the `embeddings_v3.pkl` file directly from your private/public Hugging Face dataset.
* **Required Space Secrets**:
  Add the following variables in your Space's **Settings > Variables and secrets** tab:
  * `HF_TOKEN` — Hugging Face user access token (with `read` permissions to download the dataset)
  * `HF_USERNAME` — Hugging Face username
  * `HF_DATASET_NAME` — Hugging Face dataset name
  * `GEMINI_API_KEY` — Google Gemini API key
  * `GROQ_API_KEY` — Groq API key
  * `VITE_EMBEDDING_API_URL` — Deployed Hugging Face Embedding API endpoint URL

#### 2. Embedding API (FastAPI + BGE-M3 model)
This container hosts local PyTorch inference for the `BAAI/bge-m3` model to compute query vectors locally without rate limits.
* **Hugging Face Setup**: Create a new Space using the **Docker** SDK, upload files from [Backend/huggingface_space](file:///c:/Users/youss/Desktop/Projects/IIPC-Assistant/Backend/huggingface_space), and expose port `7860`.
* The container creates a model cache directory at `/app/hf_cache` to store the tokenizer and model weights safely.

---

### `POST /chat`

Send a natural language query and receive a contextual response grounded in IIPC materials.

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
│   └── IIPC_data/                # Downloaded embeddings (auto-created)
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/             # ChatInput, ChatMessage
│   │   │   ├── sidebar/          # AppSidebar
│   │   │   └── ui/               # shadcn/ui components (button, card, badge, etc.)
│   │   ├── pages/                # Index, Chat, Browse, About, NotFound
│   │   ├── hooks/                # use-iipc-data, use-mobile
│   │   ├── lib/                  # supabase client, utils (cn), date-utils
│   │   └── assets/               # iipc-logo.svg
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
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
