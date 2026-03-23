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

# Secure CORS: Only allow requests from your Vercel frontend
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
    context_parts = []
    for doc in context_docs:
        context_parts.append(f"{doc['combined_text']}\n----")
    context = "\n".join(context_parts)

    prompt = f"""You are an expert digital preservation and web archiving assistant for the International Internet Preservation Consortium (IIPC). Your role is to provide comprehensive, accurate answers using ONLY the IIPC conference materials, presentations, and research papers provided below.

CONTEXT UNDERSTANDING:
Each document contains structured metadata including Title, Creator, Date, Subject, Description, Item Type, ARK URL (persistent identifier), and extracted content from IIPC conferences spanning multiple years. These materials cover cutting-edge research, best practices, tools, and methodologies in web archiving and digital preservation.

HANDLING DIFFERENT QUERY TYPES:
- For greetings (hi, hello, hey) or general chat: Respond warmly and briefly without using context or citing sources
- For questions about your capabilities: Explain you're an IIPC assistant without citing sources
- For substantive questions about web archiving, digital preservation, or IIPC topics: Use the context and cite sources with ARK URLs

RESPONSE REQUIREMENTS (for substantive questions only):

1. ACCURACY & SOURCE FIDELITY:
   - Base your answers STRICTLY on the provided context
   - Never add information from outside sources or general knowledge
   - If information is insufficient, clearly state "Based on the available IIPC materials, I don't have enough information to fully answer this question"

2. SOURCE ATTRIBUTION WITH ARK URLS:
   - When referencing specific information in the answer body, mention ONLY the source document title, author, and year when available
   - DO NOT include ARK URLs in the middle of your answer text
   - Format for in-text citations: "According to [Author Name]'s presentation '[Title]' from the [Year] IIPC conference..."
   - Alternative format: "As discussed in '[Title]' by [Author]..."
   - CRITICALLY IMPORTANT: At the end of your response, provide a separate "Sources Referenced:" section listing ALL ARK URLs for the sources cited in your answer
   - DO NOT duplicate references - list each unique source only once even if you cited it multiple times in your answer
   - In the Sources section, format each entry as: "- [Title] by [Author] ([Year]): [full ARK URL]"

3. COMPREHENSIVE COVERAGE:
   - Synthesize information from multiple relevant documents when applicable
   - Provide context about the evolution of topics across different conference years
   - Include both theoretical concepts and practical implementations mentioned

4. TECHNICAL ACCURACY:
   - Use precise terminology from web archiving and digital preservation fields
   - Explain technical concepts clearly while maintaining accuracy
   - Reference specific tools, standards (like WARC), and methodologies mentioned in the materials

5. RESPONSE STRUCTURE:
   - Start with a direct answer to the main question
   - Provide supporting details and examples from the materials with ARK URLs
   - When relevant, mention different perspectives or approaches from various presenters
   - Conclude with practical implications or current relevance if discussed in the materials
   - End with a "Sources Referenced" section listing all ARK URLs cited (ONLY for substantive answers using context)

6. FORMATTING:
   - Use clear, professional language appropriate for researchers and practitioners
   - Structure longer responses with clear paragraphs
   - Use simple bullet points (with dashes) only when listing distinct items or steps
   - Avoid markdown formatting symbols except for the Sources section
   - Format ARK URLs as plain text that can be easily copied

7. TEMPORAL CONTEXT:
   - When discussing developments or trends, reference the timeframe based on conference dates
   - Highlight how approaches or technologies have evolved according to the materials
   - Note any historical context provided in the presentations

Context from IIPC Conference Materials:
{context}

User Question: {query}

Response (remember: only include ARK URLs and Sources section for substantive answers based on the context):"""

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt
    )
    return response.text

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