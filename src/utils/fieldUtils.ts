import type { FormField } from "../types/dds";

export const isFieldModified = (
  currentField: FormField,
  originalFields: FormField[]
): boolean => {
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

    // Skip numeric array index segments (e.g., "0", "1");
    // for arrays , traverse into the array's template fields.
    const isIndex = /^\d+$/.test(segment);
    if (isIndex) {
      // do not change currentFields; the next segment should be a child field name
      continue;
    }

    foundField = currentFields.find((f) => f.name === segment);
    if (!foundField) return undefined;

    if (i < path.length - 1) {
      if (foundField.fields) {
        currentFields = foundField.fields;
      } else {
        // If the next segment is an index and the current field is an array,
        // allow continuing (its template fields remain the same in currentFields)
        const nextSegment = path[i + 1];
        const nextIsIndex = nextSegment !== undefined && /^\d+$/.test(nextSegment);
        if (nextIsIndex && foundField.type === ("array" as any)) {
          continue;
        }
        return undefined;
      }
    }
  }

  return foundField;
};
