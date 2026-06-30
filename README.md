# IIPC Assistant

![IIPC Assistant Banner](iipc_banner.svg)

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178c6.svg)](https://www.typescriptlang.org/)

AI-powered research platform for exploring conference materials, presentations, and publications from the International Internet Preservation Consortium. Combines semantic search with generative AI to provide contextual answers from the IIPC archive.

## Features

- **Semantic Search & Chat** — Natural language queries over IIPC conference materials with AI-generated, source-grounded responses
- **Comprehensive Archive Access** — Multi-format support (presentations, posters, transcripts), advanced filtering by year/type/author, and direct ARK links to originals
- **Modern User Experience** — Responsive design across desktop, tablet, and mobile with a polished interface

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

   Create a `.env` file at the project root with the required API keys (see `.env` for reference).

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

### Docker Deployment

**Backend:**
```bash
cd Backend
docker build -t iipc-backend .
docker run -p 7860:7860 --env-file .env iipc-backend
```

**Embedding API (Hugging Face Space):**
```bash
cd Backend/huggingface_space
docker build -t iipc-embedding-api .
docker run -p 7860:7860 iipc-embedding-api
```

## API Reference

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
