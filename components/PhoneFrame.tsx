export function PhoneFrame({ children, label, className = "" }: { children: React.ReactNode; label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {label && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gris">{label}</div>}
      <div className="relative h-[700px] w-[340px] rounded-[44px] bg-[#111] p-[10px] shadow-[0_30px_60px_-20px_rgba(19,48,46,0.45)]">
        <div className="absolute left-1/2 top-[14px] z-20 h-[22px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[34px] bg-white">
          <div className="flex h-9 shrink-0 items-end justify-between px-7 pb-1 text-[12px] font-semibold text-black">
            <span>9:41</span>
            <span className="flex items-center gap-1 text-[11px]">
              <span className="tracking-tighter">▂▄▆█</span>
              <span className="inline-block h-[10px] w-[20px] rounded-[3px] border border-black/60 p-[1px]">
                <span className="block h-full w-4/5 rounded-[1px] bg-black" />
              </span>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
