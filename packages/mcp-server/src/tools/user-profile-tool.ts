import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiService, UserProfile } from "../services/api-service";
import { z } from "zod";

export class UserProfileTool {
    private apiService: ApiService;

    constructor(apiService: ApiService) {
        this.apiService = apiService;
    }

    register(server: McpServer):void {
        server.registerTool(
            "get_user_profile",
            {
                title: "Get User Profile",
                description: "Retrieve the current user's profile information from Terapotik API",
                inputSchema: {},
            },
            async (args, extra) => {
                try {
                    const profileData = await this.getUserProfile();
                    console.log("profile", profileData.data);
                    return {
                        content: [
                            { type: "text", text: `User profile: ${JSON.stringify(profileData.data)}` },
                        ],
                    };
                } catch (error: any) {
                    console.error("Error getting user profile:", error);
                    return {
                        content: [
                            { type: "text", text: `Error getting user profile: ${error.message}` },
                        ],
                    };
                }
            }
        );
    }

    async getUserProfile(): Promise<{ success: boolean, data: UserProfile }> {
        const response = await this.apiService.getUserProfile();
        return {
            success: true,
            data: response,
        };
    }
}