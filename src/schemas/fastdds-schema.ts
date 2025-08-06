// FastDDS Complete Schema Definition
export const fastDDSSchema = {
  dds: {
    '@_xmlns': 'http://www.eprosima.com/XMLSchemas/fastRTPS_Profiles',
    profiles: {
      '@_xmlns': 'http://www.eprosima.com/XMLSchemas/fastRTPS_Profiles',
      participant: [{
        '@_profile_name': 'default_participant',
        '@_is_default_profile': true,
        rtps: {
          name: 'default_participant',
          defaultUnicastLocatorList: {
            locator: []
          },
          defaultMulticastLocatorList: {
            locator: []
          },
          sendSocketBufferSize: 0,
          listenSocketBufferSize: 0,
          participantID: -1,
          useBuiltinTransports: true,
          properties: {
            property: []
          },
          userData: {
            value: []
          },
          prefix: ''
        },
        domainId: 0,
        allocation: {
          remote_locators: {
            max_unicast_locators: 4,
            max_multicast_locators: 1
          },
          participants: {
            initial: 0,
            maximum: 0,
            increment: 1
          },
          readers: {
            initial: 0,
            maximum: 0,
            increment: 1
          },
          writers: {
            initial: 0,
            maximum: 0,
            increment: 1
          },
          send_buffers: {
            preallocated_number: 0,
            dynamic: false
          },
          data_limits: {
            max_properties: 0,
            max_user_data: 0,
            max_partitions: 0
          }
        },
        builtin: {
          discovery_config: {
            discoveryProtocol: 'SIMPLE',
            ignoreParticipantFlags: 'FILTER_DIFFERENT_HOST',
            EDP: 'SIMPLE',
            domainId: 0,
            leaseDuration: {
              sec: 'DURATION_INFINITY'
            },
            leaseAnnouncement: {
              sec: 'DURATION_INFINITY'
            },
            initialPeersList: {
              locator: []
            },
            metatrafficUnicastLocatorList: {
              locator: []
            },
            metatrafficMulticastLocatorList: {
              locator: []
            },
            clientAnnouncementPeriod: {
              sec: 0,
              nanosec: 0
            },
            use_SIMPLE_RTPSParticipantDiscoveryProtocol: true,
            use_SIMPLE_EndpointDiscoveryProtocol: true,
            use_STATIC_EndpointDiscoveryProtocol: false,
            discoveryServersList: {
              RemoteServer: []
            }
          },
          mutation_tries: 100
        }
      }],
      data_writer: [{
        '@_profile_name': 'default_datawriter',
        '@_is_default_profile': true,
        qos: {
          durability: {
            kind: 'VOLATILE'
          },
          durabilityService: {
            history_kind: 'KEEP_LAST',
            history_depth: 1,
            max_samples: -1,
            max_instances: -1,
            max_samples_per_instance: -1
          },
          deadline: {
            period: {
              sec: 'DURATION_INFINITY'
            }
          },
          latencyBudget: {
            duration: {
              sec: 0,
              nanosec: 0
            }
          },
          liveliness: {
            kind: 'AUTOMATIC',
            leaseDuration: {
              sec: 'DURATION_INFINITY'
            }
          },
          reliability: {
            kind: 'RELIABLE',
            max_blocking_time: {
              sec: 0,
              nanosec: 100000000
            }
          },
          lifespan: {
            duration: {
              sec: 'DURATION_INFINITY'
            }
          },
          ownership: {
            kind: 'SHARED'
          },
          ownershipStrength: {
            value: 0
          },
          publishMode: {
            kind: 'SYNCHRONOUS'
          },
          dataRepresentation: {
            value: []
          }
        },
        times: {
          heartbeatPeriod: {
            sec: 0,
            nanosec: 100000000
          },
          nackResponseDelay: {
            sec: 0,
            nanosec: 5000000
          },
          nackSupressionDuration: {
            sec: 0,
            nanosec: 0
          }
        },
        unicastLocatorList: {
          locator: []
        },
        multicastLocatorList: {
          locator: []
        },
        external_unicast_locators: {
          locator: []
        },
        ignore_non_matching_locators: false,
        historyMemoryPolicy: 'PREALLOCATED',
        propertiesPolicy: {
          property: []
        },
        allocation: {
          initial: 0,
          maximum: 0,
          increment: 1
        }
      }],
      data_reader: [{
        '@_profile_name': 'default_datareader',
        '@_is_default_profile': true,
        qos: {
          durability: {
            kind: 'VOLATILE'
          },
          deadline: {
            period: {
              sec: 'DURATION_INFINITY'
            }
          },
          latencyBudget: {
            duration: {
              sec: 0,
              nanosec: 0
            }
          },
          liveliness: {
            kind: 'AUTOMATIC',
            leaseDuration: {
              sec: 'DURATION_INFINITY'
            }
          },
          reliability: {
            kind: 'BEST_EFFORT'
          },
          ownership: {
            kind: 'SHARED'
          },
          timeBasedFilter: {
            minimum_separation: {
              sec: 0,
              nanosec: 0
            }
          },
          dataRepresentation: {
            value: []
          }
        },
        times: {
          heartbeatResponseDelay: {
            sec: 0,
            nanosec: 5000000
          }
        },
        unicastLocatorList: {
          locator: []
        },
        multicastLocatorList: {
          locator: []
        },
        external_unicast_locators: {
          locator: []
        },
        ignore_non_matching_locators: false,
        historyMemoryPolicy: 'PREALLOCATED',
        propertiesPolicy: {
          property: []
        },
        allocation: {
          initial: 0,
          maximum: 0,
          increment: 1
        }
      }],
      topic: [{
        '@_profile_name': 'default_topic',
        '@_is_default_profile': true,
        historyQos: {
          kind: 'KEEP_LAST',
          depth: 1
        },
        resourceLimitsQos: {
          max_samples: 5000,
          max_instances: 10,
          max_samples_per_instance: 400,
          allocated_samples: 100
        }
      }]
    },
    log: {
      verbosity: 'Info',
      stdout_threshold: 'Warning',
      file_name: '',
      use_timestamp: false,
      use_thread_id: false,
      use_colors: true
    },
    types: {
      type: []
    }
  }
};