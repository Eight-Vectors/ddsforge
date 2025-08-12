import { XMLParser, XMLBuilder } from "fast-xml-parser";
import type { DDSVendor, FormField } from "../types/dds";
import { cycloneDDSSchema } from "../schemas/cyclonedds-schema";
import { fastDDSSchema } from "../schemas/fastdds-schema";
import { isSchemaDefault } from "./schemaDefaults";
import { isFieldModified } from "./fieldUtils";

export const parseXML = async (xmlContent: string): Promise<any> => {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true,
      trimValues: true,
      parseTagValue: true,
      ignoreDeclaration: false,
      removeNSPrefix: false,
      processEntities: true,
      preserveOrder: false,
      alwaysCreateTextNode: false,
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
    indentBy: "  ",
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    processEntities: true,
  });

  let xmlData: any = {};

  if (vendor === "cyclonedds") {
    const {
      "@_xmlns": _,
      "@_xmlns:xsi": __,
      "@_xsi:schemaLocation": ___,
      ...cleanData
    } = data;

    xmlData = {
      CycloneDDS: {
        "@_xmlns": "https://cdds.io/config",
        "@_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "@_xsi:schemaLocation":
          "https://cdds.io/config https://raw.githubusercontent.com/eclipse-cyclonedds/cyclonedds/master/etc/cyclonedds.xsd",
        ...cleanData,
      },
    };
  } else if (vendor === "fastdds") {
    // Remove namespace attributes from data if they exist
    const { "@_xmlns": _, ...cleanData } = data;

    xmlData = {
      dds: {
        "@_xmlns": "http://www.eprosima.com",
        ...cleanData,
      },
    };
  } else {
    xmlData = {
      dds: data,
    };
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += builder.build(xmlData);
  return xml;
};

export const detectVendor = (content: string): DDSVendor | null => {
  const lowerContent = content.toLowerCase();

  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      if (
        lowerContent.includes('"mode"') ||
        lowerContent.includes('"scouting"') ||
        lowerContent.includes('"routing"') ||
        lowerContent.includes('"transport"') ||
        lowerContent.includes('"adminspace"')
      ) {
        return "zenoh";
      }
    } catch {}
  }

  if (
    lowerContent.includes("<cyclonedds") ||
    lowerContent.includes("cdds.io")
  ) {
    return "cyclonedds";
  } else if (
    lowerContent.includes("<dds") ||
    lowerContent.includes("profile_name") ||
    lowerContent.includes("eprosima")
  ) {
    return "fastdds";
  }
  return null;
};

