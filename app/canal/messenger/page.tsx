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
        <PhoneFrame label="Messenger (simulado)">
          <DmSim variant="messenger" hotelName={pack.hotel.nombre} />
        </PhoneFrame>
      </div>
    </div>
  );
}
