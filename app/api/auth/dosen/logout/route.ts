import { NextResponse } from "next/server";

const DOSEN_SESSION_COOKIE_NAME = "dosen_session";

function clearDosenSessionCookie(): string {
  return `${DOSEN_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", clearDosenSessionCookie());
  return response;
}
