import type { FormField } from '../types/dds';

export const isFieldModified = (currentField: FormField, originalFields: FormField[]): boolean => {
  // Check if currentField or its path is valid
  if (!currentField || !currentField.path) {
    return false;
  }
  
  const originalField = findFieldByPath(originalFields, currentField.path);
  
  if (!originalField) {
    return true;
  }
  
  // For object type fields, check if the value is actually different
  // Empty objects {} should be considered same as null/undefined
  if (currentField.type === 'object' && currentField.fields) {
    const currentIsEmpty = !currentField.value || 
      (typeof currentField.value === 'object' && Object.keys(currentField.value).length === 0);
    const originalIsEmpty = !originalField.value || 
      (typeof originalField.value === 'object' && Object.keys(originalField.value).length === 0);
    
    if (currentIsEmpty && originalIsEmpty) {
      return false;
    }
  }
  
  // Special handling for FastDDS default values
  // When a field has never been modified, both values should be identical
  const currentValue = currentField.value;
  const originalValue = originalField.value;
  
  // Handle null/undefined/empty string as equivalent for comparison
  const normalizeValue = (val: any) => {
    if (val === null || val === undefined || val === '') return null;
    return val;
  };
  
  const normalizedCurrent = normalizeValue(currentValue);
  const normalizedOriginal = normalizeValue(originalValue);
  
  return JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal);
};

export const findFieldByPath = (fields: FormField[], path: string[]): FormField | undefined => {
  if (!path || path.length === 0) return undefined;
  
  let currentFields = fields;
  let foundField: FormField | undefined;
  
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    foundField = currentFields.find(f => f.name === segment);
    
    if (!foundField) return undefined;
    
    if (i < path.length - 1) {
      if (foundField.fields) {
        currentFields = foundField.fields;
      } else {
        return undefined;
      }
    }
  }
  
  return foundField;
};