import { XMLBuilder } from "fast-xml-parser";
import type { DDSVendor, FormField } from "../types/dds";
import { cycloneDDSSchema } from "../schemas/cyclonedds-schema";
import { fastDDSSchema } from "../schemas/fastdds-schema";
import { isSchemaDefault } from "./schemaDefaults";
import { isFieldModified } from "./fieldUtils";
import { FastDDSValidator } from "./fastddsRules";
import { transportSettings, rtpsSettings, propertiesPolicy as propertiesPolicySettings, logSettings } from "../schemas/fastdds-settings";

export const buildXML = (
  data: any,
  vendor: DDSVendor,
  options?: { skipValidation?: boolean; autoFix?: boolean }
): string => {
  let processedData = data;

  // FastDDS: validate
  if (vendor === "fastdds" && !options?.skipValidation) {
    const validator = new FastDDSValidator();
    const validationResult = validator.validateConfig(data);

    if (!validationResult.valid || validationResult.warnings.length > 0) {
      console.warn("FastDDS validation issues:", {
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      });
    }

    if (options?.autoFix) {
      try {
        processedData = validator.autoFix(data, validationResult.autoFixAvailable);
      } catch (e) {
        console.warn("FastDDS auto-fix failed", e);
      }
    }
  }

  // CycloneDDS: normalize structure
  if (vendor === "cyclonedds") {
    const preprocessForCycloneDDS = (obj: any, _parentKey?: string) => {
      if (typeof obj !== "object" || obj === null) return obj;

      const processed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === "Peer" && Array.isArray(value)) {
          // Keep Peer array as-is (self-close later)
          processed[key] = value.map((peer: any) => {
            if (
              typeof peer === "object" &&
              !peer["#text"] &&
              Object.keys(peer).every((k) => k.startsWith("@_"))
            ) {
              return peer;
            }
            return peer;
          });
        } else if (
          key === "Interfaces" &&
          typeof value === "object" &&
          value !== null
        ) {
          // Interfaces should contain NetworkInterface array
          const interfacesObj = value as any;
          if (
            interfacesObj.NetworkInterface &&
            Array.isArray(interfacesObj.NetworkInterface)
          ) {
            processed[key] = interfacesObj.NetworkInterface;
          } else if (
            Object.keys(interfacesObj).some((k) => k.startsWith("@_"))
          ) {
            // Attributes found directly on Interfaces: wrap into one NetworkInterface
            const networkInterface: any = {};
            Object.keys(interfacesObj).forEach((k) => {
              if (k.startsWith("@_")) {
                networkInterface[k] = interfacesObj[k];
              }
            });
            processed[key] = [networkInterface];
          } else {
            processed[key] = preprocessForCycloneDDS(interfacesObj, key);
          }
        } else if (
          key === "Threads" &&
          typeof value === "object" &&
          value !== null
        ) {
          // Threads should contain a Thread array
          const threadsObj = value as any;

          // If attributes/content are on Threads, convert into single Thread item
          if (
            Object.keys(threadsObj).some(
              (k) =>
                k.startsWith("@_") || k === "Scheduling" || k === "StackSize"
            )
          ) {
            const thread: any = {};
            Object.keys(threadsObj).forEach((k) => {
              if (k !== "Thread") {
                thread[k] = threadsObj[k];
              }
            });
            processed[key] = { Thread: [thread] };
          } else if (threadsObj.Thread && Array.isArray(threadsObj.Thread)) {
            processed[key] = threadsObj;
          } else if (Array.isArray(threadsObj)) {
            processed[key] = { Thread: threadsObj };
          } else {
            processed[key] = preprocessForCycloneDDS(threadsObj, key);
          }
        } else if (
          (key === "IgnoredPartitions" ||
            key === "NetworkPartitions" ||
            key === "PartitionMappings") &&
          typeof value === "object" &&
          value !== null
        ) {
          // Partition containers should contain arrays
          const partitionType =
            key === "IgnoredPartitions"
              ? "IgnoredPartition"
              : key === "NetworkPartitions"
              ? "NetworkPartition"
              : "PartitionMapping";
          const partitionObj = value as any;

          if (
            Object.keys(partitionObj).some((k) => k.startsWith("@_")) &&
            !partitionObj[partitionType]
          ) {
            // Attributes on container: wrap into one element
            const element: any = {};
            Object.keys(partitionObj).forEach((k) => {
              if (k.startsWith("@_")) {
                element[k] = partitionObj[k];
              }
            });
            processed[key] = [element];
          } else if (
            partitionObj[partitionType] &&
            Array.isArray(partitionObj[partitionType])
          ) {
            processed[key] = partitionObj[partitionType];
          } else {
            processed[key] = preprocessForCycloneDDS(partitionObj, key);
          }
        } else if (typeof value === "object") {
          processed[key] = preprocessForCycloneDDS(value, key);
        } else {
          processed[key] = value;
        }
      }

      return processed;
    };

    processedData = preprocessForCycloneDDS(processedData);
  }

  // FastDDS: normalize nested structures
  if (vendor === "fastdds") {
    const preprocessForFastDDS = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) return obj.map((item) => preprocessForFastDDS(item));
      if (typeof obj !== "object") return obj;

      const processed: any = {};

      for (const [key, value] of Object.entries(obj)) {
        if (key === "partition" && typeof value === "object" && value !== null) {
          const partitionValue: any = value;
          const namesValue = partitionValue.names;

          if (namesValue !== undefined) {
            let normalizedNames: any = undefined;

            if (Array.isArray(namesValue)) {
              // Array of strings => { name: [...] }
              if (namesValue.length === 0) {
                normalizedNames = {};
              } else if (typeof namesValue[0] === "string") {
                normalizedNames = { name: namesValue };
              } else {
                normalizedNames = preprocessForFastDDS(namesValue);
              }
            } else if (typeof namesValue === "string") {
              normalizedNames = { name: [namesValue] };
            } else if (
              typeof namesValue === "object" &&
              namesValue !== null
            ) {
              // Ensure 'name' is an array
              const maybeName: any = (namesValue as any).name;
              if (Array.isArray(maybeName)) {
                normalizedNames = { name: maybeName.map((n: any) => n) };
              } else if (typeof maybeName === "string") {
                normalizedNames = { name: [maybeName] };
              } else {
                normalizedNames = preprocessForFastDDS(namesValue);
              }
            }

            // Build partition with normalized names
            const restPartition: any = {};
            for (const [k, v] of Object.entries(partitionValue)) {
              if (k === "names") continue;
              restPartition[k] = preprocessForFastDDS(v);
            }

            processed[key] = {
              ...restPartition,
              ...(normalizedNames !== undefined ? { names: normalizedNames } : {}),
            };
            continue;
          }
        }

        // Recurse
        processed[key] = preprocessForFastDDS(value);
      }

      return processed;
    };

    processedData = preprocessForFastDDS(processedData);
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: "  ",
    suppressEmptyNode: false, // Keep paired tags for empty nodes
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
    } = processedData;

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
    const { "@_xmlns": _, ...cleanData } = processedData;

    if (cleanData.profiles) {
      const { ["@_xmlns"]: _ignoreProfilesXmlns, ...profilesRest } = cleanData.profiles as any;
      cleanData.profiles = profilesRest;
    }

    xmlData = {
      dds: {
        "@_xmlns": "http://www.eprosima.com",
        ...cleanData,
      },
    };
  } else {
    xmlData = {
      dds: processedData,
    };
  }

  let xml = '<?xml version="1.0" encoding="UTF-8" ?>\n';
  xml += builder.build(xmlData);

  if (vendor === "cyclonedds") {
    xml = xml.replace(/<Peer([^>]*?)><\/Peer>/g, "<Peer$1/>");

    xml = xml.replace(
      /<NetworkInterface([^>]*?)><\/NetworkInterface>/g,
      "<NetworkInterface$1/>"
    );

    const interfacesWithAttrs = xml.match(/<Interfaces([^>]+)><\/Interfaces>/);
    if (interfacesWithAttrs && interfacesWithAttrs[1].trim()) {
      xml = xml.replace(
        /<Interfaces([^>]+)><\/Interfaces>/,
        "<Interfaces>\n        <NetworkInterface$1/>\n      </Interfaces>"
      );
    }

    const interfacesMatch = xml.match(
      /<Interfaces>\s*<NetworkInterface>([\s\S]*?)<\/NetworkInterface>\s*<\/Interfaces>/
    );
    if (interfacesMatch) {
      const content = interfacesMatch[1];
      // Convert numbered tags to NetworkInterface
      const networkInterfaces: string[] = [];
      let match;
      const regex = /<(\d+)([^>]*?)(?:\/|>([\s\S]*?)<\/\1)>/g;
      while ((match = regex.exec(content)) !== null) {
        const attrs = match[2];
        const innerContent = match[3] || "";
        if (innerContent) {
          networkInterfaces.push(
            `<NetworkInterface${attrs}>${innerContent}</NetworkInterface>`
          );
        } else {
          networkInterfaces.push(`<NetworkInterface${attrs}/>`);
        }
      }

      xml = xml.replace(
        /<Interfaces>\s*<NetworkInterface>[\s\S]*?<\/NetworkInterface>\s*<\/Interfaces>/,
        `<Interfaces>\n          ${networkInterfaces.join("\n          ")}\n        </Interfaces>`
      );
    }
  }

  return xml;
};

