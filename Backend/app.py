import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import time
import pickle
import logging
import traceback
from collections import defaultdict

import numpy as np
import faiss
import torch
from transformers import AutoTokenizer, AutoModel, logging as hf_logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Hugging Face ZeroGPU compatibility
try:
    import spaces
except ImportError:
    import sys
    from types import ModuleType
    mock_spaces = ModuleType("spaces")
    def _mock_gpu(func_or_kwargs=None, **kwargs):
        if callable(func_or_kwargs):
            return func_or_kwargs
        return lambda f: f
    mock_spaces.GPU = _mock_gpu
    sys.modules["spaces"] = mock_spaces
    import spaces

@spaces.GPU
def _zerogpu_startup():
    try:
        if torch.cuda.is_available():
            _ = torch.tensor([1.0]).cuda()
    except Exception:
        pass

try:
    _zerogpu_startup()
except Exception:
    pass

# Logging Setup: Suppress library noise, show only application interactions
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("iipc_backend")

for noisy_lib in [
    "httpx",
    "httpcore",
    "urllib3",
    "requests",
    "huggingface_hub",
    "transformers",
    "torch",
    "werkzeug",
    "google",
    "google_genai",
    "google.genai"
]:
    logging.getLogger(noisy_lib).setLevel(logging.ERROR)

hf_logging.set_verbosity_error()

# Configuration & Paths
PKL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "IIPC_data", "embeddings_v3.pkl")
if not os.path.exists(PKL_PATH):
    parent_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "IIPC_data", "embeddings_v3.pkl")
    if os.path.exists(parent_path):
        PKL_PATH = parent_path

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip() or None
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip() or None

GEMINI_MODEL = "gemini-3.1-flash-lite"
GROQ_FALLBACK_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b"
]
GEMINI_TIMEOUT = 20
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-m3")

# Load FAISS Index and Archival Metadata
def load_embeddings_data():
    if not os.path.exists(PKL_PATH):
        logger.error(f"Embeddings file missing at {PKL_PATH}.")
        raise FileNotFoundError(f"Embeddings file missing at {PKL_PATH}")

    with open(PKL_PATH, "rb") as f:
        return pickle.load(f)

data = load_embeddings_data()
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
item_types = [
    "presentation" if t in ("image_presentation", "image presentation") else t
    for t in data.get("item_types", [])
]
source_urls = data.get("source_urls", [])

index = faiss.IndexFlatIP(embeddings_matrix.shape[1])
index.add(embeddings_matrix)
logger.info(f"FAISS index loaded with {index.ntotal} vectors.")

# Initialize Local Embedding Model (BAAI/bge-m3)
tokenizer = None
embedding_model = None

try:
    tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)
    embedding_model = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME)
    embedding_model.eval()
    logger.info(f"Embedding model ready: {EMBEDDING_MODEL_NAME}")
except Exception as e:
    logger.error(f"Failed to initialize embedding model: {e}")

# Initialize AI Clients
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY is not configured. Primary chat generation will fail.")

genai_client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options={"timeout": GEMINI_TIMEOUT * 1000}
)
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

app = Flask(__name__)
CORS(app)

# In-Process Embedding Inference
@spaces.GPU
def get_embedding(text: str):
    if not embedding_model or not tokenizer:
        logger.error("Embedding model is not initialized.")
        return None

    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        embedding_model.to(device)

        inputs = tokenizer(
            [text],
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt"
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = embedding_model(**inputs)

        embeddings = outputs.last_hidden_state[:, 0]
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
        return embeddings[0].cpu().tolist()
    except Exception as e:
        logger.error(f"Embedding generation error: {e}")
        return None

# MMR Diverse Retrieval
def mmr(query_emb, candidate_embs, lambda_param=0.5, top_k=10):
    if len(candidate_embs) == 0:
        return []

    selected = []
    candidates = list(range(len(candidate_embs)))
    sim_to_query = np.dot(candidate_embs, query_emb)
    max_sim_to_selected = np.zeros(len(candidate_embs))

    while len(selected) < top_k and candidates:
        mmr_scores = lambda_param * sim_to_query[candidates] - (1 - lambda_param) * max_sim_to_selected[candidates]
        best_idx = candidates[np.argmax(mmr_scores)]

        selected.append(best_idx)
        candidates.remove(best_idx)

        if candidates:
            sims = np.dot(candidate_embs[candidates], candidate_embs[best_idx])
            max_sim_to_selected[candidates] = np.maximum(max_sim_to_selected[candidates], sims)

    return selected

def retrieve_top_k(query: str, k_chunks=60, k_docs=10, k_final=20):
    query_embedding = get_embedding(query)
    if not query_embedding:
        return []

    q_emb = np.array([query_embedding]).astype("float32")
    faiss.normalize_L2(q_emb)
    distances, indices = index.search(q_emb, k_chunks)

    retrieved = []
    for idx, dist in zip(indices[0], distances[0]):
        if idx >= len(doc_ids) or idx >= len(cleaned_texts):
            continue

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
            "item_type": "presentation" if (idx < len(item_types) and item_types[idx] == "image_presentation") else (item_types[idx] if idx < len(item_types) else ""),
            "source_url": source_urls[idx] if idx < len(source_urls) else ""
        })

    doc_groups = defaultdict(list)
    for r in retrieved:
        doc_groups[r["doc_id"]].append(r)

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

    candidate_vectors = np.array([embeddings_matrix[c["idx"]] for c in candidates])
    mmr_selected_indices = mmr(q_emb.flatten(), candidate_vectors, lambda_param=0.5, top_k=k_final)

    return [candidates[i] for i in mmr_selected_indices]

