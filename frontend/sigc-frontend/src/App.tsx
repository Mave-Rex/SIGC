import { Routes, Route, Navigate } from "react-router-dom";
import RegistroPage from "./pages/Registro";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/registro" replace />} />
      <Route path="/registro" element={<RegistroPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}
