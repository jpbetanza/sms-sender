import { NextResponse, type NextRequest } from "next/server";
import { validarToken } from "@/lib/session";

// Correspondencia EXATA, nao por prefixo: subarvore publica faria qualquer rota
// futura aninhada sob esses caminhos nascer sem autenticacao, em silencio.
const PUBLICAS = new Set(["/login", "/api/login"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLICAS.has(pathname)) {
    return NextResponse.next();
  }

  const segredo = process.env.SESSION_SECRET;
  if (!segredo) {
    // Falha explicita e legivel, em vez de estourar DataError dentro do crypto.subtle.
    return NextResponse.json(
      { erro: "config_ausente", mensagem: "SESSION_SECRET não configurado." },
      { status: 500 },
    );
  }

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
