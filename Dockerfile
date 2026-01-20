FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    python3-dev \
    ffmpeg \
    curl \
    git \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Copy and install Node.js dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Create Python virtual environment and install requirements
COPY requirements.txt ./
RUN python3 -m venv /app/venv && \
    . /app/venv/bin/activate && \
    pip install --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Build React app
RUN node setup-icons.js && npm run build

# Create directories
RUN mkdir -p public/hls logs data/uploads

# Expose ports
EXPOSE 3001 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start both servers
CMD ["/bin/bash", "-c", ". /app/venv/bin/activate && python3 ml_server.py & npm run start:server & wait"]