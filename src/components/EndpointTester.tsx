
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, Play, RefreshCw, Search, User } from "lucide-react";
import { toast } from "sonner";
import { apiService } from '@/utils/apiService';
import { scimUtils } from '@/utils/scimUtils';

interface EndpointTesterProps {
  isConfigured: boolean;
}

const EndpointTester: React.FC<EndpointTesterProps> = ({ isConfigured }) => {
  const [operation, setOperation] = useState('get');
  const [endpoint, setEndpoint] = useState('/users');
  const [resourceType, setResourceType] = useState('Users');
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [rawData, setRawData] = useState<any>(null);
  
  // Sample SCIM user for testing
  const sampleUserData = {
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
    "userName": "john.doe@example.com",
    "name": {
      "givenName": "John",
      "familyName": "Doe"
    },
    "emails": [
      {
        "value": "john.doe@example.com",
        "primary": true
      }
    ],
    "active": true,
    "displayName": "John Doe",
    "externalId": "12345"
  };
  
  const handleRunTest = async () => {
    if (!isConfigured) {
      toast.error('Configuration incomplete', {
        description: 'Please configure your API and schema mapping first.',
      });
      return;
    }
    
    setIsLoading(true);
    setTestResults(null);
    setResponseTime(null);
    setRawData(null);
    
    const startTime = performance.now();
    
    try {
      let finalEndpoint = endpoint;
      
      // Add filter if applicable
      if (operation === 'get' && filter) {
        const separator = finalEndpoint.includes('?') ? '&' : '?';
        finalEndpoint += `${separator}filter=${encodeURIComponent(filter)}`;
      }
      
      // Make API request
      let responseData;
      
      switch (operation) {
        case 'get':
          responseData = await apiService.fetchData(finalEndpoint);
          break;
          
        case 'create':
          responseData = await apiService.fetchData(finalEndpoint, {
            method: 'POST',
            body: JSON.stringify(sampleUserData)
          });
          break;
          
        case 'update':
          responseData = await apiService.fetchData(`${finalEndpoint}/12345`, {
            method: 'PUT',
            body: JSON.stringify(sampleUserData)
          });
          break;
          
        case 'delete':
          responseData = await apiService.fetchData(`${finalEndpoint}/12345`, {
            method: 'DELETE'
          });
          break;
      }
      
      // Calculate response time
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      
      // Store raw response
      setRawData(responseData);
      
      // Transform to SCIM if needed
      if (responseData) {
        try {
          // For list responses, we might need to handle arrays
          if (operation === 'get' && Array.isArray(responseData)) {
            const scimUsers = responseData.map(user => 
              scimUtils.transformToScim(user, 'User')
            );
            
            setTestResults({
              "totalResults": scimUsers.length,
              "itemsPerPage": scimUsers.length,
              "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
              "Resources": scimUsers
            });
          } else {
            // For single item responses
            const scimData = scimUtils.transformToScim(responseData, 'User');
            setTestResults(scimData);
          }
        } catch (error) {
          console.error('Error transforming to SCIM:', error);
          // If transformation fails, show raw data
          setTestResults(responseData);
        }
      }
      
      toast.success('Test completed successfully', {
        description: `Operation completed in ${Math.round(endTime - startTime)}ms`,
      });
    } catch (error) {
      console.error('API test failed:', error);
      toast.error('Test failed', {
        description: error instanceof Error ? error.message : 'Unknown error during API test',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full shadow-card animate-scale-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          <span>Endpoint Tester</span>
        </CardTitle>
        <CardDescription>
          Test your API endpoints with SCIM mapping.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="operation">Operation</Label>
            <Select
              value={operation}
              onValueChange={setOperation}
            >
              <SelectTrigger id="operation">
                <SelectValue placeholder="Select operation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="get">GET (List/Read)</SelectItem>
                <SelectItem value="create">CREATE</SelectItem>
                <SelectItem value="update">UPDATE</SelectItem>
                <SelectItem value="delete">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="endpoint">API Endpoint</Label>
            <Input
              id="endpoint"
              placeholder="/users"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="resourceType">SCIM Resource Type</Label>
            <Select
              value={resourceType}
              onValueChange={setResourceType}
            >
              <SelectTrigger id="resourceType">
                <SelectValue placeholder="Select resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Users">Users</SelectItem>
                <SelectItem value="Groups">Groups</SelectItem>
                <SelectItem value="ServiceProviderConfig">Service Provider Config</SelectItem>
                <SelectItem value="Schemas">Schemas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {operation === 'get' && (
            <div className="space-y-2">
              <Label htmlFor="filter">Filter (Optional)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="filter"
                  placeholder="name=John"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}
        </div>
        
        {operation === 'create' && (
          <div className="space-y-2">
            <Label>Request Payload</Label>
            <div className="relative bg-muted/50 rounded-md p-4 font-mono text-sm overflow-hidden">
              <ScrollArea className="h-60">
                <pre className="text-xs sm:text-sm">
                  {JSON.stringify(sampleUserData, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="flex-col space-y-4 pt-6">
        <Button
          className="w-full sm:w-auto transition-all-200"
          onClick={handleRunTest}
          disabled={isLoading || !isConfigured}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Run Test
        </Button>
        
        {responseTime !== null && (
          <div className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Response time: {responseTime}ms</span>
          </div>
        )}
        
        {testResults && (
          <div className="w-full">
            <Tabs defaultValue="formatted">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Response
                </Label>
                <TabsList>
                  <TabsTrigger value="formatted" className="text-xs px-2 py-1 h-7">Formatted</TabsTrigger>
                  <TabsTrigger value="raw" className="text-xs px-2 py-1 h-7">Raw</TabsTrigger>
                  <TabsTrigger value="source" className="text-xs px-2 py-1 h-7">Source</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="formatted">
                <div className="bg-muted/50 rounded-md p-4 font-mono text-sm">
                  <ScrollArea className="h-60">
                    {operation === 'get' && testResults.Resources && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          Found {testResults.totalResults} users
                        </p>
                        {testResults.Resources.map((user: any, index: number) => (
                          <div key={index} className="border border-border rounded-md p-3 bg-background/50">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-primary" />
                              <span className="font-semibold">{user.displayName || 'User'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <div>Username:</div>
                              <div>{user.userName || 'N/A'}</div>
                              <div>Name:</div>
                              <div>{user.name?.givenName} {user.name?.familyName}</div>
                              <div>Email:</div>
                              <div>{user.emails?.[0]?.value || 'N/A'}</div>
                              <div>Status:</div>
                              <div>
                                {user.active ? (
                                  <span className="text-green-500 font-medium">Active</span>
                                ) : (
                                  <span className="text-red-500 font-medium">Inactive</span>
                                )}
                              </div>
                              <div>External ID:</div>
                              <div>{user.externalId || 'N/A'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {operation !== 'get' && (
                      <pre className="text-xs sm:text-sm">
                        {JSON.stringify(testResults, null, 2)}
                      </pre>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
              
              <TabsContent value="raw">
                <div className="bg-muted/50 rounded-md p-4 font-mono text-sm">
                  <ScrollArea className="h-60">
                    <pre className="text-xs sm:text-sm">
                      {JSON.stringify(testResults, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </TabsContent>
              
              <TabsContent value="source">
                <div className="bg-muted/50 rounded-md p-4 font-mono text-sm">
                  <ScrollArea className="h-60">
                    <pre className="text-xs sm:text-sm">
                      {JSON.stringify(rawData, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default EndpointTester;
