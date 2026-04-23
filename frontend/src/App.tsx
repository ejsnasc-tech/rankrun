import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/public/HomePage";
import { EventsPage } from "./pages/public/EventsPage";
import { EventDetailsPage } from "./pages/public/EventDetailsPage";
import { LoginPage } from "./pages/public/LoginPage";
import { RegisterPage } from "./pages/public/RegisterPage";
import { MyRacesPage } from "./pages/runner/MyRacesPage";
import { RunnerResultPage } from "./pages/runner/RunnerResultPage";
import { ProfilePage } from "./pages/runner/ProfilePage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminEventsPage } from "./pages/admin/AdminEventsPage";
import { AdminEventDetailPage } from "./pages/admin/AdminEventDetailPage";
import { AdminLivePanelPage } from "./pages/admin/AdminLivePanelPage";
import { AdminBibsPage } from "./pages/admin/AdminBibsPage";
import { AdminReportsPage } from "./pages/admin/AdminReportsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/eventos" element={<EventsPage />} />
      <Route path="/eventos/:slug" element={<EventDetailsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />

      <Route
        path="/app/minhas-provas"
        element={
          <ProtectedRoute role="corredor">
            <MyRacesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/provas/:registrationId"
        element={
          <ProtectedRoute role="corredor">
            <RunnerResultPage />
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

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/eventos"
        element={
          <ProtectedRoute role="admin">
            <AdminEventsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/eventos/:id"
        element={
          <ProtectedRoute role="admin">
            <AdminEventDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/eventos/:id/painel-ao-vivo"
        element={
          <ProtectedRoute role="admin">
            <AdminLivePanelPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/eventos/:id/bibs"
        element={
          <ProtectedRoute role="admin">
            <AdminBibsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/relatorios"
        element={
          <ProtectedRoute role="admin">
            <AdminReportsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
