import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function Stars({ value, onChange, size = "h-4 w-4" }: { value: number; onChange?: (v: number) => void; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} estrelas`}
          className={onChange ? "cursor-pointer" : "cursor-default"}>
          <Star className={`${size} ${n <= Math.round(value) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

/** Average rating + count for a user */
export function useUserRating(userId: string | undefined) {
  return useQuery({
    queryKey: ["rating", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("rating").eq("reviewee_id", userId!);
      const list = data ?? [];
      return { avg: list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0, count: list.length };
    },
  });
}

export function RatingBadge({ userId }: { userId: string }) {
  const { data } = useUserRating(userId);
  if (!data) return null;
  if (!data.count) return <span className="text-xs text-muted-foreground">Sem avaliações</span>;
  return (
    <span className="flex items-center gap-1 text-xs">
      <Star className="h-3 w-3 fill-primary text-primary" />
      {data.avg.toFixed(1)} <span className="text-muted-foreground">({data.count})</span>
    </span>
  );
}

export function ReviewDialog({ open, onOpenChange, loanId, reviewerId, revieweeId, revieweeName, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; loanId: string; reviewerId: string; revieweeId: string; revieweeName: string; onSaved: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!rating) { toast.error("Escolha uma nota"); return; }
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({ loan_id: loanId, reviewer_id: reviewerId, reviewee_id: revieweeId, rating, comment: comment.trim().slice(0, 500) });
    setSaving(false);
    if (error) { toast.error("Não foi possível enviar a avaliação"); return; }
    toast.success("Avaliação enviada!");
    setRating(0); setComment("");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display text-3xl">Avaliar {revieweeName}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Como foi a experiência com este empréstimo?</p>
        <div className="flex justify-center py-2"><Stars value={rating} onChange={setRating} size="h-9 w-9" /></div>
        <Textarea placeholder="Comentário (opcional)" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
        <Button onClick={save} disabled={saving} className="w-full font-semibold">{saving && <Loader2 className="animate-spin" />}Enviar avaliação</Button>
      </DialogContent>
    </Dialog>
  );
}
