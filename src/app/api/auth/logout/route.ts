import { NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";
import { clearSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  await clearSession();
  return NextResponse.redirect(appUrl("/"), { status: 303 });
}
