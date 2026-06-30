import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
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
LOCAL_PKL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "IIPC_data", "embeddings_v3.pkl")
DEPLOY_PKL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "IIPC_data", "embeddings_v3.pkl")

# Use local parent workspace path if it exists, otherwise fall back to a path inside the backend folder (crucial for Docker)
if os.path.exists(LOCAL_PKL_PATH):
    PKL_PATH = LOCAL_PKL_PATH
else:
    PKL_PATH = DEPLOY_PKL_PATH

REMOTE_EMBEDDING_API = os.getenv("VITE_EMBEDDING_API_URL")

# Model Configuration
GEMINI_MODEL = "gemini-3.1-flash-lite"
GROQ_FALLBACK_MODELS = ["meta-llama/llama-4-scout-17b-16e-instruct"]

# Timeout Configuration (Seconds)
GEMINI_TIMEOUT = 20
EMBEDDING_TIMEOUT = 20

# ──────────────────────────────────────────────────────────────────────────────
# CORE INITIALIZATION
# ──────────────────────────────────────────────────────────────────────────────

def initialize_embeddings():
    """Verify local embeddings existence or download from Hugging Face on deployment."""
    # If we are local and the file already exists, bypass download
    if PKL_PATH == LOCAL_PKL_PATH and os.path.exists(PKL_PATH):
        logger.info(f"Loading local embeddings from {PKL_PATH}...")
    else:
        # Always download on deployment, or if we are local but the file is missing
        logger.info("Downloading embeddings_v3.pkl from Hugging Face...")
        
        # Ensure parent directories exist before creating/writing to file
        os.makedirs(os.path.dirname(PKL_PATH), exist_ok=True)
        
        hf_user = os.getenv("HF_USERNAME")
        hf_dataset = os.getenv("HF_DATASET_NAME")
        hf_file_path = "embeddings_v3.pkl"
        url = f"https://huggingface.co/datasets/{hf_user}/{hf_dataset}/resolve/main/{hf_file_path}"
        
        headers = {}
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            headers["Authorization"] = f"Bearer {hf_token}"
        
        try:
            r = requests.get(url, headers=headers, stream=True)
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
faiss.normalize_L2(embeddings_matrix)
cleaned_texts = data["cleaned_texts"]
doc_ids = data["doc_ids"]
titles = data.get("titles", [])
creators = data.get("creators", [])
dates = data.get("dates", [])
ark_urls = data.get("ark_urls", [])
subjects = data.get("subjects", [])
descriptions = data.get("descriptions", [])
item_types = data.get("item_types", [])
source_urls = data.get("source_urls", [])

index = faiss.IndexFlatIP(embeddings_matrix.shape[1])
index.add(embeddings_matrix)

# Initialize API Clients
app = Flask(__name__)
CORS(app)


genai_client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY"),
    http_options={'timeout': GEMINI_TIMEOUT * 1000}  # milliseconds
)
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ──────────────────────────────────────────────────────────────────────────────
# RAG LOGIC & UTILITIES
# ──────────────────────────────────────────────────────────────────────────────

def get_remote_embedding(text: str):
    """Retrieve embedding for a given text from the remote API."""
    try:
        headers = {}
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            headers["Authorization"] = f"Bearer {hf_token}"

        response = requests.post(
            REMOTE_EMBEDDING_API,
            json={"text": text},
            headers=headers,
            timeout=EMBEDDING_TIMEOUT,
        )
        response.raise_for_status()
        return response.json()["embedding"]
    except Exception as e:
        logger.error(f"Embedding API error: {e}")
        return None

def mmr(query_emb, candidate_embs, lambda_param=0.5, top_k=10):
    """Maximal Marginal Relevance (MMR) for diverse, non-repetitive retrieval."""
    if len(candidate_embs) == 0:
        return []
        
    selected = []
    candidates = list(range(len(candidate_embs)))
    
    # Precompute similarities to the query
    sim_to_query = np.dot(candidate_embs, query_emb)
    
    # Keep track of similarity of candidates to the selected set
    max_sim_to_selected = np.zeros(len(candidate_embs))
    
    while len(selected) < top_k and candidates:
        mmr_scores = lambda_param * sim_to_query[candidates] - (1 - lambda_param) * max_sim_to_selected[candidates]
        best_idx = candidates[np.argmax(mmr_scores)]
        
        selected.append(best_idx)
        candidates.remove(best_idx)
        
        # Update max similarity array with the newly selected embedding
        if candidates:
            sims = np.dot(candidate_embs[candidates], candidate_embs[best_idx])
            max_sim_to_selected[candidates] = np.maximum(max_sim_to_selected[candidates], sims)
            
    return selected

