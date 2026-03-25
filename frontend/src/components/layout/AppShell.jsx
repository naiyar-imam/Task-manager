import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const titles = {
  "/dashboard": "Dashboard",
  "/tasks": "My Tasks",
  "/calendar": "Calendar",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

export default function AppShell() {
  const location = useLocation();
  const title = titles[location.pathname] || "Dashboard";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute left-[-120px] top-20 h-72 w-72 rounded-full bg-black/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-[-140px] h-80 w-80 rounded-full bg-black/5 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-dashboard-grid bg-[size:160px_160px] opacity-30" />

      <div className="relative mx-auto flex min-h-screen max-w-[1800px] flex-col lg:flex-row">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar title={title} />
          <main className="flex-1 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1450px] animate-fade-up">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
