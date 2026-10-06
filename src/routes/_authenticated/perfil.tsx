import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RatingBadge } from "@/components/Reviews";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — GameShare" }, { name: "description", content: "Seus dados de cadastro." }] }),
  component: Perfil,
});

const fields = [
  ["full_name", "Nome completo"], ["whatsapp", "WhatsApp"], ["cep", "CEP"], ["street", "Rua"], ["number", "Número"],
  ["complement", "Complemento"], ["neighborhood", "Bairro"], ["city", "Cidade"], ["state", "UF"],
] as const;
type Key = (typeof fields)[number][0];

function Perfil() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).single()).data,
  });
  const [f, setF] = useState<Record<Key, string> | null>(null);
  useEffect(() => { if (data) setF(data); }, [data]);

  async function save() {
    if (!f) return;
    const { error } = await supabase.from("profiles").update({ ...f, state: f.state.toUpperCase() }).eq("id", user.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Perfil atualizado");
    qc.invalidateQueries();
  }
  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div>
      <h1 className="text-4xl">Meu perfil</h1>
      <p className="text-sm text-muted-foreground">{user.email}</p>
      <div className="mt-1"><RatingBadge userId={user.id} /></div>
      {f && (
        <div className="mt-4 space-y-3">
          {fields.map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={k}>{label}</Label>
              <Input id={k} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </div>
          ))}
          <Button onClick={save} className="w-full font-semibold">Salvar</Button>
        </div>
      )}
      <Button variant="outline" onClick={logout} className="mt-6 w-full"><LogOut />Sair</Button>
    </div>
  );
}
