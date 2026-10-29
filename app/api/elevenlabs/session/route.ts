import { NextResponse } from "next/server";
import { voiceProvider } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Datos para abrir la sesión de voz de ElevenLabs desde el navegador.
 * Agente público: basta el agentId. Agente privado: pedimos un token de conversación (WebRTC)
 * con la API key, que nunca sale del servidor.
 */
export async function GET(req: Request) {
  if (voiceProvider() !== "elevenlabs") return NextResponse.json({ provider: "browser" });
  const agentId = process.env.ELEVENLABS_AGENT_ID!;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (new URL(req.url).searchParams.has("probe")) return NextResponse.json({ provider: "elevenlabs" });
  if (!apiKey) return NextResponse.json({ provider: "elevenlabs", agentId });
  const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`, {
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ provider: "elevenlabs", agentId, error: `Token: ${r.status} ${await r.text()}` });
  const { token } = await r.json();
  return NextResponse.json({ provider: "elevenlabs", conversationToken: token });
}
