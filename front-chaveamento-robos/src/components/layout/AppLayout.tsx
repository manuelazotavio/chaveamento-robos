import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { AppSidebar } from "./AppSidebar";

const pageNames: Record<string, string> = {
  "": "Chaveamento",
  times: "Times",
  torneios: "Torneios",
};

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const segment = location.pathname.split("/").filter(Boolean)[0] ?? "";
  const currentPage = pageNames[segment] ?? segment;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0 flex-1">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentPage}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {user && (
              <div className="flex items-center gap-3">
                <span className="hidden truncate text-sm text-muted-foreground sm:inline">{user.email}</span>
                <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <Outlet />
        </div>

        <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} Instituto Federal de São Paulo · Chaveamento de Robôs
        </footer>
      </main>
    </div>
  );
}
