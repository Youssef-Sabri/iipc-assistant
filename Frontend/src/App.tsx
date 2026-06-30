import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import Browse from "./pages/Browse";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1">
          <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur-sm sticky top-0 z-30">
            <SidebarTrigger className="ml-4" />
          </header>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/chat" element={<MainLayout><Chat /></MainLayout>} />
          <Route path="/browse" element={<MainLayout><Browse /></MainLayout>} />
          <Route path="/about" element={<MainLayout><About /></MainLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;