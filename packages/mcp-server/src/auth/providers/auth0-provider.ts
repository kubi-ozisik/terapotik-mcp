import express, { Express, Request, Response } from "express";
import { BaseOAuthHandler } from "../base-oauth-handler";

export abstract class Auth0Provider extends BaseOAuthHandler {
    protected app: Express;
    protected auth0Domain: string;
    protected auth0ClientId: string;
    protected auth0ClientSecret: string;
    protected auth0Audience: string;
    protected port: number;

    constructor(baseUrl: string, port: number) {
        super(baseUrl);
        this.auth0Domain = process.env.AUTH0_DOMAIN || "smeetapp.eu.auth0.com";
        this.auth0ClientId = process.env.AUTH0_CLIENT_ID || "S7ienbLLZy9wBFPjgqKHCsQoXBSaqjhv";
        this.auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET!;
        this.auth0Audience = process.env.AUTH0_AUDIENCE || "https://api.terapotik.com";
        this.port = port;

        this.app = express();
    }

    protected setupRoutes(): void {
        // OAuth discovery endpoints (for future)
        this.app.get('/.well-known/oauth-authorization-server', (req, res) => {
            this.handleOAuthMetadataRequest(req, res);
        });

        // OPTIONS for oauth metadata
        this.app.options('/.well-known/oauth-authorization-server', this.handleCorsOptions);

        // Client registration endpoint
        this.app.post('/register', (req, res) => {
            this.handleClientRegistration(req, res);
        });

        // OPTIONS for register
        this.app.options('/register', this.handleCorsOptions);

        // Authorization endpoint
        this.app.get('/authorize', (req, res) => {
            this.handleAuthorization(req, res);
        });

        // OPTIONS for authorize
        this.app.options('/authorize', this.handleCorsOptions);

        // callback endpoint
        this.app.get('/callback', (req, res) => {
            this.handleAuthCallback(req, res);
        });

        // OPTIONS for callback
        this.app.options('/callback', this.handleCorsOptions);

        // token endpoint
        this.app.post('/token', (req, res) => {
            this.handleTokenRequest(req, res);
        });

        // OPTIONS for token
        this.app.options('/token', this.handleCorsOptions);

        // consent confirmation endpoint
        this.app.post('/authorize/consent', (req, res) => {
            this.handleConsentConfirmation(req, res);
        });

        // OPTIONS for consent confirmation
        this.app.options('/authorize/consent', this.handleCorsOptions);

        // JWKS endpoint for OAuth token validation
        this.app.get("/.well-known/jwks.json", (req, res) => {
            this.handleJwksRequest(req, res);
        });

        // OPTIONS for JWKS endpoint
        this.app.options("/.well-known/jwks.json", this.handleCorsOptions);
    }

    // Abstract methods - each server must implement these
    protected abstract getClient(clientId: string): any;
    protected abstract setClient(clientId: string, client: any): void;
    protected abstract findClientByAuthCode(code: string): { client: any; clientId: string } | null;

    /**
     * Handle OAuth metadata requests
     */
    protected handleOAuthMetadataRequest(req: Request, res: Response): void {
        console.log(
            "OAuth metadata requested from:",
            req.headers.origin || "unknown"
        );

        // Ensure CORS headers are properly set
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.header("Content-Type", "application/json; charset=utf-8");
        res.header("Cache-Control", "no-store");
        res.header("Pragma", "no-cache");

        // Point to our server's endpoints instead of directly to Auth0
        res.json(this.getOAuthServerMetadata(this.baseUrl));
    }

