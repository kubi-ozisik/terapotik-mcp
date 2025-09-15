import { Request, Response } from "express";

export abstract class BaseOAuthHandler {
    protected baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    // Abstract methods - each server must implement these
    protected abstract getClient(clientId: string): any;
    protected abstract setClient(clientId: string, client: any): void;
    protected abstract findClientByAuthCode(code: string): { client: any; clientId: string } | null;

    // Abstract methods - each provider must implement these
    protected abstract handleOAuthMetadataRequest(req: Request, res: Response): void;
    protected abstract handleJwksRequest(req: Request, res: Response): void;
    protected abstract handleClientRegistration(req: Request, res: Response): void;
    protected abstract handleAuthorization(req: Request, res: Response): void;
    protected abstract handleTokenRequest(req: Request, res: Response): Promise<void>;
    protected abstract handleAuthCallback(req: Request, res: Response): Promise<void>;
}