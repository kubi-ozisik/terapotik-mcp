"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
// import { AssessmentState } from "@/features/agentic-chat-module/types/plugin-types";

interface AssessmentGuardProps {
  children: React.ReactNode;
  requireAssessment?: boolean; // Whether this component requires completed assessment
}

/**
 * Assessment Guard Component
 * Checks if user has completed assessment and redirects if needed
 */
export function AssessmentGuard({ children, requireAssessment = false }: AssessmentGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  // const [assessmentState, setAssessmentState] = useState<AssessmentState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    checkAssessmentStatus();
  }, [pathname]);

  const checkAssessmentStatus = async () => {
    try {
      setIsLoading(true);

      // Skip assessment check for certain routes
      const exemptRoutes = [
        "/assessment",
        "/auth",
        "/onboarding",
        "/api",
        "/_next",
      ];

      // const isExemptRoute = exemptRoutes.some(route => pathname.startsWith(route));
      // if (isExemptRoute) {
      //   setIsLoading(false);
      //   return;
      // }

      // // Fetch user's assessment state
      // const response = await fetch("/api/assessment/state");
      
      // if (response.ok) {
      //   const state: AssessmentState = await response.json();
      //   setAssessmentState(state);

      //   // Check if assessment is required and not complete
      //   const needsAssessment = requireAssessment && !state.isComplete;
      //   const isFirstTimeUser = !state.isComplete && state.completedPhases.length === 0;

      //   // Redirect logic
      //   if (needsAssessment || isFirstTimeUser) {
      //     setShouldRedirect(true);
      //     router.replace("/assessment");
      //     return;
      //   }
      // } else if (response.status === 401) {
      //   // User not authenticated - let auth handle this
      //   setIsLoading(false);
      //   return;
      // } else {
      //   console.error("Failed to fetch assessment state");
      //   // Don't block the user if API fails
      // }

      setIsLoading(false);
    } catch (error) {
      console.error("Assessment guard error:", error);
      setIsLoading(false);
    }
  };

  // Show loading state while checking assessment
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Checking your profile...</p>
        </div>
      </div>
    );
  }

  // Don't render children if redirecting
  if (shouldRedirect) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Setting up your assessment...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// /**
//  * Hook to get current assessment state
//  */
// export function useAssessmentState() {
//   const [assessmentState, setAssessmentState] = useState<AssessmentState | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     fetchAssessmentState();
//   }, []);

//   const fetchAssessmentState = async () => {
//     try {
//       setIsLoading(true);
//       setError(null);

//       const response = await fetch("/api/assessment/state");
      
//       if (response.ok) {
//         const state: AssessmentState = await response.json();
//         setAssessmentState(state);
//       } else {
//         setError("Failed to fetch assessment state");
//       }
//     } catch (err) {
//       setError("Network error");
//       console.error("Error fetching assessment state:", err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const refreshAssessmentState = () => {
//     fetchAssessmentState();
//   };

//   return {
//     assessmentState,
//     isLoading,
//     error,
//     refresh: refreshAssessmentState,
//   };
// }

// /**
//  * Assessment Progress Component
//  * Shows user's assessment progress in the UI
//  */
// export function AssessmentProgress({ className }: { className?: string }) {
//   const { assessmentState, isLoading } = useAssessmentState();

//   if (isLoading || !assessmentState) {
//     return null;
//   }

//   const progress = Math.round(((assessmentState.completedPhases?.length || 0) / 6) * 100);
//   const isComplete = assessmentState.isComplete;

//   return (
//     <div className={`flex items-center gap-3 ${className}`}>
//       <div className="flex items-center gap-1">
//         {Array.from({ length: 6 }, (_, i) => (
//           <div
//             key={i}
//             className={`w-2 h-2 rounded-full ${
//               i < (assessmentState.completedPhases?.length || 0)
//                 ? "bg-primary"
//                 : "bg-muted"
//             }`}
//           />
//         ))}
//       </div>
//       <span className="text-sm text-muted-foreground">
//         {isComplete ? "Assessment Complete" : `${progress}% Complete`}
//       </span>
//     </div>
//   );
// }

// /**
//  * Assessment Status Badge
//  * Shows assessment completion status
//  */
// export function AssessmentStatusBadge() {
//   const { assessmentState, isLoading } = useAssessmentState();

//   if (isLoading || !assessmentState) {
//     return null;
//   }

//   const isComplete = assessmentState.isComplete;
//   const completedCount = assessmentState.completedPhases?.length || 0;

//   if (isComplete) {
//     return (
//       <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
//         <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//         Assessment Complete
//       </div>
//     );
//   }

//   if (completedCount > 0) {
//     return (
//       <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
//         <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
//         Assessment In Progress ({completedCount}/6)
//       </div>
//     );
//   }

//   return (
//     <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
//       <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
//       Assessment Pending
//     </div>
//   );
// }