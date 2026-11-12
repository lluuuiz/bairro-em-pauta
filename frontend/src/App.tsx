import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Agenda from "./pages/Agenda";
import Avisos from "./pages/Avisos";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MapPage from "./pages/MapPage";
import NewReport from "./pages/NewReport";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="mapa" element={<MapPage />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="relatos" element={<Reports />} />
        <Route path="avisos" element={<Avisos />} />
      </Route>
      <Route path="/relatos/novo" element={<NewReport />} />
      <Route path="/entrar" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
