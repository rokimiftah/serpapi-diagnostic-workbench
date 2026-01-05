import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router";

import { Dashboard } from "./pages/Dashboard";
import { Monitoring } from "./pages/Monitoring";

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-dvh bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <div className="flex flex-col items-center gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-4">
            {/* Logo / Title */}
            <div className="text-center sm:text-left">
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl md:text-2xl">SerpApi Diagnostic Workbench</h1>
              <p className="mt-0.5 text-xs text-gray-500">Internal tool for CS Engineers</p>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex gap-2">
              <Link
                to="/"
                className="group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm [&.active]:bg-blue-600 [&.active]:text-white [&.active]:shadow-md [&:not(.active)]:bg-gray-100 [&:not(.active)]:text-gray-700 [&:not(.active)]:hover:bg-gray-200"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span>Diagnostics</span>
              </Link>
              <Link
                to="/monitoring"
                className="group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm [&.active]:bg-blue-600 [&.active]:text-white [&.active]:shadow-md [&:not(.active)]:bg-gray-100 [&:not(.active)]:text-gray-700 [&:not(.active)]:hover:bg-gray-200"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span>Monitoring</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <Outlet />
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const monitoringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/monitoring",
  component: Monitoring,
});

const routeTree = rootRoute.addChildren([indexRoute, monitoringRoute]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
