import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addDays, formatDate } from "@/lib/deadlines";

const QUICK = [3, 7, 14, 30];

export function DueDateDialog({ open, onOpenChange, gameTitle, initial, confirmLabel, onConfirm }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  gameTitle: string;
  initial?: string | null;
  confirmLabel: string;
  onConfirm: (date: string) => Promise<void>;
}) {
  const [date, setDate] = useState(initial ?? addDays(7));
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!date) return;
    setSaving(true);
    await onConfirm(date);
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prazo de devolução</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Até quando {gameTitle} pode ficar emprestado?</p>
        <div className="grid grid-cols-4 gap-2">
          {QUICK.map((n) => (
            <Button key={n} type="button" size="sm" variant={date === addDays(n) ? "default" : "outline"} onClick={() => setDate(addDays(n))}>
              {n} dias
            </Button>
          ))}
        </div>
        <Input type="date" value={date} min={addDays(1)} onChange={(e) => setDate(e.target.value)} />
        {date && <p className="text-xs text-muted-foreground">Devolução combinada: {formatDate(date)}. Os dois recebem lembrete no app.</p>}
        <Button onClick={confirm} disabled={saving || !date}>
          {saving && <Loader2 className="animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
