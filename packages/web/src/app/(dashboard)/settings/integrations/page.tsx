"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  CheckCircle2,
  LucideBike as GoogleIcon,
  Calendar,
  CheckSquare,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  connected: boolean
  permissions: string[]
  connectText: string
  disconnectText: string
}

export default function IntegrationsPage() {
  const router = useRouter()
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "google",
      name: "Google Services",
      description:
        "Connect Google Calendar and Tasks to manage your schedule and tasks",
      icon: (
        <Image
          src="/google-icon.svg"
          alt="Google"
          width={32}
          height={32}
          className="rounded"
        />
      ),
      connected: false,
      permissions: [
        "Read and write calendar events",
        "Manage tasks and task lists",
        "Access basic profile information",
        "Offline access for background sync",
      ],
      connectText: "Connect Google Account",
      disconnectText: "Disconnect Google",
    },
  ])

  useEffect(() => {
    checkConnectedAccounts()
  }, [])

  const checkConnectedAccounts = async () => {
    try {
      const response = await fetch("/api/user/connected-accounts")
      const data = await response.json()

      setIntegrations((prev) =>
        prev.map((integration) => ({
          ...integration,
          connected: data.google?.connected || false,
        }))
      )
    } catch (error) {
      console.error("Error checking connected accounts:", error)
    }
  }

  const handleConnect = async (id: string) => {
    try {
      const response = await fetch(`/api/connect/${id}`, {
        method: "POST",
      })
      const data = await response.json()

      if (data.url) {
        // Redirect to OAuth provider
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Error initiating connection:", error)
    }
  }

  const handleDisconnect = async (id: string) => {
    try {
      const response = await fetch(`/api/connect/${id}/disconnect`, {
        method: "POST",
      })

      if (response.ok) {
        setIntegrations((prev) =>
          prev.map((integration) =>
            integration.id === id
              ? { ...integration, connected: false }
              : integration
          )
        )
      }
    } catch (error) {
      console.error("Error disconnecting account:", error)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Connecting these services will allow Terapotik to access your data
          according to the permissions listed.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-2 border rounded-lg flex items-center justify-center">
                  {integration.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>{integration.name}</CardTitle>
                    {integration.connected && (
                      <Badge className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{integration.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Permissions</Label>
                  <ul className="mt-2 space-y-1">
                    {integration.permissions.map((permission, index) => (
                      <li
                        key={index}
                        className="text-sm text-muted-foreground flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`${integration.id}-switch`}
                      checked={integration.connected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleConnect(integration.id)
                        } else {
                          handleDisconnect(integration.id)
                        }
                      }}
                    />
                    <Label htmlFor={`${integration.id}-switch`}>
                      {integration.connected ? "Connected" : "Disconnected"}
                    </Label>
                  </div>

                  {!integration.connected && (
                    <Button onClick={() => handleConnect(integration.id)}>
                      {integration.connectText}
                    </Button>
                  )}
                  {integration.connected && (
                    <Button
                      variant="destructive"
                      onClick={() => handleDisconnect(integration.id)}
                    >
                      {integration.disconnectText}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
