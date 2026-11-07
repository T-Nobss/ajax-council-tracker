#!/usr/bin/env bash
# OCR scanned minutes (PDFs with no text layer) into sources/minutes-text/.
#   scripts/ocr_minutes.sh            # every scanned file that hasn't been done
# Needs pdftoppm (poppler-utils) and tesseract (tesseract-ocr).
set -euo pipefail
export OMP_THREAD_LIMIT=1   # one thread per tesseract; 4 run in parallel
export OCR_TMP="${OCR_TMP:-${TMPDIR:-/tmp}}"
cd "$(dirname "$0")/.."
mkdir -p sources/minutes-text
ocr_one() {
  f="$1"; id="$(basename "$f" .pdf)"; out="sources/minutes-text/$id.txt"
  [ -s "$out" ] && return 0
  chars=$(pdftotext "$f" - 2>/dev/null | tr -d '[:space:]' | wc -c)
  [ "$chars" -ge 200 ] && return 0          # has real text; no OCR needed
  tmp="$(mktemp -d -p "$OCR_TMP")"
  pdftoppm -r 300 -gray "$f" "$tmp/p"
  for img in "$tmp"/p-*.pgm; do
    tesseract "$img" stdout --psm 4 2>/dev/null
    printf '\f'
  done > "$out.part"
  mv "$out.part" "$out"; rm -rf "$tmp"
  echo "OCR done: $id"
}
export -f ocr_one
ls sources/minutes/*.pdf | xargs -P 4 -I{} bash -c 'ocr_one "$@"' _ {}
