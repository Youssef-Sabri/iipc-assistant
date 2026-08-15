FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create cache directory for HuggingFace models
RUN mkdir -p /app/hf_cache && chmod 777 /app/hf_cache
ENV HF_HOME=/app/hf_cache

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download BAAI/bge-m3 model during build so startup is instant (0s cold start)
RUN python3 -c "from transformers import AutoTokenizer, AutoModel; \
    AutoTokenizer.from_pretrained('BAAI/bge-m3', cache_dir='/app/hf_cache'); \
    AutoModel.from_pretrained('BAAI/bge-m3', cache_dir='/app/hf_cache')"

# Copy application files
COPY . .

# Hugging Face Spaces runs on port 7860
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
