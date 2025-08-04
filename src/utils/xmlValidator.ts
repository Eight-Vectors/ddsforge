import { XMLValidator } from 'fast-xml-parser';
import type { DDSVendor } from '../types/dds';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateXML = (xmlString: string, vendor: DDSVendor): ValidationResult => {
  const errors: string[] = [];
  
  // First, check if the XML is well-formed
  const validationResult = XMLValidator.validate(xmlString, {
    allowBooleanAttributes: true,
    unpairedTags: []
  });
  
  if (validationResult !== true) {
    if (typeof validationResult === 'object' && validationResult.err) {
      errors.push(`XML Parse Error: ${validationResult.err.msg} at line ${validationResult.err.line}`);
    } else {
      errors.push('XML is not well-formed');
    }
    return { isValid: false, errors };
  }
  
  // Additional vendor-specific validations
  if (vendor === 'cyclonedds') {
    // Check for required root element
    if (!xmlString.includes('<CycloneDDS') && !xmlString.includes('<cyclonedds')) {
      errors.push('Missing required root element <CycloneDDS>');
    }
    
    // Check for Domain element
    if (!xmlString.includes('<Domain')) {
      errors.push('Missing required <Domain> element');
    }
    
    // Validate domain ID format if present
    const domainIdMatch = xmlString.match(/Id\s*=\s*["']([^"']+)["']/);
    if (domainIdMatch && domainIdMatch[1] !== 'any') {
      const domainId = domainIdMatch[1];
      if (!/^\d+$/.test(domainId) || parseInt(domainId) < 0 || parseInt(domainId) > 232) {
        errors.push('Domain ID must be a number between 0 and 232, or "any"');
      }
    }
  } else if (vendor === 'fastdds') {
    // Check for required root element
    if (!xmlString.includes('<dds>') && !xmlString.includes('<DDS>')) {
      errors.push('Missing required root element <dds>');
    }
    
    // Check for profiles element
    if (!xmlString.includes('<profiles>')) {
      errors.push('Missing required <profiles> element');
    }
    
    // Validate domain ID if present
    const domainIdMatch = xmlString.match(/<domainId>(\d+)<\/domainId>/);
    if (domainIdMatch) {
      const domainId = parseInt(domainIdMatch[1]);
      if (domainId < 0 || domainId > 232) {
        errors.push('Domain ID must be between 0 and 232');
      }
    }
  }
  
  // Check for common issues
  
  // Check for empty elements that shouldn't be empty
  const emptyElementPattern = /<(\w+)(\s+[^>]*)?\s*\/>/g;
  const emptyElements = xmlString.match(emptyElementPattern);
  if (emptyElements) {
    const problematicEmpty = emptyElements.filter(el => {
      const tagName = el.match(/<(\w+)/)?.[1];
      // These elements can be empty
      const allowedEmpty = ['Enable', 'Disable', 'NetworkInterface'];
      return tagName && !allowedEmpty.includes(tagName);
    });
    
    if (problematicEmpty.length > 0) {
      errors.push(`Found potentially problematic empty elements: ${problematicEmpty.join(', ')}`);
    }
  }
  
  // Check for duplicate profile names in FastDDS
  if (vendor === 'fastdds') {
    const profileNames = xmlString.match(/profile_name\s*=\s*["']([^"']+)["']/g);
    if (profileNames) {
      const names = profileNames.map(match => match.match(/["']([^"']+)["']/)?.[1]).filter(Boolean);
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate profile names found: ${[...new Set(duplicates)].join(', ')}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate specific field values
export const validateFieldValue = (fieldPath: string[], value: any, vendor: DDSVendor): string | null => {
  const path = fieldPath.join('.');
  
  // Common validations
  if (path.includes('domainId') || path === 'Domain.Id') {
    if (value !== 'any' && value !== undefined && value !== '') {
      const domainId = parseInt(value);
      if (isNaN(domainId) || domainId < 0 || domainId > 232) {
        return 'Domain ID must be between 0 and 232, or "any"';
      }
    }
  }
  
  // Port validations
  if (path.includes('port') || path.includes('Port')) {
    const port = parseInt(value);
    if (!isNaN(port) && (port < 1 || port > 65535)) {
      return 'Port must be between 1 and 65535';
    }
  }
  
  // Memory size validations (e.g., MaxMessageSize)
  if (path.includes('Size') && typeof value === 'string' && value.match(/^\d+[KMGT]?B?$/)) {
    const sizeMatch = value.match(/^(\d+)([KMGT]?)B?$/);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      const unit = sizeMatch[2];
      
      // Convert to bytes for validation
      let sizeInBytes = size;
      switch (unit) {
        case 'K': sizeInBytes *= 1024; break;
        case 'M': sizeInBytes *= 1024 * 1024; break;
        case 'G': sizeInBytes *= 1024 * 1024 * 1024; break;
        case 'T': sizeInBytes *= 1024 * 1024 * 1024 * 1024; break;
      }
      
      if (sizeInBytes > 1024 * 1024 * 1024 * 1024) { // 1TB max
        return 'Size value is too large (max 1TB)';
      }
    }
  }
  
  // Duration validations
  if (path.includes('Duration') || path.includes('sec') || path.includes('nanosec')) {
    const duration = parseInt(value);
    if (!isNaN(duration) && duration < 0) {
      return 'Duration values must be positive';
    }
  }
  
  // IP address validation
  if (path.includes('address') || path.includes('Address') || path.includes('IP')) {
    if (value && typeof value === 'string' && value.includes('.')) {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipRegex.test(value)) {
        const parts = value.split('.').map(Number);
        if (parts.some(part => part > 255)) {
          return 'Invalid IP address format';
        }
      }
    }
  }
  
  return null;
};