import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";

import "./i18n";
import { Box, CircularProgress } from "@mui/material";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ColorModeProvider } from "./hooks/useColorMode";

// Lazy-load every page — code-split so the initial bundle is minimal
// This directly improves Lighthouse "Reduce unused JavaScript" score
const CreateQuotePage = lazy(() => import("./pages/CreateQuotePage"));
const CustomersPage   = lazy(() => import("./pages/CustomersPage"));
const DashboardPage   = lazy(() => import("./pages/DashboardPage"));
const InstallPage     = lazy(() => import("./pages/InstallPage"));
const InvoicesPage    = lazy(() => import("./pages/InvoicesPage"));
const LoginPage       = lazy(() => import("./pages/LoginPage"));
const QuotesPage      = lazy(() => import("./pages/QuotesPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function PageFallback() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
      <CircularProgress size={32} />
    </Box>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login"   element={<LoginPage />} />
        <Route path="/install" element={<InstallPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/"           element={<DashboardPage />} />
          <Route path="/customers"  element={<CustomersPage />} />
          <Route path="/quotes"     element={<QuotesPage />} />
          <Route path="/quotes/new" element={<CreateQuotePage />} />
          <Route path="/invoices"   element={<InvoicesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ColorModeProvider>
    </QueryClientProvider>
  );
}
