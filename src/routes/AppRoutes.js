import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import MainLayout from '../layouts/MainLayout/MainLayout';
import { useAuth } from '../context/AuthContext';

// Auth
import LoginPage from '../pages/auth/LoginPage';

// Dashboards
import SuperAdminDashboard    from '../pages/dashboards/superadmin/SuperAdminDashboard';
import BranchManagerDashboard from '../pages/dashboards/branchmanager/BranchManagerDashboard';
import AdvisorDashboard       from '../pages/dashboards/advisor/AdvisorDashboard';
import MemberDashboard        from '../pages/dashboards/member/MemberDashboard';

// All pages
import MembersPage       from '../pages/members/MembersPage';
import InvestmentsPage   from '../pages/investments/InvestmentsPage';
import ApprovalsPage     from '../pages/approvals/ApprovalsPage';
import ReportsPage       from '../pages/reports/ReportsPage';
import WalletPage        from '../pages/wallet/WalletPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import BranchesPage      from '../pages/branches/BranchesPage';
import AdvisersPage      from '../pages/branches/AdvisersPage';
import UsersPage         from '../pages/users/UsersPage';
import CommissionsPage   from '../pages/commissions/CommissionsPage';
import ProfilePage       from '../pages/profile/ProfilePage';
import SettingsPage      from '../pages/settings/SettingsPage';
import NotFound          from '../pages/errors/NotFound';

function DashboardRouter() {
  const { user } = useAuth();
  switch (user?.role) {
    case 'superadmin':    return <SuperAdminDashboard />;
    case 'branchmanager': return <BranchManagerDashboard />;
    case 'advisor':       return <AdvisorDashboard />;
    default:              return <MemberDashboard />;
  }
}

function Wrap({ children }) {
  return <PrivateRoute><MainLayout>{children}</MainLayout></PrivateRoute>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/"      element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard"       element={<Wrap><DashboardRouter /></Wrap>} />
      <Route path="/members/*"       element={<Wrap><MembersPage /></Wrap>} />
      <Route path="/investments/*"   element={<Wrap><InvestmentsPage /></Wrap>} />
      <Route path="/approvals"       element={<Wrap><ApprovalsPage /></Wrap>} />
      <Route path="/reports"         element={<Wrap><ReportsPage /></Wrap>} />
      <Route path="/wallet"          element={<Wrap><WalletPage /></Wrap>} />
      <Route path="/notifications"   element={<Wrap><NotificationsPage /></Wrap>} />
      <Route path="/branches"        element={<Wrap><BranchesPage /></Wrap>} />
      <Route path="/advisers"        element={<Wrap><AdvisersPage /></Wrap>} />
      <Route path="/users"           element={<Wrap><UsersPage /></Wrap>} />
      <Route path="/commissions"     element={<Wrap><CommissionsPage /></Wrap>} />
      <Route path="/profile"         element={<Wrap><ProfilePage /></Wrap>} />
      <Route path="/settings"        element={<Wrap><SettingsPage /></Wrap>} />
      <Route path="*"                element={<NotFound />} />
    </Routes>
  );
}
