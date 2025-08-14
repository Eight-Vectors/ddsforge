import { XMLParser, XMLBuilder } from "fast-xml-parser";
import type { DDSVendor, FormField } from "../types/dds";
import { cycloneDDSSchema } from "../schemas/cyclonedds-schema";
import { fastDDSSchema } from "../schemas/fastdds-schema";
import { isSchemaDefault } from "./schemaDefaults";
import { isFieldModified } from "./fieldUtils";
import { FastDDSValidator } from "./fastddsRules";

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
      isArray: (name) => {
        // Force certain elements to always be arrays
        if (
          name === "transport_descriptor" ||
          name === "participant" ||
          name === "data_writer" ||
          name === "data_reader" ||
          name === "topic" ||
          name === "property" ||
          name === "verify" ||
          name === "option" ||
          name === "verify_path" ||
          name === "port" ||
          name === "interfaceWhiteList" ||
          name === "allowlist" ||
          name === "blocklist" ||
          name === "discoveryServersList" ||
          name === "locator" ||
          name === "Peer" ||
          name === "NetworkInterface" ||
          name === "IgnoredPartition" ||
          name === "NetworkPartition" ||
          name === "PartitionMapping" ||
          name === "Thread"
        ) {
          return true;
        }
        return false;
      },
    });

    return parser.parse(xmlContent);
  } catch (error) {
    throw error;
  }
};

