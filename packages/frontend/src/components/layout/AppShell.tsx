import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.js";
import Header from "./Header.js";
import { ToastContainer } from "../ui/Toast.js";

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
