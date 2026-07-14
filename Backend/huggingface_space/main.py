import os
from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModel
import torch

os.environ["HF_HOME"] = "/app/hf_cache"

app = FastAPI()

import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("embedding_api")
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

model_name = "BAAI/bge-m3"
tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir="/app/hf_cache")
model = AutoModel.from_pretrained(model_name, cache_dir="/app/hf_cache")
model.eval()

def get_embeddings_local(texts: List[str]):
    try:
        encoded_input = tokenizer(
            texts, 
            padding=True, 
            truncation=True, 
            max_length=512, 
            return_tensors='pt'
        )
        with torch.no_grad():
            model_output = model(**encoded_input)
        
        embeddings = model_output.last_hidden_state[:, 0]
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
        return embeddings.tolist()
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Inference computation failed: {str(e)}"
        )

class TextInput(BaseModel):
    text: str

@app.post("/embed")
def embed(input: TextInput):
    logger.info(f"Incoming embedding query: {input.text[:80]}...")
    if not input.text.strip():
        raise HTTPException(status_code=400, detail="Text input cannot be empty.")
    
    vectors = get_embeddings_local([input.text])
    logger.info(f"Successfully generated embedding vector for query (dimension {len(vectors[0])}).")
    return {"embedding": vectors[0]}

@app.get("/")
def root():
    return {
        "message": f"Embedding API is running on HuggingFace Space with model: {model_name}. Supports POST /embed"
    }
