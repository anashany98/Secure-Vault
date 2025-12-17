import { AuthProvider, useAuth } from './context/AuthContext';
import { PasswordProvider } from './context/PasswordContext';
import { ViewProvider, useView } from './context/ViewContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import SharedWithMe from './pages/SharedWithMe';
import SecurityDashboard from './pages/SecurityDashboard';
import AuditLog from './pages/AuditLog'; // New import
import UsageStatistics from './pages/UsageStatistics'; // New import
import CommandPalette from './components/common/CommandPalette';
import ErrorBoundary from './components/common/ErrorBoundary';

import { InventoryProvider } from './context/InventoryContext';
import { FolderProvider } from './context/FolderContext'; // New import
import { UsageProvider } from './context/UsageContext'; // New import

import { useAutoLogout } from './hooks/useAutoLogout';
import { useHotkeys } from 'react-hotkeys-hook'; // New import

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { currentView } = useView();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Auto-logout handling (configurable in settings)
  useAutoLogout();

  // Command Palette hotkey (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return <Login />;
  }

  if (currentView === 'inventory') {
    return (
      <>
        <Inventory />
        <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      </>
    );
  }

  if (currentView === 'settings') {
    return (
      <>
        <Settings />
        <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      </>
    );
  }

  if (currentView === 'security') {
    return (
      <>
        <SecurityDashboard />
        <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      </>
    );
  }

  if (currentView === 'shared') {
    return (
      <>
        <SharedWithMe />
        <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      </>
    );
  }

  if (currentView === 'audit') {
    return (
      <>
        <AuditLog />
        <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      </>
    );
  }

  if (currentView === 'usage') {
    return (
      <>
        <UsageStatistics />
        <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Dashboard />
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </>
  );
}

function App() {
  return (
    <UsageProvider>
      <AuthProvider>
        <ThemeProvider>
          <ViewProvider>
            <PasswordProvider>
              <FolderProvider>
                <InventoryProvider>
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
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                </InventoryProvider>
              </FolderProvider>
            </PasswordProvider>
          </ViewProvider>
        </ThemeProvider>
      </AuthProvider>
    </UsageProvider>
  );
}
export default App;
