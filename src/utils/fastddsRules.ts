export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  autoFixAvailable?: string[];
}

export interface DependencyRule {
  id: string;
  name: string;
  validate: (config: any) => ValidationResult;
  autoFix?: (config: any) => any;
}

export class FastDDSValidator {
  private rules: DependencyRule[] = [
    // transport reference rule
    {
      id: "transport-reference",
      name: "Transport Descriptor Reference",
      validate: (config) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
          autoFixAvailable: [],
        };

        if (!config.profiles) return result;

        // get all transport IDs
        const transportIds = new Set<string>();
        if (config.profiles.transport_descriptors) {
          // handle the case where transport_descriptors contains transport_descriptor directly
          const td = config.profiles.transport_descriptors.transport_descriptor;
          if (td) {
            // check if transport_descriptor is an array or single object
            const descriptors = Array.isArray(td) ? td : [td];
            descriptors.forEach((desc: any) => {
              if (desc.transport_id) {
                transportIds.add(desc.transport_id);
              }
            });
          } else {
            // try looking directly at transport_descriptors array
            const descriptors = Array.isArray(
              config.profiles.transport_descriptors
            )
              ? config.profiles.transport_descriptors
              : [config.profiles.transport_descriptors];

            descriptors.forEach((desc: any) => {
              // check multiple possible structures
              if (desc.transport_id) {
                transportIds.add(desc.transport_id);
              } else if (desc.transport_descriptor?.transport_id) {
                transportIds.add(desc.transport_descriptor.transport_id);
              }
            });
          }
        }

        // check participant transports
        if (config.profiles.participant) {
          const participants = Array.isArray(config.profiles.participant)
            ? config.profiles.participant
            : [config.profiles.participant];

          participants.forEach((participant: any) => {
            // only validate transport IDs if useBuiltinTransports is false
            if (
              participant.rtps?.useBuiltinTransports === false &&
              participant.rtps?.userTransports
            ) {
              // handle the case where userTransports is wrapped in transport_id
              let transportList;
              if (participant.rtps.userTransports.transport_id) {
                // handle { transport_id: [...] } structure
                transportList = Array.isArray(
                  participant.rtps.userTransports.transport_id
                )
                  ? participant.rtps.userTransports.transport_id
                  : [participant.rtps.userTransports.transport_id];
              } else {
                // handle direct array or single value
                transportList = Array.isArray(participant.rtps.userTransports)
                  ? participant.rtps.userTransports
                  : [participant.rtps.userTransports];
              }

              transportList.forEach((transportId: any) => {
                // transportId should be a string at this point
                const id =
                  typeof transportId === "string"
                    ? transportId
                    : transportId.transport_id || transportId;
                if (!transportIds.has(id)) {
                  result.valid = false;
                  result.errors.push(
                    `Transport '${id}' not found in transport_descriptors`
                  );
                }
              });
            }

            // check if builtin transports disabled without user transports
            if (participant.rtps?.useBuiltinTransports === false) {
              if (
                !participant.rtps.userTransports ||
                (Array.isArray(participant.rtps.userTransports) &&
                  participant.rtps.userTransports.length === 0)
              ) {
                result.valid = false;
                result.errors.push(
                  "useBuiltinTransports is false but no userTransports defined"
                );
              }
            }
          });
        }

        return result;
      },
    },

    // empty locator list rule
    {
      id: "empty-locator",
      name: "Empty Locator List Format",
      validate: (config) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
        };

        const checkLocatorList = (list: any, path: string) => {
          if (list !== undefined && list !== null) {
            if (Array.isArray(list) && list.length === 0) {
              result.warnings.push(
                `${path} is empty array, should be {locator: ""}`
              );
              result.autoFixAvailable?.push("empty-locator");
            } else if (typeof list === "object" && !Array.isArray(list)) {
              // check if it has a locator with value 0 or other non-empty value
              if (
                list.locator !== undefined &&
                list.locator !== null &&
                list.locator !== ""
              ) {
                // locator has content
              }
            }
          }
        };

        if (config.profiles?.participant) {
          const participants = Array.isArray(config.profiles.participant)
            ? config.profiles.participant
            : [config.profiles.participant];

          participants.forEach((participant: any, i: number) => {
            const prefix = `participant[${i}]`;

            if (participant.rtps?.builtin) {
              checkLocatorList(
                participant.rtps.builtin.metatrafficMulticastLocatorList,
                `${prefix}.rtps.builtin.metatrafficMulticastLocatorList`
              );
              checkLocatorList(
                participant.rtps.builtin.metatrafficUnicastLocatorList,
                `${prefix}.rtps.builtin.metatrafficUnicastLocatorList`
              );
              checkLocatorList(
                participant.rtps.builtin.initialPeersList,
                `${prefix}.rtps.builtin.initialPeersList`
              );
            }

            if (participant.rtps) {
              checkLocatorList(
                participant.rtps.defaultMulticastLocatorList,
                `${prefix}.rtps.defaultMulticastLocatorList`
              );
              checkLocatorList(
                participant.rtps.defaultUnicastLocatorList,
                `${prefix}.rtps.defaultUnicastLocatorList`
              );
            }
          });
        }

        return result;
      },
      autoFix: (config) => {
        const newConfig = JSON.parse(JSON.stringify(config));

        const fixLocatorList = (obj: any, key: string) => {
          if (obj && obj[key] !== undefined) {
            if (Array.isArray(obj[key]) && obj[key].length === 0) {
              obj[key] = { locator: {} }; // Empty object instead of empty string
            }
          }
        };

        if (newConfig.profiles?.participant) {
          const participants = Array.isArray(newConfig.profiles.participant)
            ? newConfig.profiles.participant
            : [newConfig.profiles.participant];

          participants.forEach((participant: any) => {
            if (participant.rtps?.builtin) {
              fixLocatorList(
                participant.rtps.builtin,
                "metatrafficMulticastLocatorList"
              );
              fixLocatorList(
                participant.rtps.builtin,
                "metatrafficUnicastLocatorList"
              );
              fixLocatorList(participant.rtps.builtin, "initialPeersList");
            }
            if (participant.rtps) {
              fixLocatorList(participant.rtps, "defaultMulticastLocatorList");
              fixLocatorList(participant.rtps, "defaultUnicastLocatorList");
            }
          });

          newConfig.profiles.participant = participants;
        }

        return newConfig;
      },
    },

    // Type reference rule
    {
      id: "type-reference",
      name: "Type Definition Reference",
      validate: (config) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
        };

        // Get all defined types
        const definedTypes = new Set<string>();
        if (config.types?.type) {
          const types = Array.isArray(config.types.type)
            ? config.types.type
            : [config.types.type];

          types.forEach((type: any) => {
            if (type["@_name"]) {
              definedTypes.add(type["@_name"]);
            }
          });
        }

        // Check topic type references
        if (config.profiles?.topic) {
          const topics = Array.isArray(config.profiles.topic)
            ? config.profiles.topic
            : [config.profiles.topic];

          topics.forEach((topic: any) => {
            if (topic.type_name && !definedTypes.has(topic.type_name)) {
              result.warnings.push(
                `Topic references type '${topic.type_name}' which is not defined in types section`
              );
            }
          });
        }

        return result;
      },
    },

    // QoS compatibility rule
    {
      id: "qos-compatibility",
      name: "QoS Compatibility Check",
      validate: (config) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
        };

        const writers: Map<string, any> = new Map();
        const readers: Map<string, any> = new Map();

        // Collect writers
        if (config.profiles?.data_writer) {
          const dataWriters = Array.isArray(config.profiles.data_writer)
            ? config.profiles.data_writer
            : [config.profiles.data_writer];

          dataWriters.forEach((writer: any) => {
            if (writer["@_profile_name"]) {
              writers.set(writer["@_profile_name"], writer);
            }
          });
        }

        // Collect readers
        if (config.profiles?.data_reader) {
          const dataReaders = Array.isArray(config.profiles.data_reader)
            ? config.profiles.data_reader
            : [config.profiles.data_reader];

          dataReaders.forEach((reader: any) => {
            if (reader["@_profile_name"]) {
              readers.set(reader["@_profile_name"], reader);
            }
          });
        }

        // Check compatibility for matching topic names
        writers.forEach((writer, writerName) => {
          readers.forEach((reader, readerName) => {
            // Check reliability
            const writerReliability =
              writer.qos?.reliability?.kind || "BEST_EFFORT";
            const readerReliability =
              reader.qos?.reliability?.kind || "BEST_EFFORT";

            if (
              readerReliability === "RELIABLE" &&
              writerReliability === "BEST_EFFORT"
            ) {
              result.warnings.push(
                `Reader '${readerName}' requires RELIABLE but writer '${writerName}' offers BEST_EFFORT`
              );
            }

            // Check durability
            const writerDurability = writer.qos?.durability?.kind || "VOLATILE";
            const readerDurability = reader.qos?.durability?.kind || "VOLATILE";

            const durabilityLevels = [
              "VOLATILE",
              "TRANSIENT_LOCAL",
              "TRANSIENT",
              "PERSISTENT",
            ];
            const writerLevel = durabilityLevels.indexOf(writerDurability);
            const readerLevel = durabilityLevels.indexOf(readerDurability);

            if (readerLevel > writerLevel) {
              result.warnings.push(
                `Reader '${readerName}' requires ${readerDurability} but writer '${writerName}' offers ${writerDurability}`
              );
            }
          });
        });

        return result;
      },
    },

    // Default profile rule
    {
      id: "default-profile",
      name: "Default Profile Check",
      validate: (config) => {
        const result: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
        };

        const profileTypes = [
          "participant",
          "data_writer",
          "data_reader",
          "topic",
        ];

        profileTypes.forEach((type) => {
          if (config.profiles?.[type]) {
            const profiles = Array.isArray(config.profiles[type])
              ? config.profiles[type]
              : [config.profiles[type]];

            const defaultProfiles = profiles.filter(
              (p: any) => p["@_is_default_profile"] === true
            );

            if (defaultProfiles.length > 1) {
              result.errors.push(`Multiple default profiles found for ${type}`);
            }
          }
        });

        return result;
      },
    },
  ];

  validateConfig(config: any): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    autoFixAvailable: string[];
  } {
    const overallResult = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      autoFixAvailable: [] as string[],
    };

    for (const rule of this.rules) {
      const result = rule.validate(config);

      if (!result.valid) {
        overallResult.valid = false;
      }

      overallResult.errors.push(...result.errors);
      overallResult.warnings.push(...result.warnings);

      if (result.autoFixAvailable) {
        overallResult.autoFixAvailable.push(...result.autoFixAvailable);
      }
    }

    // Remove duplicates
    overallResult.autoFixAvailable = [
      ...new Set(overallResult.autoFixAvailable),
    ];

    return overallResult;
  }

  autoFix(config: any, ruleIds?: string[]): any {
    let fixedConfig = JSON.parse(JSON.stringify(config));

    const rulesToApply = ruleIds
      ? this.rules.filter((r) => ruleIds.includes(r.id))
      : this.rules.filter((r) => r.autoFix);

    for (const rule of rulesToApply) {
      if (rule.autoFix) {
        fixedConfig = rule.autoFix(fixedConfig);
      }
    }

    return fixedConfig;
  }

  getRuleById(id: string): DependencyRule | undefined {
    return this.rules.find((r) => r.id === id);
  }
}
