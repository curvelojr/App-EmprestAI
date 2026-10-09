import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gamepad2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({ meta: [{ title: "Nova senha — GameShare" }, { name: "robots", content: "noindex" }] }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  // O link do e-mail cria uma sessão temporária; sem ela, o link é inválido ou expirou.
  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setState("ready");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) setState("ready");
    });
    const timer = setTimeout(() => active && setState((s) => (s === "ready" ? s : "invalid")), 2500);
    return () => {
      active = false;
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Senha com no mínimo 6 caracteres"); return; }
    if (password !== confirm) { toast.error("As senhas não conferem"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message.toLowerCase().includes("different") ? "Escolha uma senha diferente da anterior" : "Não foi possível alterar a senha");
      return;
    }
    toast.success("Senha alterada!");
    navigate({ to: "/explorar" });
  }

  return (
    <main className="bg-grid min-h-screen">
      <div className="mx-auto max-w-md px-6 py-8">
        <Link to="/" className="flex items-center gap-2 text-primary">
          <Gamepad2 className="h-6 w-6" />
          <span className="font-display text-xl tracking-wider">GameShare</span>
        </Link>
        <h1 className="mt-8 text-4xl">Nova senha</h1>

        {state === "checking" && <p className="mt-6 text-muted-foreground">Validando o link…</p>}

        {state === "invalid" && (
          <div className="mt-6 space-y-4">
            <p className="text-muted-foreground">Este link expirou ou já foi usado. Peça um novo link para trocar a senha.</p>
            <Button asChild className="w-full font-semibold"><Link to="/auth">Voltar ao login</Link></Button>
          </div>
        )}

        {state === "ready" && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Repita a nova senha</Label>
              <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" size="lg" className="w-full font-semibold shadow-glow" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Salvar nova senha
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