    /**
    * Get OAuth server metadata
    */
    private getOAuthServerMetadata(baseUrl: string): any {
        return {
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/authorize`,
            token_endpoint: `${baseUrl}/token`,
            registration_endpoint: `${baseUrl}/register`,
            jwks_uri: `${baseUrl}/.well-known/jwks.json`,
            response_types_supported: ["code"],
            grant_types_supported: ["authorization_code", "refresh_token"],
            token_endpoint_auth_methods_supported: ["none"],
            code_challenge_methods_supported: ["S256"],
            scopes_supported: ["openid", "profile", "email"],
        };
    }

    // JWKS endpoint
    protected handleJwksRequest(req: Request, res: Response): void {
        console.log("JWKS requested from:", req.headers.origin || "unknown");

        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.header("Content-Type", "application/json; charset=utf-8");
        res.header("Cache-Control", "public, max-age=86400");

        const auth0JwksUrl = `https://${this.auth0Domain}/.well-known/jwks.json`;

        fetch(auth0JwksUrl)
            .then((response) => response.json())
            .then((jwks) => {
                console.log("Successfully retrieved JWKS from Auth0");
                res.json(jwks);
            })
            .catch((error) => {
                console.error("Error fetching JWKS from Auth0:", error);
                res.status(500).json({
                    error: "server_error",
                    error_description: "Error fetching JWKS",
                });
            });
    }
    // OAUTH ENDPOINTS

    /**
     * Handle OPTIONS requests with standard CORS headers
     */
    private handleCorsOptions = (req: Request, res: Response): void => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, POST");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.status(204).end();
    };
    /**
     * Handle client registration
     */
    protected handleClientRegistration(req: Request, res: Response): void {
        try {
            const clientData = req.body;
            console.log("Client registration request:", clientData);

            const registeredClient = this.registerClient(clientData);
            res.status(201).json(registeredClient);
        } catch (error) {
            console.error("Client registration error:", error);
            res.status(400).json({
                error: "invalid_client_metadata",
                error_description: "Invalid client metadata",
            });
        }
    }

    /**
     * Register a new OAuth client
     */
    private registerClient(clientData: any): any {
        const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        const registeredClient = {
            ...clientData,
            client_id: clientId,
            client_id_issued_at: Math.floor(Date.now() / 1000),
            token_endpoint_auth_method: clientData.token_endpoint_auth_method || "none",
            redirect_uris: clientData.redirect_uris || [],
            client_name: clientData.client_name || 'MCP Client',
            grant_types: clientData.grant_types || ['authorization_code'],
            response_types: clientData.response_types || ['code'],
        };
        // Store the client
        this.setClient(clientId, registeredClient);

        return registeredClient;
    }

    /**
     * Handle authorization requests
     */
    protected handleAuthorization(req: Request, res: Response): void {
        console.log("Authorization request received:", req.query);

        const {
            response_type,
            client_id,
            code_challenge,
            code_challenge_method,
            redirect_uri,
            state,
        } = req.query;

        if (!client_id || !redirect_uri) {
            console.error("Missing required parameters:", {
                client_id,
                redirect_uri,
            });
            res.status(400).send("Missing required parameters");
            return;
        }

        let client = this.getClient(client_id as string);

        if (!client) {
            console.log(`Registering client on authorization: ${client_id}`);
            const clientData = {
                client_id,
                client_id_issued_at: Math.floor(Date.now() / 1000),
                redirect_uris: [redirect_uri as string],
                token_endpoint_auth_method: "none",
            };
            client = clientData;
            this.setClient(client_id as string, client);
        }

        client.pending_request = {
            client_id,
            redirect_uri,
            code_challenge,
            code_challenge_method,
            state,
        };

        this.setClient(client_id as string, client);
        console.log("Using Auth0 config:", { auth0Domain: this.auth0Domain, auth0ClientId: this.auth0ClientId });
        const auth0Url = new URL(`https://${this.auth0Domain}/authorize`);
        auth0Url.searchParams.set("client_id", this.auth0ClientId);
        auth0Url.searchParams.set("response_type", "code");
        auth0Url.searchParams.set("redirect_uri", `${this.baseUrl}/callback`);
        auth0Url.searchParams.set("scope", "openid profile email");
        auth0Url.searchParams.set("audience", this.auth0Audience);

        const enrichedState = `mcp_client_id=${client_id}&mcp_redirect_uri=${encodeURIComponent(
            redirect_uri as string
        )}&original_state=${state || ""}`;
        auth0Url.searchParams.set("state", enrichedState);
        console.log("Enriched state:", enrichedState);
        console.log(`Redirecting to Auth0: ${auth0Url.toString()}`);
        res.redirect(auth0Url.toString());
    }

