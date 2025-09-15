"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function MCPCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>('Processing authorization...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          setStatus(`Authorization failed: ${error}`);
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        if (!code) {
          setStatus('No authorization code received');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        // Get stored OAuth state
        const storedState = sessionStorage.getItem('mcp_oauth_state');
        if (!storedState) {
          setStatus('OAuth state not found - please try again');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        const oauthState = JSON.parse(storedState);
        setStatus('Exchanging authorization code for tokens...');

        // Exchange code for tokens
        const tokenResponse = await fetch(oauthState.metadata.token_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: oauthState.clientId,
            redirect_uri: window.location.origin + '/mcp-callback',
            code_verifier: oauthState.codeVerifier
          })
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          setStatus(`Token exchange failed: ${errorText}`);
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        const tokens = await tokenResponse.json();
        setStatus('Authorization successful! Storing credentials...');

        // Decode JWT to get user info
        const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
        
        // Store MCP auth in localStorage
        const mcpAuth = {
          isAuthorized: true,
          token: tokens.access_token,
          expiresAt: Date.now() + (tokens.expires_in * 1000),
          userId: payload.sub,
          authorizedAt: new Date().toISOString()
        };

        localStorage.setItem('mcp_auth', JSON.stringify(mcpAuth));

        // Clean up session storage
        sessionStorage.removeItem('mcp_oauth_state');

        setStatus('Redirecting back to chat...');

        // Redirect back to the original URL
        const returnUrl = oauthState.returnUrl || '/';
        setTimeout(() => {
          window.location.href = returnUrl;
        }, 1500);

      } catch (error) {
        console.error('MCP callback error:', error);
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setTimeout(() => router.push('/'), 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <h1 className="text-xl font-semibold">Connecting to MCP Tools</h1>
        <p className="text-muted-foreground max-w-md">
          {status}
        </p>
      </div>
    </div>
  );
}