import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/public/HomePage";
import { EventsPage } from "./pages/public/EventsPage";
import { EventDetailsPage } from "./pages/public/EventDetailsPage";
import { LoginPage } from "./pages/public/LoginPage";
import { RegisterPage } from "./pages/public/RegisterPage";
import { AthleteProfilePage } from "./pages/public/AthleteProfilePage";
import { AthletesPage } from "./pages/public/AthletesPage";
import { ProfilePage } from "./pages/runner/ProfilePage";
import { DashboardPage } from "./pages/runner/DashboardPage";
import { ResultsPage } from "./pages/runner/ResultsPage";
import { NewResultPage } from "./pages/runner/NewResultPage";
import { WorkoutsPage } from "./pages/runner/WorkoutsPage";

function App() {
  return (
    <Routes>
      {/* Área pública */}
      <Route path="/" element={<HomePage />} />
      <Route path="/eventos" element={<EventsPage />} />
      <Route path="/eventos/:slug" element={<EventDetailsPage />} />
      <Route path="/atleta/:slug" element={<AthleteProfilePage />} />
      <Route path="/atletas" element={<AthletesPage />} />

      {/* Área do corredor */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute role="corredor">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/resultados"
        element={
          <ProtectedRoute role="corredor">
            <ResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/resultados/novo"
        element={
          <ProtectedRoute role="corredor">
            <NewResultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/treinos"
        element={
          <ProtectedRoute role="corredor">
            <WorkoutsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/perfil"
        element={
          <ProtectedRoute role="corredor">
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
