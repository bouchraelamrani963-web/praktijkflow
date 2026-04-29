import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  const { allowed } = rateLimit(`claim:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return Response.json({ error: "Te veel verzoeken. Probeer het later opnieuw." }, { status: 429 });
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return Response.json({ error: "Missing token parameter" }, { status: 400 });
  }

  redirect(`/action/${encodeURIComponent(token)}`);
}
