import { loadHotelPack } from "@/lib/hotel-pack";
import { PhoneFrame } from "@/components/PhoneFrame";
import { WhatsAppSim } from "@/components/sims/WhatsAppSim";
import { TopNav } from "@/components/StatusBar";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u } = await searchParams;
  const pack = loadHotelPack();
  return (
    <div className="min-h-screen">
      <TopNav hotelName={pack.hotel.nombre} />
      <div className="flex justify-center py-8">
        <PhoneFrame label="WhatsApp (simulado)">
          <WhatsAppSim hotelName={pack.hotel.nombre} initialPhone={u} />
        </PhoneFrame>
      </div>
    </div>
  );
}
