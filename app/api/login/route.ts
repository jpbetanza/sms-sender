import { NextResponse } from "next/server";
import { criarToken, senhaConfere } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => ({}));
  const senha = typeof corpo?.senha === "string" ? corpo.senha : "";

  const segredo = process.env.SESSION_SECRET;
  const esperada = process.env.APP_PASSWORD;
  if (!segredo || !esperada) {
    return NextResponse.json({ erro: "config_ausente" }, { status: 500 });
  }

  if (!(await senhaConfere(senha, esperada, segredo))) {
    return NextResponse.json(
      { erro: "senha_invalida", mensagem: "Senha incorreta." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sessao", await criarToken(segredo), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return res;
}
