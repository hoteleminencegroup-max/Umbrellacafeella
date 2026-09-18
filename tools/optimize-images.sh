#!/usr/bin/env bash
# ==========================================================================
#  Umbrella Cafe — image optimiser
#  Turns any AI-generated / camera photo dropped into assets/img/dishes into
#  a fast web JPG (max 900px, quality 82, metadata stripped), plus the hero
#  banner (1600px wide) and the logo icons for the PWA manifest.
#
#  Usage:  bash tools/optimize-images.sh
#  Needs:  ImageMagick (`convert`). Safe to re-run — already-small files are
#          only rewritten when the source PNG/JPG is newer or bigger.
# ==========================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick 'convert' not found — install it to optimise images." >&2
  exit 1
fi

DISH_SIZE="900x900>"
DISH_QUALITY=82
HERO_SIZE="1600x1600>"
HERO_QUALITY=78

echo "☔ Umbrella Cafe — optimising images"

# ---- hero banner -------------------------------------------------------
if [ -f assets/img/hero-ella.jpg ]; then
  size=$(stat -c%s assets/img/hero-ella.jpg 2>/dev/null || echo 0)
  if [ "$size" -gt 262144 ]; then
    convert assets/img/hero-ella.jpg -auto-orient -resize "$HERO_SIZE" -quality "$HERO_QUALITY" -interlace JPEG -strip assets/img/hero-ella.tmp.jpg && mv assets/img/hero-ella.tmp.jpg assets/img/hero-ella.jpg
    echo "  ✔ hero-ella.jpg recompressed"
  fi
fi
if [ -f assets/img/hero-ella.png ]; then
  convert assets/img/hero-ella.png -auto-orient -resize "$HERO_SIZE" -quality "$HERO_QUALITY" -interlace JPEG -strip assets/img/hero-ella.jpg
  rm -f assets/img/hero-ella.png
  echo "  ✔ hero-ella.jpg"
fi

# ---- logo / PWA icons --------------------------------------------------
if [ -f assets/img/logo.png ]; then
  convert assets/img/logo.png -resize 512x512 -strip assets/img/logo.png
  convert assets/img/logo.png -resize 512x512 -strip assets/img/logo-512.png
  convert assets/img/logo.png -resize 192x192 -strip assets/img/logo-192.png
  echo "  ✔ logo-512.png · logo-192.png"
fi

# ---- dish photos: PNG -> JPG, and recompress oversized JPGs ------------
count=0
for f in assets/img/dishes/*.png assets/img/dishes/*.PNG; do
  [ -e "$f" ] || continue
  base="$(basename "$f")"; name="${base%.*}"
  convert "$f" -auto-orient -resize "$DISH_SIZE" -quality "$DISH_QUALITY" -interlace JPEG -strip "assets/img/dishes/${name}.jpg"
  rm -f "$f"; count=$((count + 1))
done
for f in assets/img/dishes/*.jpg; do
  [ -e "$f" ] || continue
  size=$(stat -c%s "$f" 2>/dev/null || echo 0)
  if [ "$size" -gt 184320 ]; then          # > 180 KB -> shrink again
    convert "$f" -auto-orient -resize "$DISH_SIZE" -quality "$DISH_QUALITY" -interlace JPEG -strip "${f}.tmp.jpg" && mv "${f}.tmp.jpg" "$f"
    count=$((count + 1))
  fi
done
echo "  ✔ ${count} dish image(s) optimised"

# ---- report ------------------------------------------------------------
echo ""
echo "  Sizes:"
du -sh assets/img 2>/dev/null | sed 's/^/    assets\/img  /'
ls -la assets/img/dishes/*.jpg 2>/dev/null | awk '{printf "    %-42s %6.0f KB\n", $9, $5/1024}'
echo ""
echo "  Done. Dish photos are referenced as .jpg in assets/js/menu-data.js"
