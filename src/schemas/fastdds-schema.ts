import { domainParticipantFactoryProfile, defaultParticipantProfile, defaultTopicProfile, defaultTransportDescriptor } from './fastdds-profiles';

export const fastDDSSchema = {
  dds: {
    "@_xmlns": "http://www.eprosima.com",
    profiles: {
      // Transport descriptors section
      transport_descriptors: [
        {
          transport_descriptor: defaultTransportDescriptor,
        },
      ],

      // Domain Participant Factory
      domainparticipant_factory: domainParticipantFactoryProfile,

      // Participant profiles
      participant: [defaultParticipantProfile],

      // Data Writer profiles
      data_writer: [
        {
          "@_profile_name": "default_datawriter",
          topic: {
            historyQos: {
              kind: "KEEP_LAST",
              depth: 1000,
            },
            resourceLimitsQos: {
              max_samples: 5000,
              max_instances: 10,
              max_samples_per_instance: 400,
              allocated_samples: 100,
              extra_samples: 1,
            },
          },
          qos: {
            durability: {
              kind: "VOLATILE",
            },
            durabilityService: {
              history_kind: "KEEP_LAST",
              history_depth: 1,
              max_samples: -1,
              max_instances: -1,
              max_samples_per_instance: -1,
            },
            deadline: {
              period: {
                sec: "DURATION_INFINITY",
              },
            },
            latencyBudget: {
              duration: {
                sec: 0,
                nanosec: 0,
              },
            },
            liveliness: {
              kind: "AUTOMATIC",
              lease_duration: {
                sec: "DURATION_INFINITY",
              },
              announcement_period: {
                sec: "DURATION_INFINITY",
              },
            },
            reliability: {
              kind: "RELIABLE",
              max_blocking_time: {
                sec: 0,
                nanosec: 100000000,
              },
            },
            lifespan: {
              duration: {
                sec: "DURATION_INFINITY",
              },
            },
            ownership: {
              kind: "SHARED",
            },
            ownershipStrength: {
              value: 0,
            },
            publishMode: {
              kind: "SYNCHRONOUS",
            },
            partition: {
              names: [],
            },
          },
          times: {
            initial_heartbeat_delay: {
              sec: 0,
              nanosec: 12000000,
            },
            heartbeat_period: {
              sec: 3,
              nanosec: 0,
            },
            nack_response_delay: {
              sec: 0,
              nanosec: 5000000,
            },
            nack_supression_duration: {
              sec: 0,
              nanosec: 0,
            },
          },
          unicastLocatorList: [],
          multicastLocatorList: [],
          historyMemoryPolicy: "PREALLOCATED",
          propertiesPolicy: {
            properties: [],
          },
          userDefinedID: -1,
          entityID: -1,
        },
      ],

      // Data Reader profiles
      data_reader: [
        {
          "@_profile_name": "default_datareader",
          topic: {
            historyQos: {
              kind: "KEEP_LAST",
              depth: 1000,
            },
            resourceLimitsQos: {
              max_samples: 5000,
              max_instances: 10,
              max_samples_per_instance: 400,
              allocated_samples: 100,
              extra_samples: 1,
            },
          },
          qos: {
            durability: {
              kind: "VOLATILE",
            },
            deadline: {
              period: {
                sec: "DURATION_INFINITY",
              },
            },
            latencyBudget: {
              duration: {
                sec: 0,
                nanosec: 0,
              },
            },
            liveliness: {
              kind: "AUTOMATIC",
              lease_duration: {
                sec: "DURATION_INFINITY",
              },
              announcement_period: {
                sec: "DURATION_INFINITY",
              },
            },
            reliability: {
              kind: "RELIABLE",
              max_blocking_time: {
                sec: 0,
                nanosec: 100000000,
              },
            },
            lifespan: {
              duration: {
                sec: "DURATION_INFINITY",
              },
            },
            ownership: {
              kind: "SHARED",
            },
            partition: {
              names: [],
            },
          },
          times: {
            initial_acknack_delay: {
              sec: 0,
              nanosec: 70000000,
            },
            heartbeat_response_delay: {
              sec: 0,
              nanosec: 5000000,
            },
          },
          unicastLocatorList: [],
          multicastLocatorList: [],
          expects_inline_qos: false,
          historyMemoryPolicy: "PREALLOCATED",
          propertiesPolicy: {
            properties: [],
          },
          userDefinedID: -1,
          entityID: -1,
        },
      ],

      // Topic profiles
      topic: [defaultTopicProfile],
    },

    // Library settings
    library_settings: {
      intraprocess_delivery: "INTRAPROCESS_FULL",
    },

    // Log configuration
    log: {
      use_default: true,
      consumer: [
        {
          class: "StdoutConsumer",
        },
      ],
      thread_settings: {
        scheduling_policy: -1,
        priority: 0,
        affinity: 0,
        stack_size: -1,
      },
    },

    // Types definition
    types: {
      type: [],
    },
  },
};
