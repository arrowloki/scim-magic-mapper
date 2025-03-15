
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
    console.log('API config saved:', config);
  }

  getConfig(): APIConfig | null {
    if (!this.config) {
      const storedConfig = localStorage.getItem('scim_mapper_api_config');
      if (storedConfig) {
        try {
          this.config = JSON.parse(storedConfig);
          console.log('Loaded stored API config:', this.config);
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
        console.log(`Loaded ${this.history.length} history items from storage`);
      } catch (error) {
        console.error('Failed to parse stored history:', error);
        this.history = [];
      }
    }
  }

  private addHistoryItem(item: APIHistory): void {
    console.log('Adding history item:', item);
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
      console.error('No API configuration set');
      throw new Error('API configuration not set');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (this.config.authType) {
      case 'apiKey':
        if (!this.config.apiKey) {
          console.error('API Key is required but missing');
          throw new Error('API Key is required');
        }
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        console.log('Using API Key authentication');
        break;
        
      case 'basic':
        if (!this.config.username || !this.config.password) {
          console.error('Username and password are required but missing');
          throw new Error('Username and password are required');
        }
        const credentials = btoa(`${this.config.username}:${this.config.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
        console.log('Using Basic authentication');
        break;
        
      case 'oauth':
        try {
          const token = await this.getOAuthToken();
          headers['Authorization'] = `Bearer ${token}`;
          console.log('Using OAuth authentication with acquired token');
        } catch (error) {
          console.error('OAuth token acquisition failed:', error);
          toast.error('Authentication failed', {
            description: 'Could not acquire OAuth token. Check your credentials.',
          });
          throw error;
        }
        break;
        
      case 'none':
        console.log('No authentication used');
        break;
        
      default:
        console.error(`Unsupported auth type: ${this.config.authType}`);
        throw new Error(`Unsupported auth type: ${this.config.authType}`);
    }

    return headers;
  }

  private async getOAuthToken(): Promise<string> {
    if (!this.config) {
      console.error('API configuration not set');
      throw new Error('API configuration not set');
    }
    
    if (
      this.accessToken && 
      this.tokenExpiry && 
      this.tokenExpiry > new Date()
    ) {
      console.log('Using cached OAuth token');
      return this.accessToken;
    }

    if (
      !this.config.tokenUrl || 
      !this.config.clientId || 
      !this.config.clientSecret
    ) {
      console.error('OAuth configuration incomplete');
      throw new Error('OAuth configuration incomplete');
    }

    console.log('Requesting new OAuth token');
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
        const errorText = await response.text();
        console.error(`OAuth token request failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`OAuth token request failed: ${response.status} ${response.statusText}`);
      }
      
      const tokenResponse = await response.json();
      
      if (!tokenResponse.access_token) {
        console.error('Invalid OAuth response: missing access_token', tokenResponse);
        throw new Error('Invalid OAuth response: missing access_token');
      }
      
      this.accessToken = tokenResponse.access_token;
      this.tokenExpiry = new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000);
      console.log('OAuth token acquired successfully');
      
      return this.accessToken;
    } catch (error) {
      console.error('OAuth token acquisition failed:', error);
      throw new Error('Failed to acquire OAuth token');
    }
  }

  async fetchData(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.config) {
      console.error('API configuration not set');
      throw new Error('API configuration not set');
    }

    const startTime = performance.now();
    let status = 0;
    let success = false;
    
    try {
      const url = this.buildUrl(endpoint);
      
      // Only get auth headers if auth type is not 'none'
      const headers = this.config.authType !== 'none' 
        ? await this.getAuthHeaders()
        : { 'Content-Type': 'application/json' };
      
      console.log(`Making API request to: ${url}`);
      console.log('With headers:', JSON.stringify(headers));
      console.log('With options:', JSON.stringify({
        ...options,
        body: options.body ? '(request body present)' : undefined
      }));
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      });

      status = response.status;
      const duration = performance.now() - startTime;
      console.log(`Response status: ${status}, duration: ${duration}ms`);
      
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('JSON response received:', responseData);
      } else {
        const textData = await response.text();
        console.log('Non-JSON response received:', textData);
        
        try {
          // Try to parse as JSON anyway in case the content-type header is wrong
          responseData = JSON.parse(textData);
          console.log('Successfully parsed response as JSON despite content-type');
        } catch (e) {
          // If it's not valid JSON, use the text as is
          responseData = { text: textData };
          console.log('Using text response as is');
        }
      }
      
      if (!response.ok) {
        console.error('API Error Response:', responseData);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      success = true;
      
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
      console.error('API request failed:', error);
      
      // Add failed request to history
      this.addHistoryItem({
        timestamp: Date.now(),
        method: options.method || 'GET',
        endpoint,
        status,
        duration,
        success
      });
      
      toast.error('API request failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.config) {
        console.error('API configuration not set');
        throw new Error('API configuration not set');
      }
      
      console.log('Testing connection to API...');
      
      // Try to fetch a dummy endpoint or the root endpoint
      // Use a simple HEAD request first to minimize data transfer
      const url = this.buildUrl('/');
      
      const headers = this.config.authType !== 'none' 
        ? await this.getAuthHeaders()
        : {};
      
      const response = await fetch(url, {
        method: 'HEAD',
        headers
      });
      
      console.log(`Connection test result: ${response.status} ${response.statusText}`);
      
      // Even if the server returns an error code, if we get a response
      // we consider the connection successful
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
    
    // Remove trailing slash from base URL if present
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    
    // Remove leading slash from endpoint if present
    if (endpoint.startsWith('/')) {
      endpoint = endpoint.slice(1);
    }
    
    // Handle empty endpoint
    if (endpoint === '') {
      return url;
    }
    
    // Combine with forward slash
    return `${url}/${endpoint}`;
  }

  clearHistory(): void {
    console.log('Clearing API request history');
    this.history = [];
    this.saveHistory();
  }
}

// Add 'none' as a valid auth type option
export const authTypes = ['apiKey', 'basic', 'oauth', 'none'];

// Export singleton instance
export const apiService = new APIService();
