
import { APIConfig } from "@/utils/apiService";

export interface MappingItem {
  scimAttribute: string;
  sourceField: string;
  isRequired: boolean;
  transformation?: string;
}

export interface ApplicationConfig {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  apiConfig: APIConfig;
  mappings: MappingItem[];
}

export interface ApplicationState {
  applications: ApplicationConfig[];
  activeApplicationId: string | null;
}

// Storage key for local storage
export const STORAGE_KEY = 'scim-mapper-applications';

// Helper functions for application storage
export const saveApplications = (applications: ApplicationConfig[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
};

export const loadApplications = (): ApplicationConfig[] => {
  const storedData = localStorage.getItem(STORAGE_KEY);
  if (storedData) {
    try {
      return JSON.parse(storedData);
    } catch (e) {
      console.error('Failed to parse stored applications:', e);
      return [];
    }
  }
  return [];
};

export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};
