
import { toast } from "sonner";

export interface APIConfig {
  name: string;
  baseUrl: string;
  authType: string;
  apiKey?: string;
  username?: string;
  password?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

export class APIService {
  private config: APIConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config?: APIConfig) {
    if (config) {
      this.setConfig(config);
    }
  }

  setConfig(config: APIConfig): void {
    this.config = config;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Store in localStorage for persistence
    localStorage.setItem('scim_mapper_api_config', JSON.stringify(config));
  }

  getConfig(): APIConfig | null {
    if (!this.config) {
      const storedConfig = localStorage.getItem('scim_mapper_api_config');
      if (storedConfig) {
        try {
          this.config = JSON.parse(storedConfig);
        } catch (error) {
          console.error('Failed to parse stored config:', error);
        }
      }
    }
    return this.config;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.config) {
      throw new Error('API configuration not set');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (this.config.authType) {
      case 'apiKey':
        if (!this.config.apiKey) {
          throw new Error('API Key is required');
        }
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
        
      case 'basic':
        if (!this.config.username || !this.config.password) {
          throw new Error('Username and password are required');
        }
        const credentials = btoa(`${this.config.username}:${this.config.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
        break;
        
      case 'oauth':
        headers['Authorization'] = `Bearer ${await this.getOAuthToken()}`;
        break;
        
      default:
        throw new Error(`Unsupported auth type: ${this.config.authType}`);
    }

    return headers;
  }

  private async getOAuthToken(): Promise<string> {
    if (!this.config) {
      throw new Error('API configuration not set');
    }
    
    if (
      this.accessToken && 
      this.tokenExpiry && 
      this.tokenExpiry > new Date()
    ) {
      return this.accessToken;
    }

    if (
      !this.config.tokenUrl || 
      !this.config.clientId || 
      !this.config.clientSecret
    ) {
      throw new Error('OAuth configuration incomplete');
    }

    try {
      // In a real application, we would make an actual API call here
      // This is just a simulation
      
      // Simulate token response
      const tokenResponse = {
        access_token: 'simulated_oauth_token_' + Date.now(),
        expires_in: 3600, // 1 hour
        token_type: 'Bearer'
      };

      this.accessToken = tokenResponse.access_token;
      this.tokenExpiry = new Date(Date.now() + tokenResponse.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('OAuth token acquisition failed:', error);
      throw new Error('Failed to acquire OAuth token');
    }
  }

  async fetchData(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.config) {
      throw new Error('API configuration not set');
    }

    try {
      const url = this.buildUrl(endpoint);
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      toast.error('API request failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private buildUrl(endpoint: string): string {
    if (!this.config) {
      throw new Error('API configuration not set');
    }
    
    let url = this.config.baseUrl;
    if (!url.endsWith('/') && !endpoint.startsWith('/')) {
      url += '/';
    }
    url += endpoint;
    
    return url;
  }
}

// Export singleton instance
export const apiService = new APIService();
