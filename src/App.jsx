import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Contexts
import { AuthProvider, useAuth } from './context/AuthContext';
import { PasswordProvider } from './context/PasswordContext';
import { ViewProvider, useView } from './context/ViewContext';
import { ThemeProvider } from './context/ThemeContext';
import { UsageProvider } from './context/UsageContext';
import { InventoryProvider } from './context/InventoryContext';
import { NotesProvider } from './context/NotesContext';
import { GroupProvider } from './context/GroupContext';
import { ShareProvider } from './context/ShareContext';
import { ConfigProvider } from './context/ConfigContext';
import { AlertsProvider } from './context/AlertsContext';
import { VaultSecurityProvider, useVaultSecurity } from './context/VaultSecurityContext';

// Components
import Sidebar from './components/layout/Sidebar';
import CommandPalette from './components/common/CommandPalette';
import ErrorBoundary from './components/common/ErrorBoundary';

// Hooks
import { useAutoLogout } from './hooks/useAutoLogout';
import { useHotkeys } from 'react-hotkeys-hook';

// Pages
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import SharedWithMe from './pages/SharedWithMe';
import SecurityDashboard from './pages/SecurityDashboard';
import AuditLog from './pages/AuditLog';
import UsageStatistics from './pages/UsageStatistics';
import NotesPage from './pages/NotesPage';
import TrashPage from './pages/TrashPage';
import GroupsPage from './pages/GroupsPage';
import SharePage from './pages/SharePage';
import Sessions from './pages/Sessions';
import Inbox from './pages/Inbox';
import VaultAccess from './pages/VaultAccess';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { isVaultReady } = useVaultSecurity();
  const { currentView } = useView();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Auto-logout handling (configurable in settings)
  useAutoLogout();

  // Global hotkey for Command Palette
  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    setIsPaletteOpen(prev => !prev);
  }, { enableOnFormTags: true });

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!isVaultReady) {
    return <VaultAccess />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'inbox':
        return <Inbox />;
      case 'settings':
        return <Settings />;
      case 'shared':
        return <SharedWithMe />;
      case 'security':
        return <SecurityDashboard />;
      case 'audit':
        return <AuditLog />;
      case 'notes':
        return <NotesPage />;
      case 'trash':
        return <TrashPage />;
      case 'groups':
        return <GroupsPage />;
      case 'usage':
        return <UsageStatistics />;
      case 'sessions':
        return <Sessions />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Sidebar />

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
      />
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/share/:id" element={<SharePage />} />
      <Route
        path="/*"
        element={isAuthenticated ? <AppContent /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}

function App() {
  return (
    <UsageProvider>
      <AuthProvider>
        <VaultSecurityProvider>
          <ThemeProvider>
            <ViewProvider>
              <InventoryProvider>
                <PasswordProvider>
                  <GroupProvider>
                    <NotesProvider>
                      <ShareProvider>
                        <ConfigProvider>
                          <AlertsProvider>
                            <Toaster
                              position="top-right"
                              toastOptions={{
                                success: {
                                  duration: 3000,
                                  style: {
                                    background: '#10b981',
                                    color: '#fff',
                                  },
                                },
                                error: {
                                  duration: 4000,
                                  style: {
                                    background: '#ef4444',
                                    color: '#fff',
                                  },
                                },
                              }}
                            />
                            <BrowserRouter>
                              <ErrorBoundary>
                                <AppRoutes />
                              </ErrorBoundary>
                            </BrowserRouter>
                          </AlertsProvider>
                        </ConfigProvider>
                      </ShareProvider>
                    </NotesProvider>
                  </GroupProvider>
                </PasswordProvider>
              </InventoryProvider>
            </ViewProvider>
          </ThemeProvider>
        </VaultSecurityProvider>
      </AuthProvider>
    </UsageProvider>
  );
}

export default App;
