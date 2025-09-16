import { fastDDSSchema } from "../schemas/fastdds-schema";

export const getFastDDSDefault = (path: string[]): any => {
  let current: any = fastDDSSchema.dds;
  let adjustedPath = [...path];

  // Profile types live under profiles
  const profileTypes = [
    "participant",
    "publisher",
    "subscriber",
    "topic",
    "data_writer",
    "data_reader",
  ];
  if (
    profileTypes.includes(path[0]) &&
    current.profiles &&
    current.profiles[path[0]]
  ) {
    current = current.profiles;
  }

  for (const key of adjustedPath) {
    if (current && typeof current === "object") {
      // If array, use first element
      if (Array.isArray(current)) {
        current = current[0];
      }

      const actualKey = Object.keys(current).find(
        (k) => k === key || k.toLowerCase() === key.toLowerCase()
      );

      if (actualKey && actualKey in current) {
        current = current[actualKey];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  if (typeof current !== "object" || current === null) {
    return current;
  }

  return undefined;
};

// Merge uploaded data with schema; include missing schema sections
export const smartMergeFastDDS = (uploadedData: any, schema: any): any => {
  const result: any = {
    "@_xmlns":
      uploadedData["@_xmlns"] || schema["@_xmlns"] || "http://www.eprosima.com",
  };

  // Include base sections from schema
  Object.keys(schema).forEach((key) => {
    if (!key.startsWith("@_")) {
      // Prefer uploaded data; fallback to schema default
      if (uploadedData[key] !== undefined) {
        result[key] = uploadedData[key];
      } else {
        result[key] = schema[key];
      }
    }
  });

  // Handle profiles section separately
  if (schema.profiles || uploadedData.profiles) {
    result.profiles = {
      "@_xmlns":
        uploadedData.profiles?.["@_xmlns"] || schema.profiles?.["@_xmlns"],
    };

    // Normalize profile types to arrays
    const profileTypes = ["participant", "data_writer", "data_reader", "topic"];

    profileTypes.forEach((type) => {
      if (uploadedData.profiles?.[type]) {
        // Ensure arrays
        const profiles = Array.isArray(uploadedData.profiles[type])
          ? uploadedData.profiles[type]
          : [uploadedData.profiles[type]];
        result.profiles[type] = profiles;
      } else if (schema.profiles?.[type]) {
        // Fallback to schema defaults
        result.profiles[type] = schema.profiles[type];
      }
    });

    // Copy other profile properties
    if (uploadedData.profiles) {
      Object.keys(uploadedData.profiles).forEach((key) => {
        if (!key.startsWith("@_") && !profileTypes.includes(key)) {
          result.profiles[key] = uploadedData.profiles[key];
        }
      });
    }
  }

  // Copy extra top-level sections from uploaded data
  Object.keys(uploadedData).forEach((key) => {
    if (!key.startsWith("@_") && result[key] === undefined) {
      result[key] = uploadedData[key];
    }
  });

  return result;
};

export const isFastDDSDefault = (path: string[], value: any): boolean => {
  const lastPathElement = path[path.length - 1];

  // Keep sec/nanosec pairs together
  if (lastPathElement === "nanosec") {
    return false;
  }

  // Don't drop sec when used with a duration context
  if (lastPathElement === "sec" && path.length >= 2) {
    const parentPath = path[path.length - 2];
    const durationContexts = [
      "duration",
      "period",
      "leaseDuration",
      "leaseAnnouncement",
      "heartbeatPeriod",
      "nackResponseDelay",
      "nackSupressionDuration",
      "heartbeatResponseDelay",
      "minimum_separation",
      "latencyBudget",
    ];
    if (durationContexts.includes(parentPath)) {
      return false;
    }
  }

  // Preserve useBuiltinTransports=false
  if (lastPathElement === "useBuiltinTransports" && value === false) {
    return false;
  }

  const defaultValue = getFastDDSDefault(path);

  // No schema default => treat as non-default
  if (defaultValue === undefined) {
    return false;
  }

  // Null/undefined handling
  if (value === null || value === undefined) {
    return defaultValue === null || defaultValue === undefined;
  }

  // Special FastDDS values
  if (typeof value === "string") {
    // DURATION_INFINITY
    if (value === "DURATION_INFINITY" && defaultValue === "DURATION_INFINITY") {
      return true;
    }

    // Numeric strings
    if (!isNaN(Number(value)) && typeof defaultValue === "number") {
      return Number(value) === defaultValue;
    }
  }

  // Compare values (string/number conversions)
  if (typeof value === "number" && typeof defaultValue === "string") {
    return String(value) === defaultValue;
  }

  // Boolean comparison
  if (typeof value === "boolean" || typeof defaultValue === "boolean") {
    return value === defaultValue;
  }

  // Arrays
  if (Array.isArray(value) && Array.isArray(defaultValue)) {
    return JSON.stringify(value) === JSON.stringify(defaultValue);
  }

  // String comparison
  return value === defaultValue;
};
