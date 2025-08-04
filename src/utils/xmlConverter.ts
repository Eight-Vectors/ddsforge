import type { FormField } from '../types/dds';
import { getSimpleFastDDSSchema, getSimpleCycloneDDSSchema } from './simpleDdsSchemas';

export const convertParsedXMLToSimpleSchema = (parsed: any, vendor: 'fastdds' | 'cyclonedds'): FormField[] => {
  if (vendor === 'fastdds') {
    return convertFastDDSToSimple(parsed);
  } else {
    return convertCycloneDDSToSimple(parsed);
  }
};

const convertFastDDSToSimple = (parsed: any): FormField[] => {
  const schema = getSimpleFastDDSSchema();
  // Deep clone the schema to avoid mutations
  const result = JSON.parse(JSON.stringify(schema));
  
  // Extract values from parsed FastDDS XML
  if (parsed.profiles) {
    // Domain ID
    if (parsed.profiles?.participant) {
      const participantData = parsed.profiles.participant;
      const participant = participantData.participant_profile || participantData;
      
      if (participant.domainId !== undefined || participant.domainid !== undefined) {
        const domainField = result.find((f: FormField) => f.name === 'domainId');
        if (domainField) domainField.value = Number(participant.domainId || participant.domainid);
      }
      
      if (participant.$ && participant.$.profile_name) {
        const nameField = result.find((f: FormField) => f.name === 'participantName');
        if (nameField) nameField.value = participant.$.profile_name;
      }
      
      // Transport settings from RTPS
      if (participant.rtps) {
        const transportField = result.find((f: FormField) => f.name === 'transport');
        if (transportField && transportField.fields) {
          if (participant.rtps.sendSocketBufferSize || participant.rtps.sendsocketbuffersize) {
            const sendBufferField = transportField.fields.find((f: FormField) => f.name === 'sendBufferSize');
            if (sendBufferField) sendBufferField.value = Number(participant.rtps.sendSocketBufferSize || participant.rtps.sendsocketbuffersize);
          }
          if (participant.rtps.listenSocketBufferSize || participant.rtps.listensocketbuffersize) {
            const receiveBufferField = transportField.fields.find((f: FormField) => f.name === 'receiveBufferSize');
            if (receiveBufferField) receiveBufferField.value = Number(participant.rtps.listenSocketBufferSize || participant.rtps.listensocketbuffersize);
          }
        }
      }
      
      // Discovery settings
      if (participant.rtps?.builtin?.discovery_config) {
        const discoveryField = result.find((f: FormField) => f.name === 'discovery');
        if (discoveryField && discoveryField.fields) {
          const config = participant.rtps.builtin.discovery_config;
          if (config.discoveryProtocol || config.discoveryprotocol) {
            const protocolField = discoveryField.fields.find((f: FormField) => f.name === 'protocol');
            if (protocolField) protocolField.value = config.discoveryProtocol || config.discoveryprotocol;
          }
          if (config.leaseDuration?.sec || config.leaseduration?.sec) {
            const leaseField = discoveryField.fields.find((f: FormField) => f.name === 'leaseDuration');
            const leaseDuration = config.leaseDuration || config.leaseduration;
            if (leaseField && leaseDuration) leaseField.value = Number(leaseDuration.sec);
          }
        }
      }
    }
  }
  
  return result;
};

const convertCycloneDDSToSimple = (parsed: any): FormField[] => {
  const schema = getSimpleCycloneDDSSchema();
  // Deep clone the schema to avoid mutations
  const result = JSON.parse(JSON.stringify(schema));
  
  // Extract values from parsed CycloneDDS XML
  if (parsed.domain) {
    const domain = Array.isArray(parsed.domain) ? parsed.domain[0] : parsed.domain;
    
    // Domain ID
    if (domain.id) {
      const domainField = result.find((f: FormField) => f.name === 'domainId');
      if (domainField) domainField.value = domain.id;
    }
    
    // General settings
    if (domain.general) {
      // Network interface
      if (domain.general.interfaces?.networkinterface) {
        const netInterface = Array.isArray(domain.general.interfaces.networkinterface)
          ? domain.general.interfaces.networkinterface[0]
          : domain.general.interfaces.networkinterface;
        
        if (netInterface.name) {
          const interfaceField = result.find((f: FormField) => f.name === 'networkInterface');
          if (interfaceField) interfaceField.value = netInterface.name;
        }
        
        if (netInterface.multicast !== undefined) {
          const multicastField = result.find((f: FormField) => f.name === 'multicast');
          if (multicastField) multicastField.value = netInterface.multicast === 'true' || netInterface.multicast === true;
        }
      }
      
      // Max message size
      if (domain.general.maxmessagesize) {
        const sizeField = result.find((f: FormField) => f.name === 'maxMessageSize');
        if (sizeField) sizeField.value = domain.general.maxmessagesize;
      }
    }
    
    // Tracing settings
    if (domain.tracing) {
      const tracingField = result.find((f: FormField) => f.name === 'tracing');
      if (tracingField && tracingField.fields) {
        if (domain.tracing.enable !== undefined) {
          const enableField = tracingField.fields.find((f: FormField) => f.name === 'enable');
          if (enableField) enableField.value = domain.tracing.enable === 'true' || domain.tracing.enable === true;
        }
        if (domain.tracing.verbosity) {
          const verbosityField = tracingField.fields.find((f: FormField) => f.name === 'verbosity');
          if (verbosityField) verbosityField.value = domain.tracing.verbosity.toLowerCase();
        }
        if (domain.tracing.outputfile) {
          const outputField = tracingField.fields.find((f: FormField) => f.name === 'outputFile');
          if (outputField) outputField.value = domain.tracing.outputfile;
        }
      }
    }
  }
  
  return result;
};

// Helper function to update nested field values
const updateFieldValue = (fields: FormField[], path: string[], value: any): void => {
  if (path.length === 0) return;
  
  const [current, ...rest] = path;
  const field = fields.find((f: FormField) => f.name === current);
  
  if (!field) return;
  
  if (rest.length === 0) {
    field.value = value;
  } else if (field.fields) {
    updateFieldValue(field.fields, rest, value);
  }
};