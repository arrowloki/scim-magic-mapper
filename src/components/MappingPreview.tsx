import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Code, Database } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MappingItem {
  scimAttribute: string;
  sourceField: string;
  isRequired: boolean;
  transformation?: string;
}

interface MappingPreviewProps {
  mappings: MappingItem[];
  applicationId?: string;
}

const MappingPreview: React.FC<MappingPreviewProps> = ({ mappings, applicationId }) => {
  // Generate sample source data based on mappings
  const generateSampleSourceData = () => {
    const data: Record<string, any> = {};
    
    mappings.forEach(mapping => {
      if (mapping.sourceField) {
        // Handle simple fields
        if (!mapping.sourceField.includes('.')) {
          switch (mapping.sourceField) {
            case 'user_name':
              data[mapping.sourceField] = 'johndoe';
              break;
            case 'first_name':
              data[mapping.sourceField] = 'John';
              break;
            case 'last_name':
              data[mapping.sourceField] = 'Doe';
              break;
            case 'email':
              data[mapping.sourceField] = 'john.doe@example.com';
              break;
            case 'is_active':
              data[mapping.sourceField] = true;
              break;
            case 'phone':
              data[mapping.sourceField] = '+1 555-123-4567';
              break;
            case 'user_id':
              data[mapping.sourceField] = '12345';
              break;
            case 'profile_url':
              data[mapping.sourceField] = 'https://example.com/profiles/johndoe';
              break;
            default:
              data[mapping.sourceField] = `Sample ${mapping.sourceField}`;
          }
        } else {
          // Handle nested fields (not implemented for this example)
          const parts = mapping.sourceField.split('.');
          let current = data;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = `Sample ${parts[parts.length - 1]}`;
        }
      }
    });
    
    return data;
  };
  
  // Generate SCIM data based on mappings
  const generateScimData = () => {
    const sourceData = generateSampleSourceData();
    const scimData: Record<string, any> = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"]
    };
    
    mappings.forEach(mapping => {
      if (mapping.sourceField) {
        const value = sourceData[mapping.sourceField];
        let transformedValue = value;
        
        // Apply transformation if specified
        if (mapping.transformation) {
          try {
            // This is a simplified implementation and not secure for production
            // eslint-disable-next-line no-new-func
            const transform = new Function('value', `return ${mapping.transformation}`);
            transformedValue = transform(value);
          } catch (error) {
            console.error(`Error applying transformation for ${mapping.scimAttribute}:`, error);
          }
        }
        
        // Set the value in the SCIM data structure
        if (mapping.scimAttribute.includes('.')) {
          const parts = mapping.scimAttribute.split('.');
          let current = scimData;
          
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }
          
          current[parts[parts.length - 1]] = transformedValue;
        } else if (mapping.scimAttribute.includes('[')) {
          // Handle array paths like emails[0].value
          const mainPart = mapping.scimAttribute.split('[')[0];
          const arrayIndex = parseInt(mapping.scimAttribute.split('[')[1].split(']')[0]);
          const remainingPath = mapping.scimAttribute.split(']')[1].substring(1); // remove the leading .
          
          if (!scimData[mainPart]) {
            scimData[mainPart] = [];
          }
          
          while (scimData[mainPart].length <= arrayIndex) {
            scimData[mainPart].push({});
          }
          
          if (remainingPath) {
            scimData[mainPart][arrayIndex][remainingPath] = transformedValue;
          } else {
            scimData[mainPart][arrayIndex] = transformedValue;
          }
        } else {
          scimData[mapping.scimAttribute] = transformedValue;
        }
      }
    });
    
    // Add default metadata
    scimData.meta = {
      resourceType: "User",
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      location: "https://example.com/scim/v2/Users/12345"
    };
    
    return scimData;
  };
  
  const sampleSourceData = generateSampleSourceData();
  const sampleScimData = generateScimData();
  
  return (
    <Card className="w-full shadow-card animate-scale-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5 text-primary" />
          <span>Mapping Preview</span>
        </CardTitle>
        <CardDescription>
          Preview how your source API data will be mapped to SCIM format.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="visual">Visual</TabsTrigger>
            <TabsTrigger value="source">Source JSON</TabsTrigger>
            <TabsTrigger value="scim">SCIM JSON</TabsTrigger>
          </TabsList>
          
          <TabsContent value="visual" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-muted/30 rounded-md p-4 border border-border relative">
                <div className="text-sm font-medium mb-3 flex items-center gap-1">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span>Source API Data</span>
                </div>
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {Object.entries(sampleSourceData).map(([key, value]) => (
                      <div 
                        key={key} 
                        className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 text-sm"
                      >
                        <div className="bg-background border border-border rounded-md p-2 overflow-hidden text-ellipsis">
                          <span className="font-mono text-xs">{key}</span>
                          <div className="mt-1 text-xs text-muted-foreground overflow-hidden text-ellipsis">
                            {typeof value === 'object' 
                              ? JSON.stringify(value) 
                              : String(value)
                            }
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <ArrowRight className="h-4 w-4 text-primary" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {mappings.find(m => m.sourceField === key)?.transformation
                              ? 'Transform'
                              : 'Map'
                            }
                          </div>
                        </div>
                        <div className="bg-background border border-primary/20 rounded-md p-2 overflow-hidden text-ellipsis">
                          <span className="font-mono text-xs text-primary">
                            {mappings.find(m => m.sourceField === key)?.scimAttribute || 'Not mapped'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <div className="bg-muted/30 rounded-md p-4 border border-border">
                <div className="text-sm font-medium mb-3 flex items-center gap-1">
                  <Code className="h-4 w-4 text-primary" />
                  <span>SCIM Data</span>
                </div>
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {/* Simplified visual representation of SCIM data */}
                    <div className="bg-background border border-border rounded-md p-3">
                      <div className="text-xs font-medium mb-2">User Identity</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-muted-foreground">Username:</div>
                        <div>{sampleScimData.userName}</div>
                        <div className="text-muted-foreground">External ID:</div>
                        <div>{sampleScimData.externalId || 'Not mapped'}</div>
                      </div>
                    </div>
                    
                    <div className="bg-background border border-border rounded-md p-3">
                      <div className="text-xs font-medium mb-2">Name Information</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-muted-foreground">First Name:</div>
                        <div>{sampleScimData.name?.givenName}</div>
                        <div className="text-muted-foreground">Last Name:</div>
                        <div>{sampleScimData.name?.familyName}</div>
                        <div className="text-muted-foreground">Display Name:</div>
                        <div>{sampleScimData.displayName || 'Not mapped'}</div>
                      </div>
                    </div>
                    
                    <div className="bg-background border border-border rounded-md p-3">
                      <div className="text-xs font-medium mb-2">Contact Information</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-muted-foreground">Email:</div>
                        <div>{sampleScimData.emails?.[0]?.value || 'Not mapped'}</div>
                        <div className="text-muted-foreground">Phone:</div>
                        <div>{sampleScimData.phoneNumbers?.[0]?.value || 'Not mapped'}</div>
                      </div>
                    </div>
                    
                    <div className="bg-background border border-border rounded-md p-3">
                      <div className="text-xs font-medium mb-2">Status</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-muted-foreground">Active:</div>
                        <div>
                          {sampleScimData.active !== undefined ? (
                            <span className={sampleScimData.active ? "text-green-500" : "text-red-500"}>
                              {sampleScimData.active ? "Active" : "Inactive"}
                            </span>
                          ) : (
                            'Not mapped'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="source">
            <div className="bg-muted/30 rounded-md p-4 border border-border overflow-hidden">
              <ScrollArea className="h-80">
                <pre className="text-xs sm:text-sm font-mono">
                  {JSON.stringify(sampleSourceData, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="scim">
            <div className="bg-muted/30 rounded-md p-4 border border-border overflow-hidden">
              <ScrollArea className="h-80">
                <pre className="text-xs sm:text-sm font-mono">
                  {JSON.stringify(sampleScimData, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MappingPreview;
