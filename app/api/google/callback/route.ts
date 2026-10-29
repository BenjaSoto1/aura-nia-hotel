import { NextResponse } from "next/server";
import { saveTokensFromCode } from "@/lib/integrations/google";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return new NextResponse("Falta el código de autorización", { status: 400 });
  try {
    await saveTokensFromCode(code);
  } catch (e) {
    return new NextResponse(`No se pudo autorizar: ${(e as Error).message}`, { status: 500 });
  }
  return NextResponse.redirect(`${appUrl()}/panel?google=ok`);
}
