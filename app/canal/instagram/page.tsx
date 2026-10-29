import { loadHotelPack } from "@/lib/hotel-pack";
import { PhoneFrame } from "@/components/PhoneFrame";
import { DmSim } from "@/components/sims/DmSim";
import { TopNav } from "@/components/StatusBar";

export const dynamic = "force-dynamic";

export default function Page() {
  const pack = loadHotelPack();
  return (
    <div className="min-h-screen">
      <TopNav hotelName={pack.hotel.nombre} />
      <div className="flex justify-center py-8">
        <PhoneFrame label="Instagram DM (simulado)">
          <DmSim variant="instagram" hotelName={pack.hotel.nombre} coverImage={pack.hotel.foto_portada} />
        </PhoneFrame>
      </div>
    </div>
  );
}
