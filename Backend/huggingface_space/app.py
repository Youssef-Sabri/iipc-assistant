import os
os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import time
import warnings
import logging
from typing import List

warnings.filterwarnings("ignore")

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModel, logging as hf_logging
import torch
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("embedding_api")

# Suppress noise from downloading/external libraries
for name in ["httpx", "urllib3", "transformers", "huggingface_hub", "torch", "uvicorn.access"]:
    logging.getLogger(name).setLevel(logging.WARNING)
hf_logging.set_verbosity_error()

# Hugging Face ZeroGPU local mock workaround
try:
    import spaces
except ImportError:
    import sys
    from types import ModuleType
    mock_spaces = ModuleType("spaces")
    mock_spaces.GPU = lambda func: func
    sys.modules["spaces"] = mock_spaces
    import spaces

@spaces.GPU
def dummy_gpu_func():
    try:
        import torch
        x = torch.tensor([1.0]).cuda()
    except Exception:
        pass

try:
    dummy_gpu_func()
except Exception:
    pass

model_name = "BAAI/bge-m3"
hf_token = os.getenv("HF_TOKEN") or None

logger.info(f"Loading embedding model: {model_name}...")
tokenizer = AutoTokenizer.from_pretrained(model_name, token=hf_token)
model = AutoModel.from_pretrained(model_name, token=hf_token)
model.eval()
logger.info(f"Model {model_name} loaded successfully and ready for inference.")

app = FastAPI()

@spaces.GPU
def get_embeddings_local(texts: List[str]):
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model.to(device)
        encoded_input = tokenizer(
            texts, 
            padding=True, 
            truncation=True, 
            max_length=512, 
            return_tensors='pt'
        )
        encoded_input = {k: v.to(device) for k, v in encoded_input.items()}
        with torch.no_grad():
            model_output = model(**encoded_input)
        
        embeddings = model_output.last_hidden_state[:, 0]
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
        return embeddings.cpu().tolist()
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Inference computation failed: {str(e)}"
        )

class TextInput(BaseModel):
    text: str

@app.post("/embed")
def embed(input: TextInput):
    start_time = time.time()
    if not input.text.strip():
        raise HTTPException(status_code=400, detail="Text input cannot be empty.")
    
    vectors = get_embeddings_local([input.text])
    duration = time.time() - start_time
    logger.info(f"[POST /embed] Vector generated (dim: {len(vectors[0])}, query_len: {len(input.text)} chars) in {duration:.2f}s")
    return {"embedding": vectors[0]}

@app.get("/")
def root():
    logger.info("[GET /] Health ping received.")
    return {
        "status": "online",
        "model": model_name,
        "message": "Embedding API is running. Supports POST /embed"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860, log_level="warning")
