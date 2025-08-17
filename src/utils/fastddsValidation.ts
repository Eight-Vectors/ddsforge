// Comprehensive FastDDS validation system
export interface ValidationIssue {
  type: "error" | "warning";
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// List of fields that should have empty locator format when empty
const LOCATOR_LIST_FIELDS = [
  "metatrafficMulticastLocatorList",
  "metatrafficUnicastLocatorList",
  "initialPeersList",
  "defaultMulticastLocatorList",
  "defaultUnicastLocatorList",
];

export class FastDDSValidator {
  private issues: ValidationIssue[] = [];

  validate(xmlData: any): ValidationResult {
    this.issues = [];

    if (!xmlData.profiles) {
      this.addIssue("error", "Missing profiles section");
      return { valid: false, issues: this.issues };
    }

    // Collect all available references
    const availableRefs = this.collectAvailableReferences(xmlData);

    // Validate each profile type
    this.validateParticipants(xmlData.profiles.participant, availableRefs);
    this.validateDataWriters(xmlData.profiles.data_writer, availableRefs);
    this.validateDataReaders(xmlData.profiles.data_reader, availableRefs);

    // Check for empty locator lists
    this.validateEmptyLocators(xmlData.profiles);

    return {
      valid: this.issues.filter((i) => i.type === "error").length === 0,
      issues: this.issues,
    };
  }

  private addIssue(type: "error" | "warning", message: string, path?: string) {
    this.issues.push({ type, message, path });
  }

  private collectAvailableReferences(xmlData: any): Map<string, Set<string>> {
    const refs = new Map<string, Set<string>>();

    // Collect transport descriptors
    const transports = new Set<string>();
    if (xmlData.profiles?.transport_descriptors) {
      // Handle the case where transport_descriptors contains transport_descriptor directly
      const td = xmlData.profiles.transport_descriptors.transport_descriptor;
      if (td) {
        // Check if transport_descriptor is an array or single object
        const descriptors = Array.isArray(td) ? td : [td];
        descriptors.forEach((desc: any) => {
          if (desc.transport_id) {
            transports.add(desc.transport_id);
          }
        });
      } else {
        // Fallback to old structure
        const descriptors = this.ensureArray(
          xmlData.profiles.transport_descriptors
        );
        descriptors.forEach((desc: any) => {
          if (desc.transport_descriptor?.transport_id) {
            transports.add(desc.transport_descriptor.transport_id);
          }
        });
      }
    }
    refs.set("transport_descriptor", transports);

    // Collect topic profiles
    const topics = new Set<string>();
    if (xmlData.profiles?.topic) {
      const topicProfiles = this.ensureArray(xmlData.profiles.topic);
      topicProfiles.forEach((topic: any) => {
        if (topic["@_profile_name"]) {
          topics.add(topic["@_profile_name"]);
        }
      });
    }
    refs.set("topic", topics);

    // Collect type definitions
    const types = new Set<string>();
    if (xmlData.types?.type) {
      const typeList = this.ensureArray(xmlData.types.type);
      typeList.forEach((type: any) => {
        if (type["@_name"]) {
          types.add(type["@_name"]);
        }
      });
    }
    refs.set("type", types);

    return refs;
  }

  private validateParticipants(
    participants: any,
    availableRefs: Map<string, Set<string>>
  ) {
    if (!participants) return;

    const participantList = this.ensureArray(participants);

    participantList.forEach((participant: any, index: number) => {
      const profileName =
        participant["@_profile_name"] || `participant[${index}]`;

      // Check transport references
      if (participant.rtps?.userTransports) {
        // Handle the case where userTransports is wrapped in transport_id
        let transportList;
        if (participant.rtps.userTransports.transport_id) {
          // Handle { transport_id: [...] } structure
          transportList = this.ensureArray(
            participant.rtps.userTransports.transport_id
          );
        } else {
          // Handle direct array or single value
          transportList = this.ensureArray(participant.rtps.userTransports);
        }

        const availableTransports =
          availableRefs.get("transport_descriptor") || new Set();

        transportList.forEach((transportId: any) => {
          // transportId should be a string at this point
          const id =
            typeof transportId === "string"
              ? transportId
              : transportId.transport_id || transportId;
          if (!availableTransports.has(id)) {
            this.addIssue(
              "error",
              `Participant '${profileName}' references undefined transport: '${id}'`,
              `participant[${index}].rtps.userTransports`
            );
          }
        });
      }

      // Check if builtin transports disabled without user transports
      if (participant.rtps?.useBuiltinTransports === false) {
        if (
          !participant.rtps.userTransports ||
          (Array.isArray(participant.rtps.userTransports) &&
            participant.rtps.userTransports.length === 0)
        ) {
          this.addIssue(
            "error",
            `Participant '${profileName}' has useBuiltinTransports=false but no userTransports defined`,
            `participant[${index}].rtps`
          );
        }
      }

      // Check discovery server references
      if (
        participant.rtps?.builtin?.discovery_config?.discoveryProtocol ===
          "SERVER" ||
        participant.rtps?.builtin?.discovery_config?.discoveryProtocol ===
          "BACKUP"
      ) {
        if (!participant.rtps.builtin.discovery_config.discoveryServersList) {
          this.addIssue(
            "error",
            `Participant '${profileName}' uses ${participant.rtps.builtin.discovery_config.discoveryProtocol} discovery but no discoveryServersList defined`,
            `participant[${index}].rtps.builtin.discovery_config`
          );
        }
      }
    });
  }

