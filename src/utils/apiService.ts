
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

export interface APIHistory {
  timestamp: number;
  method: string;
  endpoint: string;
  status: number;
  duration: number;
  success: boolean;
}

export class APIService {
  private config: APIConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private history: APIHistory[] = [];
  private maxHistoryItems = 50;

  constructor(config?: APIConfig) {
    if (config) {
      this.setConfig(config);
    }
    this.loadHistory();
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

  getHistory(): APIHistory[] {
    return this.history;
  }

  private saveHistory(): void {
    localStorage.setItem('scim_mapper_api_history', JSON.stringify(this.history));
  }

  private loadHistory(): void {
    const storedHistory = localStorage.getItem('scim_mapper_api_history');
    if (storedHistory) {
      try {
        this.history = JSON.parse(storedHistory);
      } catch (error) {
        console.error('Failed to parse stored history:', error);
        this.history = [];
      }
    }
  }

  private addHistoryItem(item: APIHistory): void {
    // Add to the start of the array
    this.history.unshift(item);
    
    // Trim if needed
    if (this.history.length > this.maxHistoryItems) {
      this.history = this.history.slice(0, this.maxHistoryItems);
    }
    
    this.saveHistory();
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
      const formData = new URLSearchParams();
      formData.append('grant_type', 'client_credentials');
      formData.append('client_id', this.config.clientId);
      formData.append('client_secret', this.config.clientSecret);
      
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`OAuth token request failed: ${response.status} ${response.statusText}`);
      }
      
      const tokenResponse = await response.json();
      
      if (!tokenResponse.access_token) {
        throw new Error('Invalid OAuth response: missing access_token');
      }
      
      this.accessToken = tokenResponse.access_token;
      this.tokenExpiry = new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000);
      
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

    const startTime = performance.now();
    let status = 0;
    let success = false;
    
    try {
      const url = this.buildUrl(endpoint);
      const headers = await this.getAuthHeaders();
      
      console.log(`Making API request to: ${url}`);
      console.log('With headers:', headers);
      console.log('With options:', options);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      });

      status = response.status;
      const duration = performance.now() - startTime;
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      success = true;
      const responseData = await response.json();
      
      // Add to history
      this.addHistoryItem({
        timestamp: Date.now(),
        method: options.method || 'GET',
        endpoint,
        status,
        duration,
        success
      });
      
      return responseData;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Add failed request to history
      this.addHistoryItem({
        timestamp: Date.now(),
        method: options.method || 'GET',
        endpoint,
        status,
        duration,
        success
      });
      
      console.error('API request failed:', error);
      toast.error('API request failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('API configuration not set');
      }
      
      // Try to fetch a dummy endpoint or the root endpoint
      const endpoint = '/';
      await this.fetchData(endpoint);
      
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  private buildUrl(endpoint: string): string {
    if (!this.config) {
      throw new Error('API configuration not set');
    }
    
    let url = this.config.baseUrl;
    
    // Handle trailing and leading slashes to properly join URL parts
    if (url.endsWith('/') && endpoint.startsWith('/')) {
      url = url + endpoint.substring(1);
    } else if (!url.endsWith('/') && !endpoint.startsWith('/')) {
      url = url + '/' + endpoint;
    } else {
      url = url + endpoint;
    }
    
    return url;
  }

  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }
}

// Export singleton instance
export const apiService = new APIService();
