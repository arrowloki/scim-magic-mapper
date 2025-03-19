
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApplicationConfig, ApplicationState, loadApplications, saveApplications, generateUniqueId } from '@/models/ApplicationConfig';
import { APIConfig } from '@/utils/apiService';
import { toast } from 'sonner';

interface ApplicationContextType extends ApplicationState {
  addApplication: (name: string) => ApplicationConfig;
  updateApplication: (id: string, updates: Partial<ApplicationConfig>) => void;
  deleteApplication: (id: string) => void;
  setActiveApplication: (id: string | null) => void;
  getApplication: (id: string) => ApplicationConfig | undefined;
  updateApiConfig: (id: string, apiConfig: APIConfig) => void;
  updateMappings: (id: string, mappings: any[]) => void;
}

const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

export const ApplicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ApplicationState>({
    applications: [],
    activeApplicationId: null
  });

  useEffect(() => {
    const applications = loadApplications();
    if (applications.length > 0) {
      setState({
        applications,
        activeApplicationId: applications[0].id
      });
    }
  }, []);

  useEffect(() => {
    if (state.applications.length > 0) {
      saveApplications(state.applications);
    }
  }, [state.applications]);

  const addApplication = (name: string): ApplicationConfig => {
    const newApplication: ApplicationConfig = {
      id: generateUniqueId(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      apiConfig: {
        name,
        baseUrl: '',
        authType: 'none'
      },
      mappings: []
    };

    setState(prev => ({
      ...prev,
      applications: [...prev.applications, newApplication],
      activeApplicationId: newApplication.id
    }));

    toast.success('New application created', {
      description: `${name} has been added to your applications.`
    });

    return newApplication;
  };

  const updateApplication = (id: string, updates: Partial<ApplicationConfig>) => {
    setState(prev => ({
      ...prev,
      applications: prev.applications.map(app => 
        app.id === id ? { ...app, ...updates, updatedAt: Date.now() } : app
      )
    }));
  };

  const deleteApplication = (id: string) => {
    const appToDelete = state.applications.find(app => app.id === id);
    
    setState(prev => {
      const updatedApps = prev.applications.filter(app => app.id !== id);
      let newActiveId = prev.activeApplicationId;

      // If we're deleting the active application, set a new active one
      if (prev.activeApplicationId === id) {
        newActiveId = updatedApps.length > 0 ? updatedApps[0].id : null;
      }

      return {
        applications: updatedApps,
        activeApplicationId: newActiveId
      };
    });

    if (appToDelete) {
      toast.success('Application deleted', {
        description: `${appToDelete.name} has been removed.`
      });
    }
  };

  const setActiveApplication = (id: string | null) => {
    if (id && !state.applications.some(app => app.id === id)) {
      console.error(`Application with ID ${id} not found`);
      return;
    }

    setState(prev => ({
      ...prev,
      activeApplicationId: id
    }));
  };

  const getApplication = (id: string) => {
    return state.applications.find(app => app.id === id);
  };

  const updateApiConfig = (id: string, apiConfig: APIConfig) => {
    updateApplication(id, { apiConfig });
  };

  const updateMappings = (id: string, mappings: any[]) => {
    updateApplication(id, { mappings });
  };

  return (
    <ApplicationContext.Provider
      value={{
        ...state,
        addApplication,
        updateApplication,
        deleteApplication,
        setActiveApplication,
        getApplication,
        updateApiConfig,
        updateMappings
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
};

export const useApplications = () => {
  const context = useContext(ApplicationContext);
  if (context === undefined) {
    throw new Error('useApplications must be used within an ApplicationProvider');
  }
  return context;
};
