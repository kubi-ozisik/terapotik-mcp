"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const error = searchParams.get("error")

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn("auth0", { callbackUrl: "/dashboard" })
    } catch (error) {
      console.error("Sign in error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const benefits = [
    "Unlimited calendar integration",
    "Connect with Google Calendar",
    "Jira task management",
    "Advanced AI automation",
    "Enterprise-grade security",
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to home</span>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Left side - Benefits */}
          <div className="hidden md:flex flex-col justify-center">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">T</span>
                </div>
                <span className="text-2xl font-bold">Terapotik</span>
              </div>

              <h1 className="text-4xl font-bold leading-tight">
                Welcome back to your productivity hub
              </h1>

              <p className="text-lg text-muted-foreground">
                Sign in to access your personalized workspace and continue
                managing your tasks and calendar.
              </p>

              <ul className="space-y-4 mt-8">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">
                  Sign in to your account
                </CardTitle>
                <CardDescription>
                  Continue your productivity journey with Terapotik
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                    {error === "OAuthAccountNotLinked" &&
                      "This account is not linked to an OAuth provider. Please contact support."}
                    {error === "Callback" &&
                      "An error occurred during authentication. Please try again."}
                    {!["OAuthAccountNotLinked", "Callback"].includes(error) &&
                      error}
                  </div>
                )}

                <Button
                  onClick={handleSignIn}
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  {isLoading ? "Signing in..." : "Sign in with Auth0"}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Secure login
                    </span>
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  By signing in, you agree to our{" "}
                  <Link
                    href="/terms"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Privacy Policy
                  </Link>
                </div>
              </CardContent>

              <CardFooter>
                <div className="text-center text-sm w-full">
                  Don't have an account?{" "}
                  <Button variant="link" className="p-0 h-auto" asChild>
                    <Link href="/register">Sign up</Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
