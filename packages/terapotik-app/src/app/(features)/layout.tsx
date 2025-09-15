import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUser, getUserWithProfile } from "@/shared/helpers";
import { logger } from "@/lib/logger";

interface Props {
  children: React.ReactNode;
}

const log = logger.child({
  component: "AuthPageLayout",
});

const AuthenticatedPageLayout = async ({ children }: Props) => {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <SessionProvider session={session}>
      <div className="h-screen flex overflow-y-hidden">
        {/* <div className="w-[56px] flex-shrink-0">
          <AuthNavigation />
        </div> */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">{children}</div>
        </div>
      </div>
    </SessionProvider>
  );
};

export default AuthenticatedPageLayout;