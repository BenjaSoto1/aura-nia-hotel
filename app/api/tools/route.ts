import { NextResponse } from "next/server";
import { anthropicTools } from "@/lib/tools";
import { VOICE_TOOL_NAMES } from "@/lib/tool-names";

export const dynamic = "force-dynamic";

/** Esquemas de las herramientas (para configurar las client tools del agente de ElevenLabs). */
export async function GET() {
  const tools = anthropicTools().filter((t) => (VOICE_TOOL_NAMES as readonly string[]).includes(t.name));
  return NextResponse.json({ tools });
}
