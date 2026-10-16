#!/usr/bin/env bash
# Starts the local summary model for one ingest run (docs/summaries.md): llama.cpp's server with
# Microsoft's Phi-3-mini (MIT licence), both pinned by version and SHA-256 and verified before use.
# Nothing is sent to a hosted AI service. Usage: scripts/summary-model.sh <cache-dir>
set -euo pipefail

DIR="${1:?cache directory}"
MODEL_URL="https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/a64113399c2f6b8ad3e11c394733a2ddadaa7f33/Phi-3-mini-4k-instruct-q4.gguf"
MODEL_SHA256="8a83c7fb9049a9b2e92266fa7ad04933bb53aa1e85136b7b30f1b8000ff2edef"
LLAMA_URL="https://github.com/ggml-org/llama.cpp/releases/download/b11269/llama-b11269-bin-ubuntu-x64.tar.gz"
LLAMA_SHA256="da117db981a629c9315613887ba89dbfbc288fa5e59859e28772a0f0d9e1afb4"
PORT=8091

mkdir -p "$DIR"
cd "$DIR"

fetch() { # url file sha256
  if [ ! -f "$2" ] || ! echo "$3  $2" | sha256sum -c --status; then
    curl -fsSL --retry 3 -o "$2.part" "$1"
    echo "$3  $2.part" | sha256sum -c --status || { echo "SHA-256 mismatch for $2" >&2; rm -f "$2.part"; exit 1; }
    mv "$2.part" "$2"
  fi
}

fetch "$MODEL_URL" model.gguf "$MODEL_SHA256"
fetch "$LLAMA_URL" llama.tar.gz "$LLAMA_SHA256"
rm -rf llama && mkdir llama && tar -xzf llama.tar.gz -C llama
SERVER="$(find llama -type f -name llama-server | head -1)"
BIN_DIR="$(dirname "$SERVER")"

LD_LIBRARY_PATH="$BIN_DIR:${LD_LIBRARY_PATH:-}" nohup "$SERVER" -m model.gguf --host 127.0.0.1 --port "$PORT" \
  -c 4096 --threads "$(nproc)" > llama-server.log 2>&1 &

for _ in $(seq 1 90); do
  if curl -fs "http://127.0.0.1:$PORT/health" | grep -q ok; then
    echo "Summary model ready on port $PORT"
    exit 0
  fi
  sleep 2
done
echo "Summary model did not start" >&2
tail -20 llama-server.log >&2 || true
exit 1
