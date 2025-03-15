
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
import { ArrowRight, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
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
}

const SchemaMapper: React.FC<SchemaMapperProps> = ({ onMappingSave }) => {
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
  
  // Fetch fields from the API
  useEffect(() => {
    const fetchSourceFields = async () => {
      try {
        setIsLoadingFields(true);
        // Fetch a sample user from the dummy API
        const response = await apiService.fetchData('users/1', { method: 'GET' });
        
        if (response) {
          // Extract the keys from the response and format them
          const fields = Object.keys(response).map(key => ({
            id: key,
            name: key
          }));
          
          setSourceFields(fields);
          console.log('Loaded source fields:', fields);
          toast.success('Source fields loaded', {
            description: `${fields.length} fields discovered from the API.`,
          });
          
          // Set default mappings based on the response
          updateDefaultMappings(response);
        }
      } catch (error) {
        console.error('Failed to load source fields:', error);
        toast.error('Failed to load fields', {
          description: 'Could not fetch fields from the API. Please check your API configuration.',
        });
        
        // Set default fields as fallback
        setSourceFields([
          { id: 'id', name: 'id' },
          { id: 'username', name: 'username' },
          { id: 'firstName', name: 'firstName' },
          { id: 'lastName', name: 'lastName' },
          { id: 'email', name: 'email' },
          { id: 'phone', name: 'phone' },
          { id: 'address', name: 'address' },
          { id: 'age', name: 'age' },
        ]);
      } finally {
        setIsLoadingFields(false);
      }
    };

    fetchSourceFields();
  }, []);
  
  // Update default mappings based on the API response
  const updateDefaultMappings = (userResponse: any) => {
    const newMappings = [...mappings];
    
    // Try to match SCIM attributes with API fields
    if (userResponse.username) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'userName');
      if (index >= 0) newMappings[index].sourceField = 'username';
    }
    
    if (userResponse.firstName) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'name.givenName');
      if (index >= 0) newMappings[index].sourceField = 'firstName';
    }
    
    if (userResponse.lastName) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'name.familyName');
      if (index >= 0) newMappings[index].sourceField = 'lastName';
    }
    
    if (userResponse.email) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'emails[0].value');
      if (index >= 0) newMappings[index].sourceField = 'email';
    }
    
    if ('active' in userResponse) {
      const index = newMappings.findIndex(m => m.scimAttribute === 'active');
      if (index >= 0) {
        newMappings[index].sourceField = 'active';
        newMappings[index].transformation = 'Boolean(value)';
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
        <Button
          variant="outline"
          onClick={handleAddMapping}
          className="transition-all-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Mapping
        </Button>
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
