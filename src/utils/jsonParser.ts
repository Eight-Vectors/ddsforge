import type { FormField } from "../types/dds";
import { isFieldModified } from "./fieldUtils";

import { zenohSchema } from "../schemas/zenoh-schema";

export function parseJSON5(content: string): any {
  try {
    return JSON.parse(content);
  } catch (e) {
    let cleaned = content;

    cleaned = cleaned.replace(/\/\/.*$/gm, "");
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

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

export function jsonToFormFields(
  data: any,
  schema: any = {},
  path: string[] = [],
  parentLabel: string = ""
): FormField[] {
  const fields: FormField[] = [];

  const allKeys = new Set([
    ...Object.keys(data || {}),
    ...Object.keys(schema || {}),
  ]);

  allKeys.forEach((key) => {
    const value = data?.[key];
    const schemaValue = schema?.[key];
    const currentPath = [...path, key];

    const label = parentLabel
      ? `${parentLabel} > ${formatLabel(key)}`
      : formatLabel(key);

    if (value === null && schemaValue === undefined) {
      return;
    }

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

    if (fieldType === "object" && fieldValue !== null) {
      field.fields = jsonToFormFields(
        value || {},
        schemaValue || {},
        currentPath,
        label
      );
    }

    if (fieldType === "array") {
      field.value = fieldValue || [];
    }

    if (isSelectField(currentPath)) {
      field.type = "select";
      field.options = getSelectOptions(currentPath);
    }

    fields.push(field);
  });

  return fields;
}

export function formFieldsToJSON(
  fields: FormField[],
  excludeDefaults: boolean = false,
  originalUploadedData?: any,
  originalFields?: FormField[]
): any {
  const result: any = {};

  fields.forEach((field) => {
    let value = field.value;

    if (excludeDefaults) {
      if (field.forceInclude) {
      } else {
        if (originalUploadedData) {
          const wasInUploadedData = hasValueInUploadedData(field.path, originalUploadedData);
          if (JSON.stringify(value) === JSON.stringify(field.defaultValue) && !wasInUploadedData) {
            return;
          }
        } else if (originalFields) {
          const isModified = isFieldModified(field, originalFields);
          if (JSON.stringify(value) === JSON.stringify(field.defaultValue) && !isModified) {
            return;
          }
        } else {
          if (JSON.stringify(value) === JSON.stringify(field.defaultValue)) {
            return;
          }
        }
      }
    }

    if (field.name === 'id' && field.path.length === 1 && (!field.value || field.value === '') && !field.forceInclude) {
      return;
    }

    if (field.type === "object" && field.fields) {
      let childFields = field.fields;
      if (field.forceInclude && excludeDefaults) {
        childFields = field.fields.map(childField => ({
          ...childField,
          forceInclude: true
        }));
      }
      
      const nestedValue = formFieldsToJSON(childFields, excludeDefaults, originalUploadedData, originalFields);
      if (Object.keys(nestedValue).length > 0 || !excludeDefaults || field.forceInclude) {
        value = nestedValue;
      } else {
        return;
      }
    }

    if (field.type === "array" && Array.isArray(value)) {
      if (excludeDefaults && value.length === 0 && !field.forceInclude) {
        if (originalUploadedData) {
          const wasInUploadedData = hasValueInUploadedData(field.path, originalUploadedData);
          if (!wasInUploadedData) return;
        } else if (originalFields) {
          const isModified = isFieldModified(field, originalFields);
          if (!isModified) return;
        } else {
          return;
        }
      }
    }

    if (value === "" && !field.required) {
      value = null;
    }

    if ((value !== null && value !== undefined) || !excludeDefaults) {
      result[field.name] = value;
    }
  });

  return result;
}

export function buildJSON(data: any, pretty: boolean = true): string {
  if (pretty) {
    return JSON.stringify(data, null, 2);
  }
  return JSON.stringify(data);
}

function formatLabel(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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

function isSelectField(path: string[]): boolean {
  const selectFields = [
    ["mode"], // root level mode field
    ["routing", "peer", "mode"],
    ["transport", "link", "protocols"],
  ];

  return selectFields.some(
    (fieldPath) => JSON.stringify(fieldPath) === JSON.stringify(path)
  );
}

function getSelectOptions(path: string[]): string[] {
  const pathStr = path.join(".");

  const optionsMap: { [key: string]: string[] } = {
    mode: ["router", "peer", "client"],
    "routing.peer.mode": ["peer_to_peer", "brokered", "linkstate_registries"],
  };

  return optionsMap[pathStr] || [];
}

function getFieldDescription(path: string[]): string | undefined {
  const pathStr = path.join(".");

  const descriptions: { [key: string]: string } = {
    id: "Unique identifier (128-bit hex). If not set, a random ID will be generated.",
    mode: "The node's operation mode",
    metadata: "Arbitrary metadata about the node (name, location, etc.)",
    "connect.endpoints": "List of endpoints to connect to",
    "connect.timeout_ms": "Connection timeout in milliseconds",
    "listen.endpoints": "List of endpoints to listen on",
    "open": "Configure conditions to be met before session open returns",
    "open.return_conditions": "Conditions that must be met before session open completes",
    "open.return_conditions.connect_scouted": "Wait to connect to scouted peers and routers before returning",
    "open.return_conditions.declares": "Wait to receive initial declares from connected peers before returning",
    "scouting.multicast.enabled":
      "Enable multicast scouting for peer discovery",
    "transport.unicast.max_sessions": "Maximum number of unicast sessions",
    "adminspace.permissions.read": "Allow read access to admin space",
    "adminspace.permissions.write": "Allow write access to admin space",
  };

  return descriptions[pathStr];
}

export function isZenohConfig(content: string): boolean {
  try {
    const parsed = parseJSON5(content);
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

export function getZenohSchema(): any {
  return zenohSchema;
}

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

function hasValueInUploadedData(path: string[], uploadedData: any): boolean {
  if (!uploadedData || !Array.isArray(path) || path.length === 0) {
    return false;
  }
  
  let current = uploadedData;
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }
  
  return current !== undefined;
}

export function generateZenohId(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
