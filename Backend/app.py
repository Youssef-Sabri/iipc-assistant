import os
import pickle
import logging
import traceback
import concurrent.futures
from collections import defaultdict

import numpy as np
import faiss
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from groq import Groq
from dotenv import load_dotenv

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION & CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────

load_dotenv()

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Paths & API URLs
PKL_PATH = "embeddings_v3.pkl"
REMOTE_EMBEDDING_API = os.getenv("VITE_EMBEDDING_API_URL")

# Model Configuration
GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
GROQ_FALLBACK_MODELS = ["meta-llama/llama-4-scout-17b-16e-instruct"]

# Timeout Configuration (Seconds)
GEMINI_TIMEOUT = 15
EMBEDDING_TIMEOUT = 20

# ──────────────────────────────────────────────────────────────────────────────
# CORE INITIALIZATION
# ──────────────────────────────────────────────────────────────────────────────

def initialize_embeddings():
    """Download embeddings from HF if not present and load them."""
    if not os.path.exists(PKL_PATH):
        logger.info("Downloading embeddings_v3.pkl from Hugging Face...")
        hf_user = os.getenv("HF_USERNAME")
        hf_dataset = os.getenv("HF_DATASET_NAME")
        url = f"https://huggingface.co/datasets/{hf_user}/{hf_dataset}/resolve/main/{PKL_PATH}"
        
        try:
            r = requests.get(url, stream=True)
            r.raise_for_status()
            with open(PKL_PATH, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            logger.info("Download complete!")
        except Exception as e:
            logger.error(f"Failed to download embeddings: {e}")
            raise

    with open(PKL_PATH, "rb") as f:
        data = pickle.load(f)
    
    return data

# Load Data & Index
data = initialize_embeddings()
embeddings_matrix = np.array(data["embeddings"]).astype("float32")
combined_texts = data["combined_texts"]
doc_ids = data["doc_ids"]

index = faiss.IndexFlatL2(embeddings_matrix.shape[1])
index.add(embeddings_matrix)

# Initialize API Clients
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://iipc-assistant.vercel.app"}})

genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ──────────────────────────────────────────────────────────────────────────────
# RAG LOGIC & UTILITIES
# ──────────────────────────────────────────────────────────────────────────────

def get_remote_embedding(text: str):
    """Retrieve embedding for a given text from the remote API."""
    try:
        response = requests.post(
            REMOTE_EMBEDDING_API,
            json={"text": text},
            timeout=EMBEDDING_TIMEOUT,
        )
        response.raise_for_status()
        return response.json()["embedding"]
    except Exception as e:
        logger.error(f"Embedding API error: {e}")
        return None

def retrieve_top_k(query, k_chunks=30, k_docs=3, k_final=10):
    """Perform FAISS search and rank documents based on embedding similarity."""
    query_embedding = get_remote_embedding(query)
    if not query_embedding:
        return []

    distances, indices = index.search(np.array([query_embedding]).astype("float32"), k_chunks)

    retrieved = []
    for idx, dist in zip(indices[0], distances[0]):
        retrieved.append({
            "doc_id": doc_ids[idx],
            "combined_text": combined_texts[idx],
            "score": float(dist)
        })

    doc_scores = defaultdict(list)
    for r in retrieved:
        doc_scores[r["doc_id"]].append(r)

    ranked_docs = sorted(
        doc_scores.items(),
        key=lambda x: min(c["score"] for c in x[1])
    )[:k_docs]

    selected_chunks = []
    for _, chunks in ranked_docs:
        chunks_sorted = sorted(chunks, key=lambda c: c["score"])
        selected_chunks.extend(chunks_sorted)

    return sorted(selected_chunks, key=lambda c: c["score"])[:k_final]

def _build_prompt(query, context_docs):
    """Construct the final system prompt with retrieved context."""
    grouped_docs = defaultdict(list)
    for doc in context_docs:
        grouped_docs[doc['doc_id']].append(doc['combined_text'])

    context_parts = []
    for doc_id, chunks in grouped_docs.items():
        doc_content = "\n".join(chunks)
        context_parts.append(f"SOURCE ID: {doc_id}\n{doc_content}\n----")

    context = "\n\n".join(context_parts)

    return f"""You are an IIPC digital preservation and web archiving assistant. Answer using ONLY the provided conference materials below.

QUERY HANDLING:
- Greetings/capability questions: Respond briefly, no citations needed
- Substantive questions: Use context strictly, cite sources

RULES:
1. Never use outside knowledge. If insufficient info: "Based on available IIPC materials, I don't have enough information to fully answer this."
2. In-text citations: "According to [Author]'s '[Title]' ([Year])..." — NO ARK URLs inline
3. End substantive answers with a "Sources Referenced:" section:
   - [Title] by [Author] ([Year]): [ARK URL]
   (Each source listed once only)
4. Use precise web archiving terminology (WARC, etc.)
5. Synthesize across documents; note how topics evolved over conference years
6. Plain text only — no markdown except in Sources section

Context:
{context}

Question: {query}

Answer:"""

def generate_response(query, context_docs):
    """Generate LLM response with Gemini primary and Groq fallback."""
    prompt = _build_prompt(query, context_docs)

    # 1. Try Gemini with hard timeout
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    try:
        future = executor.submit(
            genai_client.models.generate_content,
            model=GEMINI_MODEL,
            contents=prompt,
        )
        response = future.result(timeout=GEMINI_TIMEOUT)
        executor.shutdown(wait=False)
        logger.info(f"[✅ LLM] Responded via {GEMINI_MODEL} (Gemini)")
        return response.text, GEMINI_MODEL
    except Exception as e:
        executor.shutdown(wait=False, cancel_futures=True)
        logger.warning(f"[⚠️ LLM] Gemini failed ({type(e).__name__}) — falling back to Groq...")

    # 2. Try Groq fallback chain
    for model in GROQ_FALLBACK_MODELS:
        try:
            chat_completion = groq_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1500,
                temperature=0.3,
            )
            logger.info(f"[✅ LLM] Responded via {model} (Groq Fallback)")
            return chat_completion.choices[0].message.content, model
        except Exception as e:
            logger.error(f"[❌ LLM] Groq model {model} failed: {e}")

    logger.error("[❌ LLM] All AI providers exhausted.")
    raise RuntimeError("All LLM providers failed.")

# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINTS & MIDDLEWARE
# ──────────────────────────────────────────────────────────────────────────────

@app.before_request
def restrict_origins():
    """Security check to strictly allow only official frontend origins."""
    if request.path == "/chat" and request.method == "POST":
        origin = request.headers.get('Origin')
        allowed_origins = ["https://iipc-assistant.vercel.app", "https://huggingface.co"]
        if not origin or origin not in allowed_origins:
            return jsonify({"error": "Unauthorized origin."}), 403

@app.route("/", methods=["GET"])
def home():
    return "IIPC Assistant Backend is active.", 200

@app.route("/ping", methods=["GET"])
def ping():
    return "pong", 200

@app.route("/chat", methods=["POST"])
def chat():
    """Main chat endpoint handling context retrieval and response generation."""
    try:
        data = request.get_json()
        query = data.get("query")
        if not query:
            return jsonify({"error": "Query is required."}), 400

        logger.info(f"Incoming Query: {query}")

        context_docs = retrieve_top_k(query)
        logger.info(f"Context retrieval: {len(context_docs)} chunks found.")

        if not context_docs:
            return jsonify({"response": "I couldn't find relevant information in the IIPC archives."})

        answer, model_used = generate_response(query, context_docs)
        logger.info(f"Success: Response generated by {model_used}")

        return jsonify({"response": answer})
    except RuntimeError:
        return jsonify({"error": "All AI providers are currently unavailable."}), 503
    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "An internal server error occurred."}), 500

if __name__ == "__main__":
    app.run(debug=True, port=7860)