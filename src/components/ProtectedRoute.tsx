import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="bg-card rounded-xl p-8 shadow-card border border-border text-center space-y-4 max-w-md">
          <h2 className="text-xl font-display font-bold text-destructive">Access Denied</h2>
          <p className="text-muted-foreground">
            Your account does not have admin privileges. Please contact the system administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
