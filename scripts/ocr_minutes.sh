#!/usr/bin/env bash
# OCR scanned minutes (PDFs with no text layer) into sources/minutes-text/.
#   scripts/ocr_minutes.sh            # every scanned file that hasn't been done
# Needs pdftoppm (poppler-utils) and tesseract (tesseract-ocr).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p sources/minutes-text
ocr_one() {
  f="$1"; id="$(basename "$f" .pdf)"; out="sources/minutes-text/$id.txt"
  [ -s "$out" ] && return 0
  chars=$(pdftotext "$f" - 2>/dev/null | tr -d '[:space:]' | wc -c)
  [ "$chars" -ge 200 ] && return 0          # has real text; no OCR needed
  tmp="$(mktemp -d)"
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
