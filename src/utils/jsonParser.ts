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
    fieldValue = normalizeFieldValue(key, fieldValue, schemaValue);

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
        fieldValue || {},
        schemaValue || {},
        currentPath,
        label
      );
    }

    if (fieldType === "array") {
      const resolvedArray = Array.isArray(fieldValue) ? fieldValue : [];
      field.value = JSON.parse(JSON.stringify(resolvedArray));

      let templateSource =
        Array.isArray(schemaValue) && schemaValue.length > 0
          ? schemaValue[0]
          : null;

      if (
        !templateSource &&
        Array.isArray(resolvedArray) &&
        resolvedArray.length > 0
      ) {
        templateSource = resolvedArray[0];
      }

      if (
        templateSource &&
        typeof templateSource === "object" &&
        !Array.isArray(templateSource)
      ) {
        field.fields = jsonToFormFields(
          templateSource,
          templateSource,
          currentPath,
          label
        );
      }
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

  const serializeArrayField = (
    field: FormField,
    existedInUploadedData: boolean,
    isModified: boolean
  ): any => {
    const arrayValue = Array.isArray(field.value) ? field.value : [];

    if (field.fields && field.fields.length > 0) {
      // For arrays of objects (e.g. zenoh routing.transport_weights, access_control.rules),
      // if the whole array matches the defaults (not modified, not forced, not from upload),
      // we skip it entirely in minimal output.
      if (
        excludeDefaults &&
        !field.forceInclude &&
        !existedInUploadedData &&
        !isModified
      ) {
        return undefined;
      }

      const items = arrayValue
        .map((item: any, index: number) => {
          const itemPath = [...field.path, index.toString()];
          const childFields = field.fields!.map((templateField) =>
            cloneFieldForArrayItem(templateField, item, itemPath)
          );

          const itemResult = formFieldsToJSON(
            childFields,
            excludeDefaults,
            originalUploadedData,
            originalFields
          );

          const hasContent = Object.keys(itemResult).length > 0;
          const hasForcedChildren =
            item &&
            typeof item === "object" &&
            item.__forceInclude &&
            Object.values(item.__forceInclude).some(Boolean);

          if (
            hasContent ||
            field.forceInclude ||
            hasForcedChildren ||
            !excludeDefaults
          ) {
            return itemResult;
          }
          return null;
        })
        .filter(
          (item) => item && Object.keys(item).length > 0
        );

      if (
        items.length === 0 &&
        excludeDefaults &&
        !field.forceInclude &&
        !existedInUploadedData &&
        !isModified
      ) {
        return undefined;
      }

      if (items.length === 0 && (isModified || field.forceInclude)) {
        return [];
      }

      return items;
    }

    const primitives = arrayValue.filter(
      (entry) => entry !== undefined && entry !== ""
    );

    const defaultArray = Array.isArray(field.defaultValue)
      ? field.defaultValue
      : [];
    const matchesDefault =
      JSON.stringify(arrayValue) === JSON.stringify(defaultArray);

    if (primitives.length === 0) {
      if (isModified || field.forceInclude || existedInUploadedData) {
        return [];
      }
      return undefined;
    }

    if (
      excludeDefaults &&
      !field.forceInclude &&
      !existedInUploadedData &&
      !isModified &&
      matchesDefault
    ) {
      return undefined;
    }

    return primitives;
  };

  fields.forEach((field) => {
    let value = field.value;
    const isModified = originalFields
      ? isFieldModified(field, originalFields)
      : true;
    const existedInUploadedData = originalUploadedData
      ? hasValueInUploadedData(field.path, originalUploadedData)
      : false;

    if (
      field.name === "id" &&
      field.path.length === 1 &&
      (!field.value || field.value === "") &&
      !field.forceInclude
    ) {
      return;
    }

    if (field.type === "object" && field.fields) {
      let childFields = field.fields;
      if (field.forceInclude && excludeDefaults) {
        childFields = field.fields.map((childField) => ({
          ...childField,
          forceInclude: true,
        }));
      }

      const nestedValue = formFieldsToJSON(
        childFields,
        excludeDefaults,
        originalUploadedData,
        originalFields
      );
      const hasNestedContent = Object.keys(nestedValue).length > 0;

      if (
        hasNestedContent ||
        !excludeDefaults ||
        field.forceInclude ||
        existedInUploadedData
      ) {
        result[field.name] = nestedValue;
      }
      return;
    }

    if (field.type === "array") {
      const serialized = serializeArrayField(
        field,
        existedInUploadedData,
        isModified
      );
      if (serialized === undefined) {
        return;
      }

      if (
        field.name === "storages" &&
        Array.isArray(serialized) &&
        field.path.join(".").includes("storage_manager")
      ) {
        const storagesObject: Record<string, any> = {};
        serialized.forEach((storage: any, index: number) => {
          if (!storage || typeof storage !== "object") return;
          const storageName =
            storage.id || storage.name || `storage_${index + 1}`;
          if (!storageName) return;
          const { id, name, ...rest } = storage;
          storagesObject[storageName] = rest;
        });
        result[field.name] = storagesObject;
      } else if (field.name === "search_dirs" && Array.isArray(serialized)) {
        result[field.name] = serialized.map((entry: any) => {
          if (entry && entry.kind === "path") {
            return entry.value ?? "";
          }
          return entry;
        });
      } else {
        result[field.name] = serialized;
      }
      return;
    }

    if (
      excludeDefaults &&
      !field.forceInclude &&
      !isModified &&
      !existedInUploadedData
    ) {
      return;
    }

    if (value === "" && !field.required) {
      value = null;
    }

    if (value !== null && value !== undefined) {
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
    ["transport", "link", "tx", "sequence_number_resolution"],
    ["plugins_loading", "search_dirs", "kind"],
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
    "transport.link.tx.sequence_number_resolution": [
      "8bit",
      "16bit",
      "32bit",
      "64bit",
    ],
    "plugins_loading.search_dirs.kind": [
      "current_exe_parent",
      "path",
    ],
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

function normalizeFieldValue(
  key: string,
  fieldValue: any,
  schemaValue: any
): any {
  if (key === "storages" && Array.isArray(schemaValue)) {
    if (Array.isArray(fieldValue)) {
      return fieldValue.map((entry, index) => {
        if (entry && typeof entry === "object") {
          if (!entry.id && entry.name) {
            return { id: entry.name, ...entry };
          }
          if (!entry.id) {
            return { id: `storage_${index + 1}`, ...entry };
          }
        }
        return entry;
      });
    }

    if (fieldValue && typeof fieldValue === "object") {
      return Object.entries(fieldValue).map(([id, config]) => ({
        id,
        ...(config as any),
      }));
    }
  }

  if (key === "search_dirs" && Array.isArray(schemaValue)) {
    if (Array.isArray(fieldValue)) {
      return fieldValue.map((entry) => {
        if (typeof entry === "string") {
          return { kind: "path", value: entry };
        }
        if (entry && typeof entry === "object") {
          return {
            kind: entry.kind ?? "path",
            value: entry.value ?? null,
          };
        }
        return { kind: "path", value: entry };
      });
    }
  }

  return fieldValue;
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
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function cloneFieldForArrayItem(
  templateField: FormField,
  source: any,
  basePath: string[]
): FormField {
  const forceIncludeMap =
    source &&
    typeof source === "object" &&
    source.__forceInclude &&
    typeof source.__forceInclude === "object"
      ? source.__forceInclude
      : undefined;

  const currentValue =
    source && typeof source === "object"
      ? source[templateField.name]
      : undefined;

  const cloned: FormField = {
    ...templateField,
    path: [...basePath, templateField.name],
    value:
      currentValue !== undefined ? currentValue : templateField.defaultValue,
    forceInclude:
      templateField.forceInclude ||
      Boolean(forceIncludeMap && forceIncludeMap[templateField.name]),
  };

  if (templateField.type === "object" && templateField.fields) {
    const nestedSource =
      currentValue && typeof currentValue === "object" ? currentValue : undefined;
    cloned.fields = templateField.fields.map((childTemplate) =>
      cloneFieldForArrayItem(childTemplate, nestedSource, cloned.path)
    );
  } else if (templateField.type === "array" && templateField.fields) {
    cloned.fields = templateField.fields.map((childTemplate) =>
      cloneFieldForArrayItem(childTemplate, undefined, cloned.path)
    );
  }

  return cloned;
}
