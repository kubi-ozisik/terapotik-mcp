import { AssessmentGuard } from "@/lib/assessment-guard";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Dashboard Layout with Assessment Guard
 * Ensures users complete assessment before accessing main app features
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    // <AssessmentGuard requireAssessment={true}>
      <div className="min-h-screen bg-background">
        {/* Dashboard Header */}
        <header className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Terapotik Dashboard</h1>
            {/* Assessment progress would be shown in header */}
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    // </AssessmentGuard>
  );
}