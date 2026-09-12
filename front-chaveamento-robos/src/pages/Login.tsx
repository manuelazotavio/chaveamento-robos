import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Swords } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  if (isAuthenticated) {
    const destino = (location.state as { from?: Location })?.from?.pathname ?? "/";
    return <Navigate to={destino} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !senha) {
      setErro("Informe email e senha.");
      return;
    }

    setErro(null);
    setEntrando(true);
    try {
      await login({ email: email.trim(), senha });
      const destino = (location.state as { from?: Location })?.from?.pathname ?? "/";
      navigate(destino, { replace: true });
    } catch {
      setErro("Email ou senha inválidos.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Swords className="h-6 w-6" />
          </div>
          <CardTitle>Chaveamento de Robôs</CardTitle>
          <CardDescription>Entre com sua conta para acessar o painel.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button type="submit" className="w-full" disabled={entrando}>
              {entrando ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Quer inscrever um time?{" "}
            <Link to="/cadastro-time" className="font-medium text-primary hover:underline">
              Cadastre aqui
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
