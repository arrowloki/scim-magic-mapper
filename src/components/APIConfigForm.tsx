
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowRight, Check, Database, Key, Lock, RefreshCw } from "lucide-react";
import { apiService, APIConfig } from '@/utils/apiService';

interface APIConfigFormProps {
  onConfigSave: (config: APIConfig) => void;
}

const APIConfigForm: React.FC<APIConfigFormProps> = ({ onConfigSave }) => {
  const [config, setConfig] = useState<APIConfig>({
    name: '',
    baseUrl: '',
    authType: 'apiKey',
    apiKey: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Load existing configuration if available
    const existingConfig = apiService.getConfig();
    if (existingConfig) {
      setConfig(existingConfig);
    }
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAuthTypeChange = (value: 'none' | 'basic' | 'bearer' | 'custom' | 'apiKey' | 'oauth') => {
    setConfig(prev => ({ ...prev, authType: value }));
  };
  
  const handleTestConnection = async () => {
    // Validate form first
    if (!config.name || !config.baseUrl) {
      toast.error('Missing required fields', {
        description: 'Please fill in all required fields.',
      });
      return;
    }
    
    // Additional validation based on auth type
    if (config.authType === 'apiKey' && !config.apiKey) {
      toast.error('API Key required', {
        description: 'Please enter an API Key for API Key authentication.',
      });
      return;
    } else if (config.authType === 'basic' && (!config.username || !config.password)) {
      toast.error('Credentials required', {
        description: 'Please enter both username and password for Basic authentication.',
      });
      return;
    } else if (config.authType === 'oauth' && (!config.tokenUrl || !config.clientId || !config.clientSecret)) {
      toast.error('OAuth details required', {
        description: 'Please enter all OAuth configuration details.',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Temporarily set the config for testing
      apiService.setConfig(config);
      
      // Test the connection
      const success = await apiService.testConnection();
      
      if (success) {
        toast.success('Connection successful!', {
          description: 'Your API connection is working properly.',
        });
      } else {
        toast.error('Connection failed', {
          description: 'Could not connect to the API. Please check your configuration.',
        });
      }
    } catch (error) {
      console.error('Test connection error:', error);
      toast.error('Connection failed', {
        description: error instanceof Error ? error.message : 'Unknown error during connection test',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = () => {
    // Validate form
    if (!config.name || !config.baseUrl) {
      toast.error('Missing required fields', {
        description: 'Please fill in all required fields.',
      });
      return;
    }
    
    // Additional validation based on auth type
    if (config.authType === 'apiKey' && !config.apiKey) {
      toast.error('API Key required', {
        description: 'Please enter an API Key for API Key authentication.',
      });
      return;
    } else if (config.authType === 'basic' && (!config.username || !config.password)) {
      toast.error('Credentials required', {
        description: 'Please enter both username and password for Basic authentication.',
      });
      return;
    } else if (config.authType === 'oauth' && (!config.tokenUrl || !config.clientId || !config.clientSecret)) {
      toast.error('OAuth details required', {
        description: 'Please enter all OAuth configuration details.',
      });
      return;
    }
    
    // Save configuration
    onConfigSave(config);
    toast.success('Configuration saved', {
      description: 'Your API configuration has been saved.',
    });
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto shadow-card animate-scale-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <span>API Configuration</span>
        </CardTitle>
        <CardDescription>
          Configure your source API details to connect and map to SCIM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">API Name</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="My API Service"
              value={config.name}
              onChange={handleChange}
              className="transition-all-200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input 
              id="baseUrl" 
              name="baseUrl" 
              placeholder="https://api.example.com/v1"
              value={config.baseUrl}
              onChange={handleChange}
              className="transition-all-200"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Authentication</Label>
          <Tabs defaultValue={config.authType} onValueChange={handleAuthTypeChange} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="apiKey">API Key</TabsTrigger>
              <TabsTrigger value="basic">Basic Auth</TabsTrigger>
              <TabsTrigger value="oauth">OAuth 2.0</TabsTrigger>
            </TabsList>
            
            <TabsContent value="apiKey" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="flex items-center gap-1">
                  <Key className="h-3.5 w-3.5" />
                  <span>API Key</span>
                </Label>
                <Input 
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  placeholder="sk_123abc..."
                  value={config.apiKey || ''}
                  onChange={handleChange}
                  className="font-mono"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username"
                    name="username"
                    placeholder="Username"
                    value={config.username || ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={config.password || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="oauth" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tokenUrl">Token URL</Label>
                <Input 
                  id="tokenUrl"
                  name="tokenUrl"
                  placeholder="https://auth.example.com/oauth/token"
                  value={config.tokenUrl || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input 
                    id="clientId"
                    name="clientId"
                    placeholder="Client ID"
                    value={config.clientId || ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input 
                    id="clientSecret"
                    name="clientSecret"
                    type="password"
                    placeholder="Client Secret"
                    value={config.clientSecret || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={handleTestConnection}
          disabled={isLoading}
          className="transition-all-200"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Lock className="h-4 w-4 mr-2" />
          )}
          Test Connection
        </Button>
        <Button 
          onClick={handleSave}
          className="transition-all-200"
        >
          <Check className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </CardFooter>
    </Card>
  );
};

export default APIConfigForm;
