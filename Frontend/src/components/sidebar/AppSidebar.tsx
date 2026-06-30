import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  MessageCircle,
  Archive,
  Info
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";


import iipcLogo from "@/assets/iipc-logo.svg";

const mainNavItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Ask a Question", url: "/chat", icon: MessageCircle },
  { title: "Browse Materials", url: "/browse", icon: Archive },
  { title: "About IIPC", url: "/about", icon: Info },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className="border-r border-border/50 shadow-2xl backdrop-blur-xl bg-sidebar/95 supports-[backdrop-filter]:bg-sidebar/80">
      {/* Mobile overlay backdrop for better visibility */}
      <div className="absolute inset-0 bg-sidebar/90 backdrop-blur-xl lg:hidden"></div>
      
      <SidebarHeader className="relative z-10 p-6 border-b border-border/30 bg-gradient-to-r from-sidebar/95 to-primary/5 dark:to-primary/10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={iipcLogo} 
              alt="IIPC Logo" 
              className="w-12 h-12 object-contain drop-shadow-lg relative z-10"
            />
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-research-green/30 rounded-full blur-sm opacity-70"></div>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg text-foreground leading-tight">
                IIPC Assistant
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                Web Archiving Research
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="relative z-10 flex-1 overflow-y-auto bg-sidebar/90 backdrop-blur-sm">
        {/* Main Navigation */}
        <SidebarGroup className="px-3 py-6">
          <SidebarGroupLabel className="font-semibold text-sm mb-4 px-3 text-muted-foreground uppercase tracking-wide">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {mainNavItems.map((item) => {
                const IconComponent = item.icon;
                const active = isActive(item.url);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className="w-full h-auto p-0 hover:bg-transparent"
                    >
                      <NavLink
                        to={item.url}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-base backdrop-blur-sm
                          ${active 
                            ? 'bg-gradient-to-r from-primary to-research-green text-white shadow-lg transform md:scale-105 border border-primary/20' 
                            : 'text-foreground bg-sidebar-bg/70 hover:bg-gradient-to-r hover:from-primary/10 hover:to-research-green/10 hover:text-primary hover:scale-102 hover:shadow-md border border-transparent hover:border-primary/20'
                          }
                        `}
                      >
                        <IconComponent 
                          className={`w-5 h-5 ${active ? 'text-white' : 'text-primary'}`} 
                        />
                        {!collapsed && (
                          <span className="font-semibold">
                            {item.title}
                          </span>
                        )}
                        {active && !collapsed && (
                          <div className="ml-auto">
                            <div className="w-2 h-2 bg-white rounded-full opacity-80 shadow-sm"></div>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Stats Section (if not collapsed) */}
        {!collapsed && (
          <SidebarGroup className="px-3 pb-6">
            <div className="mx-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-research-green/10 border border-primary/20 backdrop-blur-sm bg-sidebar-bg/80 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary/20 to-research-green/20 flex items-center justify-center backdrop-blur-sm">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">AI Assistant</h3>
              </div>
              <div className="text-xs text-muted-foreground">
                Ready to help with your web archiving research questions
              </div>
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="relative z-10 p-4 border-t border-border/30 bg-gradient-to-r from-white/95 to-primary/5 dark:from-gray-900/95 dark:to-primary/10 backdrop-blur-sm">
        {!collapsed ? (
          <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-research-green/10 backdrop-blur-sm border border-primary/10 bg-sidebar-bg/80">
            <div className="text-xs text-muted-foreground font-medium text-center">
              IIPC Assistant v1.0
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-primary/70 rounded-full shadow-sm"></div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}