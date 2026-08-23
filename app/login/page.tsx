"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { KeyRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setCarregando(true);
    setErro(null);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!r.ok) {
        const corpo = await r.json().catch(() => ({}));
        setErro(corpo.mensagem ?? "Não consegui entrar.");
        return;
      }
      router.push("/compor");
      router.refresh();
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex gap-2">
          <KeyRound className="size-5 text-primary" />
          <h1 className="font-serif text-xl">Envio de SMS</h1>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <Input
            label="Senha"
            type="password"
            value={senha}
            onValueChange={setSenha}
            isInvalid={Boolean(erro)}
            errorMessage={erro}
            onKeyDown={(e) => {
              if (e.key === "Enter") entrar();
            }}
          />
          <Button color="primary" isLoading={carregando} onPress={entrar}>
            Entrar
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
