import cron from "node-cron";
import { processDueReminders } from "./lib/jobs/reminders";
import { loadHotelPack } from "./lib/hotel-pack";

const g = globalThis as unknown as { __auraCron?: boolean };
if (!g.__auraCron) {
  g.__auraCron = true;
  loadHotelPack(); // valida el Hotel Pack al arrancar (falla temprano si está mal)
  cron.schedule("* * * * *", () => {
    processDueReminders().catch((e) => console.error("[cron]", e));
  });
  console.log("[aura] Recordatorios activos (cada minuto)");
}