const getFieldDefaultValue = (
  path: string[],
  key: string,
  currentValue: any
): any => {
  // Detect context for defaults
  const isTransportDescriptor = path.some(
    (segment) =>
      segment === "transport_descriptor" ||
      segment === "transport_descriptors" ||
      segment.includes("transport_descriptor")
  );

  const isParticipant = path.some(
    (segment) => segment === "participant" || segment.includes("participant")
  );

  // Inside participant.rtps
  const isInRtps = path.some((segment) => segment === "rtps");

  // useBuiltinTransports may appear under rtps
  const isLikelyParticipantRtps = isInRtps && key === "useBuiltinTransports";

  if (isTransportDescriptor) {
    const transportDefaults = transportSettings.transportDescriptor.default;
    if (key in transportDefaults) {
      return (transportDefaults as any)[key];
    }
  }

  // Participant-specific fields
  if (isParticipant) {
    if (isInRtps && key in rtpsSettings.default) {
      return (rtpsSettings.default as any)[key];
    }

    // Default name in rtps
    if (key === "name" && isInRtps) {
      return "Default Domain Participant";
    }
  }

  // Primitive defaults
  if (typeof currentValue === "boolean") {
    if (
      key === "useBuiltinTransports" &&
      (isParticipant || isLikelyParticipantRtps)
    ) {
      return true;
    }
    if (key === "calculate_crc" || key === "check_crc") {
      return true;
    }
    return false;
  } else if (typeof currentValue === "number") {
    return 0;
  } else if (typeof currentValue === "string") {
    return "";
  }

  return null;
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

  // Handle null or non-object
  if (!data || typeof data !== "object") {
    return fields;
  }

  const processValue = (
    key: string,
    value: any,
    currentPath: string[]
  ): FormField | null => {
    // Skip internal keys
    if (key === "_" || key === "?xml" || key === "#text") return null;

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

    // locator with empty value: provide template
    if (key === "locator" && value === "") {
      const locatorTemplate = {
        udpv4: {
          address: "",
          port: 0,
        },
      };
      const fields = xmlToFormFields(locatorTemplate, fieldPath);
      return {
        name: key,
        label,
        type: "object",
        value: {},
        defaultValue: {},
        required: false,
        path: fieldPath,
        fields: fields,
      };
    }

    if (Array.isArray(value)) {
      const hasPrimitiveValues =
        value.length > 0 &&
        (typeof value[0] === "string" ||
          typeof value[0] === "number" ||
          typeof value[0] === "boolean");

      // interfaceWhiteList: show item template even when empty
      if (key === "interfaceWhiteList") {
        const itemTemplate = {
          address: "",
          interface: "",
        };
        const fields = xmlToFormFields(itemTemplate, [...fieldPath, "0"]);
        return {
          name: key,
          label,
          type: "array",
          value: value,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // log consumer list: class select and property array
      if (key === "consumer") {
        const consumerItemFields: FormField[] = [
          {
            name: "class",
            label: "Class",
            type: "select",
            value: logSettings.consumer.class.default,
            defaultValue: logSettings.consumer.class.default,
            required: false,
            path: [...fieldPath, "0", "class"],
            options: logSettings.consumer.class.values,
          } as any,
          {
            name: "property",
            label: "Property",
            type: "array",
            value: [],
            defaultValue: [],
            required: false,
            path: [...fieldPath, "0", "property"],
            fields: [
              {
                name: "name",
                label: "Name",
                type: "select",
                value: logSettings.consumer.property.name.default,
                defaultValue: logSettings.consumer.property.name.default,
                required: false,
                path: [...fieldPath, "0", "property", "0", "name"],
                options: logSettings.consumer.property.name.values,
              } as any,
              {
                name: "value",
                label: "Value",
                type: "text",
                value: "",
                defaultValue: "",
                required: false,
                path: [...fieldPath, "0", "property", "0", "value"],
              },
            ],
          },
        ];

        // Normalize: property must be array
        const normalizedValue = Array.isArray(value)
          ? value.map((item: any) => {
              const normalized = { ...item };
              if (
                normalized.property !== undefined &&
                !Array.isArray(normalized.property)
              ) {
                normalized.property = [normalized.property];
              }
              return normalized;
            })
          : value;

        return {
          name: key,
          label,
          type: "array",
          value: normalizedValue,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: consumerItemFields,
        };
      }

      // Interfaces allowlist
      if (key === "allowlist" && fieldPath.includes("interfaces")) {
        const itemTemplate = {
          name: "",
          netmask_filter: "AUTO",
        };
        const fields = xmlToFormFields(itemTemplate, [...fieldPath, "0"]);
        return {
          name: key,
          label,
          type: "array",
          value: value,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      if (key === "blocklist" && fieldPath.includes("interfaces")) {
        const itemTemplate = {
          name: "",
        };
        const fields = xmlToFormFields(itemTemplate, [...fieldPath, "0"]);
        return {
          name: key,
          label,
          type: "array",
          value: value,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // userTransports: array of transport_id
      if (key === "userTransports") {
        let transportIds: string[] = [];

        if (Array.isArray(value)) {
          transportIds = value;
        } else if (typeof value === "object" && value !== null) {
          const transportObj = value as any;
          if (transportObj.transport_id) {
            if (Array.isArray(transportObj.transport_id)) {
              transportIds = transportObj.transport_id;
            } else {
              transportIds = [transportObj.transport_id];
            }
          }
        } else if (typeof value === "string") {
          transportIds = [value];
        }
        return {
          name: key,
          label,
          type: "array",
          value: transportIds,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: [],
        };
      }

      // CycloneDDS Threads container
      if (key === "Threads" && currentPath.some((p) => p === "Domain")) {
        const threadsValue: any =
          typeof value === "object" && value !== null && !Array.isArray(value)
            ? value
            : { Thread: [] };

        if (!threadsValue.Thread) {
          threadsValue.Thread = [];
        } else if (!Array.isArray(threadsValue.Thread)) {
          threadsValue.Thread = [threadsValue.Thread];
        }

        const fields = xmlToFormFields(threadsValue, fieldPath);
        return {
          name: key,
          label,
          type: "object",
          value: threadsValue,
          defaultValue: { Thread: [] },
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // CycloneDDS Thread array
      if (key === "Thread" && fieldPath.includes("Threads")) {
        const itemTemplate = {
          "@_name": "",
          Scheduling: {
            Class: "default",
            Priority: "default",
          },
          StackSize: "default",
        };
        const fields = xmlToFormFields(itemTemplate, [...fieldPath, "0"]);
        return {
          name: key,
          label,
          type: "array",
          value: value,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // CycloneDDS Peer array
      if (key === "Peer" && fieldPath.includes("Peers")) {
        const itemTemplate = {
          "@_Address": "",
          "@_PruneDelay": "default",
        };
        const fields = xmlToFormFields(itemTemplate, [...fieldPath, "0"]);
        return {
          name: key,
          label,
          type: "array",
          value: value,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // CycloneDDS Interfaces container
      if (
        key === "Interfaces" &&
        currentPath.some((p) => p === "General" || p === "Domain")
      ) {
        const interfacesValue: any =
          typeof value === "object" && value !== null && !Array.isArray(value)
            ? value
            : { NetworkInterface: [] };

        if (!interfacesValue.NetworkInterface) {
          interfacesValue.NetworkInterface = [];
        } else if (!Array.isArray(interfacesValue.NetworkInterface)) {
          interfacesValue.NetworkInterface = [interfacesValue.NetworkInterface];
        }

        const fields = xmlToFormFields(interfacesValue, fieldPath);
        return {
          name: key,
          label,
          type: "object",
          value: interfacesValue,
          defaultValue: { NetworkInterface: [] },
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // CycloneDDS NetworkInterface array
      if (key === "NetworkInterface" && fieldPath.includes("Interfaces")) {
        const itemTemplate = {
          "@_name": "",
          "@_address": "",
          "@_autodetermine": "false",
          "@_multicast": "default",
          "@_allow_multicast": "default",
          "@_prefer_multicast": "false",
          "@_presence_required": "false",
          "@_priority": "default",
        };
        const fields = xmlToFormFields(itemTemplate, [...fieldPath, "0"]);
        return {
          name: key,
          label,
          type: "array",
          value: value,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // CycloneDDS IgnoredPartitions container
      if (
        key === "IgnoredPartitions" &&
        currentPath.some((p) => p === "Partitioning")
      ) {
        const ignoredPartitionsValue: any =
          typeof value === "object" && value !== null && !Array.isArray(value)
            ? value
            : { IgnoredPartition: [] };

        if (!ignoredPartitionsValue.IgnoredPartition) {
          ignoredPartitionsValue.IgnoredPartition = [];
        } else if (!Array.isArray(ignoredPartitionsValue.IgnoredPartition)) {
          ignoredPartitionsValue.IgnoredPartition = [
            ignoredPartitionsValue.IgnoredPartition,
          ];
        }

        const fields = xmlToFormFields(ignoredPartitionsValue, fieldPath);
        return {
          name: key,
          label,
          type: "object",
          value: ignoredPartitionsValue,
          defaultValue: { IgnoredPartition: [] },
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // CycloneDDS NetworkPartitions container
      if (
        key === "NetworkPartitions" &&
        currentPath.some((p) => p === "Partitioning")
      ) {
        const networkPartitionsValue: any =
          typeof value === "object" && value !== null && !Array.isArray(value)
            ? value
            : { NetworkPartition: [] };

        if (!networkPartitionsValue.NetworkPartition) {
          networkPartitionsValue.NetworkPartition = [];
        } else if (!Array.isArray(networkPartitionsValue.NetworkPartition)) {
          networkPartitionsValue.NetworkPartition = [
            networkPartitionsValue.NetworkPartition,
          ];
        }

        const fields = xmlToFormFields(networkPartitionsValue, fieldPath);
        return {
          name: key,
          label,
          type: "object",
          value: networkPartitionsValue,
          defaultValue: { NetworkPartition: [] },
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // CycloneDDS PartitionMappings container
      if (
        key === "PartitionMappings" &&
        currentPath.some((p) => p === "Partitioning")
      ) {
        const partitionMappingsValue: any =
          typeof value === "object" && value !== null && !Array.isArray(value)
            ? value
            : { PartitionMapping: [] };

        if (!partitionMappingsValue.PartitionMapping) {
          partitionMappingsValue.PartitionMapping = [];
        } else if (!Array.isArray(partitionMappingsValue.PartitionMapping)) {
          partitionMappingsValue.PartitionMapping = [
            partitionMappingsValue.PartitionMapping,
          ];
        }

        const fields = xmlToFormFields(partitionMappingsValue, fieldPath);
        return {
          name: key,
          label,
          type: "object",
          value: partitionMappingsValue,
          defaultValue: { PartitionMapping: [] },
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // CycloneDDS IgnoredPartition array
      if (
        key === "IgnoredPartition" &&
        fieldPath.includes("IgnoredPartitions")
      ) {
        const hasPrimitiveValues =
          value.length > 0 && typeof value[0] === "string";

        if (hasPrimitiveValues) {
          return {
            name: key,
            label,
            type: "array",
            value: value,
            defaultValue: [],
            required: false,
            path: fieldPath,
            fields: [],
          };
        } else {
          const itemTemplate = {
            "@_DCPSPartitionTopic": "",
            "#text": "",
          };
          const fields = xmlToFormFields(itemTemplate, [...fieldPath, "0"]);
          return {
            name: key,
            label,
            type: "array",
            value: value,
            defaultValue: [],
            required: false,
            path: fieldPath,
            fields: fields,
          };
        }
      }

      // CycloneDDS NetworkPartition array
      if (
        key === "NetworkPartition" &&
        fieldPath.includes("NetworkPartitions")
      ) {
        const itemTemplate = {
          "@_Address": "",
          "@_Interface": "",
          "@_Name": "",
          "#text": "",
        };
        const fields = xmlToFormFields(itemTemplate, [...fieldPath, "0"]);
        return {
          name: key,
          label,
          type: "array",
          value: value,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // CycloneDDS PartitionMapping array
      if (
        key === "PartitionMapping" &&
        fieldPath.includes("PartitionMappings")
      ) {
        const itemTemplate = {
          "@_DCPSPartitionTopic": "",
          "@_NetworkPartition": "",
          "#text": "",
        };
        const fields = xmlToFormFields(itemTemplate, [...fieldPath, "0"]);
        return {
          name: key,
          label,
          type: "array",
          value: value,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // Security Library element
      if (
        key === "Library" &&
        (fieldPath.includes("AccessControl") ||
          fieldPath.includes("Authentication") ||
          fieldPath.includes("Cryptographic"))
      ) {
        if (typeof value === "string") {
          return {
            name: key,
            label,
            type: "object",
            value: { "#text": value },
            defaultValue: { "#text": "" },
            required: false,
            path: fieldPath,
            fields: [
              {
                name: "#text",
                label: "Library Name",
                type: "text",
                value: value,
                defaultValue: "",
                required: false,
                path: [...fieldPath, "#text"],
              },
              {
                name: "@_path",
                label: "Path",
                type: "text",
                value: "",
                defaultValue: "",
                required: false,
                path: [...fieldPath, "@_path"],
              },
              {
                name: "@_initFunction",
                label: "Init Function",
                type: "text",
                value: fieldPath.includes("AccessControl")
                  ? "init_access_control"
                  : fieldPath.includes("Authentication")
                  ? "init_authentication"
                  : "init_crypto",
                defaultValue: fieldPath.includes("AccessControl")
                  ? "init_access_control"
                  : fieldPath.includes("Authentication")
                  ? "init_authentication"
                  : "init_crypto",
                required: false,
                path: [...fieldPath, "@_initFunction"],
              },
              {
                name: "@_finalizeFunction",
                label: "Finalize Function",
                type: "text",
                value: fieldPath.includes("AccessControl")
                  ? "finalize_access_control"
                  : fieldPath.includes("Authentication")
                  ? "finalize_authentication"
                  : "finalize_crypto",
                defaultValue: fieldPath.includes("AccessControl")
                  ? "finalize_access_control"
                  : fieldPath.includes("Authentication")
                  ? "finalize_authentication"
                  : "finalize_crypto",
                required: false,
                path: [...fieldPath, "@_finalizeFunction"],
              },
            ],
          };
        } else if (typeof value === "object" && value !== null) {
          const fields = xmlToFormFields(value, fieldPath);

          let textField = fields.find((f) => f.name === "#text");
          if (!textField) {
            textField = {
              name: "#text",
              label: "Library Name",
              type: "text",
              value: (value as any)["#text"] || "",
              defaultValue: "",
              required: false,
              path: [...fieldPath, "#text"],
            };
            fields.unshift(textField);
          } else {
            textField.label = "Library Name";
          }

          return {
            name: key,
            label,
            type: "object",
            value: value,
            defaultValue: { "#text": "" },
            required: false,
            path: fieldPath,
            fields: fields,
          };
        }
      }

      // discoveryServersList: contains locator objects
      if (key === "discoveryServersList") {
        const itemTemplate = {
          udpv4: {
            address: "",
            port: 0,
          },
        };
        const fields = xmlToFormFields(itemTemplate, []);
        return {
          name: key,
          label,
          type: "array",
          value: value,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // Locator lists
      if (
        key === "metatrafficUnicastLocatorList" ||
        key === "metatrafficMulticastLocatorList" ||
        key === "initialPeersList" ||
        key === "defaultUnicastLocatorList" ||
        key === "defaultMulticastLocatorList" ||
        key === "unicastLocatorList" ||
        key === "multicastLocatorList"
      ) {
        const itemTemplate = {
          locator: {
            udpv4: {
              address: "",
              port: 0,
            },
          },
        };
        const fields = xmlToFormFields(itemTemplate, []);
        return {
          name: key,
          label,
          type: "array",
          value: value,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // external_unicast_locators (udpv4/udpv6 with attributes)
      if (
        key === "external_unicast_locators" ||
        key === "default_external_unicast_locators"
      ) {
        const itemTemplate = {
          udpv4: {
            "@_externality": 1,
            "@_cost": 0,
            "@_mask": 24,
            address: "",
            port: 0,
          },
        };
        const fields = xmlToFormFields(itemTemplate, []);
        return {
          name: key,
          label,
          type: "array",
          value: value,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

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
      // locator object with empty content
      if (key === "locator" && Object.keys(value).length === 0) {
        const locatorTemplate = {
          udpv4: {
            address: "",
            port: 0,
          },
        };
        const fields = xmlToFormFields(locatorTemplate, fieldPath);
        return {
          name: key,
          label,
          type: "object",
          value: {},
          defaultValue: {},
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

      // FastDDS normalization
      if (key === "data_sharing" && value && typeof value === "object") {
        const v: any = value as any;
        if (v.shm_directory !== undefined) {
          if (v.shared_dir === undefined || v.shared_dir === "") {
            v.shared_dir = v.shm_directory;
          }
          delete v.shm_directory;
        }
        if (v.kind === "AUTO") {
          v.kind = "AUTOMATIC";
        }
        if (v.domain_ids && typeof v.domain_ids === "object" && !Array.isArray(v.domain_ids)) {
          const di = v.domain_ids as any;
          if (Array.isArray(di.domainId)) {
            v.domain_ids = di.domainId;
          }
        }
      }

      // FastDDS: partition names may be wrapped
      if (key === "partition" && value && typeof value === "object") {
        const v: any = value as any;
        if (
          v.names !== undefined &&
          typeof v.names === "object" &&
          !Array.isArray(v.names) &&
          Object.prototype.hasOwnProperty.call(v.names, "name")
        ) {
          const namesNode: any = v.names;
          if (Array.isArray(namesNode.name)) {
            v.names = namesNode.name;
          } else if (namesNode.name !== undefined && namesNode.name !== null) {
            v.names = [namesNode.name];
          }
        }
      }

      // propertiesPolicy: ensure array template even when empty
      if (key === "propertiesPolicy") {
        const propertiesNode: any =
          value && typeof value === "object" && (value as any).properties
            ? (value as any).properties
            : {};
        let propertyArray: any[] = [];
        if (
          propertiesNode &&
          Object.prototype.hasOwnProperty.call(propertiesNode, "property")
        ) {
          if (Array.isArray(propertiesNode.property)) {
            propertyArray = propertiesNode.property;
          } else if (propertiesNode.property) {
            propertyArray = [propertiesNode.property];
          }
        }

        const propertyItemTemplate = {
          name: propertiesPolicySettings.property.default.name,
          value: propertiesPolicySettings.property.default.value,
          propagate: propertiesPolicySettings.property.default.propagate,
        };
        const propertyItemFields = xmlToFormFields(propertyItemTemplate, []);

        return {
          name: key,
          label,
          type: "object",
          value: value,
          defaultValue: {},
          required: false,
          path: fieldPath,
          fields: [
            {
              name: "properties",
              label: "Properties",
              type: "object",
              value: propertiesNode || {},
              defaultValue: {},
              required: false,
              path: [...fieldPath, "properties"],
              fields: [
                {
                  name: "property",
                  label: "Property",
                  type: "array",
                  value: propertyArray,
                  defaultValue: [],
                  required: false,
                  path: [...fieldPath, "properties", "property"],
                  fields: propertyItemFields,
                },
              ],
            },
          ],
        };
      }

      // external locator lists: normalize object to array for UI
      if (
        key === "external_unicast_locators" ||
        key === "default_external_unicast_locators"
      ) {
        const arrayValue = Array.isArray(value) ? value : [value];
        const itemTemplate = {
          udpv4: {
            "@_externality": 1,
            "@_cost": 0,
            "@_mask": 24,
            address: "",
            port: 0,
          },
        };
        const fields = xmlToFormFields(itemTemplate, []);
        return {
          name: key,
          label,
          type: "array",
          value: arrayValue,
          defaultValue: [],
          required: false,
          path: fieldPath,
          fields: fields,
        };
      }

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
      const defaultValue = getFieldDefaultValue(currentPath, key, value);
      return {
        name: key,
        label,
        type: "boolean",
        value: value,
        defaultValue: defaultValue,
        required: false,
        path: fieldPath,
      };
    } else if (value !== "" && !isNaN(Number(value))) {
      const defaultValue = getFieldDefaultValue(
        currentPath,
        key,
        Number(value)
      );
      return {
        name: key,
        label,
        type: "number",
        value: Number(value),
        defaultValue: defaultValue,
        required: false,
        path: fieldPath,
      };
    } else {
      const defaultValue = getFieldDefaultValue(currentPath, key, value || "");
      return {
        name: key,
        label,
        type: "text",
        value: value || "",
        defaultValue: defaultValue,
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
      if (field.forceInclude) {
        // keep
      } else {
        if (originalUploadedData) {
          // Uploaded file: drop defaults not present in uploaded data
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
          // New file: drop defaults not modified by user
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
          // Fallback: drop all defaults
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
            .map((item: any, _index: number) => {
              const itemFields = field.fields!.map((subField) => {
                let fieldValue = item[subField.name];

                // Nested objects: handle recursively
                if (
                  subField.type === "object" &&
                  subField.fields &&
                  fieldValue
                ) {
                  return {
                    ...subField,
                    value: fieldValue,
                    fields: subField.fields.map((nestedField) => ({
                      ...nestedField,
                      value:
                        fieldValue[nestedField.name] !== undefined
                          ? fieldValue[nestedField.name]
                          : nestedField.defaultValue,
                    })),
                  };
                }

                // FastDDS log consumer: always include <class> and property <name>
                let mappedSubField = {
                  ...subField,
                  value:
                    fieldValue !== undefined
                      ? fieldValue
                      : subField.defaultValue,
                } as any;

                if (vendor === "fastdds" && field.name === "consumer") {
                  if (subField.name === "class") {
                    mappedSubField = { ...mappedSubField, forceInclude: true };
                  } else if (
                    subField.name === "property" &&
                    Array.isArray(mappedSubField.fields)
                  ) {
                    mappedSubField = {
                      ...mappedSubField,
                      fields: mappedSubField.fields.map((f: any) =>
                        f.name === "name" ? { ...f, forceInclude: true } : f
                      ),
                    };
                  }
                }

                return mappedSubField;
              });

              const xmlResult = formFieldsToXML(
                itemFields,
                excludeDefaults,
                vendor,
                originalUploadedData,
                originalFields
              );

              return xmlResult;
            })
            .filter((item: any) => {
              return Object.keys(item).length > 0;
            });

          if (mappedItems.length > 0 || field.forceInclude) {
            if (
              vendor === "fastdds" &&
              field.name === "property" &&
              field.path.includes("consumer")
            ) {
              result[field.name] = mappedItems.map((it: any) => {
                const out: any = {};
                if (it.name !== undefined) out.name = it.name;
                if (it.value !== undefined) out.value = it.value;
                if (Object.keys(out).length === 0) return it;
                return out;
              });
            } else {
              result[field.name] = mappedItems;
            }
          } else if (field.name === "Thread") {
          }
        } else {
          // Simple arrays
          const nonEmptyItems = field.value.filter(
            (item: any) => item !== null && item !== undefined && item !== ""
          );
          if (nonEmptyItems.length > 0 || field.forceInclude) {
            if (field.name === "userTransports" && vendor === "fastdds") {
              result[field.name] = {
                transport_id: nonEmptyItems,
              };
            } else if (
              vendor === "fastdds" &&
              field.name === "domain_ids" &&
              Array.isArray(nonEmptyItems)
            ) {
              result[field.name] = {
                domainId: nonEmptyItems,
              };
            } else if (
              vendor === "fastdds" &&
              field.name === "names" &&
              Array.isArray(nonEmptyItems)
            ) {
              result[field.name] = {
                name: nonEmptyItems,
              };
            } else {
              result[field.name] = nonEmptyItems;
            }
          }
        }
      }
    } else if (field.type === "object" && field.fields) {
      // Child fields
      let childFields = field.fields;

      // Threads contains Thread array
      if (field.name === "Threads") {
        const threadArrayField = field.fields?.find((f) => f.name === "Thread");
        if (
          threadArrayField &&
          threadArrayField.value &&
          threadArrayField.value.length > 0
        ) {
          childFields = field.fields.map((childField) => {
            return {
              ...childField,
              forceInclude: field.forceInclude && excludeDefaults,
            };
          });
        } else {
          childFields = field.fields.map((childField) => {
            return {
              ...childField,
              forceInclude: field.forceInclude && excludeDefaults,
            };
          });
        }
      } else if (field.forceInclude && excludeDefaults) {
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

      // Security Library: include only if any attribute is not default
      if (
        field.name === "Library" &&
        (field.path.includes("AccessControl") ||
          field.path.includes("Authentication") ||
          field.path.includes("Cryptographic"))
      ) {
        const hasPath = subResult["@_path"] && subResult["@_path"] !== "";
        const defaultInit = field.path.includes("AccessControl")
          ? "init_access_control"
          : field.path.includes("Authentication")
          ? "init_authentication"
          : "init_crypto";
        const defaultFinalize = field.path.includes("AccessControl")
          ? "finalize_access_control"
          : field.path.includes("Authentication")
          ? "finalize_authentication"
          : "finalize_crypto";

        const hasNonDefaultInit =
          subResult["@_initFunction"] &&
          subResult["@_initFunction"] !== defaultInit;
        const hasNonDefaultFinalize =
          subResult["@_finalizeFunction"] &&
          subResult["@_finalizeFunction"] !== defaultFinalize;

        if (hasPath || hasNonDefaultInit || hasNonDefaultFinalize) {
          result[field.name] = {
            "@_path": subResult["@_path"] || "",
            "@_initFunction": subResult["@_initFunction"] || defaultInit,
            "@_finalizeFunction":
              subResult["@_finalizeFunction"] || defaultFinalize,
          };
        }
      } else if (
        (field.name === "metatrafficMulticastLocatorList" ||
          field.name === "metatrafficUnicastLocatorList" ||
          field.name === "initialPeersList" ||
          field.name === "defaultMulticastLocatorList" ||
          field.name === "defaultUnicastLocatorList" ||
          field.name === "unicastLocatorList" ||
          field.name === "multicastLocatorList") &&
        Object.keys(subResult).length === 0
      ) {
        // Empty locator list: output special format
        result[field.name] = { locator: {} };
      } else if (Object.keys(subResult).length > 0 || field.forceInclude) {
        // Skip empty Security sections
        if (
          (field.name === "AccessControl" ||
            field.name === "Authentication" ||
            field.name === "Cryptographic") &&
          Object.keys(subResult).length === 0
        ) {
          return;
        }

        // Skip empty Security object
        if (field.name === "Security") {
          const hasContent =
            Object.keys(subResult).length > 0 &&
            Object.values(subResult).some(
              (val) => val !== null && val !== undefined
            );
          if (!hasContent) {
            return;
          }
        }

        // FastDDS: prefer shared_dir and normalize kind
        if (vendor === "fastdds" && field.name === "data_sharing") {
          if (
            Object.prototype.hasOwnProperty.call(subResult, "shm_directory") &&
            subResult["shm_directory"] !== undefined
          ) {
            if (
              !Object.prototype.hasOwnProperty.call(subResult, "shared_dir") ||
              subResult["shared_dir"] === ""
            ) {
              subResult["shared_dir"] = subResult["shm_directory"];
            }
            delete subResult["shm_directory"];
          }
          if (
            Object.prototype.hasOwnProperty.call(subResult, "kind") &&
            subResult["kind"] === "AUTO"
          ) {
            subResult["kind"] = "AUTOMATIC";
          }
        }

        result[field.name] = subResult;
      } else {
        if (field.name === "Threads") {
          const threadField = field.fields?.find((f) => f.name === "Thread");
          if (
            threadField &&
            threadField.value &&
            threadField.value.length > 0
          ) {
            const forceIncludeResult = formFieldsToXML(
              field.fields || [],
              false,
              vendor,
              originalUploadedData,
              originalFields
            );
            if (Object.keys(forceIncludeResult).length > 0) {
              result[field.name] = forceIncludeResult;
            }
          }
        }
      }
    } else if (field.type === "text") {
      // Empty locator item is handled by parent list
      if (
        field.name === "locator" &&
        field.value === "" &&
        field.path.length >= 2 &&
        (field.path[field.path.length - 2] ===
          "metatrafficMulticastLocatorList" ||
          field.path[field.path.length - 2] ===
            "metatrafficUnicastLocatorList" ||
          field.path[field.path.length - 2] === "initialPeersList" ||
          field.path[field.path.length - 2] === "defaultMulticastLocatorList" ||
          field.path[field.path.length - 2] === "defaultUnicastLocatorList" ||
          field.path[field.path.length - 2] === "unicastLocatorList" ||
          field.path[field.path.length - 2] === "multicastLocatorList")
      ) {
        return;
      }
      result[field.name] = field.value;
    } else if (
      field.type === "select" ||
      field.type === "number" ||
      field.type === "boolean"
    ) {
      result[field.name] = field.value;
    }
  });

  return result;
};

// Deep merge uploaded data into schema, with uploaded data taking precedence
export const mergeUploadedDataIntoSchema = (
  uploadedData: any,
  schema: any
): any => {
  // Start with uploaded data, then add missing fields from schema
  const result = JSON.parse(JSON.stringify(uploadedData));

  const addMissingFields = (target: any, schema: any, path: string[] = []) => {
    Object.keys(schema).forEach((key) => {
      const currentPath = [...path, key];

      if (!target.hasOwnProperty(key)) {
        if (Array.isArray(schema[key]) && schema[key].length === 0) {
        } else {
          target[key] = JSON.parse(JSON.stringify(schema[key]));
        }
      } else if (
        typeof target[key] === "object" &&
        !Array.isArray(target[key]) &&
        target[key] !== null
      ) {
        if (
          typeof schema[key] === "object" &&
          !Array.isArray(schema[key]) &&
          schema[key] !== null
        ) {
          addMissingFields(target[key], schema[key], currentPath);
        }
      }
    });
  };

  addMissingFields(result, schema);
  return result;
};

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
        // Try to match ignoring case (XML)
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

export const getSchemaForVendor = (vendor: DDSVendor): any => {
  switch (vendor) {
    case "cyclonedds":
      return cycloneDDSSchema;
    case "fastdds":
      return fastDDSSchema;
    case "zenoh":
      return {};
    default:
      return {};
  }
};
