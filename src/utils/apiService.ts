
import { toast } from "sonner";

// Define the history item interface
export interface APIHistory {
  timestamp: number;
  method: string;
  endpoint: string;
  baseUrl?: string;
  status: number;
  duration: number;
  success: boolean;
  requestData?: any;
  responseData?: any;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, any>;
}

// API configuration interface
interface APIConfig {
  baseUrl: string;
  authType: 'none' | 'basic' | 'bearer' | 'custom';
  username?: string;
  password?: string;
  token?: string;
  customHeaderName?: string;
  customHeaderValue?: string;
}

class ApiService {
  private config: APIConfig | null = null;
  private history: APIHistory[] = [];
  
  // Set API configuration
  setConfig(config: APIConfig): void {
    this.config = config;
    console.log('API configuration set:', JSON.stringify({
      ...config,
      password: config.password ? '****' : undefined,
      token: config.token ? '****' : undefined
    }));
  }
  
  // Get current API configuration
  getConfig(): APIConfig | null {
    return this.config;
  }
  
  // Build the full URL
  private buildUrl(endpoint: string): string {
    if (!this.config) {
      throw new Error('API configuration not set');
    }
    
    let baseUrl = this.config.baseUrl;
    
    // Handle trailing/leading slashes for proper URL formation
    if (baseUrl.endsWith('/') && endpoint.startsWith('/')) {
      return baseUrl + endpoint.substring(1);
    } else if (!baseUrl.endsWith('/') && !endpoint.startsWith('/')) {
      return baseUrl + '/' + endpoint;
    }
    
    return baseUrl + endpoint;
  }
  
  // Get authentication headers based on auth type
  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.config) {
      throw new Error('API configuration not set');
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    switch (this.config.authType) {
      case 'basic':
        if (this.config.username && this.config.password) {
          const credentials = btoa(`${this.config.username}:${this.config.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
        
      case 'bearer':
        if (this.config.token) {
          headers['Authorization'] = `Bearer ${this.config.token}`;
        }
        break;
        
      case 'custom':
        if (this.config.customHeaderName && this.config.customHeaderValue) {
          headers[this.config.customHeaderName] = this.config.customHeaderValue;
        }
        break;
    }
    
    return headers;
  }
  
  async fetchData(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.config) {
      console.error('API configuration not set');
      throw new Error('API configuration not set');
    }

    const startTime = performance.now();
    let status = 0;
    let success = false;
    let responseData;
    let responseHeaders = {};
    
    try {
      const url = this.buildUrl(endpoint);
      
      // Only get auth headers if auth type is not 'none'
      const requestHeaders = this.config.authType !== 'none' 
        ? await this.getAuthHeaders()
        : { 'Content-Type': 'application/json' };
      
      console.log(`Making API request to: ${url}`);
      console.log('With headers:', JSON.stringify(requestHeaders));
      console.log('With options:', JSON.stringify({
        ...options,
        body: options.body ? '(request body present)' : undefined
      }));
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...requestHeaders,
          ...(options.headers || {})
        }
      });

      status = response.status;
      const duration = performance.now() - startTime;
      console.log(`Response status: ${status}, duration: ${duration}ms`);
      
      // Extract response headers
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('JSON response received:', responseData);
        
        // Special handling for DummyJSON API response format
        if (responseData.users && Array.isArray(responseData.users)) {
          // When getting a list of users, return the users array
          responseData = responseData.users;
        }
      } else {
        const textData = await response.text();
        console.log('Non-JSON response received:', textData);
        
        try {
          // Try to parse as JSON anyway in case the content-type header is wrong
          responseData = JSON.parse(textData);
          console.log('Successfully parsed response as JSON despite content-type');
          
          // Special handling for DummyJSON API response format
          if (responseData.users && Array.isArray(responseData.users)) {
            // When getting a list of users, return the users array
            responseData = responseData.users;
          }
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
      
      // Add to history with enhanced data
      this.addHistoryItem({
        timestamp: Date.now(),
        method: options.method || 'GET',
        endpoint,
        baseUrl: this.config.baseUrl,
        status,
        duration,
        success,
        requestData: options.body ? JSON.parse(options.body.toString()) : undefined,
        responseData,
        requestHeaders,
        responseHeaders
      });
      
      return responseData;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error('API request failed:', error);
      
      // Add failed request to history with enhanced data
      this.addHistoryItem({
        timestamp: Date.now(),
        method: options.method || 'GET',
        endpoint,
        baseUrl: this.config?.baseUrl,
        status,
        duration,
        success,
        requestData: options.body ? JSON.parse(options.body.toString()) : undefined,
        responseData,
        requestHeaders: options.headers as Record<string, string>,
        responseHeaders
      });
      
      toast.error('API request failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
  
  // Add an item to the history
  private addHistoryItem(item: APIHistory): void {
    this.history.unshift(item); // Add to the start of the array
    
    // Limit history to 50 items
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }
  }
  
  // Get the request history
  getHistory(): APIHistory[] {
    return this.history;
  }
  
  // Clear the request history
  clearHistory(): void {
    this.history = [];
  }
}

// Export a singleton instance of the service
export const apiService = new ApiService();
