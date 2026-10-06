import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { waLink } from "@/lib/games";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewDialog, Stars } from "@/components/Reviews";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos de empréstimo — GameShare" }, { name: "description", content: "Pedidos recebidos e enviados." }] }),
  component: Pedidos,
});

const statusLabel: Record<string, string> = { pendente: "Pendente", aceito: "Aceito", recusado: "Recusado", devolvido: "Devolvido" };

function Pedidos() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("loan_requests").select("*, games(title, platform)").order("created_at", { ascending: false });
      if (error) throw error;
      const ids = [...new Set(data.flatMap((r) => [r.owner_id, r.requester_id]))];
      const { data: people } = await supabase.rpc("get_public_profiles", { _ids: ids });
      const map = Object.fromEntries((people ?? []).map((p) => [p.id, p]));
      const loanIds = data.filter((r) => r.status === "devolvido").map((r) => r.id);
      const { data: reviews } = loanIds.length
        ? await supabase.from("reviews").select("*").in("loan_id", loanIds)
        : { data: [] as { loan_id: string; reviewer_id: string; rating: number; comment: string }[] };
      return data.map((r) => ({
        ...r,
        other: map[r.owner_id === user.id ? r.requester_id : r.owner_id],
        myReview: reviews?.find((v) => v.loan_id === r.id && v.reviewer_id === user.id),
        theirReview: reviews?.find((v) => v.loan_id === r.id && v.reviewer_id !== user.id),
      }));
    },
  });
  type Loan = NonNullable<typeof data>[number];
  const [reviewing, setReviewing] = useState<Loan | null>(null);

  async function setStatus(r: { id: string; game_id: string }, status: string) {
    await supabase.from("loan_requests").update({ status }).eq("id", r.id);
    if (status === "aceito") await supabase.from("games").update({ available: false }).eq("id", r.game_id);
    if (status === "devolvido") await supabase.from("games").update({ available: true }).eq("id", r.game_id);
    qc.invalidateQueries();
  }

  const received = (data ?? []).filter((r) => r.owner_id === user.id);
  const sent = (data ?? []).filter((r) => r.requester_id === user.id);

  const List = ({ items, mine }: { items: typeof received; mine: boolean }) =>
    items.length === 0 ? (
      <p className="mt-10 text-center text-muted-foreground">Nenhum pedido.</p>
    ) : (
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{r.games?.title}</p>
                <p className="text-xs text-muted-foreground">{r.games?.platform} · {mine ? "de" : "para"} {r.other?.full_name} ({r.other?.neighborhood})</p>
              </div>
              <Badge variant={r.status === "pendente" ? "default" : "secondary"}>{statusLabel[r.status] ?? r.status}</Badge>
            </div>
            {r.message && <p className="mt-2 text-sm text-muted-foreground">“{r.message}”</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {mine && r.status === "pendente" && (
                <>
                  <Button size="sm" onClick={() => setStatus(r, "aceito")}>Aceitar</Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus(r, "recusado")}>Recusar</Button>
                </>
              )}
              {mine && r.status === "aceito" && <Button size="sm" variant="outline" onClick={() => setStatus(r, "devolvido")}>Marcar devolvido</Button>}
              {r.status === "devolvido" && (r.myReview ? (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">Você avaliou <Stars value={r.myReview.rating} /></span>
              ) : (
                <Button size="sm" onClick={() => setReviewing(r)}><Star />Avaliar</Button>
              ))}
              {r.other?.whatsapp && (
                <Button size="sm" variant="secondary" asChild>
                  <a href={waLink(r.other.whatsapp, `Olá ${r.other.full_name}, sobre o jogo "${r.games?.title}" no GameShare…`)} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a>
                </Button>
              )}
            </div>
            {r.theirReview && (
              <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">{r.other?.full_name} avaliou você <Stars value={r.theirReview.rating} /></div>
                {r.theirReview.comment && <p className="mt-1">“{r.theirReview.comment}”</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    );

  return (
    <div>
      <h1 className="text-4xl">Pedidos</h1>
      <Tabs defaultValue="recebidos" className="mt-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recebidos">Recebidos ({received.length})</TabsTrigger>
          <TabsTrigger value="enviados">Enviados ({sent.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="recebidos"><List items={received} mine /></TabsContent>
        <TabsContent value="enviados"><List items={sent} mine={false} /></TabsContent>
      </Tabs>
      {reviewing && (
        <ReviewDialog open onOpenChange={(o) => !o && setReviewing(null)} loanId={reviewing.id} reviewerId={user.id}
          revieweeId={reviewing.owner_id === user.id ? reviewing.requester_id : reviewing.owner_id}
          revieweeName={reviewing.other?.full_name ?? "usuário"} onSaved={() => qc.invalidateQueries()} />
      )}
    </div>
  );
}