    /**
     * Handle token requests
     */
    protected async handleTokenRequest(req: Request, res: Response): Promise<void> {
        console.log("Token request received with body:", req.body);

        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

        try {
            // Parse form data correctly based on content type
            let formData: any;
            if (typeof req.body === "string") {
                formData = Object.fromEntries(new URLSearchParams(req.body).entries());
                console.log("Parsed form data from string:", formData);
            } else {
                formData = req.body;
            }

            const grant_type = formData.grant_type;
            const code = formData.code;
            const client_id = formData.client_id;
            const redirect_uri = formData.redirect_uri;
            const code_verifier = formData.code_verifier;

            console.log("Token request parameters:", {
                grant_type,
                code: code ? `${code.substring(0, 10)}...` : undefined,
                client_id,
                redirect_uri,
                code_verifier: code_verifier ? "present" : "missing",
            });

            let client = null;
            let clientId = null;

            if (!code) {
                console.error("Missing authorization code in token request");
                res.status(400).json({
                    error: "invalid_request",
                    error_description: "Authorization code is required",
                });
                return;
            }

            console.log(`Looking for client by code: ${code.substring(0, 20)}...`);

            const foundClient = this.findClientByAuthCode(code);
            if (foundClient) {
                client = foundClient.client;
                clientId = foundClient.clientId;
                console.log(`Found client ${clientId} by authorization code`);
            }
            if (!client) {
                console.error("Client not found for the provided authorization code");
                res.status(400).json({
                    error: "invalid_grant",
                    error_description: "Invalid authorization code",
                });
                return;
            }

            if (grant_type === "authorization_code") {
                if (
                    !client.authorization_code ||
                    client.authorization_code.code !== code
                ) {
                    console.error("Invalid authorization code", {
                        expected: client.authorization_code?.code,
                        received: code,
                    });
                    res.status(400).json({
                        error: "invalid_grant",
                        error_description: "Invalid authorization code",
                    });
                    return;
                }

                if (client.authorization_code.expires_at < Date.now()) {
                    console.error("Authorization code expired", {
                        expiresAt: new Date(client.authorization_code.expires_at),
                        now: new Date(),
                    });
                    res.status(400).json({
                        error: "invalid_grant",
                        error_description: "Authorization code expired",
                    });
                    return;
                }

                if (!client.tokens) {
                    console.error("No tokens found for client");
                    res.status(500).json({
                        error: "server_error",
                        error_description: "No tokens found for client",
                    });
                    return;
                }

                console.log("Returning Auth0 tokens to client");

                res.json({
                    access_token: client.tokens.access_token,
                    token_type: client.tokens.token_type || "Bearer",
                    expires_in: client.tokens.expires_in || 3600,
                    refresh_token: client.tokens.refresh_token,
                    id_token: client.tokens.id_token,
                });
                return;
            } else if (grant_type === "refresh_token") {
                const refresh_token = formData.refresh_token;

                if (!refresh_token) {
                    console.error("Missing refresh_token");
                    res.status(400).json({
                        error: "invalid_request",
                        error_description: "Missing refresh_token",
                    });
                    return;
                }

                try {
                    const tokenResponse = await fetch(
                        `https://${this.auth0Domain}/oauth/token`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                grant_type: "refresh_token",
                                client_id: this.auth0ClientId,
                                client_secret: this.auth0ClientSecret,
                                refresh_token: refresh_token,
                            }),
                        }
                    );

                    if (!tokenResponse.ok) {
                        const errorText = await tokenResponse.text();
                        console.error("Auth0 refresh token error:", errorText);
                        res.status(400).json({
                            error: "invalid_grant",
                            error_description: "Error refreshing token",
                        });
                        return;
                    }

                    const refreshedTokenData = (await tokenResponse.json()) as {
                        access_token: string;
                        token_type: string;
                        expires_in: number;
                        refresh_token: string;
                        id_token: string;
                    };
                    console.log("Received refreshed tokens from Auth0");

                    client.tokens = refreshedTokenData;
                    this.setClient(clientId as string, client);

                    res.json({
                        access_token: refreshedTokenData.access_token,
                        token_type: refreshedTokenData.token_type || "Bearer",
                        expires_in: refreshedTokenData.expires_in || 3600,
                        refresh_token: refreshedTokenData.refresh_token,
                        id_token: refreshedTokenData.id_token,
                    });
                    return;
                } catch (error) {
                    console.error("Error refreshing token with Auth0:", error);
                    res.status(400).json({
                        error: "invalid_grant",
                        error_description: "Error refreshing token",
                    });
                    return;
                }
            } else {
                console.error(`Unsupported grant type: ${grant_type}`);
                res.status(400).json({
                    error: "unsupported_grant_type",
                    error_description: "Unsupported grant type",
                });
                return;
            }
        } catch (error) {
            console.error("Token endpoint error:", error);
            res.status(500).json({
                error: "server_error",
                error_description: "Internal server error",
            });
        }
    }
    /**
   * Handle Auth0 callback
   */
    protected async handleAuthCallback(req: Request, res: Response): Promise<void> {
        console.log("Auth0 callback received with query params:", req.query);

        const { code, state, error } = req.query;

        if (error) {
            console.error("Auth0 returned an error:", error);
            res.status(400).send(`Auth0 error: ${error}`);
            return;
        }

        if (!code || !state) {
            console.error("Missing code or state:", { code, state });
            res.status(400).send("Missing code or state");
            return;
        }

        try {
            // Parse the state to get the MCP client ID, redirect_uri and original state
            const stateString = state as string;
            const mcpClientIdMatch = stateString.match(/mcp_client_id=([^&]+)/);
            const mcpRedirectUriMatch = stateString.match(/mcp_redirect_uri=([^&]+)/);
            const originalStateMatch = stateString.match(/original_state=([^&]*)/);

            const mcpClientId = mcpClientIdMatch ? mcpClientIdMatch[1] : null;
            const mcpRedirectUri = mcpRedirectUriMatch
                ? decodeURIComponent(mcpRedirectUriMatch[1])
                : null;
            const originalState = originalStateMatch ? originalStateMatch[1] : "";

            console.log("Parsed state parameters:", {
                mcpClientId,
                mcpRedirectUri,
                originalState,
            });

            if (!mcpClientId) {
                console.error("Invalid state - missing MCP client ID");
                res.status(400).send("Invalid state - missing MCP client ID");
                return;
            }

            // Get the MCP client
            const mcpClient = this.getClient(mcpClientId as string);

            if (!mcpClient) {
                console.error("Invalid MCP client:", mcpClientId);
                res.status(400).send("Invalid MCP client");
                return;
            }

            // Exchange the Auth0 code for tokens
            const auth0Domain = process.env.AUTH0_DOMAIN || "smeetapp.eu.auth0.com";
            const auth0ClientId =
                process.env.AUTH0_CLIENT_ID || "S7ienbLLZy9wBFPjgqKHCsQoXBSaqjhv";
            const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET;

            const callbackUrl = `${this.baseUrl || `http://localhost:${this.port}`}/callback`;
            console.log("Exchange Auth0 code using redirect_uri:", callbackUrl);

            try {
                // Make a request to Auth0's token endpoint
                const tokenResponse = await fetch(
                    `https://${auth0Domain}/oauth/token`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            grant_type: "authorization_code",
                            client_id: auth0ClientId,
                            client_secret: auth0ClientSecret,
                            code: code,
                            redirect_uri: callbackUrl,
                        }),
                    }
                );

                if (!tokenResponse.ok) {
                    const errorText = await tokenResponse.text();
                    console.error("Auth0 token exchange error:", errorText);
                    res.status(400).send(`Error exchanging code for tokens: ${errorText}`);
                    return;
                }

                const tokenData = (await tokenResponse.json()) as {
                    access_token: string;
                    token_type: string;
                    expires_in: number;
                    refresh_token?: string;
                    id_token?: string;
                };

                console.log("Received tokens from Auth0");

                // Store the tokens with the MCP client
                mcpClient.tokens = tokenData;
                this.setClient(mcpClientId as string, mcpClient);

                // Get the redirect URI from the stored state or pending request
                let redirectUri = mcpRedirectUri;
                if (
                    !redirectUri &&
                    mcpClient.pending_request &&
                    mcpClient.pending_request.redirect_uri
                ) {
                    redirectUri = mcpClient.pending_request.redirect_uri;
                }

                if (!redirectUri) {
                    console.error("Missing redirect URI");
                    res.status(400).send("Missing redirect URI");
                    return;
                }

                // Generate an MCP authorization code
                const mcpCode = `auth_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(2, 15)}`;
                console.log("Generated MCP code:", mcpCode);

                // Store the code with the client
                mcpClient.authorization_code = {
                    code: mcpCode,
                    redirect_uri: redirectUri,
                    code_challenge: mcpClient.pending_request?.code_challenge,
                    code_challenge_method:
                        mcpClient.pending_request?.code_challenge_method,
                    expires_at: Date.now() + 600000, // 10 minutes
                };

                this.setClient(mcpClientId as string, mcpClient);

                // Build the redirect URL for the MCP client
                const redirectUrl = new URL(redirectUri as string);
                redirectUrl.searchParams.set("code", mcpCode);

                if (originalState) {
                    redirectUrl.searchParams.set("state", originalState);
                }

                const finalRedirectUrl = redirectUrl.toString();
                console.log(`Redirecting to MCP client: ${finalRedirectUrl}`);
                res.redirect(finalRedirectUrl);
            } catch (error) {
                console.error("Auth0 token exchange error:", error);
                res.status(500).send("Error exchanging code for tokens");
            }
        } catch (error) {
            console.error("Error in callback:", error);
            res.status(500).send("Error processing Auth0 callback");
        }
    }
    /**
* Handle consent confirmation
*/
    private handleConsentConfirmation(req: Request, res: Response): void {
        console.log("Consent response received:", req.body);

        const {
            client_id,
            redirect_uri,
            code_challenge,
            code_challenge_method,
            state,
            consent,
        } = req.body;

        if (consent !== "approve") {
            // User denied the authorization
            const redirectUrl = new URL(redirect_uri);
            redirectUrl.searchParams.set("error", "access_denied");
            redirectUrl.searchParams.set(
                "error_description",
                "The user denied the authorization request"
            );

            if (state) {
                redirectUrl.searchParams.set("state", state);
            }

            res.redirect(redirectUrl.toString());
            return;
        }

        // User approved, generate authorization code
        const code = `auth_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 15)}`;

        // Store code with client
        const client = this.getClient(client_id);
        client.authorization_code = {
            code,
            redirect_uri,
            code_challenge,
            code_challenge_method,
            expires_at: Date.now() + 600000, // 10 minutes
        };

        this.setClient(client_id, client);

        // Redirect with code
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set("code", code);

        if (state) {
            redirectUrl.searchParams.set("state", state);
        }

        console.log(`Redirecting to: ${redirectUrl.toString()}`);
        res.redirect(redirectUrl.toString());
    }
}