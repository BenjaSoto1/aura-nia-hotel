import { loadHotelPack } from "@/lib/hotel-pack";
import { TopNav } from "@/components/StatusBar";
import { MascotShowcase } from "./MascotShowcase";

export const dynamic = "force-dynamic";

export default function PersonajePage() {
  const pack = loadHotelPack();
  return (
    <div className="min-h-screen">
      <TopNav hotelName={pack.hotel.nombre} />
      <MascotShowcase hotelName={pack.hotel.nombre} />
    </div>
  );
}
