import { cycloneDDSSchema } from '../schemas/cyclonedds-schema';
import type { DDSVendor } from '../types/dds';
import { isFastDDSDefault } from './fastddsUtils';

export const getCycloneDDSDefault = (path: string[]): any => {
  let current: any = cycloneDDSSchema.CycloneDDS;
  
  for (const key of path) {
    if (current && typeof current === 'object') {
      const actualKey = Object.keys(current).find(k => k === key || k.toLowerCase() === key.toLowerCase());
      
      if (actualKey && actualKey in current) {
        current = current[actualKey];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  
  if (typeof current !== 'object' || current === null) {
    return current;
  }
  
  return undefined;
};

// Check if a value matches the schema default
export const isSchemaDefault = (vendor: DDSVendor, path: string[], value: any): boolean => {
  if (vendor === 'cyclonedds') {
    const defaultValue = getCycloneDDSDefault(path);
    
    // If no default found in schema, assume it's not a default
    if (defaultValue === undefined) {
      return false;
    }
    
    // Handle null/undefined values
    if (value === null || value === undefined) {
      return defaultValue === null || defaultValue === undefined;
    }
    
    // Compare values (handle string/number conversions)
    if (typeof value === 'string' && typeof defaultValue === 'number') {
      return Number(value) === defaultValue;
    }
    
    if (typeof value === 'number' && typeof defaultValue === 'string') {
      return String(value) === defaultValue;
    }
    
    // Handle boolean comparisons
    if (typeof value === 'boolean' || typeof defaultValue === 'boolean') {
      return value === defaultValue;
    }
    
    // String comparison
    return value === defaultValue;
  } else if (vendor === 'fastdds') {
    // Use FastDDS-specific default checking
    return isFastDDSDefault(path, value);
  }
  
  return false;
};