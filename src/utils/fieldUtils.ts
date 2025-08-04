import type { FormField } from '../types/dds';

export const isFieldModified = (currentField: FormField, originalFields: FormField[]): boolean => {
  const originalField = findFieldByPath(originalFields, currentField.path);
  
  if (!originalField) {
    return true;
  }
  
  return JSON.stringify(currentField.value) !== JSON.stringify(originalField.value);
};

export const findFieldByPath = (fields: FormField[], path: string[]): FormField | undefined => {
  if (path.length === 0) return undefined;
  
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