import { z } from "zod";
import { ApiClient } from "./api-client";

const UserProfileSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    role: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export class ApiService {
    private apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this.apiClient = apiClient;
    }

    async getUserProfile(): Promise<UserProfile> {
        const response = await this.apiClient.request<{data: UserProfile}>("/api/v1/me");
        console.log("response", response);
        return UserProfileSchema.parse(response.data);
    }
}