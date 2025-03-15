
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import APIConfigForm from '@/components/APIConfigForm';
import SchemaMapper from '@/components/SchemaMapper';
import EndpointTester from '@/components/EndpointTester';
import MappingPreview from '@/components/MappingPreview';
import APIHistory from '@/components/APIHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiService, APIConfig } from '@/utils/apiService';
import { scimUtils } from '@/utils/scimUtils';
import { Button } from '@/components/ui/button';
import { ChevronRight, Code, Database, Download, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface MappingItem {
  scimAttribute: string;
  sourceField: string;
  isRequired: boolean;
  transformation?: string;
}

const Index = () => {
  const [apiConfig, setApiConfig] = useState<APIConfig | null>(null);
  const [mappings, setMappings] = useState<MappingItem[]>([]);
  const [activeTab, setActiveTab] = useState('setup');
  const [isConfigured, setIsConfigured] = useState(false);
  
  // Load saved configuration on mount
  useEffect(() => {
    const savedApiConfig = apiService.getConfig();
    if (savedApiConfig) {
      setApiConfig(savedApiConfig);
    }
    
    const savedScimConfig = scimUtils.getConfig();
    if (savedScimConfig?.mappings) {
      setMappings(savedScimConfig.mappings);
    }
    
    setIsConfigured(!!(savedApiConfig && savedScimConfig?.mappings?.length));
  }, []);
  
  const handleApiConfigSave = (config: APIConfig) => {
    // For DummyJSON API, ensure URL format is correct
    if (config.baseUrl.includes('dummyjson.com')) {
      // Make sure the URL ends with /users for proper API calls
      if (!config.baseUrl.endsWith('/users')) {
        // Remove trailing slash if present
        const baseUrl = config.baseUrl.endsWith('/') 
          ? config.baseUrl.slice(0, -1) 
          : config.baseUrl;
        
        // Add /users to the end
        config.baseUrl = `${baseUrl}/users`;
        
        toast.info('URL format updated', {
          description: 'URL updated to include /users endpoint for DummyJSON API.',
        });
      }
    }
    
    setApiConfig(config);
    apiService.setConfig(config);
    updateConfigStatus();
  };
  
  const handleMappingSave = (newMappings: MappingItem[]) => {
    setMappings(newMappings);
    
    if (apiConfig) {
      scimUtils.setConfig({
        mappings: newMappings,
        baseUrl: apiConfig.baseUrl,
        resourceTypes: ['Users', 'Groups']
      });
    }
    
    updateConfigStatus();
  };
  
  const updateConfigStatus = () => {
    setIsConfigured(!!(apiConfig && mappings.length > 0));
  };
  
  const handleExportConfig = () => {
    try {
      const config = {
        api: apiService.getConfig(),
        scim: scimUtils.getConfig()
      };
      
      if (!config.api || !config.scim) {
        toast.error('Incomplete configuration', {
          description: 'Please complete both API and schema configuration before exporting.',
        });
        return;
      }
      
      const json = JSON.stringify(config, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scim-mapper-config.json';
      a.click();
      
      URL.revokeObjectURL(url);
      
      toast.success('Configuration exported', {
        description: 'Your SCIM mapper configuration has been exported.',
      });
    } catch (error) {
      console.error('Failed to export configuration:', error);
      toast.error('Export failed', {
        description: 'Failed to export configuration. Please try again.',
      });
    }
  };
  
  const renderSteps = () => (
    <div className="flex flex-col md:flex-row gap-6 w-full px-4 md:px-6 py-6 animate-fade-in">
      <div className="w-full md:w-64 space-y-4">
        <div 
          className={`p-4 rounded-lg border ${activeTab === 'setup' 
            ? 'border-primary bg-primary/5' 
            : 'border-border'} transition-all-200 cursor-pointer`}
          onClick={() => setActiveTab('setup')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                1
              </div>
              <h3 className="text-sm font-medium">API Setup</h3>
            </div>
            {apiConfig && <ChevronRight className="h-4 w-4 text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Configure your source API connection and authentication.
          </p>
        </div>
        
        <div 
          className={`p-4 rounded-lg border ${activeTab === 'mapping' 
            ? 'border-primary bg-primary/5' 
            : 'border-border'} transition-all-200 cursor-pointer`}
          onClick={() => setActiveTab('mapping')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                2
              </div>
              <h3 className="text-sm font-medium">Schema Mapping</h3>
            </div>
            {mappings.length > 0 && <ChevronRight className="h-4 w-4 text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Map source API fields to SCIM attributes.
          </p>
        </div>
        
        <div 
          className={`p-4 rounded-lg border ${activeTab === 'preview' 
            ? 'border-primary bg-primary/5' 
            : 'border-border'} transition-all-200 cursor-pointer`}
          onClick={() => setActiveTab('preview')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                3
              </div>
              <h3 className="text-sm font-medium">Preview & Test</h3>
            </div>
            <ChevronRight className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Preview mapping results and test your SCIM endpoints.
          </p>
        </div>
        
        <div 
          className={`p-4 rounded-lg border ${activeTab === 'export' 
            ? 'border-primary bg-primary/5' 
            : 'border-border'} transition-all-200 cursor-pointer`}
          onClick={() => setActiveTab('export')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                4
              </div>
              <h3 className="text-sm font-medium">Export</h3>
            </div>
            <ChevronRight className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Export your configuration for production deployment.
          </p>
        </div>
      </div>
      
      <div className="flex-1">
        {activeTab === 'setup' && (
          <APIConfigForm onConfigSave={handleApiConfigSave} />
        )}
        
        {activeTab === 'mapping' && (
          <SchemaMapper onMappingSave={handleMappingSave} />
        )}
        
        {activeTab === 'preview' && (
          <div className="space-y-8">
            {mappings.length > 0 ? (
              <>
                <MappingPreview mappings={mappings} />
                <EndpointTester isConfigured={isConfigured} />
                <APIHistory />
              </>
            ) : (
              <div className="bg-muted/30 rounded-lg border border-border p-6 text-center">
                <h3 className="text-lg font-medium mb-2">No Mappings Defined</h3>
                <p className="text-muted-foreground mb-4">
                  Please complete the schema mapping step before previewing.
                </p>
                <Button onClick={() => setActiveTab('mapping')}>
                  Go to Schema Mapping
                </Button>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'export' && (
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-xl font-medium mb-2 flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              <span>Export Configuration</span>
            </h3>
            <p className="text-muted-foreground mb-6">
              Export your SCIM mapper configuration for deployment or backup.
            </p>
            
            {isConfigured ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-muted/30 rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-medium">API Configuration</h4>
                    </div>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span>{apiConfig?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base URL:</span>
                        <span className="font-mono text-xs truncate max-w-40">{apiConfig?.baseUrl}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Auth Type:</span>
                        <span>{apiConfig?.authType}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Play className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-medium">Schema Mapping</h4>
                    </div>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mappings:</span>
                        <span>{mappings.length} fields</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Required:</span>
                        <span>{mappings.filter(m => m.isRequired).length} fields</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">With Transformations:</span>
                        <span>{mappings.filter(m => m.transformation && m.transformation.length > 0).length} fields</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Button onClick={handleExportConfig} className="transition-all-200">
                    <Download className="h-4 w-4 mr-2" />
                    Export Configuration
                  </Button>
                </div>
                
                <div className="bg-muted/30 rounded-lg border border-border p-4">
                  <h4 className="text-sm font-medium mb-3">Implementation Guide</h4>
                  <ol className="text-sm space-y-2 list-decimal list-inside">
                    <li>Export the configuration using the button above.</li>
                    <li>Import the configuration in your server-side SCIM service.</li>
                    <li>Deploy your SCIM service with the provided configuration.</li>
                    <li>Configure your identity provider to connect to your SCIM endpoint.</li>
                    <li>Test the connection from your identity provider.</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg border border-border p-6 text-center">
                <h3 className="text-lg font-medium mb-2">Configuration Incomplete</h3>
                <p className="text-muted-foreground mb-4">
                  Please complete both API setup and schema mapping before exporting.
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => setActiveTab('setup')}>
                    Go to API Setup
                  </Button>
                  <Button onClick={() => setActiveTab('mapping')}>
                    Go to Schema Mapping
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  
  const renderTabContent = () => (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 animate-fade-in">
      <Tabs defaultValue="configure" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="configure" className="space-y-6 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <APIConfigForm onConfigSave={handleApiConfigSave} />
            <SchemaMapper onMappingSave={handleMappingSave} />
          </div>
        </TabsContent>
        <TabsContent value="preview" className="pt-6">
          {mappings.length > 0 ? (
            <MappingPreview mappings={mappings} />
          ) : (
            <div className="bg-muted/30 rounded-lg border border-border p-6 text-center">
              <h3 className="text-lg font-medium mb-2">No Mappings Defined</h3>
              <p className="text-muted-foreground mb-4">
                Please complete the schema mapping configuration first.
              </p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="test" className="pt-6">
          <EndpointTester isConfigured={isConfigured} />
        </TabsContent>
        <TabsContent value="history" className="pt-6">
          <APIHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto mt-6 mb-10">
        {renderSteps()}
      </main>
      <footer className="bg-card border-t border-border py-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              SCIM Magic Mapper - Transform any REST API to SCIM
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="h-8">
                Documentation
              </Button>
              <Button size="sm" className="h-8">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
