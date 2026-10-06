import { Gamepad2 } from "lucide-react";

export function GameCover({ src, title }: { src?: string | undefined; title: string }) {
  return (
    <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
      {src ? (
        <img src={src} alt={`Capa de ${title}`} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <Gamepad2 className="h-10 w-10" />
        </div>
      )}
    </div>
  );
}
