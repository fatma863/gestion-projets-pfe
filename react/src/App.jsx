import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, GuestRoute } from './routes/guards';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Guest routes */}
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<Placeholder title="Projets" />} />
              <Route path="/teams" element={<Placeholder title="Équipes" />} />
              <Route path="/gantt" element={<Placeholder title="Diagramme de Gantt" />} />
              <Route path="/ai" element={<Placeholder title="IA & Analytics" />} />
              <Route path="/notifications" element={<Placeholder title="Notifications" />} />
              <Route path="/settings" element={<Placeholder title="Paramètres" />} />
            </Route>

            {/* Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function Placeholder({ title }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-muted-foreground">Cette page sera implémentée dans l'étape suivante.</p>
      </div>
    </div>
  );
}

export default App;
