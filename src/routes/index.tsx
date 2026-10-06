import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2, MapPin, Camera, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GameShare — empreste jogos na sua cidade" },
      { name: "description", content: "Cadastre sua coleção de jogos físicos e pegue emprestado com vizinhos da sua cidade." },
      { property: "og:title", content: "GameShare — empreste jogos na sua cidade" },
      { property: "og:description", content: "Cadastre sua coleção de jogos físicos e pegue emprestado com vizinhos da sua cidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const items = [
    { icon: Camera, t: "Fotografe a capa", d: "Monte sua biblioteca em segundos." },
    { icon: MapPin, t: "Só da sua cidade", d: "Veja jogos de quem mora perto." },
    { icon: MessageCircle, t: "Combine no WhatsApp", d: "Peça emprestado e converse direto." },
  ];
  return (
    <main className="bg-grid min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex items-center gap-2 text-primary">
          <Gamepad2 className="h-7 w-7" />
          <span className="font-display text-2xl tracking-wider">GameShare</span>
        </div>
        <h1 className="mt-16 text-6xl leading-[0.9]">
          Seus jogos <span className="text-primary">parados</span> na estante viram diversão na cidade.
        </h1>
        <p className="mt-4 text-muted-foreground">PS3, PS4, PS5, Xbox, Switch — empreste e pegue emprestado mídias físicas com vizinhos.</p>
        <ul className="mt-10 space-y-4">
          {items.map(({ icon: I, t, d }) => (
            <li key={t} className="flex gap-4 rounded-xl border bg-card p-4">
              <I className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-auto space-y-3 pt-10">
          <Button asChild size="lg" className="w-full font-semibold shadow-glow">
            <Link to="/auth" search={{ modo: "cadastro" }}>Criar conta</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link to="/auth" search={{ modo: "entrar" }}>Já tenho conta</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
