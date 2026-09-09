import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Chaveamento from "@/pages/Chaveamento";
import Times from "@/pages/Times";
import Torneios from "@/pages/Torneios";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Chaveamento />} />
        <Route path="times" element={<Times />} />
        <Route path="torneios" element={<Torneios />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
