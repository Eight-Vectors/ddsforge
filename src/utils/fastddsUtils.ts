import { fastDDSSchema } from '../schemas/fastdds-schema';

export const getFastDDSDefault = (path: string[]): any => {
  let current: any = fastDDSSchema.dds;
  let adjustedPath = [...path];
  
  // FastDDS schema has profile types under the profiles section
  const profileTypes = ['participant', 'publisher', 'subscriber', 'topic', 'data_writer', 'data_reader'];
  if (profileTypes.includes(path[0]) && current.profiles && current.profiles[path[0]]) {
    current = current.profiles;
  }
  
  for (const key of adjustedPath) {
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

// Merges uploaded data with schema, ensuring all schema sections are included
export const smartMergeFastDDS = (uploadedData: any, schema: any): any => {
  const result: any = {
    '@_xmlns': uploadedData['@_xmlns'] || schema['@_xmlns'] || 'http://www.eprosima.com/XMLSchemas/fastRTPS_Profiles'
  };
  
  // First, include all base sections from schema
  Object.keys(schema).forEach(key => {
    if (!key.startsWith('@_')) {
      // For each schema section, use uploaded data if available, otherwise use schema default
      if (uploadedData[key] !== undefined) {
        result[key] = uploadedData[key];
      } else {
        result[key] = schema[key];
      }
    }
  });
  
  // Handle profiles section specially
  if (schema.profiles || uploadedData.profiles) {
    result.profiles = {
      '@_xmlns': uploadedData.profiles?.['@_xmlns'] || schema.profiles?.['@_xmlns']
    };
    
    // Include uploaded profiles
    if (uploadedData.profiles) {
      Object.keys(uploadedData.profiles).forEach(key => {
        if (!key.startsWith('@_')) {
          result.profiles[key] = uploadedData.profiles[key];
        }
      });
    }
  }
  
  // Include any additional sections from uploaded data that aren't in schema
  Object.keys(uploadedData).forEach(key => {
    if (!key.startsWith('@_') && result[key] === undefined) {
      result[key] = uploadedData[key];
    }
  });
  
  return result;
};

export const isFastDDSDefault = (path: string[], value: any): boolean => {
  const lastPathElement = path[path.length - 1];
  
  // Duration fields should stay together (sec/nanosec pairs)
  if (lastPathElement === 'nanosec') {
    return false;
  }
  
  if (lastPathElement === 'sec' && path.length >= 2) {
    const parentPath = path[path.length - 2];
    const durationContexts = ['duration', 'period', 'leaseDuration', 'leaseAnnouncement', 
                            'heartbeatPeriod', 'nackResponseDelay', 'nackSupressionDuration',
                            'heartbeatResponseDelay', 'minimum_separation', 'latencyBudget'];
    if (durationContexts.includes(parentPath)) {
      return false;
    }
  }
  
  // Important boolean fields that differ from default
  if (lastPathElement === 'useBuiltinTransports' && value === false) {
    return false;
  }
  
  const defaultValue = getFastDDSDefault(path);
  
  // If no default found in schema, don't exclude it
  if (defaultValue === undefined) {
    return false;
  }
  
  // Handle null/undefined values
  if (value === null || value === undefined) {
    return defaultValue === null || defaultValue === undefined;
  }
  
  // Handle special FastDDS values
  if (typeof value === 'string') {
    // Handle DURATION_INFINITY
    if (value === 'DURATION_INFINITY' && defaultValue === 'DURATION_INFINITY') {
      return true;
    }
    
    // Handle numeric strings
    if (!isNaN(Number(value)) && typeof defaultValue === 'number') {
      return Number(value) === defaultValue;
    }
  }
  
  // Compare values (handle string/number conversions)
  if (typeof value === 'number' && typeof defaultValue === 'string') {
    return String(value) === defaultValue;
  }
  
  // Handle boolean comparisons
  if (typeof value === 'boolean' || typeof defaultValue === 'boolean') {
    return value === defaultValue;
  }
  
  // Handle arrays
  if (Array.isArray(value) && Array.isArray(defaultValue)) {
    return JSON.stringify(value) === JSON.stringify(defaultValue);
  }
  
  // String comparison
  return value === defaultValue;
};