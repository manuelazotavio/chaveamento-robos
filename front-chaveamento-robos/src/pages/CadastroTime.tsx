import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Swords } from "lucide-react";
import { TimeCadastroForm } from "@/components/TimeCadastroForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CadastroTime() {
  const [enviado, setEnviado] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Swords className="h-6 w-6" />
          </div>
          <CardTitle>Inscrição de time</CardTitle>
          <CardDescription>
            Cadastre sua equipe para o torneio de Chaveamento de Robôs. Após o envio, um dos organizadores do evento irão
            avaliar e aprova a inscrição.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enviado ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <div className="space-y-1">
                <p className="font-medium">Time enviado para aprovação!</p>
                <p className="text-sm text-muted-foreground">
                  Aguarde um dos organizadores revisar o cadastro. Você pode inscrever outro time se quiser.
                </p>
              </div>
              <Button variant="outline" onClick={() => setEnviado(false)}>
                Cadastrar outro time
              </Button>
            </div>
          ) : (
            <TimeCadastroForm submitLabel="Enviar para aprovação" onSuccess={() => setEnviado(true)} />
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            É administrador?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Entrar no painel
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
