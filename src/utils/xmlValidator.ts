import { XMLValidator } from "fast-xml-parser";
import type { DDSVendor } from "../types/dds";
import { validateZenohConfig, validateZenohFieldValue } from "./zenohValidator";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateXML = (
  content: string,
  vendor: DDSVendor
): ValidationResult => {
  if (vendor === "zenoh") {
    return validateZenohConfig(content);
  }
  const errors: string[] = [];
  const validationResult = XMLValidator.validate(content, {
    allowBooleanAttributes: true,
    unpairedTags: [],
  });

  if (validationResult !== true) {
    if (typeof validationResult === "object" && validationResult.err) {
      errors.push(
        `XML Parse Error: ${validationResult.err.msg} at line ${validationResult.err.line}`
      );
    } else {
      errors.push("XML is not well-formed");
    }
    return { isValid: false, errors };
  }

  if (vendor === "cyclonedds") {
    if (!content.includes("<CycloneDDS") && !content.includes("<cyclonedds")) {
      errors.push("Missing required root element <CycloneDDS>");
    }

    if (!content.includes("<Domain")) {
      errors.push("Missing required <Domain> element");
    }

    const domainIdMatch = content.match(/Id\s*=\s*["']([^"']+)["']/);
    if (domainIdMatch && domainIdMatch[1] !== "any") {
      const domainId = domainIdMatch[1];
      if (
        !/^\d+$/.test(domainId) ||
        parseInt(domainId) < 0 ||
        parseInt(domainId) > 232
      ) {
        errors.push('Domain ID must be a number between 0 and 232, or "any"');
      }
    }
  } else if (vendor === "fastdds") {
    if (!content.includes("<dds") && !content.includes("<DDS")) {
      errors.push("Missing required root element <dds>");
    }

    const hasProfiles = content.includes("<profiles");
    const hasLog = content.includes("<log");
    const hasTypes = content.includes("<types");

    if (!hasProfiles && !hasLog && !hasTypes) {
      errors.push(
        "FastDDS XML must contain at least one of: profiles, log, or types elements"
      );
    }

    const domainIdMatch = content.match(/<domainId>(\d+)<\/domainId>/);
    if (domainIdMatch) {
      const domainId = parseInt(domainIdMatch[1]);
      if (domainId < 0 || domainId > 232) {
        errors.push("Domain ID must be between 0 and 232");
      }
    }
  }

  const emptyElementPattern = /<(\w+)(\s+[^>]*)?\s*\/>/g;
  const emptyElements = content.match(emptyElementPattern);
  if (emptyElements) {
    const problematicEmpty = emptyElements.filter((el) => {
      const tagName = el.match(/<(\w+)/)?.[1];
      const hasAttributes = /\s+\w+\s*=\s*["']/.test(el);
      if (hasAttributes) {
        return false;
      }
      const allowedEmpty = [
        "Enable",
        "Disable",
        "NetworkInterface",
        "Peer",
        "dataRepresentation",
        "unicastLocatorList",
        "multicastLocatorList",
        "external_unicast_locators",
        "propertiesPolicy",
        "userDefinedTransportDescriptors",
        "remoteLocators",
        "historyMemoryPolicy",
        "properties",
        "allocation",
        "userData",
        "topicData",
        "groupData",
        "partitions",
        "remoteServerAttributes",
        "defaultUnicastLocatorList",
        "defaultMulticastLocatorList",
        "initialPeersList",
        "metatrafficUnicastLocatorList",
        "metatrafficMulticastLocatorList",
        "discoveryServersList",
      ];
      return tagName && !allowedEmpty.includes(tagName);
    });

    if (problematicEmpty.length > 0) {
      errors.push(
        `Found potentially problematic empty elements: ${problematicEmpty.join(
          ", "
        )}`
      );
    }
  }

  if (vendor === "fastdds") {
    const profileNames = content.match(/profile_name\s*=\s*["']([^"']+)["']/g);
    if (profileNames) {
      const names = profileNames
        .map((match) => match.match(/["']([^"']+)["']/)?.[1])
        .filter(Boolean);
      const duplicates = names.filter(
        (name, index) => names.indexOf(name) !== index
      );
      if (duplicates.length > 0) {
        errors.push(
          `Duplicate profile names found: ${[...new Set(duplicates)].join(
            ", "
          )}`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateFieldValue = (
  fieldPath: string[],
  value: any,
  vendor: DDSVendor
): string | null => {
  if (vendor === "zenoh") {
    return validateZenohFieldValue(fieldPath, value);
  }
  const path = fieldPath.join(".");
  if (path.includes("domainId") || path === "Domain.Id") {
    if (value !== "any" && value !== undefined && value !== "") {
      const domainId = parseInt(value);
      if (isNaN(domainId) || domainId < 0 || domainId > 232) {
        return 'Domain ID must be between 0 and 232, or "any"';
      }
    }
  }

  if (path.includes("port") || path.includes("Port")) {
    const port = parseInt(value);
    if (!isNaN(port) && (port < 1 || port > 65535)) {
      return "Port must be between 1 and 65535";
    }
  }

  if (
    path.includes("Size") &&
    typeof value === "string" &&
    value.match(/^\d+[KMGT]?B?$/)
  ) {
    const sizeMatch = value.match(/^(\d+)([KMGT]?)B?$/);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      const unit = sizeMatch[2];

      let sizeInBytes = size;
      switch (unit) {
        case "K":
          sizeInBytes *= 1024;
          break;
        case "M":
          sizeInBytes *= 1024 * 1024;
          break;
        case "G":
          sizeInBytes *= 1024 * 1024 * 1024;
          break;
        case "T":
          sizeInBytes *= 1024 * 1024 * 1024 * 1024;
          break;
      }

      if (sizeInBytes > 1024 * 1024 * 1024 * 1024) {
        return "Size value is too large (max 1TB)";
      }
    }
  }

  if (
    path.includes("Duration") ||
    path.includes("sec") ||
    path.includes("nanosec")
  ) {
    const duration = parseInt(value);
    if (!isNaN(duration) && duration < 0) {
      return "Duration values must be positive";
    }
  }

  if (
    path.includes("address") ||
    path.includes("Address") ||
    path.includes("IP")
  ) {
    if (value && typeof value === "string" && value.includes(".")) {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipRegex.test(value)) {
        const parts = value.split(".").map(Number);
        if (parts.some((part) => part > 255)) {
          return "Invalid IP address format";
        }
      }
    }
  }

  return null;
};
