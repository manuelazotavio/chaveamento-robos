import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { AppSidebar } from "./AppSidebar";

const pageNames: Record<string, string> = {
  "": "Times",
  torneios: "Torneios",
};

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const segment = location.pathname.split("/").filter(Boolean)[0] ?? "";
  const currentPage = pageNames[segment] ?? segment;

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

            <span className="hidden shrink-0 text-xs font-medium text-muted-foreground sm:block">
              Instituto Federal de São Paulo
            </span>
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
