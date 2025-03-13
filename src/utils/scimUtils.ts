
interface MappingItem {
  scimAttribute: string;
  sourceField: string;
  isRequired: boolean;
  transformation?: string;
}

interface ScimConfig {
  mappings: MappingItem[];
  baseUrl: string;
  resourceTypes: string[];
}

export class ScimUtils {
  private config: ScimConfig | null = null;

  constructor(config?: ScimConfig) {
    if (config) {
      this.setConfig(config);
    } else {
      // Try to load from localStorage
      this.loadConfig();
    }
  }

  setConfig(config: ScimConfig): void {
    this.config = config;
    localStorage.setItem('scim_mapper_config', JSON.stringify(config));
  }

  getConfig(): ScimConfig | null {
    return this.config;
  }

  private loadConfig(): void {
    const storedConfig = localStorage.getItem('scim_mapper_config');
    if (storedConfig) {
      try {
        this.config = JSON.parse(storedConfig);
      } catch (error) {
        console.error('Failed to parse stored SCIM config:', error);
      }
    }
  }

  /**
   * Transform source API data to SCIM format
   */
  transformToScim(sourceData: any, resourceType: string = 'User'): any {
    if (!this.config) {
      throw new Error('SCIM configuration not set');
    }

    // Determine schema based on resource type
    let schemas: string[] = [];
    switch (resourceType) {
      case 'User':
        schemas = ['urn:ietf:params:scim:schemas:core:2.0:User'];
        break;
      case 'Group':
        schemas = ['urn:ietf:params:scim:schemas:core:2.0:Group'];
        break;
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }

    // Initialize SCIM data with schema
    const scimData: Record<string, any> = {
      schemas
    };

    // Apply mappings
    this.config.mappings.forEach(mapping => {
      if (mapping.sourceField) {
        let value = this.getNestedValue(sourceData, mapping.sourceField);
        
        // Apply transformation if specified
        if (mapping.transformation && value !== undefined) {
          try {
            // This is a simplified implementation and not secure for production
            // eslint-disable-next-line no-new-func
            const transform = new Function('value', `return ${mapping.transformation}`);
            value = transform(value);
          } catch (error) {
            console.error(`Error applying transformation for ${mapping.scimAttribute}:`, error);
          }
        }
        
        // Only set if value is not undefined
        if (value !== undefined) {
          this.setNestedValue(scimData, mapping.scimAttribute, value);
        }
      }
    });

    // Add metadata
    scimData.meta = {
      resourceType,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    return scimData;
  }

  /**
   * Transform SCIM data to source API format
   */
  transformFromScim(scimData: any): any {
    if (!this.config) {
      throw new Error('SCIM configuration not set');
    }

    const sourceData: Record<string, any> = {};

    // Apply reverse mappings
    this.config.mappings.forEach(mapping => {
      if (mapping.scimAttribute && mapping.sourceField) {
        const value = this.getNestedValue(scimData, mapping.scimAttribute);
        
        // Only set if value is not undefined
        if (value !== undefined) {
          this.setNestedValue(sourceData, mapping.sourceField, value);
        }
      }
    });

    return sourceData;
  }

  /**
   * Generate SCIM endpoints based on configuration
   */
  generateEndpoints(): Record<string, string> {
    if (!this.config) {
      throw new Error('SCIM configuration not set');
    }

    const endpoints: Record<string, string> = {
      ServiceProviderConfig: `/ServiceProviderConfig`,
      Schemas: `/Schemas`,
    };

    // Add resource-specific endpoints
    this.config.resourceTypes.forEach(resourceType => {
      endpoints[resourceType] = `/${resourceType}`;
      endpoints[`${resourceType}Id`] = `/${resourceType}/{id}`;
    });

    return endpoints;
  }

  /**
   * Validate source data against required SCIM mappings
   */
  validateSourceData(sourceData: any): { valid: boolean; missing: string[] } {
    if (!this.config) {
      throw new Error('SCIM configuration not set');
    }

    const missing: string[] = [];

    // Check required fields
    this.config.mappings
      .filter(mapping => mapping.isRequired)
      .forEach(mapping => {
        const value = this.getNestedValue(sourceData, mapping.sourceField);
        if (value === undefined || value === null || value === '') {
          missing.push(mapping.sourceField);
        }
      });

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Helper: Get a nested value from an object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    // Handle array notation like items[0].name
    if (path.includes('[')) {
      const parts = path.split(/[\[\].]+/).filter(Boolean);
      let current = obj;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        // If it's a number, treat as array index
        if (/^\d+$/.test(part)) {
          const index = parseInt(part, 10);
          if (!Array.isArray(current)) {
            return undefined;
          }
          if (index >= current.length) {
            return undefined;
          }
          current = current[index];
        } else {
          if (current === null || current === undefined || typeof current !== 'object') {
            return undefined;
          }
          current = current[part];
        }
      }
      
      return current;
    }
    
    // Regular dot notation
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Helper: Set a nested value in an object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    // Handle array notation like items[0].name
    if (path.includes('[')) {
      const main = path.split('[')[0];
      const rest = path.substring(main.length);
      
      // Match all [n] parts
      const arrayPattern = /\[(\d+)\]/g;
      const matches = [...rest.matchAll(arrayPattern)];
      
      let current = obj;
      
      // Ensure the main path exists
      if (!current[main]) {
        current[main] = [];
      }
      current = current[main];
      
      // Process each array index except the last one
      for (let i = 0; i < matches.length - 1; i++) {
        const index = parseInt(matches[i][1], 10);
        // Ensure the array has enough elements
        while (current.length <= index) {
          current.push({});
        }
        current = current[index];
      }
      
      // Handle the last segment
      if (matches.length > 0) {
        const lastIndex = parseInt(matches[matches.length - 1][1], 10);
        const fieldPath = rest.split(']').slice(-1)[0].replace(/^\./, '');
        
        while (current.length <= lastIndex) {
          current.push({});
        }
        
        if (fieldPath) {
          // If there's a field after the last array index
          if (!current[lastIndex]) {
            current[lastIndex] = {};
          }
          current = current[lastIndex];
          
          const fieldParts = fieldPath.split('.');
          for (let i = 0; i < fieldParts.length - 1; i++) {
            const part = fieldParts[i];
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }
          current[fieldParts[fieldParts.length - 1]] = value;
        } else {
          // If the path ends with an array index
          current[lastIndex] = value;
        }
      }
      
      return;
    }
    
    // Regular dot notation
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
}

// Export singleton instance
export const scimUtils = new ScimUtils();
