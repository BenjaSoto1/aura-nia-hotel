import { NextResponse } from "next/server";
import { authUrl } from "@/lib/integrations/google";
import { googleConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!googleConfigured()) {
    return new NextResponse("Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env (ver README, sección Google).", { status: 400 });
  }
  return NextResponse.redirect(authUrl());
}
