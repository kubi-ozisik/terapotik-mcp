"use client"

import {
  callTerapotikApi,
  getTerapotikToken,
} from "@/services/terapotik-client"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

type ApiState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook for client components to interact with the Terapotik API
 * @param endpoint - The API endpoint to call (e.g., "/me", "/tasks")
 * @param options - Fetch options
 * @param initialFetch - Whether to fetch data on mount
 */
export function useTerapotikApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
  initialFetch = true
): ApiState<T> {
  const { data: session, status } = useSession()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(initialFetch)
  const [error, setError] = useState<Error | null>(null)

  // Function to fetch data from the API
  const fetchData = async () => {
    if (status !== "authenticated") {
      setError(new Error("Not authenticated"))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get token from server action
      const token = await getTerapotikToken()

      if (!token) {
        throw new Error("No access token available")
      }

      // Call the API
      const result = await callTerapotikApi(endpoint, token, options)
      setData(result)
    } catch (err) {
      console.error(`API error for ${endpoint}:`, err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch on mount if initialFetch is true
  useEffect(() => {
    if (initialFetch && status === "authenticated") {
      fetchData()
    }
  }, [status, endpoint, initialFetch])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook to fetch and manage a specific resource (CRUD operations)
 * @param resourceType - The type of resource ("tasks", "events", etc.)
 * @param id - Optional ID of the specific resource
 */
export function useTerapotikResource<T = any>(
  resourceType: string,
  id?: string
) {
  const endpoint = id ? `/${resourceType}/${id}` : `/${resourceType}`
  const { data, loading, error, refetch } = useTerapotikApi<T>(endpoint)

  // Create function
  const create = async (resourceData: any) => {
    const token = await getTerapotikToken()
    if (!token) throw new Error("No access token available")

    const result = await callTerapotikApi(`/${resourceType}`, token, {
      method: "POST",
      body: JSON.stringify(resourceData),
    })

    refetch() // Refresh the list after creating
    return result
  }

  // Update function
  const update = async (resourceId: string, resourceData: any) => {
    if (!resourceId) throw new Error("Resource ID is required for update")

    const token = await getTerapotikToken()
    if (!token) throw new Error("No access token available")

    const result = await callTerapotikApi(
      `/${resourceType}/${resourceId}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify(resourceData),
      }
    )

    refetch() // Refresh the data after updating
    return result
  }

  // Delete function
  const remove = async (resourceId: string) => {
    if (!resourceId) throw new Error("Resource ID is required for deletion")

    const token = await getTerapotikToken()
    if (!token) throw new Error("No access token available")

    const result = await callTerapotikApi(
      `/${resourceType}/${resourceId}`,
      token,
      {
        method: "DELETE",
      }
    )

    refetch() // Refresh the list after deletion
    return result
  }

  return {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  }
}
