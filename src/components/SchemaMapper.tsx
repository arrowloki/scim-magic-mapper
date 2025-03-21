
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Info, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/utils/apiService";

// Sample SCIM attributes
const scimAttributes = [
  { id: 'userName', name: 'Username', required: true },
  { id: 'name.givenName', name: 'First Name', required: true },
  { id: 'name.familyName', name: 'Last Name', required: true },
  { id: 'displayName', name: 'Display Name', required: false },
  { id: 'emails[0].value', name: 'Primary Email', required: true },
  { id: 'active', name: 'Active Status', required: false },
  { id: 'externalId', name: 'External ID', required: false },
  { id: 'phoneNumbers[0].value', name: 'Phone Number', required: false },
];

interface MappingItem {
  scimAttribute: string;
  sourceField: string;
  isRequired: boolean;
  transformation?: string;
}

interface SchemaMapperProps {
  onMappingSave: (mappings: MappingItem[]) => void;
  initialMappings?: MappingItem[];
  applicationId?: string;
}

const SchemaMapper: React.FC<SchemaMapperProps> = ({ 
  onMappingSave, 
  initialMappings,
  applicationId 
}) => {
  const [mappings, setMappings] = useState<MappingItem[]>([
    { scimAttribute: 'userName', sourceField: '', isRequired: true },
    { scimAttribute: 'name.givenName', sourceField: '', isRequired: true },
    { scimAttribute: 'name.familyName', sourceField: '', isRequired: true },
    { scimAttribute: 'emails[0].value', sourceField: '', isRequired: true },
    { scimAttribute: 'active', sourceField: '', isRequired: false },
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [sourceFields, setSourceFields] = useState<{id: string, name: string}[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [fieldsFetchFailed, setFieldsFetchFailed] = useState(false);
  
  // Load initial mappings if provided
  useEffect(() => {
    if (initialMappings && initialMappings.length > 0) {
      setMappings(initialMappings);
    }
  }, [initialMappings]);
  
  // Extract all fields including nested ones from an object
  const extractFields = (obj: any, prefix = '') => {
    let fields: {id: string, name: string}[] = [];
    
    if (!obj || typeof obj !== 'object') {
      console.warn('Invalid object for field extraction', obj);
      return fields;
    }
    
    for (const key in obj) {
      const value = obj[key];
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      
      // Skip functions and complex objects like Dates
      if (typeof value === 'function' || value instanceof Date) {
        continue;
      }
      
      // Add the current field
      fields.push({ id: fieldPath, name: fieldPath });
      
      // Recurse for nested objects, but not arrays or null
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        fields = [...fields, ...extractFields(value, fieldPath)];
      }
      
      // Handle array of objects
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        fields.push({ id: `${fieldPath}[0]`, name: `${fieldPath}[0]` });
        
        // Also include the first array element's fields
        if (value[0] && typeof value[0] === 'object') {
          for (const arrayKey in value[0]) {
            if (typeof value[0][arrayKey] !== 'function') {
              fields.push({ 
                id: `${fieldPath}[0].${arrayKey}`, 
                name: `${fieldPath}[0].${arrayKey}` 
              });
            }
          }
        }
      }
    }
    
    return fields;
  };
  
  // Fetch fields from the API
  useEffect(() => {
    const fetchSourceFields = async () => {
      const config = apiService.getConfig(applicationId);
      if (!config || !config.baseUrl) {
        console.error('API configuration not set, cannot fetch fields');
        setFieldsFetchFailed(true);
        return;
      }

      try {
        setIsLoadingFields(true);
        setFieldsFetchFailed(false);
        
        // For DummyJSON or JSONPlaceholder, we need to use a specific endpoint
        let endpoint = '';
        if (config.baseUrl.includes('dummyjson.com') || config.baseUrl.includes('jsonplaceholder.typicode.com')) {
          endpoint = '1'; // Fetch first user
        }

        // Fetch a sample user from the API
        const response = await apiService.fetchData(endpoint, { method: 'GET' }, applicationId);
        
        if (response) {
          // Extract all fields including nested ones
          const fields = extractFields(response);
          
          setSourceFields(fields);
          console.log('Loaded source fields:', fields);
          toast.success('Source fields loaded', {
            description: `${fields.length} fields discovered from the API.`,
          });
          
          // Set default mappings based on the response if no initial mappings
          if (!initialMappings || initialMappings.length === 0) {
            updateDefaultMappings(response);
          }
        } else {
          throw new Error('No data returned from API');
        }
      } catch (error) {
        console.error('Failed to load source fields:', error);
        setFieldsFetchFailed(true);
        toast.error('Failed to load fields', {
          description: 'Could not fetch fields from the API. Please check your API configuration.',
        });
        
        // Set default fields as fallback
        setSourceFields([
          { id: 'id', name: 'id' },
          { id: 'username', name: 'username' },
          { id: 'name', name: 'name' },
          { id: 'email', name: 'email' },
          { id: 'phone', name: 'phone' },
          { id: 'address', name: 'address' },
          { id: 'website', name: 'website' },
          { id: 'company', name: 'company' },
        ]);
      } finally {
        setIsLoadingFields(false);
      }
    };

    if (applicationId) {
      fetchSourceFields();
    }
  }, [applicationId, initialMappings]);
  
  // Manual refresh of fields
  const handleRefreshFields = async () => {
    const fetchSourceFields = async () => {
      const config = apiService.getConfig(applicationId);
      if (!config || !config.baseUrl) {
        toast.error('API configuration required', {
          description: 'Please configure the API first in the API Configuration tab.',
        });
        return;
      }

      try {
        setIsLoadingFields(true);
        setFieldsFetchFailed(false);
        
        // For DummyJSON or JSONPlaceholder, we need to use a specific endpoint
        let endpoint = '';
        if (config.baseUrl.includes('dummyjson.com') || config.baseUrl.includes('jsonplaceholder.typicode.com')) {
          endpoint = '1'; // Fetch first user
        }

        // Fetch a sample user from the API
        const response = await apiService.fetchData(endpoint, { method: 'GET' }, applicationId);
        
        if (response) {
          // Extract all fields including nested ones
          const fields = extractFields(response);
          
          setSourceFields(fields);
          console.log('Refreshed source fields:', fields);
          toast.success('Source fields refreshed', {
            description: `${fields.length} fields discovered from the API.`,
          });
          
          // Update default mappings based on the response
          updateDefaultMappings(response);
        } else {
          throw new Error('No data returned from API');
        }
      } catch (error) {
        console.error('Failed to refresh source fields:', error);
        setFieldsFetchFailed(true);
        toast.error('Failed to refresh fields', {
          description: 'Could not fetch fields from the API. Please check your API configuration.',
        });
      } finally {
        setIsLoadingFields(false);
      }
    };

    fetchSourceFields();
  };
  
  // Update default mappings based on the API response
  const updateDefaultMappings = (userResponse: any) => {
    const newMappings = [...mappings];
    
    // Try to match SCIM attributes with API fields
    
    // Username mapping
    if (userResponse.username) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'userName');
      if (index >= 0) newMappings[index].sourceField = 'username';
    }
    
    // Handle firstname/given name
    if (userResponse.firstName) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'name.givenName');
      if (index >= 0) newMappings[index].sourceField = 'firstName';
    } else if (userResponse.name && typeof userResponse.name === 'string') {
      // For JSONPlaceholder where name is a single string
      const index = newMappings.findIndex(m => m.scimAttribute === 'name.givenName');
      if (index >= 0) {
        newMappings[index].sourceField = 'name';
        newMappings[index].transformation = 'value.split(" ")[0]';
      }
    } else if (userResponse.name && userResponse.name.firstname) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'name.givenName');
      if (index >= 0) newMappings[index].sourceField = 'name.firstname';
    }
    
    // Handle lastname/family name
    if (userResponse.lastName) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'name.familyName');
      if (index >= 0) newMappings[index].sourceField = 'lastName';
    } else if (userResponse.name && typeof userResponse.name === 'string') {
      // For JSONPlaceholder where name is a single string
      const index = newMappings.findIndex(m => m.scimAttribute === 'name.familyName');
      if (index >= 0) {
        newMappings[index].sourceField = 'name';
        newMappings[index].transformation = 'value.split(" ").slice(1).join(" ")';
      }
    } else if (userResponse.name && userResponse.name.lastname) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'name.familyName');
      if (index >= 0) newMappings[index].sourceField = 'name.lastname';
    }
    
    // Handle email
    if (userResponse.email) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'emails[0].value');
      if (index >= 0) newMappings[index].sourceField = 'email';
    } else if (userResponse.email === undefined && userResponse.username) {
      // Create email from username if missing
      const index = newMappings.findIndex(m => m.scimAttribute === 'emails[0].value');
      if (index >= 0) {
        newMappings[index].sourceField = 'username';
        newMappings[index].transformation = 'value + "@example.com"';
      }
    }
    
    // Handle active status
    if ('active' in userResponse) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'active');
      if (index >= 0) {
        newMappings[index].sourceField = 'active';
        newMappings[index].transformation = 'Boolean(value)';
      }
    } else {
      // If no active field, we'll just set everyone as active
      const index = newMappings.findIndex(m => m.scimAttribute === 'active');
      if (index >= 0) {
        newMappings[index].sourceField = 'id'; 
        newMappings[index].transformation = 'true';
      }
    }
    
    // Add phone number mapping if available
    const phoneIndex = newMappings.findIndex(m => m.scimAttribute === 'phoneNumbers[0].value');
    if (phoneIndex === -1 && userResponse.phone) {
      newMappings.push({
        scimAttribute: 'phoneNumbers[0].value',
        sourceField: 'phone',
        isRequired: false
      });
    } else if (phoneIndex >= 0 && userResponse.phone) {
      newMappings[phoneIndex].sourceField = 'phone';
    }
    
    // Add external ID mapping if it exists
    const externalIdIndex = newMappings.findIndex(m => m.scimAttribute === 'externalId');
    if (externalIdIndex === -1 && userResponse.id) {
      newMappings.push({
        scimAttribute: 'externalId',
        sourceField: 'id',
        isRequired: false,
        transformation: 'String(value)'
      });
    } else if (externalIdIndex >= 0 && userResponse.id) {
      newMappings[externalIdIndex].sourceField = 'id';
      newMappings[externalIdIndex].transformation = 'String(value)';
    }
    
    // Add display name - handle different name formats
    const displayNameIndex = newMappings.findIndex(m => m.scimAttribute === 'displayName');
    
    if (displayNameIndex === -1) {
      if (userResponse.firstName || userResponse.lastName) {
        // For APIs with firstName/lastName fields
        newMappings.push({
          scimAttribute: 'displayName',
          sourceField: 'firstName',
          isRequired: false,
          transformation: 'value + " " + (source.lastName || "")'
        });
      } else if (userResponse.name && typeof userResponse.name === 'string') {
        // For APIs with just name as a string (like JSONPlaceholder)
        newMappings.push({
          scimAttribute: 'displayName',
          sourceField: 'name',
          isRequired: false
        });
      } else if (userResponse.username) {
        // Fallback to username
        newMappings.push({
          scimAttribute: 'displayName',
          sourceField: 'username',
          isRequired: false
        });
      }
    } else {
      if (userResponse.firstName || userResponse.lastName) {
        newMappings[displayNameIndex].sourceField = 'firstName';
        newMappings[displayNameIndex].transformation = 'value + " " + (source.lastName || "")';
      } else if (userResponse.name && typeof userResponse.name === 'string') {
        newMappings[displayNameIndex].sourceField = 'name';
        newMappings[displayNameIndex].transformation = undefined;
      } else if (userResponse.username) {
        newMappings[displayNameIndex].sourceField = 'username';
        newMappings[displayNameIndex].transformation = undefined;
      }
    }
    
    setMappings(newMappings);
  };
  
  const handleAddMapping = () => {
    const unmappedScimAttr = scimAttributes.find(attr => 
      !mappings.some(map => map.scimAttribute === attr.id)
    );
    
    if (unmappedScimAttr) {
      setMappings([...mappings, {
        scimAttribute: unmappedScimAttr.id,
        sourceField: '',
        isRequired: unmappedScimAttr.required
      }]);
    } else {
      toast.info('All SCIM attributes are already mapped.', {
        description: 'To add custom attributes, use the custom mapping option.',
      });
    }
  };
  
  const handleRemoveMapping = (index: number) => {
    const newMappings = [...mappings];
    newMappings.splice(index, 1);
    setMappings(newMappings);
  };
  
  const updateMapping = (index: number, field: string, value: string | boolean) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    
    // If the SCIM attribute is changed, update the required flag
    if (field === 'scimAttribute') {
      const scimAttr = scimAttributes.find(attr => attr.id === value);
      if (scimAttr) {
        newMappings[index].isRequired = scimAttr.required;
      }
    }
    
    setMappings(newMappings);
  };
  
  const handleSaveMapping = () => {
    setIsLoading(true);
    
    // Validate mappings
    const requiredMissing = mappings.some(mapping => 
      mapping.isRequired && !mapping.sourceField
    );
    
    if (requiredMissing) {
      toast.error('Missing required mappings', {
        description: 'Please map all required SCIM attributes to source fields.',
      });
      setIsLoading(false);
      return;
    }
    
    // Simulate saving delay
    setTimeout(() => {
      onMappingSave(mappings);
      setIsLoading(false);
      toast.success('Mappings saved successfully', {
        description: 'Your schema mappings have been saved and are ready to use.',
      });
    }, 500);
  };
  
  const getScimAttributeName = (id: string) => {
    const attr = scimAttributes.find(a => a.id === id);
    return attr ? attr.name : id;
  };
  
  return (
    <Card className="w-full shadow-card animate-scale-in">
      <CardHeader>
        <CardTitle>Schema Mapping</CardTitle>
        <CardDescription>
          Map your source API fields to SCIM schema attributes. Required attributes are marked with an asterisk (*).
          {isLoadingFields && " Loading source fields..."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {fieldsFetchFailed && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Could not load API fields</h4>
              <p className="text-sm text-amber-700 mt-1">
                We couldn't automatically detect fields from your API. You can still map fields manually, or try to refresh the fields.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshFields} 
                disabled={isLoadingFields}
                className="mt-2"
              >
                {isLoadingFields ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                )}
                Refresh Fields
              </Button>
            </div>
          </div>
        )}
        
        <ScrollArea className="max-h-[500px] pr-4">
          <Table className="table-fixed">
            <TableHeader className="bg-secondary/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-1/3">SCIM Attribute</TableHead>
                <TableHead className="w-1/3">Source Field</TableHead>
                <TableHead className="w-1/4">Transformation</TableHead>
                <TableHead className="w-1/12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping, index) => (
                <TableRow key={index} className="group transition-all-200 hover:bg-secondary/20">
                  <TableCell>
                    <Select
                      value={mapping.scimAttribute}
                      onValueChange={(value) => updateMapping(index, 'scimAttribute', value)}
                    >
                      <SelectTrigger className="bg-transparent">
                        <SelectValue placeholder="Select attribute">
                          {mapping.isRequired ? (
                            <span>
                              {getScimAttributeName(mapping.scimAttribute)}
                              <span className="text-destructive">*</span>
                            </span>
                          ) : (
                            getScimAttributeName(mapping.scimAttribute)
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {scimAttributes
                          .filter(attr => 
                            attr.id === mapping.scimAttribute || 
                            !mappings.some(m => m.scimAttribute === attr.id)
                          )
                          .map((attr) => (
                            <SelectItem key={attr.id} value={attr.id}>
                              {attr.name}
                              {attr.required && <span className="text-destructive ml-1">*</span>}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.sourceField}
                      onValueChange={(value) => updateMapping(index, 'sourceField', value)}
                    >
                      <SelectTrigger className="bg-transparent">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceFields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Optional transformation"
                      value={mapping.transformation || ''}
                      onChange={(e) => updateMapping(index, 'transformation', e.target.value)}
                      className="bg-transparent"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMapping(index)}
                      disabled={mapping.isRequired}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity ${mapping.isRequired ? 'cursor-not-allowed' : ''}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {mappings.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <p>No mappings defined yet. Add your first mapping to start.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <Separator />
      <CardFooter className="flex justify-between pt-6">
        <div className="flex gap-2">
          <Button
            variant="outline" 
            onClick={handleRefreshFields} 
            disabled={isLoadingFields}
          >
            {isLoadingFields ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Fields
          </Button>
          <Button
            variant="outline"
            onClick={handleAddMapping}
            className="transition-all-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Mapping
          </Button>
        </div>
        <Button
          onClick={handleSaveMapping}
          disabled={isLoading}
          className="transition-all-200"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Schema Mapping
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SchemaMapper;
