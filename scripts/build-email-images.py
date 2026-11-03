"""
Genera las versiones para correo de las fotos del sitio (public/aura/uploads/images -> public/aura/uploads/email).

Gmail ignora object-fit, así que cada foto se recorta ya con la proporción exacta del hueco del correo
(y al doble de resolución para pantallas retina). El correo las adjunta como imágenes en línea (CID),
de modo que se ven aunque la app corra en localhost.

Uso:  python scripts/build-email-images.py
"""
import pathlib
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "aura" / "uploads" / "images"
OUT = ROOT / "public" / "aura" / "uploads" / "email"

# variante: (ancho, alto) en píxeles reales (2x del tamaño en el correo)
VARIANTS = {"hero": (1120, 400), "card": (472, 220), "thumb": (128, 128)}

OUT.mkdir(parents=True, exist_ok=True)
total = 0
for f in sorted(SRC.iterdir()):
    if f.suffix.lower() not in (".jpg", ".jpeg", ".png"):
        continue
    im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    for name, size in VARIANTS.items():
        o = OUT / f"{f.stem}-{name}.jpg"
        ImageOps.fit(im, size, Image.LANCZOS, centering=(0.5, 0.5)).save(o, "JPEG", quality=78, optimize=True, progressive=True)
        total += o.stat().st_size
print(f"[build-email-images] OK -> {OUT.relative_to(ROOT)} ({total / 1e6:.1f} MB)")
