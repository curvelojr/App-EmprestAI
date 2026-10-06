import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CONDITIONS, PLATFORMS, useCoverUrls } from "@/lib/games";
import { GameCover } from "@/components/GameCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({ meta: [{ title: "Minha biblioteca — GameShare" }, { name: "description", content: "Seus jogos cadastrados." }] }),
  component: Biblioteca,
});

function Biblioteca() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["my-games"],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const urls = useCoverUrls(data.map((g) => g.cover_url));

  async function toggle(id: string, available: boolean) {
    await supabase.from("games").update({ available }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-games"] });
  }
  async function remove(id: string, path: string | null) {
    if (!confirm("Remover este jogo?")) return;
    await supabase.from("games").delete().eq("id", id);
    if (path) await supabase.storage.from("game-covers").remove([path]);
    qc.invalidateQueries({ queryKey: ["my-games"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-4xl">Minha biblioteca</h1>
        <Button size="sm" onClick={() => setOpen(true)} className="font-semibold"><Plus />Jogo</Button>
      </div>
      {data.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          <p>Você ainda não cadastrou jogos.</p>
          <Button className="mt-4" onClick={() => setOpen(true)}><Camera />Fotografar primeira capa</Button>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((g) => (
            <li key={g.id} className="flex gap-3 rounded-xl border bg-card p-3">
              <div className="w-16 shrink-0"><GameCover src={g.cover_url ? urls[g.cover_url] : undefined} title={g.title} /></div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="line-clamp-1 font-semibold">{g.title}</p>
                <div className="mt-1 flex gap-2"><Badge variant="secondary">{g.platform}</Badge><span className="text-xs text-muted-foreground">{g.condition}</span></div>
                <label className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={g.available} onCheckedChange={(v) => toggle(g.id, v)} />
                  {g.available ? "Disponível" : "Emprestado"}
                </label>
              </div>
              <button onClick={() => remove(g.id, g.cover_url)} aria-label="Remover" className="self-start text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <AddGame open={open} onOpenChange={setOpen} userId={user.id} onSaved={() => qc.invalidateQueries({ queryKey: ["my-games"] })} />
    </div>
  );
}

function AddGame({ open, onOpenChange, userId, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; userId: string; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("PS4");
  const [genre, setGenre] = useState("");
  const [condition, setCondition] = useState("Bom");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function pick(f?: File) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save() {
    if (!title.trim()) { toast.error("Informe o nome do jogo"); return; }
    if (!file) { toast.error("Tire uma foto da capa"); return; }
    setSaving(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("game-covers").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("games").insert({ owner_id: userId, title: title.trim(), platform, genre, condition, notes, cover_url: path });
      if (error) throw error;
      toast.success("Jogo adicionado!");
      onSaved();
      onOpenChange(false);
      setFile(null); setPreview(undefined); setTitle(""); setGenre(""); setNotes("");
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-3xl">Novo jogo</DialogTitle></DialogHeader>
        <label className="mx-auto block w-40 cursor-pointer">
          {preview ? (
            <img src={preview} alt="Prévia da capa" className="aspect-[3/4] w-full rounded-lg object-cover" />
          ) : (
            <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/50 text-sm text-primary">
              <Camera className="h-8 w-8" />Foto da capa
            </div>
          )}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome do jogo</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Plataforma</Label>
              <Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Estado</Label>
              <Select value={condition} onValueChange={setCondition}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Gênero</Label><Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Ação, Esporte, RPG…" /></div>
          <div className="space-y-1.5"><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: com manual, disco sem riscos" /></div>
          <Button onClick={save} disabled={saving} className="w-full font-semibold">{saving && <Loader2 className="animate-spin" />}Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
