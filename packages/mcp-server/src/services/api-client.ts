export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  authToken?: string;
}

export class ApiClient {
  private config: ApiClientConfig;
  
  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.config.authToken ? `Bearer ${this.config.authToken}` : undefined,
            'User-Agent': 'terapotik-mcp-server/1.0.0',
            ...options.headers,
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json() as T;
      } catch (error: any) {
        lastError = error;
        
        if (attempt < this.config.retries && !controller.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    clearTimeout(timeoutId);
    throw lastError;
  }
}