import { NextResponse } from "next/server";
import { criarToken, senhaConfere } from "@/lib/session";
import { atrasoDaProximaTentativa, registrarFalha, limparFalhas } from "@/lib/login-throttle";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // O atraso vem ANTES de avaliar a senha: e ele que torna forca bruta inviavel por tempo.
  const atraso = atrasoDaProximaTentativa();
  if (atraso > 0) {
    await new Promise((resolve) => setTimeout(resolve, atraso));
  }

  const corpo = await req.json().catch(() => ({}));
  const senha = typeof corpo?.senha === "string" ? corpo.senha : "";

  const segredo = process.env.SESSION_SECRET;
  const esperada = process.env.APP_PASSWORD;
  if (!segredo || !esperada) {
    return NextResponse.json({ erro: "config_ausente" }, { status: 500 });
  }

  if (!(await senhaConfere(senha, esperada, segredo))) {
    registrarFalha();
    return NextResponse.json(
      { erro: "senha_invalida", mensagem: "Senha incorreta." },
      { status: 401 },
    );
  }

  limparFalhas();
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
