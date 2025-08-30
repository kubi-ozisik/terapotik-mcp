// "use client";

// import { AssessmentProgress, AssessmentStatusBadge, useAssessmentState } from "@/lib/assessment-guard";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
// import { Button } from "@/shared/components/ui/button";
// import { Activity, Brain, Briefcase, Heart, DollarSign, TrendingUp } from "lucide-react";
// import Link from "next/link";

// const dimensionIcons = {
//   physical_health: Activity,
//   mental_health: Brain,
//   career: Briefcase,
//   relationships: Heart,
//   finances: DollarSign,
//   personal_growth: TrendingUp,
// };

// const dimensionColors = {
//   physical_health: "text-green-600",
//   mental_health: "text-blue-600",
//   career: "text-purple-600",
//   relationships: "text-pink-600",
//   finances: "text-orange-600",
//   personal_growth: "text-indigo-600",
// };

const DashboardPage = () => {
  return <div><a href="/chat">Chat</a></div>;
};

export default DashboardPage;

// export default function DashboardPage() {
//   const { assessmentState, isLoading } = useAssessmentState();

//   if (isLoading) {
//     return (
//       <div className="flex h-full items-center justify-center">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
//       </div>
//     );
//   }

//   const isAssessmentComplete = assessmentState?.isComplete;
//   const phaseScores = assessmentState?.phaseScores || {};
//   const completedPhases = assessmentState?.completedPhases || [];

//   return (
//     <div className="p-6 space-y-6">
//       {/* Welcome Section */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-bold">Welcome to Terapotik</h1>
//           <p className="text-muted-foreground mt-1">
//             Your personal life coaching and assessment platform
//           </p>
//         </div>
//         <AssessmentStatusBadge />
//       </div>

//       {/* Assessment Progress */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center justify-between">
//             Life Assessment Progress
//             <AssessmentProgress />
//           </CardTitle>
//           <CardDescription>
//             {isAssessmentComplete 
//               ? "Your comprehensive life assessment is complete. Review your results below."
//               : "Complete your life assessment to unlock personalized coaching and insights."
//             }
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           {!isAssessmentComplete ? (
//             <div className="text-center py-8">
//               <p className="text-muted-foreground mb-4">
//                 Complete your assessment to see your life balance hexagon and get personalized recommendations.
//               </p>
//               <Link href="/assessment">
//                 <Button size="lg">
//                   {completedPhases.length === 0 ? "Start Assessment" : "Continue Assessment"}
//                 </Button>
//               </Link>
//             </div>
//           ) : (
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//               {Object.entries(phaseScores).map(([phase, score]) => {
//                 const Icon = dimensionIcons[phase as keyof typeof dimensionIcons];
//                 const colorClass = dimensionColors[phase as keyof typeof dimensionColors];
//                 const phaseName = phase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
//                 return (
//                   <Card key={phase}>
//                     <CardContent className="p-4">
//                       <div className="flex items-center gap-3">
//                         <Icon className={`h-8 w-8 ${colorClass}`} />
//                         <div className="flex-1">
//                           <h3 className="font-medium">{phaseName}</h3>
//                           <div className="flex items-center gap-2 mt-1">
//                             <div className="flex-1 bg-muted rounded-full h-2">
//                               <div 
//                                 className="bg-primary h-2 rounded-full transition-all duration-500"
//                                 style={{ width: `${score}%` }}
//                               />
//                             </div>
//                             <span className="text-sm font-medium">{score}</span>
//                           </div>
//                         </div>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 );
//               })}
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Quick Actions */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         <Card>
//           <CardHeader>
//             <CardTitle>Chat with AI Companions</CardTitle>
//             <CardDescription>
//               Get personalized guidance from expert AI companions
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Link href="/test-chat">
//               <Button className="w-full" variant={isAssessmentComplete ? "default" : "outline"}>
//                 Start Conversation
//               </Button>
//             </Link>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle>Assessment Results</CardTitle>
//             <CardDescription>
//               View detailed analysis of your life dimensions
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Link href="/assessment">
//               <Button className="w-full" variant="outline">
//                 {isAssessmentComplete ? "Review Results" : "Take Assessment"}
//               </Button>
//             </Link>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle>Progress Tracking</CardTitle>
//             <CardDescription>
//               Monitor your improvement over time
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Button className="w-full" variant="outline" disabled={!isAssessmentComplete}>
//               View Progress
//             </Button>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Assessment Summary */}
//       {isAssessmentComplete && (
//         <Card>
//           <CardHeader>
//             <CardTitle>Your Life Balance Summary</CardTitle>
//             <CardDescription>
//               Overall insights from your assessment
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               <div className="text-center">
//                 <div className="text-3xl font-bold text-primary mb-2">
//                   {Math.round(Object.values(phaseScores).reduce((sum, score) => sum + score, 0) / Object.values(phaseScores).length)}
//                 </div>
//                 <p className="text-sm text-muted-foreground">Overall Life Score</p>
//               </div>
              
//               <div className="text-center">
//                 <div className="text-3xl font-bold text-green-600 mb-2">
//                   {Object.values(phaseScores).filter(score => score >= 70).length}
//                 </div>
//                 <p className="text-sm text-muted-foreground">Strong Areas</p>
//               </div>
              
//               <div className="text-center">
//                 <div className="text-3xl font-bold text-orange-600 mb-2">
//                   {Object.values(phaseScores).filter(score => score < 60).length}
//                 </div>
//                 <p className="text-sm text-muted-foreground">Focus Areas</p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// }