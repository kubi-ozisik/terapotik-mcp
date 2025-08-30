"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ShieldCheck } from "lucide-react";

interface MCPAuthStatus {
  isAuthorized: boolean;
  token: string | null;
  expiresAt: number | null;
  userId: string | null;
}

export function MCPAuthButton() {
  const [authStatus, setAuthStatus] = useState<MCPAuthStatus>({
    isAuthorized: false,
    token: null,
    expiresAt: null,
    userId: null
  });
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing MCP token on mount
  useEffect(() => {
    const stored = localStorage.getItem('mcp_auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Check if token is still valid
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          setAuthStatus(parsed);
        } else {
          // Token expired, clean up
          localStorage.removeItem('mcp_auth');
        }
      } catch (error) {
        console.error('Error parsing stored MCP auth:', error);
        localStorage.removeItem('mcp_auth');
      }
    }
  }, []);

  const handleAuthorize = async () => {
    setIsLoading(true);
    
    try {
      // Step 1: Discover OAuth endpoints
      const metadata = await fetch('http://localhost:3001/.well-known/oauth-authorization-server')
        .then(r => r.json());

      // Step 2: Register OAuth client
      const clientInfo = await fetch(metadata.registration_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'Chat App MCP Client',
          redirect_uris: [window.location.origin + '/mcp-callback'],
          token_endpoint_auth_method: 'none',
          grant_types: ['authorization_code'],
          response_types: ['code']
        })
      }).then(r => r.json());

      // Step 3: Generate PKCE
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Step 4: Store OAuth state
      const oauthState = {
        clientId: clientInfo.client_id,
        codeVerifier: codeVerifier,
        metadata: metadata,
        returnUrl: window.location.href
      };
      
      sessionStorage.setItem('mcp_oauth_state', JSON.stringify(oauthState));

      // Step 5: Redirect to authorization
      const authUrl = metadata.authorization_endpoint + '?' + new URLSearchParams({
        response_type: 'code',
        client_id: clientInfo.client_id,
        redirect_uri: window.location.origin + '/mcp-callback',
        scope: 'openid profile',
        state: 'chat-app-auth',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      window.location.href = authUrl;
      
    } catch (error) {
      console.error('MCP authorization failed:', error);
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('mcp_auth');
    setAuthStatus({
      isAuthorized: false,
      token: null,
      expiresAt: null,
      userId: null
    });
  };

  // PKCE utility functions
  function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
  }

  async function generateCodeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(new Uint8Array(digest));
  }

  function base64URLEncode(array: Uint8Array): string {
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  if (authStatus.isAuthorized) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Badge variant="secondary" className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          MCP Connected
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="text-xs"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAuthorize}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Shield className="h-4 w-4" />
      )}
      {isLoading ? 'Connecting...' : 'Connect MCP Tools'}
    </Button>
  );
}