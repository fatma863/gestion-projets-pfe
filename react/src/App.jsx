import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, GuestRoute, RoleRoute, RoleRedirect } from './routes/guards';
import { usePermission } from './hooks/usePermission';
import AppLayout from './components/layout/AppLayout';
import AdminLayout from './components/layout/AdminLayout';
import ManagerLayout from './components/layout/ManagerLayout';
import LandingPage from './pages/landing/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/errors/UnauthorizedPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UsersPage from './pages/admin/UsersPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
import AdminProjectDetailPage from './pages/admin/AdminProjectDetailPage';
import AdminTeamsPage from './pages/admin/AdminTeamsPage';
import AdminAiPage from './pages/admin/AdminAiPage';

// Manager pages
import ManagerDashboardPage from './pages/manager/ManagerDashboardPage';
import ManagerProjectsPage from './pages/manager/ManagerProjectsPage';
import ManagerProjectDetailPage from './pages/manager/ManagerProjectDetailPage';
import ManagerTeamsPage from './pages/manager/ManagerTeamsPage';
import ManagerTeamDetailPage from './pages/manager/ManagerTeamDetailPage';
import ManagerAiPage from './pages/manager/ManagerAiPage';
import ManagerGanttPage from './pages/manager/ManagerGanttPage';
import ManagerNotificationsPage from './pages/manager/ManagerNotificationsPage';
import ManagerSettingsPage from './pages/manager/ManagerSettingsPage';

// Member (app) pages
import MemberDashboardPage from './pages/app/MemberDashboardPage';
import MemberProjectsPage from './pages/app/MemberProjectsPage';
import MemberProjectDetailPage from './pages/app/MemberProjectDetailPage';
import MemberTeamsPage from './pages/app/MemberTeamsPage';
import MemberTeamDetailPage from './pages/app/MemberTeamDetailPage';
import MemberAiPage from './pages/app/MemberAiPage';
import MemberGanttPage from './pages/app/MemberGanttPage';
import MemberNotificationsPage from './pages/app/MemberNotificationsPage';
import MemberSettingsPage from './pages/app/MemberSettingsPage';

// Viewer (app) pages
import ViewerDashboardPage from './pages/app/ViewerDashboardPage';
import ViewerProjectsPage from './pages/app/ViewerProjectsPage';
import ViewerProjectDetailPage from './pages/app/ViewerProjectDetailPage';

// Shared pages (role-agnostic)
import MyTasksPage from './pages/tasks/MyTasksPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import GanttPage from './pages/gantt/GanttPage';

/**
 * Renders member or viewer version of a page based on user role.
 * For pages that have a viewer-specific version, renders that for viewers.
 * Falls back to the member version otherwise.
 */
function AppPage({ memberPage, viewerPage }) {
  const { isViewer } = usePermission();
  return isViewer && viewerPage ? viewerPage : memberPage;
}

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
            {/* Landing */}
            <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />

            {/* Guest routes */}
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

            {/* Redirection selon le rôle */}
            <Route path="/dashboard" element={<RoleRedirect />} />

            {/* Unauthorized */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* ═══════════ ESPACE ADMIN ═══════════ */}
            <Route element={<RoleRoute roles={['admin']}><AdminLayout /></RoleRoute>}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/my-tasks" element={<MyTasksPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/projects" element={<AdminProjectsPage />} />
              <Route path="/admin/projects/:id" element={<AdminProjectDetailPage />} />
              <Route path="/admin/teams" element={<AdminTeamsPage />} />
              <Route path="/admin/ai" element={<AdminAiPage />} />
              <Route path="/admin/gantt" element={<GanttPage />} />
              <Route path="/admin/notifications" element={<NotificationsPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>

            {/* ═══════════ ESPACE MANAGER ═══════════ */}
            <Route element={<RoleRoute roles={['admin', 'manager']}><ManagerLayout /></RoleRoute>}>
              <Route path="/manager/dashboard" element={<ManagerDashboardPage />} />
              <Route path="/manager/my-tasks" element={<MyTasksPage />} />
              <Route path="/manager/projects" element={<ManagerProjectsPage />} />
              <Route path="/manager/projects/:id" element={<ManagerProjectDetailPage />} />
              <Route path="/manager/teams" element={<ManagerTeamsPage />} />
              <Route path="/manager/teams/:id" element={<ManagerTeamDetailPage />} />
              <Route path="/manager/ai" element={<ManagerAiPage />} />
              <Route path="/manager/gantt" element={<ManagerGanttPage />} />
              <Route path="/manager/notifications" element={<ManagerNotificationsPage />} />
              <Route path="/manager/settings" element={<ManagerSettingsPage />} />
            </Route>

            {/* ═══════════ ESPACE MEMBRE / VIEWER ═══════════ */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/app/dashboard" element={<AppPage memberPage={<MemberDashboardPage />} viewerPage={<ViewerDashboardPage />} />} />
              <Route path="/app/my-tasks" element={<MyTasksPage />} />
              <Route path="/app/projects" element={<AppPage memberPage={<MemberProjectsPage />} viewerPage={<ViewerProjectsPage />} />} />
              <Route path="/app/projects/:id" element={<AppPage memberPage={<MemberProjectDetailPage />} viewerPage={<ViewerProjectDetailPage />} />} />
              <Route path="/app/teams" element={<MemberTeamsPage />} />
              <Route path="/app/teams/:id" element={<MemberTeamDetailPage />} />
              <Route path="/app/ai" element={<MemberAiPage />} />
              <Route path="/app/gantt" element={<AppPage memberPage={<MemberGanttPage />} viewerPage={<MemberGanttPage />} />} />
              <Route path="/app/notifications" element={<AppPage memberPage={<MemberNotificationsPage />} viewerPage={<MemberNotificationsPage />} />} />
              <Route path="/app/settings" element={<AppPage memberPage={<MemberSettingsPage />} viewerPage={<MemberSettingsPage />} />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
