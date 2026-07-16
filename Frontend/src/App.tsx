import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "@/pages/HomePage";
import Chat from "@/pages/ChatPage";
import Browse from "@/pages/BrowsePage";
import About from "@/pages/AboutPage";
import NotFound from "@/pages/NotFound";

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
  <TooltipProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/chat" element={<MainLayout><Chat /></MainLayout>} />
          <Route path="/browse" element={<MainLayout><Browse /></MainLayout>} />
          <Route path="/about" element={<MainLayout><About /></MainLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
