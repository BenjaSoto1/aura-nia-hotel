const STATUS: Record<string, [string, string]> = {
  pending_payment: ["Pendiente de pago", "bg-[#fff4e0] text-[#9a6a00]"],
  confirmed: ["Confirmada", "bg-laguna-50 text-laguna"],
  precheckin_done: ["Pre-check-in listo", "bg-[#e7f0ff] text-[#2456b8]"],
  in_house: ["En casa", "bg-[#efe7ff] text-[#5b3cc4]"],
  checked_out: ["Checkout", "bg-arena text-tinta"],
  cancelled: ["Cancelada", "bg-[#fde8e3] text-coral"],
  expired: ["Vencida", "bg-[#f1f1f1] text-gris"],
};

export function StatusBadge({ status }: { status: string }) {
  const [label, cls] = STATUS[status] ?? [status, "bg-arena text-tinta"];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

const PAY: Record<string, [string, string]> = {
  link_sent: ["Enlace enviado", "text-[#9a6a00]"],
  paid: ["Pagado", "text-laguna"],
  authorized: ["Autorizada", "text-[#2456b8]"],
  released: ["Liberada", "text-gris"],
  expired: ["Vencido", "text-gris"],
  failed: ["Falló", "text-coral"],
};

export function PayBadge({ status }: { status: string }) {
  const [label, cls] = PAY[status] ?? [status, "text-tinta"];
  return <span className={`text-[12px] font-semibold ${cls}`}>{label}</span>;
}

export const CHANNEL_ICON: Record<string, string> = { whatsapp: "🟢", instagram: "📸", messenger: "💬", web: "🌐", phone: "📞" };
export const CHANNEL_NAME: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram", messenger: "Messenger", web: "Web voz", phone: "Teléfono" };

export function ChannelTag({ channel }: { channel: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-arena-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-tinta">
      {CHANNEL_ICON[channel] ?? "•"} {CHANNEL_NAME[channel] ?? channel}
    </span>
  );
}
