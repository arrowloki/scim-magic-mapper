
import React, { useState } from 'react';
import Header from '@/components/Header';
import APIConfigForm from '@/components/APIConfigForm';
import SchemaMapper from '@/components/SchemaMapper';
import EndpointTester from '@/components/EndpointTester';
import MappingPreview from '@/components/MappingPreview';
import APIHistory from '@/components/APIHistory';
import ApplicationList from '@/components/applications/ApplicationList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { ChevronLeft, Download, List, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { useApplications } from '@/contexts/ApplicationContext';
import { apiService, APIConfig } from '@/utils/apiService';
import { scimUtils } from '@/utils/scimUtils';

const Index = () => {
  const { 
    applications, 
    activeApplicationId, 
    addApplication,
    getApplication, 
    updateApiConfig,
    updateMappings,
    setActiveApplication
  } = useApplications();
  
  const [activeTab, setActiveTab] = useState('setup');
  const activeApp = activeApplicationId ? getApplication(activeApplicationId) : null;

  const handleApiConfigSave = (config: APIConfig) => {
    if (!activeApplicationId) {
      toast.error('No active application', {
        description: 'Please select or create an application first.',
      });
      return;
    }

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
    
    // Update application context
    updateApiConfig(activeApplicationId, config);
    
    // Update API service
    apiService.setConfig(config, activeApplicationId);
    
    toast.success('API configuration saved', {
      description: 'Your API configuration has been updated.',
    });
  };
  
  const handleMappingSave = (newMappings: any[]) => {
    if (!activeApplicationId) {
      toast.error('No active application', {
        description: 'Please select or create an application first.',
      });
      return;
    }
    
    // Update application context
    updateMappings(activeApplicationId, newMappings);
    
    // Update SCIM utils if needed
    if (activeApp?.apiConfig) {
      scimUtils.setConfig({
        mappings: newMappings,
        baseUrl: activeApp.apiConfig.baseUrl,
        resourceTypes: ['Users', 'Groups']
      });
    }
    
    toast.success('Mappings saved', {
      description: 'Your schema mappings have been updated.',
    });
  };
  
  const handleExportConfig = () => {
    try {
      if (!activeApp) {
        toast.error('No active application', {
          description: 'Please select or create an application to export.',
        });
        return;
      }
      
      // Create export object
      const exportData = {
        name: activeApp.name,
        api: activeApp.apiConfig,
        mappings: activeApp.mappings,
        createdAt: activeApp.createdAt,
        updatedAt: activeApp.updatedAt
      };
      
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeApp.name.replace(/\s+/g, '-').toLowerCase()}-config.json`;
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
  
  const handleCreateNewApp = () => {
    const newApp = addApplication('New Application');
    setActiveApplication(newApp.id);
  };
  
  const renderApplicationDetails = () => {
    if (!activeApp) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <h2 className="text-2xl font-semibold mb-4">No Application Selected</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Please select an existing application or create a new one to get started.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setActiveTab('applications')}>
              <List className="h-4 w-4 mr-2" />
              View Applications
            </Button>
            <Button onClick={handleCreateNewApp}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Application
            </Button>
          </div>
        </div>
      );
    }
    
    const isConfigured = activeApp.apiConfig.baseUrl && activeApp.mappings.length > 0;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveTab('applications')}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Applications
            </Button>
            <h2 className="text-xl font-semibold">{activeApp.name}</h2>
          </div>
        </div>
        
        <Tabs defaultValue="configure" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="test">Test</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="configure" className="space-y-6 pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <APIConfigForm 
                onConfigSave={handleApiConfigSave} 
                initialConfig={activeApp.apiConfig}
                applicationId={activeApp.id}
              />
              <SchemaMapper 
                onMappingSave={handleMappingSave}
                initialMappings={activeApp.mappings}
                applicationId={activeApp.id}
              />
            </div>
          </TabsContent>
          <TabsContent value="preview" className="pt-6">
            {activeApp.mappings.length > 0 ? (
              <MappingPreview 
                mappings={activeApp.mappings} 
                applicationId={activeApp.id}
              />
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
            <EndpointTester 
              isConfigured={isConfigured}
              applicationId={activeApp.id}
            />
          </TabsContent>
          <TabsContent value="history" className="pt-6">
            <APIHistory applicationId={activeApp.id} />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end pt-4">
          <Button onClick={handleExportConfig} disabled={!isConfigured}>
            <Download className="h-4 w-4 mr-2" />
            Export Configuration
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto mt-6 mb-10">
        {activeTab === 'applications' ? (
          <div className="p-6 bg-card rounded-lg border border-border shadow-sm">
            <h2 className="text-2xl font-semibold mb-6">Your Applications</h2>
            <ApplicationList />
          </div>
        ) : (
          renderApplicationDetails()
        )}
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
