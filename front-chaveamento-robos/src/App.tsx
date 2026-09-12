import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "@/pages/Login";
import CadastroTime from "@/pages/CadastroTime";
import Chaveamento from "@/pages/Chaveamento";
import Times from "@/pages/Times";
import Torneios from "@/pages/Torneios";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="cadastro-time" element={<CadastroTime />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Chaveamento />} />
          <Route path="times" element={<Times />} />
          <Route path="torneios" element={<Torneios />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
