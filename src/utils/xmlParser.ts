import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import type { DDSVendor, FormField } from '../types/dds';
import { cycloneDDSSchema } from '../schemas/cyclonedds-schema';
import { fastDDSSchema } from '../schemas/fastdds-schema';
import { isSchemaDefault } from './schemaDefaults';

export const parseXML = async (xmlContent: string): Promise<any> => {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      trimValues: true,
      parseTagValue: true,
      ignoreDeclaration: false,
      removeNSPrefix: false,
      processEntities: true,
      preserveOrder: false,
      alwaysCreateTextNode: false
    });
    
    return parser.parse(xmlContent);
  } catch (error) {
    throw error;
  }
};

export const buildXML = (data: any, vendor: DDSVendor): string => {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: '  ',
    suppressEmptyNode: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    processEntities: true
  });

  let xmlData: any = {};
  
  if (vendor === 'cyclonedds') {
    // For CycloneDDS, wrap the data in the root element with namespace
    // Remove any user-editable namespace fields to prevent conflicts
    const { '@_xmlns': _, '@_xmlns:xsi': __, '@_xsi:schemaLocation': ___, ...cleanData } = data;
    
    xmlData = {
      CycloneDDS: {
        '@_xmlns': 'https://cdds.io/config',
        '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        '@_xsi:schemaLocation': 'https://cdds.io/config https://raw.githubusercontent.com/eclipse-cyclonedds/cyclonedds/master/etc/cyclonedds.xsd',
        ...cleanData
      }
    };
  } else {
    // For FastDDS, wrap the data in the dds root element
    xmlData = {
      dds: data
    };
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += builder.build(xmlData);
  return xml;
};

export const detectVendor = (xmlContent: string): DDSVendor | null => {
  const lowerContent = xmlContent.toLowerCase();
  if (lowerContent.includes('<cyclonedds') || lowerContent.includes('cdds.io')) {
    return 'cyclonedds';
  } else if (lowerContent.includes('<dds') || lowerContent.includes('profile_name') || lowerContent.includes('eprosima')) {
    return 'fastdds';
  }
  return null;
};

export const xmlToFormFields = (
  data: any,
  path: string[] = []
): FormField[] => {
  const fields: FormField[] = [];

  const processValue = (key: string, value: any, currentPath: string[]): FormField | null => {
    if (key === '_' || key === '#text' || key === '?xml') return null;
    
    // Skip namespace declarations as they're handled automatically
    if (key === '@_xmlns' || key === '@_xmlns:xsi' || key === '@_xsi:schemaLocation') return null;

    const fieldPath = [...currentPath, key];
    const label = key.split(/(?=[A-Z])/).join(' ').toLowerCase()
      .replace(/(^|\s)\S/g, (l) => l.toUpperCase());

    if (Array.isArray(value)) {
      // Check if it's an array of primitive values (strings, numbers, booleans)
      const hasPrimitiveValues = value.length > 0 && 
        (typeof value[0] === 'string' || typeof value[0] === 'number' || typeof value[0] === 'boolean');
      
      return {
        name: key,
        label,
        type: 'array',
        value: value,
        defaultValue: [],
        required: false,
        path: fieldPath,
        // Only create sub-fields for arrays of objects, not for arrays of primitives
        fields: hasPrimitiveValues ? [] : (value.length > 0 ? xmlToFormFields(value[0], fieldPath) : [])
      };
    } else if (typeof value === 'object' && value !== null) {
      const subFields = xmlToFormFields(value, fieldPath);
      if (subFields.length > 0) {
        return {
          name: key,
          label,
          type: 'object',
          value: value,
          defaultValue: {},
          required: false,
          path: fieldPath,
          fields: subFields
        };
      }
      return null;
    } else if (typeof value === 'boolean') {
      return {
        name: key,
        label,
        type: 'boolean',
        value: value,
        defaultValue: false,
        required: false,
        path: fieldPath
      };
    } else if (!isNaN(Number(value))) {
      return {
        name: key,
        label,
        type: 'number',
        value: Number(value),
        defaultValue: 0,
        required: false,
        path: fieldPath
      };
    } else {
      return {
        name: key,
        label,
        type: 'text',
        value: value || '',
        defaultValue: '',
        required: false,
        path: fieldPath
      };
    }
  };

  Object.entries(data).forEach(([key, value]) => {
    const field = processValue(key, value, path);
    if (field) {
      fields.push(field);
    }
  });

  return fields;
};

export const formFieldsToXML = (fields: FormField[], excludeDefaults: boolean = false, vendor?: DDSVendor): any => {
  const result: any = {};

  fields.forEach(field => {
    if (field.value === '' || field.value === null || field.value === undefined) {
      return;
    }
    
    if (excludeDefaults) {
      if (vendor === 'cyclonedds' && isSchemaDefault('cyclonedds', field.path, field.value)) {
        return;
      }
      else if (field.defaultValue !== undefined) {
        const isDefault = JSON.stringify(field.value) === JSON.stringify(field.defaultValue);
        if (isDefault) return;
      }
    }
    
    if (field.type === 'array') {
      if (field.fields && field.fields.length > 0) {
        result[field.name] = field.value.map((item: any) => {
          const itemFields = field.fields!.map(subField => ({
            ...subField,
            value: item[subField.name] !== undefined ? item[subField.name] : subField.defaultValue
          }));
          return formFieldsToXML(itemFields, excludeDefaults, vendor);
        });
      } else {
        result[field.name] = field.value;
      }
    } else if (field.type === 'object' && field.fields) {
      const subResult = formFieldsToXML(field.fields, excludeDefaults, vendor);
      if (Object.keys(subResult).length > 0) {
        result[field.name] = subResult;
      }
    } else {
      result[field.name] = field.value;
    }
  });

  return result;
};

export const mergeWithDefaults = (data: any, defaults: any): any => {
  const merged = { ...defaults };
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = mergeWithDefaults(value, defaults[key] || {});
      } else {
        merged[key] = value;
      }
    }
  });
  
  return merged;
};

// Deep merge uploaded data into schema, preserving all schema fields
export const mergeUploadedDataIntoSchema = (uploadedData: any, schema: any): any => {
  const result = JSON.parse(JSON.stringify(schema)); // Deep clone schema
  
  const deepMerge = (target: any, source: any) => {
    Object.keys(source).forEach(key => {
      if (key.startsWith('@_')) {
        // Preserve attributes
        target[key] = source[key];
      } else if (source[key] !== null && source[key] !== undefined) {
        if (Array.isArray(source[key])) {
          target[key] = source[key];
        } else if (typeof source[key] === 'object') {
          if (!target[key]) target[key] = {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    });
  };
  
  deepMerge(result, uploadedData);
  return result;
};

// Check if a value exists in the original uploaded data
export const isInUploadedData = (path: string[], uploadedData: any): boolean => {
  if (!uploadedData) return false;
  
  let current = uploadedData;
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }
  return true;
};

// Get the appropriate schema based on vendor
export const getSchemaForVendor = (vendor: DDSVendor): any => {
  return vendor === 'cyclonedds' ? cycloneDDSSchema : fastDDSSchema;
};