import os
from typing import Union, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModel
import torch

# Ensure Hugging Face cache directory matches Space/Docker configuration
os.environ["HF_HOME"] = "/app/hf_cache"

app = FastAPI()

# Load model and tokenizer locally inside the HuggingFace Space
model_name = "BAAI/bge-m3"
tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir="/app/hf_cache")
model = AutoModel.from_pretrained(model_name, cache_dir="/app/hf_cache")

# Set model to evaluation mode
model.eval()

# Inference function to compute embeddings (handles single text or batch list)
def get_embeddings_local(texts: List[str]):
    try:
        # Tokenize inputs (max length 512 as per BGE-M3 specs)
        encoded_input = tokenizer(
            texts, 
            padding=True, 
            truncation=True, 
            max_length=512, 
            return_tensors='pt'
        )
        
        with torch.no_grad():
            model_output = model(**encoded_input)
            
        # Get CLS token representations (index 0)
        embeddings = model_output.last_hidden_state[:, 0]
        
        # Normalize the vectors (L2 normalization)
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
        
        return embeddings.tolist()
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Inference computation failed: {str(e)}"
        )

# Flexible input schema (supports single text string or list of text strings)
class TextInput(BaseModel):
    text: Union[str, List[str]]

# Endpoint: generate embeddings
@app.post("/embed")
def embed(input: TextInput):
    # Standardize input to a list of strings
    if isinstance(input.text, str):
        if not input.text.strip():
            raise HTTPException(status_code=400, detail="Text input cannot be empty.")
        vectors = get_embeddings_local([input.text])
        # Return single vector for backward compatibility with single string calls
        return {"embedding": vectors[0]}
    
    elif isinstance(input.text, list):
        if not input.text:
            raise HTTPException(status_code=400, detail="Text list cannot be empty.")
        vectors = get_embeddings_local(input.text)
        return {"embeddings": vectors}
        
    else:
        raise HTTPException(status_code=400, detail="Invalid input format. Must be string or list of strings.")

# Root / Health check endpoint
@app.get("/")
def root():
    return {
        "message": f"Embedding API is running on HuggingFace Space with model: {model_name}. Supports POST /embed"
    }
