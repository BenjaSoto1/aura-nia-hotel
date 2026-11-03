/**
 * Diagnóstico y conexión de Instagram (Meta).
 *
 *   npx tsx --env-file=.env scripts/instagram-setup.ts              revisa token, permisos y cuenta
 *   npx tsx --env-file=.env scripts/instagram-setup.ts --subscribe  además suscribe la cuenta a los webhooks
 *   npx tsx --env-file=.env scripts/instagram-setup.ts --menu       configura el menú rápido (ice breakers y menú ☰)
 *
 * Imprime la URL del webhook y el token de verificación que hay que pegar en developers.facebook.com.
 */
import { appUrl } from "../lib/config";
import { instagramAccount, instagramToken, setInstagramQuickMenu, subscribeInstagramWebhooks } from "../lib/integrations/instagram";

const NEEDS_IG_LOGIN = ["instagram_business_basic", "instagram_business_manage_messages", "instagram_business_manage_comments"];
const NEEDS_FB_LOGIN = ["instagram_basic", "instagram_manage_messages", "instagram_manage_comments", "pages_show_list", "pages_manage_metadata"];

async function main() {
  const token = instagramToken();
  const ok = (s: string) => console.log("  ✔ " + s);
  const bad = (s: string) => console.log("  ✘ " + s);
  console.log("\nInstagram · diagnóstico\n");
  if (!token) return bad("Falta INSTAGRAM_ACCESS_TOKEN en .env");
  const igLogin = token.startsWith("IG");
  ok(`Token de ${igLogin ? "Instagram Login (graph.instagram.com)" : "Facebook Login (graph.facebook.com)"}`);

  if (!igLogin) {
    const r = await fetch(`https://graph.facebook.com/v23.0/me/permissions?access_token=${encodeURIComponent(token)}`).then((x) => x.json());
    const granted: string[] = (r.data ?? []).filter((p: { status: string }) => p.status === "granted").map((p: { permission: string }) => p.permission);
    for (const p of NEEDS_FB_LOGIN) (granted.includes(p) ? ok : bad)(`permiso ${p}`);
  } else {
    console.log(`  · Permisos necesarios: ${NEEDS_IG_LOGIN.join(", ")}`);
  }

  try {
    const acc = await instagramAccount();
    ok(`Cuenta: @${acc.username} (id ${acc.igId})${acc.pageId ? ` · página ${acc.pageId}` : ""}`);
    if (process.argv.includes("--subscribe")) {
      await subscribeInstagramWebhooks();
      ok("Cuenta suscrita a los webhooks (mensajes y comentarios)");
    }
    if (process.argv.includes("--menu")) {
      const r = await setInstagramQuickMenu();
      for (const [k, v] of Object.entries(r)) (v === "ok" ? ok : bad)(`${k === "ice_breakers" ? "Preguntas rápidas (ice breakers)" : "Menú persistente"}: ${v}`);
    }
  } catch (e) {
    bad(`No pude leer la cuenta de Instagram: ${(e as Error).message}`);
  }

  const url = `${appUrl()}/api/webhooks/instagram`;
  console.log("\nWebhook (developers.facebook.com → tu app → Instagram → Webhooks)");
  console.log(`  URL de devolución:      ${url}`);
  console.log(`  Token de verificación:  ${process.env.INSTAGRAM_VERIFY_TOKEN || "(falta INSTAGRAM_VERIFY_TOKEN)"}`);
  console.log("  Campos:                 messages, messaging_postbacks, comments");
  if (/localhost|127\.0\.0\.1/.test(url)) bad("La URL es local: Meta necesita una dirección pública https (túnel o Netlify) en APP_PUBLIC_URL.");
  (process.env.INSTAGRAM_APP_SECRET ? ok : bad)("INSTAGRAM_APP_SECRET (para validar la firma de cada webhook)");
  console.log("");
}

main();
