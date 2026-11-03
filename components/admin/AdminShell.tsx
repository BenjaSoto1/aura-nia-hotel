"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuraWordmark, NiaMonogram } from "@/components/brand";
import { IntegrationChips } from "@/components/StatusBar";

const NAV: { href: string; label: string; icon: string; exact?: boolean }[] = [
  { href: "/panel", label: "Resumen", icon: "◐", exact: true },
  { href: "/panel/reservas", label: "Reservas", icon: "▤" },
  { href: "/panel/calendario", label: "Calendario", icon: "▦" },
  { href: "/panel/huespedes", label: "Huéspedes", icon: "◉" },
  { href: "/panel/conversaciones", label: "Conversaciones", icon: "✉" },
  { href: "/panel/servicios", label: "Servicios", icon: "✦" },
  { href: "/panel/correos", label: "Correos", icon: "@" },
  { href: "/panel/hotel", label: "Hotel e integraciones", icon: "⚙" },
];

export function AdminShell({ hotelName, authEnabled, children }: { hotelName: string; authEnabled: boolean; children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/panel/login") return <>{children}</>;
  const active = (n: (typeof NAV)[number]) => (n.exact ? path === n.href : path === n.href || path.startsWith(`${n.href}/`));

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-arena-200 bg-cal md:flex">
        <Link href="/panel" className="flex items-center gap-2.5 px-5 py-5">
          <NiaMonogram size={32} />
          <div>
            <AuraWordmark name={hotelName} className="text-[22px] leading-none" />
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gris">Administración</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium ${active(n) ? "bg-oscuro text-white" : "text-tinta hover:bg-arena"}`}
            >
              <span aria-hidden className="w-4 text-center text-[13px] opacity-80">
                {n.icon}
              </span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t border-arena-200 px-3 py-4 text-[12.5px]">
          <a href="/" className="block rounded-lg px-3 py-1.5 text-tinta hover:bg-arena">
            ↗ Sitio de Aura
          </a>
          <Link href="/consola" className="block rounded-lg px-3 py-1.5 text-tinta hover:bg-arena">
            ↗ Consola de canales
          </Link>
          {authEnabled && (
            <form action="/api/panel/logout" method="post">
              <button className="w-full rounded-lg px-3 py-1.5 text-left text-gris hover:bg-arena hover:text-oscuro">Cerrar sesión</button>
            </form>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        {/* Cabecera: navegación compacta en móvil + estado de integraciones */}
        <header className="sticky top-0 z-30 border-b border-arena-200 bg-fondo/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-2.5 md:px-6">
            <Link href="/panel" className="flex items-center gap-2 md:hidden">
              <NiaMonogram size={28} />
              <AuraWordmark name={hotelName} className="text-[20px] leading-none" />
            </Link>
            <div className="ml-auto hidden lg:block">
              <IntegrationChips />
            </div>
          </div>
          <nav className="scroll-thin flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${active(n) ? "bg-oscuro text-white" : "bg-white text-tinta"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-[34px] leading-tight text-oscuro">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-gris">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
