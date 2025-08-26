"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "next-auth/react"
import {
  getTerapotikUserData,
  getTerapotikToken,
  callTerapotikApi,
  updateUserProfile,
} from "@/services/terapotik-client"
import { useState, useEffect } from "react"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [apiData, setApiData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionDebug, setSessionDebug] = useState<any>(null)
  const [isLoadingDebug, setIsLoadingDebug] = useState(false)
  const [name, setName] = useState(session?.user?.name || "")

  // Debug session data when it changes
  useEffect(() => {
    if (session) {
      setName(session.user?.name || "")
    }
  }, [session])

  const fetchDebugSession = async () => {
    setIsLoadingDebug(true)
    try {
      const response = await fetch("/api/debug-session")
      const data = await response.json()
      setSessionDebug(data.session)
    } catch (err) {
      console.error("Error fetching debug session:", err)
    } finally {
      setIsLoadingDebug(false)
    }
  }

  // Method 1: Using the server action directly
  const fetchTerapotikData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Call the API using server action
      const data = await getTerapotikUserData()
      setApiData(data)
    } catch (err) {
      console.error("Error fetching Terapotik user data:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Method 2: Client-side API call (alternative)
  const fetchTerapotikDataClient = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get token from server action
      const token = await getTerapotikToken()

      if (!token) {
        throw new Error(
          "No access token available. Please make sure you're logged in with Auth0."
        )
      }

      // Use client-side helper to call API
      const data = await callTerapotikApi("/me", token)
      setApiData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile({ name })
      alert("Profile updated successfully!")
    } catch (err) {
      alert(
        `Error updating profile: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      )
      console.error(err)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your personal information and how others can contact you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={session?.user?.image || ""}
                alt={session?.user?.name || ""}
              />
              <AvatarFallback>{session?.user?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <Button variant="outline">Change Photo</Button>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={session?.user?.email || ""}
                disabled
              />
              <p className="text-sm text-muted-foreground">
                Email is managed through Auth0 and cannot be changed here.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Input id="bio" placeholder="Tell us about yourself" />
            </div>
          </div>

          <Button onClick={handleSaveProfile}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Session Debug</CardTitle>
          <CardDescription>
            Check your session details from server and client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-4">
            <p className="text-sm">Client login status: {status}</p>
            {session && (
              <p className="text-sm">
                Client has token: {(session as any).accessToken ? "Yes" : "No"}
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <Button onClick={fetchDebugSession} disabled={isLoadingDebug}>
              {isLoadingDebug ? "Loading..." : "Check Server Session"}
            </Button>
          </div>

          {sessionDebug && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">
                Server Session Data:
              </h3>
              <pre className="bg-slate-100 p-4 rounded-md overflow-auto">
                {JSON.stringify(sessionDebug, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Terapotik API</CardTitle>
          <CardDescription>
            Test connection to Terapotik API and view your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={fetchTerapotikData} disabled={isLoading}>
              {isLoading ? "Loading..." : "Fetch (Server Action)"}
            </Button>
            <Button
              onClick={fetchTerapotikDataClient}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? "Loading..." : "Fetch (Client API)"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-md">
              Error: {error}
            </div>
          )}

          {apiData && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">API Response:</h3>
              <pre className="bg-slate-100 p-4 rounded-md overflow-auto">
                {JSON.stringify(apiData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
