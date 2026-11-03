"""
Optimiza las fotos del sitio de Aura (public/aura/uploads/images) para que cargue rápido en el celular.
Guarda los originales en design/aura/originals/images (si ya están, parte siempre desde ellos).

  - fondos de pantalla completa: lado largo máx. 1920 px
  - platos de Brasa (tarjetas chicas): lado largo máx. 900 px
  - JPEG progresivo calidad 78; cena-arena.png pasa a cena-arena.jpg

Uso:  python scripts/optimize-aura-images.py      (requiere Pillow)
"""
import pathlib
import shutil

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "public" / "aura" / "uploads" / "images"
ORIG = ROOT / "design" / "aura" / "originals" / "images"
ORIG.mkdir(parents=True, exist_ok=True)

before = after = 0
for f in sorted(IMG.iterdir()):
    if f.suffix.lower() not in (".jpg", ".jpeg", ".png") or f.stem.endswith("-poster"):
        continue
    src = ORIG / f.name
    if not src.exists():
        shutil.copy2(f, src)
    before += src.stat().st_size
    im = Image.open(src).convert("RGB")
    limit = 900 if f.stem.startswith("plato-") else 1920
    im.thumbnail((limit, limit), Image.LANCZOS)
    out = f.with_suffix(".jpg")
    im.save(out, "JPEG", quality=78, optimize=True, progressive=True)
    if out != f:
        f.unlink()  # el original queda en design/aura/originals/images
    after += out.stat().st_size
    print(f"{out.name:32} {src.stat().st_size // 1024:>5} KB -> {out.stat().st_size // 1024:>4} KB")
print(f"Total: {before // 1024} KB -> {after // 1024} KB")