# Prompt Construction
def _build_prompt(query: str, context_docs: list) -> str:
    grouped_docs = defaultdict(list)
    doc_metadata = {}

    for doc in context_docs:
        doc_id = doc["doc_id"]
        grouped_docs[doc_id].append(doc["cleaned_text"])
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
3. When you use the provided context, end your answer with a "Sources Referenced:" section:
   - [Title] by [Author] ([Year]): [ARK URL]
   (Each source listed once only)
   If you could not answer from the provided materials, omit this section entirely.
4. Use precise web archiving terminology (WARC, etc.)
5. Synthesize across documents; note how topics evolved over conference years
6. Plain text only — no markdown except in Sources section

Context:
{context}

Question: {query}

Answer:"""

# Multi-Provider LLM Generation
def generate_response(query: str, context_docs: list):
    prompt = _build_prompt(query, context_docs)

    try:
        response = genai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
            ),
        )
        logger.info(f"[LLM] Primary response generated via {GEMINI_MODEL} (Gemini)")
        return response.text, GEMINI_MODEL
    except Exception as e:
        logger.warning(f"[LLM Fallback Triggered] Gemini failed ({type(e).__name__}) -> Cascading to Groq...")

    if not groq_client:
        logger.error("[LLM Error] Gemini failed and Groq fallback is not configured.")
        raise RuntimeError("All LLM providers failed.")

    for model in GROQ_FALLBACK_MODELS:
        try:
            chat_completion = groq_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1500,
                temperature=0.3,
            )
            logger.info(f"[LLM] Fallback response generated via {model} (Groq)")
            return chat_completion.choices[0].message.content, model
        except Exception as e:
            logger.error(f"[LLM Error] Groq model {model} failed: {e}")

    logger.error("[LLM Error] All AI providers exhausted.")
    raise RuntimeError("All LLM providers failed.")

# HTTP Endpoints
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "online",
        "service": "IIPC Assistant Backend",
        "local_embedding_ready": embedding_model is not None,
        "embedding_model": EMBEDDING_MODEL_NAME if embedding_model else None,
        "primary_chat_model": GEMINI_MODEL,
        "endpoints": ["/chat", "/embed", "/ping"]
    }), 200

@app.route("/ping", methods=["GET"])
def ping():
    return "pong", 200

@app.route("/embed", methods=["POST"])
def embed():
    start = time.time()
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request payload. Expected JSON object."}), 400

    text = data.get("text")
    if not text or not isinstance(text, str) or not text.strip():
        return jsonify({"error": "Text input is required and cannot be empty."}), 400

    vector = get_embedding(text.strip())
    if not vector:
        return jsonify({"error": "Failed to generate embedding vector."}), 500

    elapsed = time.time() - start
    logger.info(f"[POST /embed] Vector generated in {elapsed:.2f}s (dim: {len(vector)})")
    return jsonify({"embedding": vector})

@app.route("/chat", methods=["POST"])
def chat():
    start = time.time()
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid request payload. Expected JSON object."}), 400

        query = data.get("query")
        if not query or not isinstance(query, str) or not query.strip():
            return jsonify({"error": "Query is required and must be a non-empty string."}), 400

        query = query.strip()
        if len(query) > 2000:
            return jsonify({"error": "Query exceeds maximum limit of 2000 characters."}), 400

        query_preview = query if len(query) <= 60 else query[:57] + "..."
        logger.info(f"[POST /chat] Query: \"{query_preview}\"")

        context_docs = retrieve_top_k(query)
        logger.info(f"[POST /chat] Retrieved {len(context_docs)} context chunks")

        if not context_docs:
            logger.warning("[POST /chat] No relevant archival context found.")
            return jsonify({"response": "I couldn't find relevant information in the IIPC archives."})

        answer, model_used = generate_response(query, context_docs)
        elapsed = time.time() - start
        logger.info(f"[POST /chat] Completed via {model_used} in {elapsed:.2f}s")
        return jsonify({"response": answer})
    except RuntimeError:
        return jsonify({"error": "All AI providers are currently unavailable."}), 503
    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "An internal server error occurred."}), 500

if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1")
    app.run(host="0.0.0.0", debug=debug_mode, port=int(os.getenv("PORT", 7860)))
