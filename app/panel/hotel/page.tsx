import { db } from "@/lib/db";
import { integrationStatus, stripeEnabled } from "@/lib/config";
import { adminAuthEnabled } from "@/lib/admin/auth";
import { loadHotelPack } from "@/lib/hotel-pack";
import { priceStay } from "@/lib/tools/quote";
import { usd } from "@/lib/money";
import { PageHeader } from "@/components/admin/AdminShell";
import { TimeTravel } from "@/components/StatusBar";
import { instagramWebhookLog } from "@/lib/integrations/instagram-log";
import { instagramAccount } from "@/lib/integrations/instagram";

export const dynamic = "force-dynamic";

function Integration({ name, state, ok, detail }: { name: string; state: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-arena-200 bg-white p-4">
      <span aria-hidden className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-bruma" : "bg-[#C9B99F]"}`} />
      <div>
        <div className="text-[14px] font-semibold">
          {name} <span className={`ml-1 text-[12px] font-semibold ${ok ? "text-bruma" : "text-gris"}`}>· {state}</span>
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-gris">{detail}</p>
      </div>
    </div>
  );
}

export default async function HotelPage() {
  const pack = loadHotelPack();
  const st = await integrationStatus();
  const types = await db.roomType.findMany();
  const igLog = await instagramWebhookLog();
  // Salud de Instagram: si Meta bloquea la app o vence el token, se ve aquí.
  const igHealth = st.instagram === "real" ? await instagramAccount().then((a) => ({ ok: true as const, text: `@${a.username}` })).catch((e: Error) => ({ ok: false as const, text: e.message })) : null;
  const h = pack.hotel;

  return (
    <div>
      <PageHeader title="Hotel e integraciones" subtitle="Configuración vigente del Hotel Pack (hotel-pack.yaml) y estado de cada conexión. Para cambiar datos del hotel, edita el Hotel Pack." />

      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-gris">Integraciones</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Integration name="Cerebro (Claude)" ok={st.agent.mode === "ai"} state={st.agent.mode === "ai" ? `IA · ${st.agent.model}` : "modo guiado"} detail={st.agent.mode === "ai" ? "Nía conversa con IA y usa las herramientas del hotel." : "Sin ANTHROPIC_API_KEY: Nía responde con flujos guiados y botones (mismas herramientas)."} />
        <Integration name="Voz (ElevenLabs)" ok={st.voice === "elevenlabs"} state={st.voice === "elevenlabs" ? "conectada" : "voz del navegador"} detail={st.voice === "elevenlabs" ? `Agente ${process.env.ELEVENLABS_AGENT_ID} en la web y el teléfono.` : "Define ELEVENLABS_AGENT_ID para usar la voz de ElevenLabs."} />
        <Integration name="Correo" ok={st.email !== "simulated"} state={st.email === "smtp" ? "Gmail SMTP" : st.email === "gmail" ? "API de Gmail" : "simulado"} detail={st.email === "smtp" ? `Envía desde ${process.env.SMTP_USER}.` : st.email === "gmail" ? "Envía con la cuenta Google autorizada." : "Los correos se guardan en el panel pero no se envían (falta SMTP o Google)."} />
        <Integration name="Pasarela de pago" ok={stripeEnabled()} state={stripeEnabled() ? "modo prueba" : "simulada"} detail={stripeEnabled() ? "Página de pago segura con tarjetas de prueba; la reserva se confirma cuando la pasarela avisa el pago." : "Sin claves de la pasarela: el pago abre una página simulada con la misma lógica."} />
        <Integration name="Google Calendar" ok={st.google === "real"} state={st.google} detail={st.google === "real" ? "Cada reserva crea y actualiza su evento." : "El evento se registra en la línea de tiempo (simulado); el huésped igual recibe la invitación .ics por correo."} />
        <Integration
          name="Instagram"
          ok={!!igHealth?.ok}
          state={!igHealth ? "simulado" : igHealth.ok ? `conectado · ${igHealth.text}` : "sin acceso"}
          detail={!igHealth ? "Sin INSTAGRAM_ACCESS_TOKEN: Instagram se simula en la consola." : igHealth.ok ? "DMs y comentarios de la cuenta real (webhook /api/webhooks/instagram). Actividad abajo." : `Meta rechaza el token: «${igHealth.text}». Revisa los avisos de la app en developers.facebook.com (app restringida, token vencido o permisos).`}
        />
        <Integration name="WhatsApp y Messenger" ok={false} state="simulados" detail="Se simulan en la consola de canales con el mismo cerebro de Nía." />
        <Integration name="Acceso al panel" ok={adminAuthEnabled()} state={adminAuthEnabled() ? "con contraseña" : "abierto"} detail={adminAuthEnabled() ? "El panel pide la contraseña definida en ADMIN_PASSWORD." : "Define ADMIN_PASSWORD antes de publicar: el panel muestra datos de huéspedes."} />
        <Integration name="Recordatorios" ok={true} state="activos" detail="Pre-check-in 24 h antes, aviso de salida, encuesta y vencimiento de pagos (cada minuto)." />
      </div>

      {st.instagram === "real" && (
        <div className="mt-4 rounded-xl border border-arena-200 bg-white p-4">
          <div className="mb-2 text-[13px] font-semibold">Actividad del webhook de Instagram</div>
          {igLog.length === 0 ? (
            <p className="text-[12.5px] text-gris">Meta todavía no ha llamado al webhook. Revisa que esté guardado en la app de Meta y que la cuenta que escribe sea tester.</p>
          ) : (
            <ul className="space-y-1 text-[12.5px]">
              {igLog.slice(0, 12).map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.ok ? "bg-bruma" : "bg-laguna"}`} />
                  <span className="shrink-0 tabular-nums text-gris">{new Date(e.at).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  <span className="font-semibold">{e.kind}</span>
                  <span className="break-all text-tinta">{e.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-arena-200 bg-cal p-4">
        <div className="mb-2 text-[13px] font-semibold">Viaje en el tiempo (pruebas)</div>
        <TimeTravel />
      </div>

      <h2 className="mb-2 mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-gris">Identidad</h2>
      <div className="grid gap-3 rounded-2xl border border-arena-200 bg-white p-5 text-[13px] md:grid-cols-2">
        <div>
          <div className="font-serif text-[28px] leading-none">{h.nombre}</div>
          <div className="mt-1 text-gris">{h.lema}</div>
          <div className="mt-3 text-tinta">
            {h.direccion}
            <br />
            {h.telefono} · {h.correo}
            <br />
            Zona horaria {h.zona_horaria} · moneda {h.moneda}
          </div>
        </div>
        <div>
          <div className="text-gris">Concierge</div>
          <div className="mt-1 font-semibold">{pack.agente.nombre}</div>
          <div className="text-tinta">{pack.agente.tono}</div>
          <div className="mt-2 text-gris">Idiomas: {pack.agente.idiomas.join(", ")}</div>
          <div className="mt-3 flex gap-1.5">
            {Object.entries(h.colores).map(([k, c]) => (
              <span key={k} title={`${k} ${c}`} className="h-6 w-6 rounded-full border border-arena-200" style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>

      <h2 className="mb-2 mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-gris">Habitaciones</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {pack.habitaciones.map((r) => (
          <div key={r.codigo} className="overflow-hidden rounded-2xl border border-arena-200 bg-white">
            <img src={r.foto} alt={r.nombre_es} className="h-36 w-full object-cover" />
            <div className="p-4 text-[13px]">
              <div className="font-semibold">{r.nombre_es}</div>
              <div className="text-gris">
                {r.codigo} · hasta {r.max_huespedes} personas · inventario {types.find((t) => t.code === r.codigo)?.inventory ?? r.inventario}
              </div>
              <p className="mt-2 text-tinta">{r.descripcion_es}</p>
              <div className="mt-2 font-semibold">
                {pack.tarifas.map((t) => `${t.codigo} ${usd(priceStay(r.codigo, t.codigo, 1, 0).nightlyCents)}`).join(" · ")} <span className="font-normal text-gris">/ noche</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-gris">Tarifas e impuestos</h2>
          <div className="space-y-2 rounded-2xl border border-arena-200 bg-white p-5 text-[13px]">
            {pack.tarifas.map((t) => (
              <div key={t.codigo} className="border-b border-arena-200/70 pb-2 last:border-0 last:pb-0">
                <div className="font-semibold">
                  {t.nombre} <span className="font-normal text-gris">· {t.codigo} · {t.modalidad_pago === "prepaid" ? "prepago" : "pago en el hotel"}</span>
                </div>
                <div className="text-tinta">{t.cancelacion}</div>
                {t.garantia_usd ? <div className="text-gris">Garantía al llegar: USD {t.garantia_usd}</div> : null}
                {t.descuento_pct ? <div className="text-gris">Descuento: {t.descuento_pct}%</div> : null}
              </div>
            ))}
            {pack.impuestos.map((i) => (
              <div key={i.nombre} className="text-gris">
                {i.nombre}: {i.tasa_pct}% sobre {i.sobre}
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-gris">Políticas y servicios</h2>
          <div className="space-y-2 rounded-2xl border border-arena-200 bg-white p-5 text-[13px]">
            <div>
              Check-in desde las <b>{pack.politicas.check_in}</b> · check-out hasta las <b>{pack.politicas.check_out}</b>
            </div>
            <div>{pack.politicas.mascotas}</div>
            <div className="border-t border-arena-200/70 pt-2">
              {pack.servicios.map((s) => (
                <div key={s.codigo} className="flex justify-between gap-3 py-0.5">
                  <span>
                    {s.nombre} <span className="text-gris">· {s.codigo}</span>
                  </span>
                  <span className="text-gris">
                    {s.horario ?? ""}
                    {s.precio_usd ? ` · ${usd(s.precio_usd * 100)}` : ""}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-arena-200/70 pt-2 text-gris">
              Recordatorio de pre-check-in {pack.recordatorios.precheckin_horas_antes} h antes · aviso de salida a las {pack.recordatorios.aviso_checkout_hora}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
