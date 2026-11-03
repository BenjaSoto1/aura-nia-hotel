import { AuraWordmark, NiaMonogram } from "@/components/brand";
import { loadHotelPack } from "@/lib/hotel-pack";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const pack = loadHotelPack();
  return (
    <div className="grid min-h-screen place-items-center bg-fondo px-4">
      <form action="/api/panel/login" method="post" className="w-full max-w-sm rounded-2xl border border-arena-200 bg-white p-8">
        <div className="flex items-center gap-2.5">
          <NiaMonogram size={36} />
          <div>
            <AuraWordmark name={pack.hotel.nombre} className="text-[26px] leading-none" />
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gris">Administración</div>
          </div>
        </div>
        <label htmlFor="password" className="mt-8 block text-[13px] font-semibold text-oscuro">
          Contraseña del panel
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="mt-2 w-full rounded-xl border border-arena-200 bg-fondo px-4 py-3 text-[15px] outline-none focus:border-oscuro"
        />
        <input type="hidden" name="next" value={sp.next ?? "/panel"} />
        {sp.error && <p className="mt-3 text-[13px] text-laguna-600">Contraseña incorrecta.</p>}
        <button className="mt-6 w-full rounded-xl bg-oscuro py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-noche">Entrar</button>
      </form>
    </div>
  );
}
