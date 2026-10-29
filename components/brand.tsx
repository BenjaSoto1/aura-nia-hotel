/** Piezas de identidad compartidas: wordmark de Aura y monograma / wordmark de Nía. */

/** "Au" + "ra" en itálica, Cormorant. Si el hotel no se llama Aura, muestra el nombre tal cual. */
export function AuraWordmark({ name = "Aura", className = "" }: { name?: string; className?: string }) {
  const isAura = name.trim().toLowerCase() === "aura";
  return (
    <span className={`font-serif font-medium tracking-[0.03em] ${className}`}>
      {isAura ? (
        <>
          Au<em className="font-normal">ra</em>
        </>
      ) : (
        name
      )}
    </span>
  );
}

/** Monograma circular de Nía: "N" en Instrument Serif con el punto terracota. */
export function NiaMonogram({ size = 40, halo = false, className = "" }: { size?: number; halo?: boolean; className?: string }) {
  const dot = Math.max(5, Math.round(size * 0.17));
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center rounded-full border border-[#7A5A46] bg-noche text-fondo ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: halo ? "0 0 0 6px rgba(217,162,127,.18), 0 10px 30px rgba(22,32,43,.4)" : undefined,
      }}
      aria-hidden
    >
      <span className="font-nia leading-none" style={{ fontSize: size * 0.6 }}>
        N
      </span>
      <span className="nia-dot absolute rounded-full" style={{ width: dot, height: dot, right: size * 0.19, top: size * 0.2 }} />
    </span>
  );
}

/** Wordmark "Nía" con la tilde terracota inclinada y el punto luminoso final. */
export function NiaWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-nia leading-none ${className}`} aria-label="Nía">
      N
      <span className="relative inline-block">
        ı
        <span
          className="absolute rounded-[0.03em] bg-laguna"
          style={{ left: "50%", top: "0.1em", width: "0.06em", height: "0.17em", transform: "translateX(-5%) rotate(22deg)" }}
        />
      </span>
      a
      <span className="nia-dot ml-[0.05em] inline-block rounded-full" style={{ width: "0.15em", height: "0.15em" }} />
    </span>
  );
}

/** Imagen con proporción fija y degradado de respaldo (la fotografía final se reemplaza sin tocar la UI). */
export function ImgSlot({
  src,
  alt,
  ratio,
  gradient,
  className = "",
  children,
}: {
  src?: string;
  alt: string;
  ratio?: string;
  gradient?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`img-slot ${className}`} style={{ aspectRatio: ratio, background: gradient }}>
      {src && <img src={src} alt={alt} loading="lazy" />}
      {children}
    </div>
  );
}
