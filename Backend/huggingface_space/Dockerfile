FROM python:3.10-slim

# Prevent Python from writing .pyc files and buffering output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set Hugging Face cache directory and ensure it's consistent with app
ENV HF_HOME=/app/hf_cache
ENV TRANSFORMERS_CACHE=/app/hf_cache

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download BAAI/bge-m3 model and tokenizer during build
RUN python -c "from transformers import AutoTokenizer, AutoModel; \
    AutoTokenizer.from_pretrained('BAAI/bge-m3', cache_dir='/app/hf_cache'); \
    AutoModel.from_pretrained('BAAI/bge-m3', cache_dir='/app/hf_cache')"

# Set offline mode for runtime (0s startup, no external network calls or rate limits)
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1

# Copy application files
COPY . .

# Ensure cache folder exists and has full read/write permissions for HF unprivileged user
RUN mkdir -p /app/hf_cache && chmod -R 777 /app/hf_cache

# Expose API port and start the FastAPI server
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
