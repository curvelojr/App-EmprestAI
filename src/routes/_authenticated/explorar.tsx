import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORMS, useCoverUrls, waLink } from "@/lib/games";
import { GameCover } from "@/components/GameCover";
import { RatingBadge } from "@/components/Reviews";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/explorar")({
  head: () => ({ meta: [{ title: "Explorar jogos — GameShare" }, { name: "description", content: "Jogos disponíveis na sua cidade." }] }),
  component: Explorar,
});

type Row = { id: string; owner_id: string; title: string; platform: string; genre: string; condition: string; notes: string; cover_url: string | null; available: boolean; owner_name: string; owner_neighborhood: string; owner_whatsapp: string };

function Explorar() {
  const { user } = Route.useRouteContext();
  const [platform, setPlatform] = useState<string | null>(null);
  const [sel, setSel] = useState<Row | null>(null);
  const [msg, setMsg] = useState("");
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["city-games", platform],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_city_games", platform ? { _platform: platform } : {});
      if (error) throw error;
      return data as Row[];
    },
  });
  const urls = useCoverUrls(data.map((g) => g.cover_url));

  async function request() {
    if (!sel) return;
    const { error } = await supabase.from("loan_requests").insert({ game_id: sel.id, owner_id: sel.owner_id, requester_id: user.id, message: msg });
    if (error) { toast.error("Não foi possível enviar o pedido"); return; }
    toast.success("Pedido enviado!");
    qc.invalidateQueries({ queryKey: ["loans"] });
    window.open(waLink(sel.owner_whatsapp, `Olá ${sel.owner_name}! Vi seu jogo "${sel.title}" (${sel.platform}) no GameShare e gostaria de pegar emprestado. ${msg}`), "_blank");
    setSel(null);
    setMsg("");
  }

  return (
    <div>
      <h1 className="text-4xl">Na sua cidade</h1>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2">
        {[null, ...PLATFORMS].map((p) => (
          <button key={p ?? "all"} onClick={() => setPlatform(p)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm ${platform === p ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {p ?? "Todos"}
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="mt-10 text-center text-muted-foreground">Carregando…</p>
      ) : data.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">Nenhum jogo encontrado na sua cidade ainda. Convide amigos!</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4">
          {data.map((g) => (
            <button key={g.id} onClick={() => setSel(g)} className="text-left">
              <GameCover src={g.cover_url ? urls[g.cover_url] : undefined} title={g.title} />
              <p className="mt-2 line-clamp-1 font-semibold">{g.title}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{g.platform}</Badge>
                {!g.available && <span className="text-xs text-accent">Emprestado</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-w-sm">
          {sel && (
            <>
              <DialogHeader><DialogTitle className="font-display text-3xl">{sel.title}</DialogTitle></DialogHeader>
              <div className="flex gap-4">
                <div className="w-28 shrink-0"><GameCover src={sel.cover_url ? urls[sel.cover_url] : undefined} title={sel.title} /></div>
                <div className="space-y-1 text-sm">
                  <Badge>{sel.platform}</Badge>
                  {sel.genre && <p>Gênero: {sel.genre}</p>}
                  <p>Estado: {sel.condition}</p>
                  <p className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{sel.owner_name} · {sel.owner_neighborhood}</p>
                  <RatingBadge userId={sel.owner_id} />
                </div>
              </div>
              {sel.notes && <p className="text-sm text-muted-foreground">{sel.notes}</p>}
              {sel.available ? (
                <>
                  <Textarea placeholder="Mensagem (opcional): por quanto tempo, quando pode buscar…" value={msg} onChange={(e) => setMsg(e.target.value)} />
                  <Button onClick={request} className="w-full font-semibold"><MessageCircle />Pedir emprestado</Button>
                </>
              ) : (
                <p className="text-center text-sm text-accent">Este jogo está emprestado no momento.</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
