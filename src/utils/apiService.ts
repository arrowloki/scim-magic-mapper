
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
  applicationId?: string;
}

// API configuration interface
export interface APIConfig {
  baseUrl: string;
  authType: 'none' | 'basic' | 'bearer' | 'custom' | 'apiKey' | 'oauth';
  username?: string;
  password?: string;
  token?: string;
  customHeaderName?: string;
  customHeaderValue?: string;
  name?: string;
  apiKey?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

class ApiService {
  private currentConfig: APIConfig | null = null;
  private configStore: Map<string, APIConfig> = new Map();
  private history: APIHistory[] = [];
  
  // Set API configuration for a specific application
  setConfig(config: APIConfig, applicationId?: string): void {
    this.currentConfig = config;
    
    if (applicationId) {
      this.configStore.set(applicationId, config);
    }
    
    console.log('API configuration set:', JSON.stringify({
      ...config,
      password: config.password ? '****' : undefined,
      token: config.token ? '****' : undefined,
      apiKey: config.apiKey ? '****' : undefined,
      clientSecret: config.clientSecret ? '****' : undefined
    }));
  }
  
  // Get current API configuration
  getConfig(applicationId?: string): APIConfig | null {
    if (applicationId && this.configStore.has(applicationId)) {
      return this.configStore.get(applicationId) || null;
    }
    return this.currentConfig;
  }
  
  // Test connection to the API
  async testConnection(applicationId?: string): Promise<boolean> {
    const config = applicationId ? this.configStore.get(applicationId) : this.currentConfig;
    
    if (!config) {
      throw new Error('API configuration not set');
    }
    
    try {
      // For DummyJSON, use a specific test endpoint
      if (config.baseUrl.includes('dummyjson.com')) {
        // Try to get the first user
        await this.fetchData('1', { method: 'GET' }, applicationId);
      } 
      // For JSONPlaceholder, use a specific test endpoint
      else if (config.baseUrl.includes('jsonplaceholder.typicode.com')) {
        // Try to get the first user
        await this.fetchData('1', { method: 'GET' }, applicationId);
      } else {
        // Attempt a simple GET request to verify connection for other APIs
        await this.fetchData('', { method: 'GET' }, applicationId);
      }
      return true;
    } catch (error) {
      console.error('Test connection failed:', error);
      return false;
    }
  }
  
  // Build the full URL
  private buildUrl(endpoint: string, applicationId?: string): string {
    const config = applicationId ? this.configStore.get(applicationId) : this.currentConfig;
    
    if (!config) {
      throw new Error('API configuration not set');
    }
    
    let baseUrl = config.baseUrl;
    
    // Special handling for DummyJSON API
    if (baseUrl.includes('dummyjson.com')) {
      // Check if the URL already includes /users
      if (!baseUrl.includes('/users')) {
        // Remove trailing slash if present
        baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        baseUrl = `${baseUrl}/users`;
      }
      
      // For empty endpoints, return base URL
      if (!endpoint) {
        return baseUrl;
      }
      
      // For numeric IDs, format correctly
      if (/^\d+$/.test(endpoint)) {
        return `${baseUrl}/${endpoint}`;
      }
    }
    
    // Special handling for JSONPlaceholder API
    if (baseUrl.includes('jsonplaceholder.typicode.com')) {
      // Check if the URL already includes /users
      if (!baseUrl.includes('/users')) {
        // Remove trailing slash if present
        baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        baseUrl = `${baseUrl}/users`;
      }
      
      // For empty endpoints, return base URL
      if (!endpoint) {
        return baseUrl;
      }
      
      // For numeric IDs, format correctly
      if (/^\d+$/.test(endpoint)) {
        return `${baseUrl}/${endpoint}`;
      }
    }
    
    // Handle trailing/leading slashes for proper URL formation
    if (baseUrl.endsWith('/') && endpoint.startsWith('/')) {
      return baseUrl + endpoint.substring(1);
    } else if (!baseUrl.endsWith('/') && !endpoint.startsWith('/') && endpoint) {
      return baseUrl + '/' + endpoint;
    }
    
    return baseUrl + endpoint;
  }
  
  // Get authentication headers based on auth type
  private async getAuthHeaders(applicationId?: string): Promise<Record<string, string>> {
    const config = applicationId ? this.configStore.get(applicationId) : this.currentConfig;
    
    if (!config) {
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
        
      case 'apiKey':
        if (this.config.apiKey) {
          // Commonly used as a query parameter or header
          headers['X-API-Key'] = this.config.apiKey;
        }
        break;
        
      case 'oauth':
        if (this.config.token) {
          headers['Authorization'] = `Bearer ${this.config.token}`;
        }
        break;
    }
    
    return headers;
  }
  
  async fetchData(endpoint: string, options: RequestInit = {}, applicationId?: string): Promise<any> {
    const config = applicationId ? this.configStore.get(applicationId) : this.currentConfig;
    
    if (!config) {
      console.error('API configuration not set');
      throw new Error('API configuration not set');
    }

    const startTime = performance.now();
    let status = 0;
    let success = false;
    let responseData;
    let responseHeaders = {};
    
    try {
      const url = this.buildUrl(endpoint, applicationId);
      
      // Only get auth headers if auth type is not 'none' 
      const requestHeaders = config.authType !== 'none' 
        ? await this.getAuthHeaders(applicationId)
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
        if (config.baseUrl.includes('dummyjson.com')) {
          if (responseData.users && Array.isArray(responseData.users)) {
            // When getting a list of users, return the users array
            responseData = responseData.users;
          }
        }
        
        // No special handling needed for JSONPlaceholder as it returns arrays directly
      } else {
        const textData = await response.text();
        console.log('Non-JSON response received:', textData);
        
        try {
          // Try to parse as JSON anyway in case the content-type header is wrong
          responseData = JSON.parse(textData);
          console.log('Successfully parsed response as JSON despite content-type');
          
          // Special handling for DummyJSON API response format
          if (config.baseUrl.includes('dummyjson.com')) {
            if (responseData.users && Array.isArray(responseData.users)) {
              // When getting a list of users, return the users array
              responseData = responseData.users;
            }
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
        baseUrl: config.baseUrl,
        status,
        duration,
        success,
        requestData: options.body ? JSON.parse(options.body.toString()) : undefined,
        responseData,
        requestHeaders,
        responseHeaders,
        applicationId
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
        baseUrl: config?.baseUrl,
        status,
        duration,
        success,
        requestData: options.body ? JSON.parse(options.body.toString()) : undefined,
        responseData,
        requestHeaders: options.headers as Record<string, string>,
        responseHeaders,
        applicationId
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
  
  // Get the request history, optionally filtered by applicationId
  getHistory(applicationId?: string): APIHistory[] {
    if (applicationId) {
      return this.history.filter(item => item.applicationId === applicationId);
    }
    return this.history;
  }
  
  // Clear the request history, optionally for a specific application
  clearHistory(applicationId?: string): void {
    if (applicationId) {
      this.history = this.history.filter(item => item.applicationId !== applicationId);
    } else {
      this.history = [];
    }
  }
}

// Export a singleton instance of the service
export const apiService = new ApiService();
