export const fastDDSSchema = {
  dds: {
    "@_xmlns": "http://www.eprosima.com",
    profiles: {
      // Transport descriptors section
      transport_descriptors: [
        {
          transport_descriptor: {
            transport_id: "default_transport",
            type: "UDPv4",
            sendBufferSize: 65536,
            receiveBufferSize: 65536,
            maxMessageSize: 65500,
            maxInitialPeersRange: 4,
            interfaceWhiteList: [],
            netmask_filter: "AUTO",
            non_blocking_send: false,
            output_port: 0,
            TTL: 1,
          },
        },
      ],

      // Domain Participant Factory
      domainparticipant_factory: {
        "@_profile_name": "default_domainparticipant_factory",
        qos: {
          entity_factory: {
            autoenable_created_entities: true,
          },
        },
      },

      // Participant profiles
      participant: [
        {
          "@_profile_name": "default_participant",
          domainId: 0,
          rtps: {
            name: "default_participant",
            defaultUnicastLocatorList: [],
            defaultMulticastLocatorList: [],
            sendSocketBufferSize: 0,
            listenSocketBufferSize: 0,
            builtin: {
              discovery_config: {
                discoveryProtocol: "SIMPLE",
                EDP: "SIMPLE",
                simpleEDP: {
                  PUBWRITER_SUBREADER: true,
                  PUBREADER_SUBWRITER: true,
                },
                leaseDuration: {
                  sec: "DURATION_INFINITY",
                },
                leaseAnnouncement: {
                  sec: "DURATION_INFINITY",
                },
              },
              avoid_builtin_multicast: false,
              use_WriterLivelinessProtocol: true,
              metatrafficUnicastLocatorList: [],
              metatrafficMulticastLocatorList: [],
              initialPeersList: [],
              readerHistoryMemoryPolicy: "PREALLOCATED",
              writerHistoryMemoryPolicy: "PREALLOCATED",
              readerPayloadSize: 512,
              writerPayloadSize: 512,
              mutation_tries: 100,
            },
            port: {
              portBase: 7400,
              domainIDGain: 250,
              participantIDGain: 2,
              offsetd0: 0,
              offsetd1: 10,
              offsetd2: 1,
              offsetd3: 11,
            },
            participantID: -1,
            userTransports: [],
            useBuiltinTransports: true,
            propertiesPolicy: {
              properties: [],
            },
            allocation: {
              remote_locators: {
                max_unicast_locators: 4,
                max_multicast_locators: 1,
              },
              total_participants: {
                initial: 0,
                maximum: 0,
                increment: 1,
              },
              total_readers: {
                initial: 0,
                maximum: 0,
                increment: 1,
              },
              total_writers: {
                initial: 0,
                maximum: 0,
                increment: 1,
              },
              max_partitions: 256,
              max_user_data: 256,
              max_properties: 512,
              send_buffers: {
                preallocated_number: 0,
                dynamic: true,
              },
            },
          },
        },
      ],

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
      topic: [
        {
          "@_profile_name": "default_topic",
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
      ],
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