export const buildXML = (
  data: any,
  vendor: DDSVendor,
  options?: { skipValidation?: boolean; autoFix?: boolean }
): string => {
  let processedData = data;

  // Run FastDDS validation and auto-fix
  if (vendor === "fastdds" && !options?.skipValidation) {
    const validator = new FastDDSValidator();
    const validationResult = validator.validateConfig(data);

    if (!validationResult.valid || validationResult.warnings.length > 0) {
      console.warn("FastDDS validation issues:", {
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      });

      // Auto-fix if enabled
      if (options?.autoFix && validationResult.autoFixAvailable.length > 0) {
        processedData = validator.autoFix(data);
        console.log(
          "Applied auto-fixes for:",
          validationResult.autoFixAvailable
        );
      }
    }
  }

  // Preprocess data to handle self-closing tags and proper array formatting for CycloneDDS
  if (vendor === "cyclonedds") {
    const preprocessForCycloneDDS = (obj: any, parentKey?: string) => {
      if (typeof obj !== "object" || obj === null) return obj;

      const processed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === "Peer" && Array.isArray(value)) {
          // Process Peer array to ensure empty elements for self-closing
          processed[key] = value.map((peer: any) => {
            if (
              typeof peer === "object" &&
              !peer["#text"] &&
              Object.keys(peer).every((k) => k.startsWith("@_"))
            ) {
              // Element has only attributes, no text content
              return peer;
            }
            return peer;
          });
        } else if (
          key === "Interfaces" &&
          typeof value === "object" &&
          value !== null
        ) {
          // Handle Interfaces - check if it has NetworkInterface array or if attributes are directly on it
          const interfacesObj = value as any;
          if (
            interfacesObj.NetworkInterface &&
            Array.isArray(interfacesObj.NetworkInterface)
          ) {
            // Correct structure - has NetworkInterface array
            processed[key] = interfacesObj.NetworkInterface;
          } else if (
            Object.keys(interfacesObj).some((k) => k.startsWith("@_"))
          ) {
            // Incorrect structure - attributes directly on Interfaces
            // Convert to NetworkInterface array with single element
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
        } else if (key === "Threads" && typeof value === "object" && value !== null) {
          // Handle Threads - should contain Thread array
          const threadsObj = value as any;
          
          // Check if attributes/content are directly on Threads (wrong structure)
          if (Object.keys(threadsObj).some(k => k.startsWith('@_') || k === 'Scheduling' || k === 'StackSize')) {
            // Convert to Thread array with single element
            const thread: any = {};
            Object.keys(threadsObj).forEach(k => {
              if (k !== 'Thread') {
                thread[k] = threadsObj[k];
              }
            });
            processed[key] = { Thread: [thread] };
          } else if (threadsObj.Thread && Array.isArray(threadsObj.Thread)) {
            // Correct structure - has Thread array
            processed[key] = threadsObj;
          } else if (Array.isArray(threadsObj)) {
            // If Threads is already an array, wrap it properly
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
          // Handle partition containers
          const partitionType =
            key === "IgnoredPartitions"
              ? "IgnoredPartition"
              : key === "NetworkPartitions"
              ? "NetworkPartition"
              : "PartitionMapping";
          const partitionObj = value as any;
          
          // Check if attributes are directly on the container (wrong structure)
          if (Object.keys(partitionObj).some(k => k.startsWith('@_')) && !partitionObj[partitionType]) {
            // Convert attributes on container to a single element in the array
            const element: any = {};
            Object.keys(partitionObj).forEach(k => {
              if (k.startsWith('@_')) {
                element[k] = partitionObj[k];
              }
            });
            processed[key] = [element];
          } else if (partitionObj[partitionType] && Array.isArray(partitionObj[partitionType])) {
            // Correct structure - has the appropriate array
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

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: "  ",
    suppressEmptyNode: false, // Keep paired tags for empty elements
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
    // Remove namespace attributes from data if they exist
    const { "@_xmlns": _, ...cleanData } = processedData;

    // Add xmlns to profiles if it exists
    if (cleanData.profiles) {
      cleanData.profiles = {
        "@_xmlns": "http://www.eprosima.com/XMLSchemas/fastRTPS_Profiles",
        ...cleanData.profiles,
      };
    }

    xmlData = {
      dds: {
        "@_xmlns": "http://www.eprosima.com/XMLSchemas/fastRTPS_Profiles",
        ...cleanData,
      },
    };
  } else {
    xmlData = {
      dds: processedData,
    };
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += builder.build(xmlData);

  // Post-process XML for CycloneDDS to convert empty elements with only attributes to self-closing
  if (vendor === "cyclonedds") {
    // Convert <Peer attribute="value"></Peer> to <Peer attribute="value"/>
    xml = xml.replace(/<Peer([^>]*?)><\/Peer>/g, "<Peer$1/>");
    // Convert <NetworkInterface attribute="value"></NetworkInterface> to <NetworkInterface attribute="value"/>
    xml = xml.replace(
      /<NetworkInterface([^>]*?)><\/NetworkInterface>/g,
      "<NetworkInterface$1/>"
    );

    // Fix NetworkInterface array structure
    // First, check if Interfaces has attributes directly on it (wrong structure)
    const interfacesWithAttrs = xml.match(/<Interfaces([^>]+)><\/Interfaces>/);
    if (interfacesWithAttrs && interfacesWithAttrs[1].trim()) {
      // Convert <Interfaces attr="value"></Interfaces> to <Interfaces><NetworkInterface attr="value"/></Interfaces>
      xml = xml.replace(
        /<Interfaces([^>]+)><\/Interfaces>/,
        "<Interfaces>\n        <NetworkInterface$1/>\n      </Interfaces>"
      );
    }

    // Look for <Interfaces><NetworkInterface><0>...</0><1>...</1></NetworkInterface></Interfaces>
    const interfacesMatch = xml.match(
      /<Interfaces>\s*<NetworkInterface>([\s\S]*?)<\/NetworkInterface>\s*<\/Interfaces>/
    );
    if (interfacesMatch) {
      const content = interfacesMatch[1];
      // Extract all numbered elements
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

      if (networkInterfaces.length > 0) {
        const newInterfaces = `<Interfaces>\n${networkInterfaces
          .map((ni) => "        " + ni)
          .join("\n")}\n      </Interfaces>`;
        xml = xml.replace(/<Interfaces>[\s\S]*?<\/Interfaces>/, newInterfaces);
      }
    }

    // Also handle the case where we have Interfaces as a direct array
    // Look for patterns like <Interfaces><0>...</0><1>...</1></Interfaces>
    const interfacesDirectArray = xml.match(
      /<Interfaces>\s*<(\d+)[^>]*?[\s\S]*?<\/Interfaces>/
    );
    if (interfacesDirectArray) {
      const interfacesContent = xml.match(
        /<Interfaces>([\s\S]*?)<\/Interfaces>/
      );
      if (interfacesContent) {
        const content = interfacesContent[1];
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

        if (networkInterfaces.length > 0) {
          const newInterfaces = `<Interfaces>\n${networkInterfaces
            .map((ni) => "        " + ni)
            .join("\n")}\n      </Interfaces>`;
          xml = xml.replace(
            /<Interfaces>[\s\S]*?<\/Interfaces>/,
            newInterfaces
          );
        }
      }
    }
    
    // Fix Threads with attributes/content directly on it
    const threadsWithContent = xml.match(/<Threads([^>]*)>([\s\S]*?)<\/Threads>/);
    if (threadsWithContent) {
      const attrs = threadsWithContent[1];
      const content = threadsWithContent[2];
      
      // Check if content doesn't contain <Thread> elements
      if (!/<Thread[^>]*>/.test(content)) {
        // This means the content is directly under Threads, not in Thread elements
        const newThreads = `<Threads>\n    <Thread${attrs}>${content}</Thread>\n  </Threads>`;
        xml = xml.replace(/<Threads[^>]*>[\s\S]*?<\/Threads>/, newThreads);
      }
    }
    
    // Fix Thread elements with numbered children
    // Look for <Thread><0>...</0></Thread> or <Threads><0>...</0></Threads>
    const threadPatterns = [
      { container: 'Thread', element: 'Thread' },
      { container: 'Threads', element: 'Thread' }
    ];
    
    threadPatterns.forEach(({ container, element }) => {
      const regex = new RegExp(`<${container}>([\\s\\S]*?)<\\/${container}>`, 'g');
      xml = xml.replace(regex, (match, content) => {
        // Check if content has numbered elements
        if (/<\d+[^>]*>/.test(content)) {
          const threads: string[] = [];
          const elemRegex = /<(\d+)([^>]*?)(?:\/|>([\s\\S]*?)<\/\1)>/g;
          let elemMatch;
          while ((elemMatch = elemRegex.exec(content)) !== null) {
            const attrs = elemMatch[2];
            const innerContent = elemMatch[3] || '';
            if (innerContent) {
              threads.push(`<${element}${attrs}>${innerContent}</${element}>`);
            } else {
              threads.push(`<${element}${attrs}/>`);
            }
          }
          
          if (threads.length > 0) {
            return `<${container}>\n${threads.map(t => '    ' + t).join('\n')}\n  </${container}>`;
          }
        }
        return match;
      });
    });
    
    // Fix partition containers with attributes directly on them
    const partitionContainers = [
      { container: 'IgnoredPartitions', element: 'IgnoredPartition' },
      { container: 'NetworkPartitions', element: 'NetworkPartition' },
      { container: 'PartitionMappings', element: 'PartitionMapping' }
    ];
    
    partitionContainers.forEach(({ container, element }) => {
      // Check if container has attributes directly on it (wrong structure)
      const containerWithAttrs = xml.match(new RegExp(`<${container}([^>]+)><\\/${container}>`, 'g'));
      if (containerWithAttrs) {
        xml = xml.replace(new RegExp(`<${container}([^>]+)><\\/${container}>`, 'g'), (match, attrs) => {
          if (attrs.trim()) {
            // Convert to proper structure with element inside
            return `<${container}>\n        <${element}${attrs}/>\n      </${container}>`;
          }
          return match;
        });
      }
    });
    
    // Convert Library elements to self-closing tags
    const libraryRegex = /<Library([^>]+?)><\/Library>/g;
    xml = xml.replace(libraryRegex, '<Library$1/>');
    
    // Fix partition elements with numbered children
    const partitionTypes = ['IgnoredPartition', 'NetworkPartition', 'PartitionMapping'];
    partitionTypes.forEach(partitionType => {
      // Look for <PartitionType><0>...</0></PartitionType>
      const regex = new RegExp(`<${partitionType}>\\s*<(\\d+)[^>]*?>([\\s\\S]*?)<\\/\\1>\\s*<\\/${partitionType}>`, 'g');
      xml = xml.replace(regex, (match, num, content) => {
        // Convert to simple text content
        return `<${partitionType}>${content}</${partitionType}>`;
      });
      
      // Also handle arrays of partition elements with numbered children
      const parentType = partitionType === 'IgnoredPartition' ? 'IgnoredPartitions' :
                        partitionType === 'NetworkPartition' ? 'NetworkPartitions' : 'PartitionMappings';
      const parentRegex = new RegExp(`<${parentType}>([\\s\\S]*?)<\\/${parentType}>`, 'g');
      
      xml = xml.replace(parentRegex, (match, content) => {
        // Replace numbered elements within the parent
        const elemRegex = /<(\d+)([^>]*?)(?:\/|>([\s\\S]*?)<\/\1)>/g;
        const fixedContent = content.replace(elemRegex, (elemMatch: string, num: string, attrs: string, innerContent: string) => {
          if (innerContent) {
            return `<${partitionType}${attrs}>${innerContent}</${partitionType}>`;
          } else {
            return `<${partitionType}${attrs}/>`;
          }
        });
        return `<${parentType}>${fixedContent}</${parentType}>`;
      });
    });
    
    // Fix Category array with numbered children
    // Look for <Category><0>...</0><1>...</1></Category>
    const categoryRegex = /<Category>([\s\S]*?)<\/Category>/g;
    xml = xml.replace(categoryRegex, (match, content) => {
      // Check if content has numbered elements
      if (/<\d+[^>]*>/.test(content)) {
        const categories: string[] = [];
        const elemRegex = /<(\d+)([^>]*?)(?:\/|>([\s\S]*?)<\/\1)>/g;
        let elemMatch;
        while ((elemMatch = elemRegex.exec(content)) !== null) {
          const innerContent = elemMatch[3] || '';
          if (innerContent) {
            categories.push(`<Category>${innerContent}</Category>`);
          }
        }
        
        if (categories.length > 0) {
          return categories.join('\n      ');
        }
      }
      return match;
    });
  }

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
  
  // Handle null or undefined data
  if (!data || typeof data !== 'object') {
    return fields;
  }

  const processValue = (
    key: string,
    value: any,
    currentPath: string[]
  ): FormField | null => {
    // Skip certain keys
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

    // Special handling for locator fields with empty content
    if (key === "locator" && value === "") {
      // Provide template fields for empty locators
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

      // Special handling for interfaceWhiteList - define structure even when empty
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

      // Special handling for interfaces allowlist and blocklist
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

      // Special handling for userTransports - array of transport_id strings
      if (key === "userTransports") {
        let transportIds: string[] = [];
        
        console.log("xmlToFormFields - Processing userTransports:", {
          key,
          value,
          valueType: typeof value,
          isArray: Array.isArray(value),
          fieldPath
        });
        
        // Handle different userTransports structures
        if (Array.isArray(value)) {
          // Direct array of strings
          transportIds = value;
        } else if (typeof value === 'object' && value !== null) {
          // Object with transport_id property
          const transportObj = value as any;
          if (transportObj.transport_id) {
            if (Array.isArray(transportObj.transport_id)) {
              transportIds = transportObj.transport_id;
            } else {
              transportIds = [transportObj.transport_id];
            }
          }
        } else if (typeof value === 'string') {
          // Single string value
          transportIds = [value];
        }
        
        console.log("xmlToFormFields - userTransports result:", {
          transportIds,
          transportIdsLength: transportIds.length
        });
        
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

      // Special handling for Threads container in CycloneDDS
      if (key === "Threads" && currentPath.some(p => p === "Domain")) {
        // Threads is an object that contains Thread array
        const threadsValue: any = 
          typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value
            : { Thread: [] };
            
        // Ensure Thread exists as an array
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

      // Special handling for Thread array in CycloneDDS
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

      // Special handling for Peer array in CycloneDDS
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

      // handling for Interfaces in CycloneDDS - it should contain NetworkInterface array
      if (
        key === "Interfaces" &&
        currentPath.some((p) => p === "General" || p === "Domain")
      ) {
        // Interfaces is an object that contains NetworkInterface array
        const interfacesValue: any =
          typeof value === "object" && value !== null && !Array.isArray(value)
            ? value
            : { NetworkInterface: [] };

        if (!interfacesValue.NetworkInterface) {
          interfacesValue.NetworkInterface = [];
        } else if (!Array.isArray(interfacesValue.NetworkInterface)) {
          // If NetworkInterface exists but is not an array, convert it
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

      // handling for NetworkInterface array in CycloneDDS
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

      // Special handling for IgnoredPartitions container in CycloneDDS
      if (key === "IgnoredPartitions" && currentPath.some(p => p === "Partitioning")) {
        // IgnoredPartitions is an object that contains IgnoredPartition array
        const ignoredPartitionsValue: any = 
          typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value
            : { IgnoredPartition: [] };
            
        // Ensure IgnoredPartition exists as an array
        if (!ignoredPartitionsValue.IgnoredPartition) {
          ignoredPartitionsValue.IgnoredPartition = [];
        } else if (!Array.isArray(ignoredPartitionsValue.IgnoredPartition)) {
          ignoredPartitionsValue.IgnoredPartition = [ignoredPartitionsValue.IgnoredPartition];
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

      // Special handling for NetworkPartitions container in CycloneDDS
      if (key === "NetworkPartitions" && currentPath.some(p => p === "Partitioning")) {
        // NetworkPartitions is an object that contains NetworkPartition array
        const networkPartitionsValue: any = 
          typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value
            : { NetworkPartition: [] };
            
        // Ensure NetworkPartition exists as an array
        if (!networkPartitionsValue.NetworkPartition) {
          networkPartitionsValue.NetworkPartition = [];
        } else if (!Array.isArray(networkPartitionsValue.NetworkPartition)) {
          networkPartitionsValue.NetworkPartition = [networkPartitionsValue.NetworkPartition];
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

      // Special handling for PartitionMappings container in CycloneDDS
      if (key === "PartitionMappings" && currentPath.some(p => p === "Partitioning")) {
        // PartitionMappings is an object that contains PartitionMapping array
        const partitionMappingsValue: any = 
          typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value
            : { PartitionMapping: [] };
            
        // Ensure PartitionMapping exists as an array
        if (!partitionMappingsValue.PartitionMapping) {
          partitionMappingsValue.PartitionMapping = [];
        } else if (!Array.isArray(partitionMappingsValue.PartitionMapping)) {
          partitionMappingsValue.PartitionMapping = [partitionMappingsValue.PartitionMapping];
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

      // Special handling for IgnoredPartition array in CycloneDDS
      if (
        key === "IgnoredPartition" &&
        fieldPath.includes("IgnoredPartitions")
      ) {
        // IgnoredPartition can be simple strings or objects with DCPSPartitionTopic attribute
        const hasPrimitiveValues =
          value.length > 0 && typeof value[0] === "string";

        if (hasPrimitiveValues) {
          // Simple string array
          return {
            name: key,
            label,
            type: "array",
            value: value,
            defaultValue: [],
            required: false,
            path: fieldPath,
            fields: [], // No fields for simple string array
          };
        } else {
          // Object array with attributes
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

      //  handling for NetworkPartition array in CycloneDDS
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

      // Special handling for PartitionMapping array in CycloneDDS
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

      // Special handling for Library elements in Security section
      if (key === "Library" && (fieldPath.includes("AccessControl") || 
                                fieldPath.includes("Authentication") || 
                                fieldPath.includes("Cryptographic"))) {
        // Library can have text content and attributes
        if (typeof value === 'string') {
          // Simple string, convert to object structure
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
                value: fieldPath.includes("AccessControl") ? "init_access_control" : 
                       fieldPath.includes("Authentication") ? "init_authentication" : "init_crypto",
                defaultValue: fieldPath.includes("AccessControl") ? "init_access_control" : 
                              fieldPath.includes("Authentication") ? "init_authentication" : "init_crypto",
                required: false,
                path: [...fieldPath, "@_initFunction"],
              },
              {
                name: "@_finalizeFunction",
                label: "Finalize Function",
                type: "text",
                value: fieldPath.includes("AccessControl") ? "finalize_access_control" : 
                       fieldPath.includes("Authentication") ? "finalize_authentication" : "finalize_crypto",
                defaultValue: fieldPath.includes("AccessControl") ? "finalize_access_control" : 
                              fieldPath.includes("Authentication") ? "finalize_authentication" : "finalize_crypto",
                required: false,
                path: [...fieldPath, "@_finalizeFunction"],
              },
            ],
          };
        } else if (typeof value === 'object' && value !== null) {
          // Already an object, process normally but ensure #text field is included
          const fields = xmlToFormFields(value, fieldPath);
          
          // Find or add #text field
          let textField = fields.find(f => f.name === '#text');
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
            fields.unshift(textField); // Add at beginning
          } else {
            textField.label = "Library Name"; // Update label
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

      // Special handling for discoveryServersList - contains locator objects
      if (key === "discoveryServersList") {
        // Create a simpler structure - each item is a locator
        const itemTemplate = {
          udpv4: {
            address: "",
            port: 0,
          },
        };
        // Don't include array index in the field path template
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

      // Special handling for other locator lists
      if (
        key === "metatrafficUnicastLocatorList" ||
        key === "metatrafficMulticastLocatorList" ||
        key === "initialPeersList" ||
        key === "defaultUnicastLocatorList" ||
        key === "defaultMulticastLocatorList"
      ) {
        // These lists contain locator elements
        const itemTemplate = {
          locator: {
            udpv4: {
              address: "",
              port: 0,
            },
          },
        };
        // Don't include array index in the field path template
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
      // Special handling for locator objects with empty string value
      if (key === "locator" && Object.keys(value).length === 0) {
        // Provide template fields for empty locators
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
    } else if (value !== "" && !isNaN(Number(value))) {
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
    // Debug log for Domain field
    if (field.name === "Domain") {
      console.log("formFieldsToXML - Processing Domain field:", {
        fieldName: field.name,
        fieldType: field.type,
        fieldValue: field.value,
        hasThreads: field.value?.Threads,
        fieldFields: field.fields?.map(f => ({ name: f.name, type: f.type, hasValue: !!f.value }))
      });
    }
    
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
      // Debug log for array fields
      if (field.name === "Thread") {
        console.log("formFieldsToXML - Array field Thread:", {
          fieldName: field.name,
          fieldValue: field.value,
          fieldType: field.type,
          hasValue: Array.isArray(field.value),
          valueLength: field.value?.length,
          forceInclude: field.forceInclude,
          excludeDefaults: excludeDefaults
        });
      }
      
      if (
        Array.isArray(field.value) &&
        (field.value.length > 0 || field.forceInclude)
      ) {
        if (field.fields && field.fields.length > 0) {
          const mappedItems = field.value
            .map((item: any, index: number) => {
              // Debug logging for Thread items
              if (field.name === "Thread") {
                console.log("formFieldsToXML - Processing Thread item:", {
                  index: index,
                  item: item,
                  fieldName: field.name,
                  fieldFields: field.fields
                });
              }
              
              const itemFields = field.fields!.map((subField) => {
                let fieldValue = item[subField.name];
                
                // For nested objects, we need to handle them recursively
                if (subField.type === 'object' && subField.fields && fieldValue) {
                  // Debug for Scheduling field
                  if (subField.name === "Scheduling") {
                    console.log("formFieldsToXML - Processing Scheduling:", {
                      fieldValue: fieldValue,
                      subFieldFields: subField.fields
                    });
                  }
                  
                  return {
                    ...subField,
                    value: fieldValue,
                    fields: subField.fields.map(nestedField => ({
                      ...nestedField,
                      value: fieldValue[nestedField.name] !== undefined 
                        ? fieldValue[nestedField.name] 
                        : nestedField.defaultValue
                    }))
                  };
                }
                
                return {
                  ...subField,
                  value: fieldValue !== undefined ? fieldValue : subField.defaultValue,
                };
              });
              
              const xmlResult = formFieldsToXML(
                itemFields,
                excludeDefaults,
                vendor,
                originalUploadedData,
                originalFields
              );
              
              // Debug log for Thread item result
              if (field.name === "Thread") {
                console.log("formFieldsToXML - Thread item XML result:", {
                  index: index,
                  xmlResult: xmlResult,
                  hasKeys: Object.keys(xmlResult).length > 0
                });
              }
              
              return xmlResult;
            })
            .filter((item: any) => {
              // For Thread items, don't filter out if they have any properties
              if (field.name === "Thread") {
                const hasContent = Object.keys(item).length > 0;
                console.log("formFieldsToXML - Thread filter check:", {
                  item: item,
                  hasContent: hasContent,
                  willKeep: hasContent
                });
                return hasContent;
              }
              return Object.keys(item).length > 0;
            }); // Filter out empty objects

          if (mappedItems.length > 0 || field.forceInclude) {
            result[field.name] = mappedItems;
            
            // Debug log for Thread array result
            if (field.name === "Thread") {
              console.log("formFieldsToXML - Thread array result:", {
                fieldName: field.name,
                mappedItemsLength: mappedItems.length,
                mappedItems: mappedItems,
                result: result[field.name]
              });
            }
          } else if (field.name === "Thread") {
            console.log("formFieldsToXML - Thread array SKIPPED (no items):", {
              fieldName: field.name,
              mappedItemsLength: mappedItems.length,
              forceInclude: field.forceInclude
            });
          }
        } else {
          // For simple arrays (not objects)
          const nonEmptyItems = field.value.filter(
            (item: any) => item !== null && item !== undefined && item !== ""
          );
          if (nonEmptyItems.length > 0 || field.forceInclude) {
            // Special handling for userTransports in FastDDS
            if (field.name === "userTransports" && vendor === "fastdds") {
              // Convert array of strings to proper XML structure
              result[field.name] = {
                transport_id: nonEmptyItems
              };
            } else {
              result[field.name] = nonEmptyItems;
            }
          }
        }
      }
    } else if (field.type === "object" && field.fields) {
      // Debug logging for Threads object
      if (field.name === "Threads") {
        console.log("formFieldsToXML - Processing Threads object:", {
          fieldValue: field.value,
          fieldFields: field.fields
        });
      }
      
      // Initialize childFields
      let childFields = field.fields;
      
      // Special handling for Threads object which contains Thread array
      if (field.name === "Threads") {
        // The Threads object should get its Thread array value from the child field
        const threadArrayField = field.fields?.find(f => f.name === "Thread");
        if (threadArrayField && threadArrayField.value && threadArrayField.value.length > 0) {
          console.log("formFieldsToXML - Fixing Threads/Thread structure:", {
            threadArrayFieldValue: threadArrayField.value,
            originalFieldValue: field.value
          });
          
          // Use the Thread field's value directly, not from the Threads object
          childFields = field.fields.map((childField) => {
            return {
              ...childField,
              forceInclude: field.forceInclude && excludeDefaults
            };
          });
        } else {
          childFields = field.fields.map((childField) => {
            return {
              ...childField,
              forceInclude: field.forceInclude && excludeDefaults
            };
          });
        }
      } else if (field.forceInclude && excludeDefaults) {
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

      // Special handling for Library elements in Security
      if (field.name === "Library" && (field.path.includes("AccessControl") || 
                                       field.path.includes("Authentication") || 
                                       field.path.includes("Cryptographic"))) {
        // Check if Library has any non-default attributes
        const hasPath = subResult["@_path"] && subResult["@_path"] !== "";
        const defaultInit = field.path.includes("AccessControl") ? "init_access_control" :
                           field.path.includes("Authentication") ? "init_authentication" : "init_crypto";
        const defaultFinalize = field.path.includes("AccessControl") ? "finalize_access_control" :
                               field.path.includes("Authentication") ? "finalize_authentication" : "finalize_crypto";
        
        const hasNonDefaultInit = subResult["@_initFunction"] && subResult["@_initFunction"] !== defaultInit;
        const hasNonDefaultFinalize = subResult["@_finalizeFunction"] && subResult["@_finalizeFunction"] !== defaultFinalize;
        
        // Include Library if any attribute is non-default
        if (hasPath || hasNonDefaultInit || hasNonDefaultFinalize) {
          // Include all attributes when Library is present
          result[field.name] = {
            "@_path": subResult["@_path"] || "",
            "@_initFunction": subResult["@_initFunction"] || defaultInit,
            "@_finalizeFunction": subResult["@_finalizeFunction"] || defaultFinalize
          };
        }
        // Otherwise, don't include the Library field at all
      } else if (
        (field.name === "metatrafficMulticastLocatorList" ||
          field.name === "metatrafficUnicastLocatorList" ||
          field.name === "initialPeersList" ||
          field.name === "defaultMulticastLocatorList" ||
          field.name === "defaultUnicastLocatorList") &&
        Object.keys(subResult).length === 0
      ) {
        // This is an empty locator list - output the special format
        result[field.name] = { locator: {} };
      } else if (Object.keys(subResult).length > 0 || field.forceInclude) {
        // Special check for Security sections that only contain empty Library
        if ((field.name === "AccessControl" || field.name === "Authentication" || field.name === "Cryptographic") &&
            Object.keys(subResult).length === 0) {
          // Don't include empty security sections
          return;
        }
        
        // Special check for Security object that only contains empty subsections
        if (field.name === "Security") {
          const hasContent = Object.keys(subResult).length > 0 && 
                           Object.values(subResult).some(val => val !== null && val !== undefined);
          if (!hasContent) {
            // Don't include empty Security section
            return;
          }
        }
        
        result[field.name] = subResult;
        
        // Debug log for Threads object result
        if (field.name === "Threads") {
          console.log("formFieldsToXML - Threads object result:", {
            fieldName: field.name,
            subResult: subResult,
            hasThread: 'Thread' in subResult,
            threadValue: subResult.Thread
          });
        }
      } else {
        // Special case: For Threads, check if the Thread field has values
        if (field.name === "Threads") {
          const threadField = field.fields?.find(f => f.name === "Thread");
          if (threadField && threadField.value && threadField.value.length > 0) {
            console.log("formFieldsToXML - Threads object has Thread values, including anyway");
            // Process it again without excludeDefaults to ensure Thread is included
            const forceIncludeResult = formFieldsToXML(
              field.fields || [],
              false, // Don't exclude defaults for this specific case
              vendor,
              originalUploadedData,
              originalFields
            );
            if (Object.keys(forceIncludeResult).length > 0) {
              result[field.name] = forceIncludeResult;
            }
          } else {
            console.log("formFieldsToXML - Threads object SKIPPED (empty):", {
              fieldName: field.name,
              subResultKeys: Object.keys(subResult),
              forceInclude: field.forceInclude,
              threadFieldValue: threadField?.value
            });
          }
        }
      }
    } else {
      // Special handling for empty locator in locator lists
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
          field.path[field.path.length - 2] === "defaultUnicastLocatorList")
      ) {
        // Don't include empty string for locator - it will be handled by the parent
        return;
      }
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

// Deep merge uploaded data into schema, with uploaded data taking precedence
export const mergeUploadedDataIntoSchema = (
  uploadedData: any,
  schema: any
): any => {
  // Start with uploaded data as base, then add missing fields from schema
  const result = JSON.parse(JSON.stringify(uploadedData)); // Deep clone uploaded data

  // Function to add missing schema fields to uploaded data
  const addMissingFields = (target: any, schema: any, path: string[] = []) => {
    Object.keys(schema).forEach((key) => {
      const currentPath = [...path, key];
      
      if (!target.hasOwnProperty(key)) {
        // Field exists in schema but not in uploaded data
        if (Array.isArray(schema[key]) && schema[key].length === 0) {
          // Don't add empty arrays from schema
          if (key === "userTransports") {
            console.log("mergeUploadedDataIntoSchema - skipping empty userTransports from schema");
          }
        } else {
          // Add the schema field
          target[key] = JSON.parse(JSON.stringify(schema[key]));
        }
      } else if (typeof target[key] === "object" && !Array.isArray(target[key]) && target[key] !== null) {
        // Recursively add missing fields to nested objects
        if (typeof schema[key] === "object" && !Array.isArray(schema[key]) && schema[key] !== null) {
          addMissingFields(target[key], schema[key], currentPath);
        }
      }
      
      // Debug logging for userTransports
      if (key === "userTransports") {
        console.log("mergeUploadedDataIntoSchema - userTransports after merge:", {
          key,
          targetValue: target[key],
          schemaValue: schema[key],
          currentPath
        });
      }
    });
  };

  // Add missing fields from schema to the uploaded data
  addMissingFields(result, schema);
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