export const xmlToFormFields = (
  data: any,
  path: string[] = []
): FormField[] => {
  const fields: FormField[] = [];

  const processValue = (
    key: string,
    value: any,
    currentPath: string[]
  ): FormField | null => {
    if (key === "_" || key === "#text" || key === "?xml") return null;

    if (
      key === "@_xmlns" ||
      key === "@_xmlns:xsi" ||
      key === "@_xsi:schemaLocation"
    )
      return null;

    const fieldPath = [...currentPath, key];
    const displayKey = key.startsWith("@_") ? key.substring(2) : key;
    const label = displayKey
      .split(/(?=[A-Z])/)
      .join(" ")
      .toLowerCase()
      .replace(/(^|\s)\S/g, (l) => l.toUpperCase());

    if (Array.isArray(value)) {
      const hasPrimitiveValues =
        value.length > 0 &&
        (typeof value[0] === "string" ||
          typeof value[0] === "number" ||
          typeof value[0] === "boolean");

      return {
        name: key,
        label,
        type: "array",
        value: value,
        defaultValue: [],
        required: false,
        path: fieldPath,
        fields: hasPrimitiveValues
          ? []
          : value.length > 0
          ? xmlToFormFields(value[0], fieldPath)
          : [],
      };
    } else if (typeof value === "object" && value !== null) {
      const subFields = xmlToFormFields(value, fieldPath);
      if (subFields.length > 0) {
        return {
          name: key,
          label,
          type: "object",
          value: value,
          defaultValue: {},
          required: false,
          path: fieldPath,
          fields: subFields,
        };
      }
      return null;
    } else if (typeof value === "boolean") {
      return {
        name: key,
        label,
        type: "boolean",
        value: value,
        defaultValue: false,
        required: false,
        path: fieldPath,
      };
    } else if (!isNaN(Number(value))) {
      return {
        name: key,
        label,
        type: "number",
        value: Number(value),
        defaultValue: 0,
        required: false,
        path: fieldPath,
      };
    } else {
      return {
        name: key,
        label,
        type: "text",
        value: value || "",
        defaultValue: "",
        required: false,
        path: fieldPath,
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

export const formFieldsToXML = (
  fields: FormField[],
  excludeDefaults: boolean = false,
  vendor?: DDSVendor,
  originalUploadedData?: any,
  originalFields?: FormField[]
): any => {
  const result: any = {};

  fields.forEach((field) => {
    if (
      field.value === "" ||
      field.value === null ||
      field.value === undefined
    ) {
      return;
    }

    if (excludeDefaults) {
      // Check if user has explicitly forced this field to be included
      if (field.forceInclude) {
        // Don't exclude this field, user wants it included
      } else {
        // Determine if we should exclude this field
        if (originalUploadedData) {
          // Uploaded file scenario: exclude defaults that weren't in uploaded data
          const wasInUploadedData = hasValueInUploadedXMLData(
            field.path,
            originalUploadedData
          );
          if (
            vendor === "cyclonedds" &&
            isSchemaDefault("cyclonedds", field.path, field.value) &&
            !wasInUploadedData
          ) {
            return;
          }
          if (field.defaultValue !== undefined) {
            const isDefault =
              JSON.stringify(field.value) ===
              JSON.stringify(field.defaultValue);
            if (isDefault && !wasInUploadedData) return;
          }
        } else if (originalFields) {
          // Created from scratch scenario: exclude unmodified defaults
          const isModified = isFieldModified(field, originalFields);
          if (
            vendor === "cyclonedds" &&
            isSchemaDefault("cyclonedds", field.path, field.value) &&
            !isModified
          ) {
            return;
          }
          if (field.defaultValue !== undefined) {
            const isDefault =
              JSON.stringify(field.value) ===
              JSON.stringify(field.defaultValue);
            if (isDefault && !isModified) return;
          }
        } else {
          // Fallback: exclude all defaults (old behavior)
          if (
            vendor === "cyclonedds" &&
            isSchemaDefault("cyclonedds", field.path, field.value)
          ) {
            return;
          }
          if (field.defaultValue !== undefined) {
            const isDefault =
              JSON.stringify(field.value) ===
              JSON.stringify(field.defaultValue);
            if (isDefault) return;
          }
        }
      }
    }

    if (field.type === "array") {
      if (
        Array.isArray(field.value) &&
        (field.value.length > 0 || field.forceInclude)
      ) {
        if (field.fields && field.fields.length > 0) {
          const mappedItems = field.value
            .map((item: any) => {
              const itemFields = field.fields!.map((subField) => ({
                ...subField,
                value:
                  item[subField.name] !== undefined
                    ? item[subField.name]
                    : subField.defaultValue,
              }));
              return formFieldsToXML(
                itemFields,
                excludeDefaults,
                vendor,
                originalUploadedData,
                originalFields
              );
            })
            .filter((item: any) => Object.keys(item).length > 0); // Filter out empty objects

          if (mappedItems.length > 0 || field.forceInclude) {
            result[field.name] = mappedItems;
          }
        } else {
          // For simple arrays (not objects)
          const nonEmptyItems = field.value.filter(
            (item: any) => item !== null && item !== undefined && item !== ""
          );
          if (nonEmptyItems.length > 0 || field.forceInclude) {
            result[field.name] = nonEmptyItems;
          }
        }
      }
    } else if (field.type === "object" && field.fields) {
      // If parent object is force included, propagate this to child fields
      let childFields = field.fields;
      if (field.forceInclude && excludeDefaults) {
        // Clone child fields and set forceInclude on all children
        childFields = field.fields.map((childField) => ({
          ...childField,
          forceInclude: true,
        }));
      }

      const subResult = formFieldsToXML(
        childFields,
        excludeDefaults,
        vendor,
        originalUploadedData,
        originalFields
      );
      if (Object.keys(subResult).length > 0 || field.forceInclude) {
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
      if (typeof value === "object" && !Array.isArray(value)) {
        merged[key] = mergeWithDefaults(value, defaults[key] || {});
      } else {
        merged[key] = value;
      }
    }
  });

  return merged;
};

// Deep merge uploaded data into schema, preserving all schema fields
export const mergeUploadedDataIntoSchema = (
  uploadedData: any,
  schema: any
): any => {
  const result = JSON.parse(JSON.stringify(schema)); // Deep clone schema

  const deepMerge = (target: any, source: any) => {
    Object.keys(source).forEach((key) => {
      if (key.startsWith("@_")) {
        // Preserve attributes
        target[key] = source[key];
      } else if (source[key] !== null && source[key] !== undefined) {
        if (Array.isArray(source[key])) {
          target[key] = source[key];
        } else if (typeof source[key] === "object") {
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
export const isInUploadedData = (
  path: string[],
  uploadedData: any
): boolean => {
  if (!uploadedData) return false;

  let current = uploadedData;
  for (const key of path) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }
  return true;
};

// Helper function to check if a value exists in the original uploaded XML data
function hasValueInUploadedXMLData(path: string[], uploadedData: any): boolean {
  if (!uploadedData || !Array.isArray(path) || path.length === 0) {
    return false;
  }

  let current = uploadedData;
  for (const key of path) {
    if (current && typeof current === "object") {
      // Handle XML attributes (keys starting with @_)
      if (key.startsWith("@_") && key in current) {
        current = current[key];
      } else if (key in current) {
        current = current[key];
      } else {
        // Try to find the key case-insensitively for XML
        const actualKey = Object.keys(current).find(
          (k) => k.toLowerCase() === key.toLowerCase() || k === key
        );
        if (actualKey) {
          current = current[actualKey];
        } else {
          return false;
        }
      }
    } else {
      return false;
    }
  }

  return current !== undefined;
}

// Get the appropriate schema based on vendor
export const getSchemaForVendor = (vendor: DDSVendor): any => {
  switch (vendor) {
    case "cyclonedds":
      return cycloneDDSSchema;
    case "fastdds":
      return fastDDSSchema;
    case "zenoh":
      // For Zenoh, we'll need to import and return the schema
      return {}; // Placeholder - will be handled differently
    default:
      return {};
  }
};
