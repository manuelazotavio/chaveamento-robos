import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="text-sm font-semibold text-primary">Erro 404</p>
      <h1 className="text-3xl font-bold tracking-tight">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Button asChild>
        <Link to="/">Voltar</Link>
      </Button>
    </div>
  );
}
