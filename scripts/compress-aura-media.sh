#!/usr/bin/env bash
# Comprime los videos de fondo del sitio Aura (se guardan los originales en design/aura/originals).
# Requiere ffmpeg (o: pip install imageio-ffmpeg).  Uso: bash scripts/compress-aura-media.sh
set -e
cd "$(dirname "$0")/.."
FF="$(command -v ffmpeg || python -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')"
IMG=public/aura/uploads/images
ORIG=design/aura/originals
mkdir -p "$ORIG"
for f in atardecer-velero brasa-dia-noche habitaciones-fondo; do
  [ -f "$ORIG/$f.mp4" ] || cp "$IMG/$f.mp4" "$ORIG/$f.mp4"
  # Lado largo máx. 1280 px, sin audio (los videos se reproducen en silencio), H.264 compatible y faststart.
  "$FF" -y -hide_banner -loglevel error -i "$ORIG/$f.mp4" -an \
    -vf "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'" \
    -c:v libx264 -preset slow -crf 27 -profile:v high -pix_fmt yuv420p -movflags +faststart "$IMG/$f.mp4"
  # Póster (primer cuadro) para mostrar algo mientras el video carga.
  "$FF" -y -hide_banner -loglevel error -i "$IMG/$f.mp4" -frames:v 1 -q:v 4 "$IMG/$f-poster.jpg"
done
ls -la "$IMG"/*.mp4 "$IMG"/*-poster.jpg
