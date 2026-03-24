import os
import pickle
import numpy as np
import faiss
import requests
from flask import Flask, request, jsonify
from google import genai
from dotenv import load_dotenv
from flask_cors import CORS
import traceback
from collections import defaultdict

# Load environment variables (local dev only, ignored on HF)
load_dotenv()

# ─── Download embeddings from HF Dataset if not present ───────────────────────
PKL_PATH = "embeddings_v3.pkl"

if not os.path.exists(PKL_PATH):
    print("Downloading embeddings_v3.pkl from Hugging Face...")
    HF_USER = os.getenv("HF_USERNAME")          # set this in HF Secrets
    HF_DATASET = os.getenv("HF_DATASET_NAME")   # set this in HF Secrets
    url = f"https://huggingface.co/datasets/{HF_USER}/{HF_DATASET}/resolve/main/embeddings_v3.pkl"
    r = requests.get(url, stream=True)
    r.raise_for_status()
    with open(PKL_PATH, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    print("Download complete!")
# ──────────────────────────────────────────────────────────────────────────────

# Initialize Flask app
app = Flask(__name__)

# Secure CORS: Tell browsers to only allow your Vercel frontend
CORS(app, resources={r"/*": {"origins": "https://iipc-assistant.vercel.app"}})

# Load FAISS index and texts
with open(PKL_PATH, "rb") as f:
    data = pickle.load(f)

embeddings = np.array(data["embeddings"]).astype("float32")
combined_texts = data["combined_texts"]
doc_ids = data["doc_ids"]

index = faiss.IndexFlatL2(embeddings.shape[1])
index.add(embeddings)

# Configure Gemini API using the new SDK
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Load remote embedding API URL
REMOTE_EMBEDDING_API = os.getenv("VITE_EMBEDDING_API_URL")

# Call Hugging Face embedding API
def get_remote_embedding(text: str):
    try:
        response = requests.post(
            REMOTE_EMBEDDING_API,
            json={"text": text},
            timeout=20,
        )
        response.raise_for_status()
        return response.json()["embedding"]
    except Exception as e:
        print("Embedding API error:", str(e))
        return None

def retrieve_top_k(query, k_chunks=30, k_docs=3, k_final=10):
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

    final_results = sorted(selected_chunks, key=lambda c: c["score"])[:k_final]
    return final_results

def generate_response(query, context_docs):
    # --- DEDUPLICATION LOGIC: Group multiple chunks by their Source ID ---
    grouped_docs = defaultdict(list)
    for doc in context_docs:
        grouped_docs[doc['doc_id']].append(doc['combined_text'])
    
    context_parts = []
    for doc_id, chunks in grouped_docs.items():
        # Combine all paragraphs belonging to the same document
        doc_content = "\n".join(chunks)
        context_parts.append(f"SOURCE ID: {doc_id}\n{doc_content}\n----")
    
    context = "\n\n".join(context_parts)
    # ---------------------------------------------------------------------


    prompt = f"""You are an IIPC digital preservation and web archiving assistant. Answer using ONLY the provided conference materials below.

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

    response = client.models.generate_content(
        model="gemini-3-flash-preview", 
        contents=prompt
    )
    return response.text

# --- HARD SECURITY CHECK TO BYPASS HF PROXY ---
@app.before_request
def restrict_origins():
    if request.path == "/chat" and request.method == "POST":
        origin = request.headers.get('Origin')
        allowed_origins = ["https://iipc-assistant.vercel.app", "https://huggingface.co"]
        if not origin or origin not in allowed_origins:
            return jsonify({"error": "Unauthorized. API restricted to official frontend."}), 403
        if not origin:
            return jsonify({"error": "Direct API access forbidden."}), 403
# ----------------------------------------------

@app.route("/", methods=["GET"])
def home():
    return "Backend is running successfully! Connected to Vercel Frontend.", 200

@app.route("/ping", methods=["GET"])
def ping():
    return "pong", 200

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data_req = request.get_json()
        query = data_req.get("query")
        if not query:
            return jsonify({"error": "Query not provided"}), 400

        print(f"Received query: {query}")

        context_docs = retrieve_top_k(query)
        print(f"Retrieved {len(context_docs)} context chunks")

        if not context_docs:
            return jsonify({"response": "I don't know."})

        answer = generate_response(query, context_docs)
        print("Generated answer")

        return jsonify({"response": answer})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(debug=True)