import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import FeedPage from "./pages/Feed";

import AdminSpaces from "./pages/admin/Spaces";
import AdminBookings from "./pages/admin/Bookings";
import AdminUsers from "./pages/admin/Users";
import AdminReports from "./pages/admin/Reports";
import UserSpaces from "./pages/user/Spaces";
import UserMyBookings from "./pages/user/MyBookings";
import Settings from "./pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Re-fetch on window focus only in production
      refetchOnWindowFocus: import.meta.env.PROD,
      // Retry once on failure (avoids hammering a down API)
      retry: 1,
      // Consider data stale after 60s by default; override per-query
      staleTime: 60_000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected — any authenticated user */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/spaces" element={
              <ProtectedRoute>
                <UserSpaces />
              </ProtectedRoute>
            } />
            <Route path="/my-bookings" element={
              <ProtectedRoute>
                <UserMyBookings />
              </ProtectedRoute>
            } />
            <Route path="/feed" element={
              <ProtectedRoute>
                <FeedPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />

            {/* Protected — ADMIN only */}
            <Route path="/admin/spaces" element={
              <ProtectedRoute requireAdmin>
                <AdminSpaces />
              </ProtectedRoute>
            } />
            <Route path="/admin/bookings" element={
              <ProtectedRoute requireAdmin>
                <AdminBookings />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute requireAdmin>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute requireAdmin>
                <AdminReports />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
