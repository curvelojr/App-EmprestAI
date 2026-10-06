import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Gamepad2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => z.object({ modo: z.enum(["entrar", "cadastro"]).optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Entrar ou cadastrar — GameShare" },
      { name: "description", content: "Acesse sua conta GameShare ou cadastre-se." },
      { property: "og:title", content: "Entrar ou cadastrar — GameShare" },
      { property: "og:description", content: "Acesse sua conta GameShare ou cadastre-se." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(6, "Senha com no mínimo 6 caracteres"),
  whatsapp: z.string().refine((v) => v.replace(/\D/g, "").length >= 10, "WhatsApp inválido"),
  cep: z.string().refine((v) => v.replace(/\D/g, "").length === 8, "CEP inválido"),
  street: z.string().trim().min(2, "Informe a rua"),
  number: z.string().trim().min(1, "Informe o número"),
  complement: z.string().optional(),
  neighborhood: z.string().trim().min(2, "Informe o bairro"),
  city: z.string().trim().min(2, "Informe a cidade"),
  state: z.string().trim().length(2, "UF com 2 letras"),
});

type F = z.infer<typeof signupSchema>;
const empty: F = { full_name: "", email: "", password: "", whatsapp: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

function AuthPage() {
  const { modo } = Route.useSearch();
  const [mode, setMode] = useState<"entrar" | "cadastro">(modo ?? "entrar");
  const [f, setF] = useState<F>(empty);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function lookupCep(v: string) {
    const d = v.replace(/\D/g, "");
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`).then((r) => r.json());
      if (!r.erro) setF((p) => ({ ...p, street: r.logradouro || p.street, neighborhood: r.bairro || p.neighborhood, city: r.localidade || p.city, state: r.uf || p.state }));
    } catch {
      /* ignore */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw new Error("E-mail ou senha incorretos");
        navigate({ to: "/explorar" });
      } else {
        const parsed = signupSchema.safeParse(f);
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
        const { password, email, ...meta } = parsed.data;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/explorar", data: { ...meta, state: meta.state.toUpperCase() } },
        });
        if (error) throw error;
        setSent(true);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent)
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <h1 className="text-4xl text-primary">Confira seu e-mail</h1>
        <p className="mt-3 text-muted-foreground">Enviamos um link de confirmação para {f.email}. Depois é só entrar.</p>
        <Button className="mt-8" onClick={() => { setSent(false); setMode("entrar"); }}>Ir para o login</Button>
      </main>
    );

  const field = (k: keyof F, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} value={f[k] ?? ""} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <main className="bg-grid min-h-screen">
      <div className="mx-auto max-w-md px-6 py-8">
        <Link to="/" className="flex items-center gap-2 text-primary">
          <Gamepad2 className="h-6 w-6" />
          <span className="font-display text-xl tracking-wider">GameShare</span>
        </Link>
        <div className="mt-8 grid grid-cols-2 rounded-lg bg-muted p-1">
          {(["entrar", "cadastro"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`rounded-md py-2 text-sm font-semibold transition ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {m === "entrar" ? "Entrar" : "Cadastrar"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "cadastro" && field("full_name", "Nome completo", { autoComplete: "name" })}
          {field("email", "E-mail", { type: "email", autoComplete: "email" })}
          {field("password", "Senha", { type: "password", autoComplete: mode === "entrar" ? "current-password" : "new-password" })}
          {mode === "cadastro" && (
            <>
              {field("whatsapp", "WhatsApp (com DDD)", { type: "tel", placeholder: "(85) 99999-9999" })}
              <h2 className="pt-2 text-2xl text-primary">Endereço</h2>
              {field("cep", "CEP", { inputMode: "numeric", onBlur: (e) => lookupCep(e.target.value) })}
              {field("street", "Rua")}
              <div className="grid grid-cols-2 gap-3">
                {field("number", "Número")}
                {field("complement", "Complemento")}
              </div>
              {field("neighborhood", "Bairro")}
              <div className="grid grid-cols-[1fr_80px] gap-3">
                {field("city", "Cidade")}
                {field("state", "UF", { maxLength: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Seu endereço completo fica privado. Outros usuários veem só seu bairro e WhatsApp.</p>
            </>
          )}
          <Button type="submit" size="lg" className="w-full font-semibold shadow-glow" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {mode === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
      </div>
    </main>
  );
}
