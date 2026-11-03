import { loadHotelPack } from "@/lib/hotel-pack";
import { adminAuthEnabled } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Aura · Administración" };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell hotelName={loadHotelPack().hotel.nombre} authEnabled={adminAuthEnabled()}>
      {children}
    </AdminShell>
  );
}
