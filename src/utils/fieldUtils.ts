import type { FormField } from "../types/dds";

export const isFieldModified = (
  currentField: FormField,
  originalFields: FormField[]
): boolean => {
  // Guard invalid field or path
  if (!currentField || !currentField.path) {
    return false;
  }

  const originalField = findFieldByPath(originalFields, currentField.path);

  if (!originalField) {
    return true;
  }

  // If object field, treat {} as empty; not modified when both are empty
  if (currentField.type === "object" && currentField.fields) {
    const currentIsEmpty =
      !currentField.value ||
      (typeof currentField.value === "object" &&
        Object.keys(currentField.value).length === 0);
    const originalIsEmpty =
      !originalField.value ||
      (typeof originalField.value === "object" &&
        Object.keys(originalField.value).length === 0);

    if (currentIsEmpty && originalIsEmpty) {
      return false;
    }
  }

  // Compare normalized values
  const currentValue = currentField.value;
  const originalValue = originalField.value;

  // Normalize null/undefined/empty string to null
  const normalizeValue = (val: any) => {
    if (val === null || val === undefined || val === "") return null;
    return val;
  };

  const normalizedCurrent = normalizeValue(currentValue);
  const normalizedOriginal = normalizeValue(originalValue);

  return (
    JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal)
  );
};

// Walk nested fields by name; returns undefined if any segment is missing
export const findFieldByPath = (
  fields: FormField[],
  path: string[]
): FormField | undefined => {
  if (!path || path.length === 0) return undefined;

  let currentFields = fields;
  let foundField: FormField | undefined;

  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    foundField = currentFields.find((f) => f.name === segment);

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