  private validateDataWriters(
    dataWriters: any,
    availableRefs: Map<string, Set<string>>
  ) {
    if (!dataWriters) return;

    const writerList = this.ensureArray(dataWriters);

    writerList.forEach((writer: any, index: number) => {
      const profileName = writer["@_profile_name"] || `data_writer[${index}]`;

      // Check topic references
      if (writer.topicName) {
        const availableTopics = availableRefs.get("topic") || new Set();
        if (!availableTopics.has(writer.topicName)) {
          this.addIssue(
            "warning",
            `DataWriter '${profileName}' references undefined topic: '${writer.topicName}'`,
            `data_writer[${index}].topicName`
          );
        }
      }

      // Check type references
      if (writer.topicDataType) {
        const availableTypes = availableRefs.get("type") || new Set();
        if (!availableTypes.has(writer.topicDataType)) {
          this.addIssue(
            "warning",
            `DataWriter '${profileName}' references undefined type: '${writer.topicDataType}'`,
            `data_writer[${index}].topicDataType`
          );
        }
      }
    });
  }

  private validateDataReaders(
    dataReaders: any,
    availableRefs: Map<string, Set<string>>
  ) {
    if (!dataReaders) return;

    const readerList = this.ensureArray(dataReaders);

    readerList.forEach((reader: any, index: number) => {
      const profileName = reader["@_profile_name"] || `data_reader[${index}]`;

      // Check topic references
      if (reader.topicName) {
        const availableTopics = availableRefs.get("topic") || new Set();
        if (!availableTopics.has(reader.topicName)) {
          this.addIssue(
            "warning",
            `DataReader '${profileName}' references undefined topic: '${reader.topicName}'`,
            `data_reader[${index}].topicName`
          );
        }
      }

      // Check type references
      if (reader.topicDataType) {
        const availableTypes = availableRefs.get("type") || new Set();
        if (!availableTypes.has(reader.topicDataType)) {
          this.addIssue(
            "warning",
            `DataReader '${profileName}' references undefined type: '${reader.topicDataType}'`,
            `data_reader[${index}].topicDataType`
          );
        }
      }
    });
  }

  private validateEmptyLocators(profiles: any) {
    // Check participant locator lists
    if (profiles.participant) {
      const participants = this.ensureArray(profiles.participant);

      participants.forEach((participant: any, index: number) => {
        const profileName =
          participant["@_profile_name"] || `participant[${index}]`;

        // Check each locator list field
        LOCATOR_LIST_FIELDS.forEach((field) => {
          const value = this.getNestedValue(participant, field);
          if (value !== undefined) {
            // Check if it's an empty array or has wrong format
            if (Array.isArray(value) && value.length === 0) {
              this.addIssue(
                "warning",
                `${profileName}: ${field} is empty array, should be {locator: {}} for empty locator`,
                `participant[${index}].${field}`
              );
            } else if (
              value &&
              typeof value === "object" &&
              value.locator === 0
            ) {
              this.addIssue(
                "error",
                `${profileName}: ${field} has invalid locator value '0', should be empty object`,
                `participant[${index}].${field}`
              );
            }
          }
        });
      });
    }
  }

  private ensureArray(value: any): any[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  private getNestedValue(obj: any, path: string): any {
    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === "object") {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}

// Helper function to validate before generating XML
export function validateFastDDSConfig(xmlData: any): ValidationResult {
  const validator = new FastDDSValidator();
  return validator.validate(xmlData);
}
