import { XMLParser } from 'fast-xml-parser';
import type { DDSVendor } from '../types/dds';

export const parseXMLInBrowser = (xmlString: string): any => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    trimValues: true,
    parseTagValue: true,
    ignoreDeclaration: false,
    removeNSPrefix: false,
    processEntities: true,
    preserveOrder: false,
    alwaysCreateTextNode: false
  });
  
  try {
    return parser.parse(xmlString);
  } catch (error) {
    throw new Error('XML parsing error: ' + (error as Error).message);
  }
};

// This function is no longer needed as we use buildXML from xmlParser.ts
export const buildXMLFromObject = (data: any, vendor: DDSVendor): string => {
  let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n';
  
  if (vendor === 'cyclonedds') {
    // Build CycloneDDS structure
    xmlString += '<CycloneDDS xmlns="https://cdds.io/config" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://cdds.io/config https://raw.githubusercontent.com/eclipse-cyclonedds/cyclonedds/master/etc/cyclonedds.xsd">\n';
    
    xmlString += '  <Domain Id="' + (data.domainId || 'any') + '">\n';
    
    if (data.networkInterface || data.multicast !== undefined || data.maxMessageSize) {
      xmlString += '    <General>\n';
      
      if (data.networkInterface) {
        xmlString += '      <Interfaces>\n';
        xmlString += '        <NetworkInterface>\n';
        xmlString += '          <name>' + data.networkInterface + '</name>\n';
        xmlString += '          <autodetermine>false</autodetermine>\n';
        xmlString += '          <multicast>' + (data.multicast !== undefined ? data.multicast : true) + '</multicast>\n';
        xmlString += '        </NetworkInterface>\n';
        xmlString += '      </Interfaces>\n';
      }
      
      if (data.maxMessageSize && data.maxMessageSize !== '65500B') {
        xmlString += '      <MaxMessageSize>' + data.maxMessageSize + '</MaxMessageSize>\n';
      }
      
      xmlString += '    </General>\n';
    }
    
    if (data.tracing && (data.tracing.enable || data.tracing.verbosity !== 'warning' || data.tracing.outputFile)) {
      xmlString += '    <Tracing>\n';
      if (data.tracing.enable !== undefined) {
        xmlString += '      <Enable>' + data.tracing.enable + '</Enable>\n';
      }
      if (data.tracing.verbosity && data.tracing.verbosity !== 'warning') {
        xmlString += '      <Verbosity>' + data.tracing.verbosity + '</Verbosity>\n';
      }
      if (data.tracing.outputFile) {
        xmlString += '      <OutputFile>' + data.tracing.outputFile + '</OutputFile>\n';
      }
      xmlString += '    </Tracing>\n';
    }
    
    xmlString += '  </Domain>\n';
    xmlString += '</CycloneDDS>';
  } else {
    // Build FastDDS structure
    xmlString += '<dds>\n';
    xmlString += '  <profiles>\n';
    
    if (data.domainId !== undefined || data.participantName || data.transport || data.discovery) {
      xmlString += '    <participant>\n';
      xmlString += '      <participant_profile profile_name="' + (data.participantName || 'default_participant') + '">\n';
      
      if (data.domainId !== undefined) {
        xmlString += '        <domainId>' + data.domainId + '</domainId>\n';
      }
      
      if (data.transport || data.discovery) {
        xmlString += '        <rtps>\n';
        
        if (data.participantName) {
          xmlString += '          <name>' + data.participantName + '</name>\n';
        }
        
        if (data.transport) {
          if (data.transport.sendBufferSize) {
            xmlString += '          <sendSocketBufferSize>' + data.transport.sendBufferSize + '</sendSocketBufferSize>\n';
          }
          if (data.transport.receiveBufferSize) {
            xmlString += '          <listenSocketBufferSize>' + data.transport.receiveBufferSize + '</listenSocketBufferSize>\n';
          }
        }
        
        if (data.discovery) {
          xmlString += '          <builtin>\n';
          xmlString += '            <discovery_config>\n';
          xmlString += '              <discoveryProtocol>' + (data.discovery.protocol || 'SIMPLE') + '</discoveryProtocol>\n';
          xmlString += '              <leaseDuration>\n';
          xmlString += '                <sec>' + (data.discovery.leaseDuration || 12) + '</sec>\n';
          xmlString += '              </leaseDuration>\n';
          xmlString += '            </discovery_config>\n';
          xmlString += '          </builtin>\n';
        }
        
        xmlString += '        </rtps>\n';
      }
      
      xmlString += '      </participant_profile>\n';
      xmlString += '    </participant>\n';
    }
    
    xmlString += '  </profiles>\n';
    xmlString += '</dds>';
  }
  
  return xmlString;
};