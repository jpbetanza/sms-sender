import { NextResponse, type NextRequest } from "next/server";
import { validarToken } from "@/lib/session";

const PUBLICAS = ["/login", "/api/login", "/api/progress"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const segredo = process.env.SESSION_SECRET ?? "";
  const token = req.cookies.get("sessao")?.value;

  if (await validarToken(token, segredo)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "nao_autenticado" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
