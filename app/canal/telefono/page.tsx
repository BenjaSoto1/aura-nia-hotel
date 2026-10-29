import { loadHotelPack } from "@/lib/hotel-pack";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PhoneSim } from "@/components/sims/PhoneSim";
import { WhatsAppSim } from "@/components/sims/WhatsAppSim";
import { TopNav } from "@/components/StatusBar";

export const dynamic = "force-dynamic";

export default function Page() {
  const pack = loadHotelPack();
  return (
    <div className="min-h-screen">
      <TopNav hotelName={pack.hotel.nombre} />
      <div className="flex flex-wrap justify-center gap-10 py-8">
        <PhoneFrame label="Llamada (simulada)">
          <PhoneSim hotelName={pack.hotel.nombre} hotelPhone={pack.hotel.telefono} />
        </PhoneFrame>
        <PhoneFrame label="WhatsApp del mismo número">
          <WhatsAppSim hotelName={pack.hotel.nombre} />
        </PhoneFrame>
      </div>
    </div>
  );
}
