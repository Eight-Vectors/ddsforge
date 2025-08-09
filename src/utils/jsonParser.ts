import type { FormField } from "../types/dds";

import { zenohSchema } from "../schemas/zenoh-schema";

// Parse JSON5 content (JSON5 is a superset of JSON that allows comments, trailing commas, etc.)
export function parseJSON5(content: string): any {
  // First, try to parse as regular JSON
  try {
    return JSON.parse(content);
  } catch (e) {
    // If that fails, we need to clean up JSON5 syntax to make it valid JSON
    let cleaned = content;

    // Remove single-line comments
    cleaned = cleaned.replace(/\/\/.*$/gm, "");

    // Remove multi-line comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove trailing commas before } or ]
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

    // Handle unquoted keys (basic implementation)
    cleaned = cleaned.replace(
      /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
      '$1"$2":'
    );

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      throw new Error(
        `Failed to parse JSON5: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}

// Convert JSON object to FormFields
export function jsonToFormFields(
  data: any,
  schema: any = {},
  path: string[] = [],
  parentLabel: string = ""
): FormField[] {
  const fields: FormField[] = [];

  // Get all keys from both data and schema
  const allKeys = new Set([
    ...Object.keys(data || {}),
    ...Object.keys(schema || {}),
  ]);

  allKeys.forEach((key) => {
    const value = data?.[key];
    const schemaValue = schema?.[key];
    const currentPath = [...path, key];

    // Create a readable label
    const label = parentLabel
      ? `${parentLabel} > ${formatLabel(key)}`
      : formatLabel(key);

    // Skip null values unless they're in the schema
    if (value === null && schemaValue === undefined) {
      return;
    }

    // Determine the field type
    let fieldType: FormField["type"];
    let fieldValue = value !== undefined ? value : schemaValue;

    if (fieldValue === null || fieldValue === undefined) {
      fieldType = "text";
      fieldValue = "";
    } else if (typeof fieldValue === "boolean") {
      fieldType = "boolean";
    } else if (typeof fieldValue === "number") {
      fieldType = "number";
    } else if (Array.isArray(fieldValue)) {
      fieldType = "array";
    } else if (typeof fieldValue === "object") {
      fieldType = "object";
    } else {
      fieldType = "text";
    }

    const field: FormField = {
      name: key,
      label: formatLabel(key),
      type: fieldType,
      value: value !== undefined ? value : schemaValue,
      defaultValue:
        schemaValue !== undefined ? schemaValue : getDefaultValue(fieldType),
      required: false,
      path: currentPath,
      description: getFieldDescription(currentPath),
    };

    // Handle nested objects
    if (fieldType === "object" && fieldValue !== null) {
      field.fields = jsonToFormFields(
        value || {},
        schemaValue || {},
        currentPath,
        label
      );
    }

    // Handle arrays
    if (fieldType === "array") {
      field.value = fieldValue || [];
    }

    // Add options for select fields
    if (isSelectField(currentPath)) {
      field.type = "select";
      field.options = getSelectOptions(currentPath);
    }

    fields.push(field);
  });

  return fields;
}

// Convert FormFields back to JSON object
export function formFieldsToJSON(
  fields: FormField[],
  excludeDefaults: boolean = false
): any {
  const result: any = {};

  fields.forEach((field) => {
    let value = field.value;

    // Skip if excluding defaults and value matches default
    if (
      excludeDefaults &&
      JSON.stringify(value) === JSON.stringify(field.defaultValue)
    ) {
      return;
    }

    // Handle nested objects
    if (field.type === "object" && field.fields) {
      const nestedValue = formFieldsToJSON(field.fields, excludeDefaults);
      if (Object.keys(nestedValue).length > 0 || !excludeDefaults) {
        value = nestedValue;
      } else {
        return; // Skip empty objects when excluding defaults
      }
    }

    // Handle arrays
    if (field.type === "array" && Array.isArray(value)) {
      if (value.length === 0 && excludeDefaults) {
        return; // Skip empty arrays when excluding defaults
      }
    }

    // Convert empty strings to null for optional fields
    if (value === "" && !field.required) {
      value = null;
    }

    // Only add the field if it has a value or we're not excluding defaults
    if ((value !== null && value !== undefined) || !excludeDefaults) {
      result[field.name] = value;
    }
  });

  return result;
}

// Build JSON string from object
export function buildJSON(data: any, pretty: boolean = true): string {
  if (pretty) {
    return JSON.stringify(data, null, 2);
  }
  return JSON.stringify(data);
}

// Format field name to readable label
function formatLabel(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Get default value based on type
function getDefaultValue(type: FormField["type"]): any {
  switch (type) {
    case "boolean":
      return false;
    case "number":
      return 0;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

// Check if a field should be a select field
function isSelectField(path: string[]): boolean {
  const selectFields = [
    ["mode"], // root level mode field
    ["routing", "peer", "mode"],
    ["transport", "link", "protocols"],
    // Add more select fields as needed
  ];

  return selectFields.some(
    (fieldPath) => JSON.stringify(fieldPath) === JSON.stringify(path)
  );
}

// Get options for select fields
function getSelectOptions(path: string[]): string[] {
  const pathStr = path.join(".");

  const optionsMap: { [key: string]: string[] } = {
    mode: ["router", "peer", "client"],
    "routing.peer.mode": ["peer_to_peer", "brokered", "linkstate_registries"],
    // Add more options as needed
  };

  return optionsMap[pathStr] || [];
}

// Get field descriptions
function getFieldDescription(path: string[]): string | undefined {
  const pathStr = path.join(".");

  const descriptions: { [key: string]: string } = {
    id: "Unique identifier (128-bit hex). If not set, a random ID will be generated.",
    mode: "The node's operation mode",
    metadata: "Arbitrary metadata about the node (name, location, etc.)",
    "connect.endpoints": "List of endpoints to connect to",
    "connect.timeout_ms": "Connection timeout in milliseconds",
    "listen.endpoints": "List of endpoints to listen on",
    "scouting.multicast.enabled":
      "Enable multicast scouting for peer discovery",
    "transport.unicast.max_sessions": "Maximum number of unicast sessions",
    "adminspace.permissions.read": "Allow read access to admin space",
    "adminspace.permissions.write": "Allow write access to admin space",
    // Add more descriptions as needed
  };

  return descriptions[pathStr];
}

// Detect if content is Zenoh config
export function isZenohConfig(content: string): boolean {
  try {
    const parsed = parseJSON5(content);
    // Check for Zenoh-specific fields
    return (
      parsed.hasOwnProperty("mode") ||
      parsed.hasOwnProperty("scouting") ||
      parsed.hasOwnProperty("routing") ||
      parsed.hasOwnProperty("transport") ||
      parsed.hasOwnProperty("adminspace")
    );
  } catch {
    return false;
  }
}

// Get schema for Zenoh
export function getZenohSchema(): any {
  return zenohSchema;
}

// Merge uploaded data with schema defaults
export function mergeWithSchema(uploadedData: any, schema: any): any {
  const merged = { ...schema };

  const deepMerge = (target: any, source: any) => {
    Object.keys(source).forEach((key) => {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (!target[key]) {
          target[key] = {};
        }
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
  };

  deepMerge(merged, uploadedData);
  return merged;
}