def retrieve_top_k(query, k_chunks=30, k_docs=3, k_final=10):
    """Perform FAISS search and rank documents based on embedding similarity."""
    query_embedding = get_remote_embedding(query)
    if not query_embedding:
        return []

    q_emb = np.array([query_embedding]).astype("float32")
    faiss.normalize_L2(q_emb)

    distances, indices = index.search(q_emb, k_chunks)

    retrieved = []
    for idx, dist in zip(indices[0], distances[0]):
        retrieved.append({
            "idx": idx,
            "doc_id": doc_ids[idx],
            "cleaned_text": cleaned_texts[idx],
            "title": titles[idx] if idx < len(titles) else "Unknown Title",
            "creator": creators[idx] if idx < len(creators) else "Unknown Creator",
            "date": dates[idx] if idx < len(dates) else "Unknown Date",
            "ark_url": ark_urls[idx] if idx < len(ark_urls) else "",
            "score": float(dist),
            "subject": subjects[idx] if idx < len(subjects) else "",
            "description": descriptions[idx] if idx < len(descriptions) else "",
            "item_type": item_types[idx] if idx < len(item_types) else "",
            "source_url": source_urls[idx] if idx < len(source_urls) else ""
        })

    doc_groups = defaultdict(list)
    for r in retrieved:
        doc_groups[r["doc_id"]].append(r)

    # Filter to top k_docs (presentations) with highest single match score
    top_docs = sorted(
        doc_groups.items(),
        key=lambda x: max(c["score"] for c in x[1]),
        reverse=True
    )[:k_docs]

    candidates = []
    for _, chunks in top_docs:
        candidates.extend(chunks)

    if not candidates:
        return []

    # Re-rank candidate chunks using MMR to extract the best diverse set
    candidate_vectors = np.array([embeddings_matrix[c["idx"]] for c in candidates])
    mmr_selected_indices = mmr(q_emb.flatten(), candidate_vectors, lambda_param=0.5, top_k=k_final)

    return [candidates[i] for i in mmr_selected_indices]

def _build_prompt(query, context_docs):
    """Construct the final system prompt with retrieved context."""
    grouped_docs = defaultdict(list)
    doc_metadata = {}
    
    for doc in context_docs:
        doc_id = doc['doc_id']
        grouped_docs[doc_id].append(doc['cleaned_text'])
        if doc_id not in doc_metadata:
            doc_metadata[doc_id] = {
                "title": doc.get("title", "Unknown Title"),
                "creator": doc.get("creator", "Unknown Creator"),
                "date": doc.get("date", "Unknown Date"),
                "ark_url": doc.get("ark_url", "")
            }

    context_parts = []
    for doc_id, chunks in grouped_docs.items():
        meta = doc_metadata[doc_id]
        doc_content = "\n".join(chunks)
        context_parts.append(
            f"SOURCE ID: {doc_id}\n"
            f"TITLE: {meta['title']}\n"
            f"CREATOR/AFFILIATION: {meta['creator']}\n"
            f"DATE: {meta['date']}\n"
            f"URL: {meta['ark_url']}\n"
            f"CONTENT CHUNKS:\n{doc_content}\n----"
        )

    context = "\n\n".join(context_parts)

    return f"""You are an IIPC digital preservation and web archiving assistant. Answer using ONLY the provided conference materials below.

QUERY HANDLING:
- Greetings/capability questions: Respond briefly, no citations needed
- Substantive questions: Use context strictly, cite sources

RULES:
1. Never use outside knowledge. If insufficient info: "Based on available IIPC materials, I don't have enough information to fully answer this." and skip the Sources section entirely.
2. In-text citations: "According to [Author]'s '[Title]' ([Year])..." — NO ARK URLs inline
3. Only include a "Sources Referenced:" section when you actually used the context to answer. If you couldn't answer from the provided materials, omit it.
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

    # 1. Try Gemini (Native SDK timeout)
    try:
        response = genai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        logger.info(f"[✅ LLM] Responded via {GEMINI_MODEL} (Gemini)")
        return response.text, GEMINI_MODEL
    except Exception as e:
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
