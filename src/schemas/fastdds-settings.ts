export const fastDDSSettings = {
  builtin: {
    default: {
      avoid_builtin_multicast: true,
      use_WriterLivelinessProtocol: true,
      metatrafficUnicastLocatorList: [],
      metatrafficMulticastLocatorList: [],
      initialPeersList: [],
      metatraffic_external_unicast_locators: [],
      readerHistoryMemoryPolicy: "PREALLOCATED",
      writerHistoryMemoryPolicy: "PREALLOCATED",
      readerPayloadSize: 512,
      writerPayloadSize: 512,
      mutation_tries: 100,
      flow_controller_name: "",
    },
    descriptions: {
      discovery_config:
        "Main element for discovery-related settings configuration",
      avoid_builtin_multicast: "Restricts multicast metatraffic to PDP only",
      use_WriterLivelinessProtocol:
        "Indicates whether to use the DataWriterLiveliness protocol",
      metatrafficUnicastLocatorList: "Metatraffic Unicast Locator List",
      metatrafficMulticastLocatorList: "Metatraffic Multicast Locator List",
      initialPeersList:
        "List of IP-port address pairs of all other DomainParticipants for communication",
      metatraffic_external_unicast_locators:
        "List of External Locators to announce for the metatraffic of this participant",
      readerHistoryMemoryPolicy: "Memory policy for DataReaders",
      writerHistoryMemoryPolicy: "Memory policy for DataWriters",
      readerPayloadSize:
        "Maximum DataReader's History payload size. Allows to reserve all required memory at initialization",
      writerPayloadSize:
        "Maximum DataWriter's History payload size. Allows to reserve all required memory at initialization",
      mutation_tries:
        "Number of different ports to try if DataReader's physical port is already in use",
      flow_controller_name: "FlowControllersQos name",
    },
    types: {
      avoid_builtin_multicast: "bool",
      use_WriterLivelinessProtocol: "bool",
      metatrafficUnicastLocatorList: "LocatorListType",
      metatrafficMulticastLocatorList: "LocatorListType",
      initialPeersList: "LocatorListType",
      metatraffic_external_unicast_locators: "ExternalLocatorListType",
      readerHistoryMemoryPolicy: "HistoryMemoryPolicy",
      writerHistoryMemoryPolicy: "HistoryMemoryPolicy",
      readerPayloadSize: "uint32_t",
      writerPayloadSize: "uint32_t",
      mutation_tries: "uint32_t",
      flow_controller_name: "string",
    },
  },
};

// Export individual setting groups for easier access
export const qosSettings = {
  flowControllers: {
    schedulerPolicy: {
      values: [
        "FIFO_SCHED_POLICY",
        "ROUND_ROBIN_SCHED_POLICY",
        "HIGH_PRIORITY_SCHED_POLICY",
        "PRIORITY_WITH_RESERVATION_SCHED_POLICY",
      ],
      default: "FIFO_SCHED_POLICY",
      description: "Flow controller scheduler policy",
    },
    default: {
      name: "",
      scheduler: "FIFO_SCHED_POLICY",
      max_bytes_per_period: 0, // 0 means infinite
      period_ms: 100,
      sender_thread: null, // Uses threadSettings.default when needed
    },
    descriptions: {
      name: "Name of the flow controller",
      scheduler: "Scheduler policy for the flow controller",
      max_bytes_per_period:
        "Maximum number of bytes to send per period (0 for infinite)",
      period_ms: "Period in milliseconds for the flow controller",
      sender_thread: "Thread settings for the sender thread",
    },
    types: {
      name: "string",
      scheduler: "FlowControllerSchedulerPolicy",
      max_bytes_per_period: "int32_t",
      period_ms: "uint64_t",
      sender_thread: "ThreadSettings",
    },
  },
  historyQos: {
    kind: {
      values: ["KEEP_LAST", "KEEP_ALL"],
      default: "KEEP_LAST",
      descriptions: {
        KEEP_LAST:
          "Fast DDS will only attempt to keep the latest values of the instance and discard the older ones",
        KEEP_ALL:
          "Fast DDS will attempt to maintain and deliver all the values of the instance to existing DataReaders",
      },
    },
    default: {
      kind: "KEEP_LAST",
      depth: 1,
    },
    descriptions: {
      kind: "History QoS kind policy",
      depth:
        "History depth. Must be consistent with ResourceLimitsQos max_samples_per_instance (depth <= max_samples_per_instance)",
    },
    types: {
      kind: "HistoryQosPolicyKind",
      depth: "uint32_t",
    },
  },
  resourceLimitsQos: {
    default: {
      max_samples: 5000,
      max_instances: 10,
      max_samples_per_instance: 400,
      allocated_samples: 100,
      extra_samples: 1,
    },
    descriptions: {
      max_samples:
        "Maximum number of samples. Must verify that: max_samples >= max_samples_per_instance",
      max_instances: "Maximum number of instances",
      max_samples_per_instance:
        "Maximum samples per instance. Must verify that: HistoryQos depth <= max_samples_per_instance",
      allocated_samples: "Controls the maximum number of samples to be stored",
      extra_samples: "Number of extra samples to allocate on the pool",
    },
    types: {
      max_samples: "int32_t",
      max_instances: "int32_t",
      max_samples_per_instance: "int32_t",
      allocated_samples: "int32_t",
      extra_samples: "int32_t",
    },
    validation: {
      // max_samples >= max_samples_per_instance
      // depth <= max_samples_per_instance
    },
  },
};
export const transportSettings = {
  builtinTransports: {
    values: ["DEFAULT", "DEFAULTv6", "SHM", "UDPv4", "UDPv6", "LARGE_DATA"],
    default: "DEFAULT",
    description:
      "Configuration option to determine which transports will be instantiated if useBuiltinTransports is true",
  },
  transportDescriptor: {
    default: {
      transport_id: "",
      type: "UDPv4",
      sendBufferSize: 0,
      receiveBufferSize: 0,
      maxMessageSize: 65500,
      maxInitialPeersRange: 4,
      netmask_filter: "AUTO",
      interfaces: {
        allowlist: [], // Array of {name: string, netmask_filter?: string}
        blocklist: [], // Array of {name: string}
      },
      interfaceWhiteList: [], // Array of {address: string, interface: string}
      TTL: 1,
      non_blocking_send: false,
      output_port: 0,
      wan_addr: "",
      keep_alive_frequency_ms: 50000,
      keep_alive_timeout_ms: 10000,
      max_logical_port: 100,
      logical_port_range: 20,
      logical_port_increment: 2,
      listening_ports: [],
      tls: {
        password: "",
        private_key_file: "",
        rsa_private_key_file: "",
        cert_chain_file: "",
        tmp_dh_file: "",
        verify_file: "",
        verify_mode: [],
        options: [],
        verify_paths: [],
        verify_depth: 0,
        default_verify_path: false,
        handshake_role: "DEFAULT",
        server_name: "",
      },
      calculate_crc: true,
      check_crc: true,
      enable_tcp_nodelay: false,
      tcp_negotiation_timeout: 0,
      segment_size: 262144,
      port_queue_capacity: 512,
      healthy_check_timeout_ms: 1000,
      rtps_dump_file: "",
    },
    descriptions: {
      transport_id: "Unique name to identify each transport descriptor",
      type: "Type of the transport descriptor",
      sendBufferSize:
        "Size in bytes of the send socket buffer. If the value is zero then Fast DDS will use the system default socket size",
      receiveBufferSize:
        "Size in bytes of the reception socket buffer. If the value is zero then Fast DDS will use the system default socket size",
      maxMessageSize:
        "The maximum size in bytes of the transport's message buffer",
      maxInitialPeersRange:
        "Number of channels opened with each initial remote peer",
      netmask_filter: "Transport's Netmask filtering configuration",
      interfaces: "Allows defining an Interfaces configuration",
      interfaceWhiteList: "Allows defining an interfaces Whitelist",
      TTL: "Time To Live (UDP only)",
      non_blocking_send:
        "Whether to set the non-blocking send mode on the socket (NOT available for SHM type)",
      output_port:
        "Port used for output bound. If this field isn't defined, the output port will be random (UDP only)",
      wan_addr:
        "Public WAN address when using TCPv4 transports. This field is optional if the transport doesn't need to define a WAN address (TCPv4 only)",
      keep_alive_frequency_ms:
        "Frequency in milliseconds for sending RTCP keep-alive requests (TCP only)",
      keep_alive_timeout_ms:
        "Time in milliseconds since the last keep-alive request was sent to consider a connection as broken (TCP only)",
      max_logical_port:
        "The maximum number of logical ports to try during RTCP negotiations (TCP only)",
      logical_port_range:
        "The maximum number of logical ports per request to try during RTCP negotiations (TCP only)",
      logical_port_increment:
        "Increment between logical ports to try during RTCP negotiation (TCP only)",
      listening_ports:
        "Local port to work as TCP acceptor for input connections. If not set, the transport will work as TCP client only. If set to 0, an available port will be automatically assigned (TCP only)",
      tls: "Allows to define TLS related parameters and options (TCP only)",
      calculate_crc:
        "Calculates the Cyclic Redundancy Code (CRC) for error control (TCP only)",
      check_crc: "Check the CRC for error control (TCP only)",
      enable_tcp_nodelay:
        "Socket option for disabling the Nagle algorithm. (TCP only)",
      tcp_negotiation_timeout:
        "Time to wait for logical port negotiation (in ms) (TCP only)",
      segment_size:
        "Size (in bytes) of the shared-memory segment. (Optional, SHM only)",
      port_queue_capacity:
        "Capacity (in number of messages) available to every Listener (Optional, SHM only)",
      healthy_check_timeout_ms:
        "Maximum time-out (in milliseconds) used when checking whether a Listener is alive (Optional, SHM only)",
      rtps_dump_file:
        "Complete path (including file) where RTPS messages will be stored for debugging purposes. An empty string indicates no trace will be performed (Optional, SHM only)",
    },
    types: {
      transport_id: "string",
      type: "TransportType",
      sendBufferSize: "uint32_t",
      receiveBufferSize: "uint32_t",
      maxMessageSize: "uint32_t",
      maxInitialPeersRange: "uint32_t",
      netmask_filter: "NetmaskFilterKind",
      interfaces: "InterfacesConfiguration",
      interfaceWhiteList: "InterfaceWhitelist",
      TTL: "uint8_t",
      non_blocking_send: "bool",
      output_port: "uint16_t",
      wan_addr: "string",
      keep_alive_frequency_ms: "uint32_t",
      keep_alive_timeout_ms: "uint32_t",
      max_logical_port: "uint16_t",
      logical_port_range: "uint16_t",
      logical_port_increment: "uint16_t",
      listening_ports: "List<uint16_t>",
      tls: "TLSConfiguration",
      calculate_crc: "bool",
      check_crc: "bool",
      enable_tcp_nodelay: "bool",
      tcp_negotiation_timeout: "uint32_t",
      segment_size: "uint32_t",
      port_queue_capacity: "uint32_t",
      healthy_check_timeout_ms: "uint32_t",
      rtps_dump_file: "string",
    },
    transportTypes: {
      values: ["UDPv4", "UDPv6", "TCPv4", "TCPv6", "SHM"],
      default: "UDPv4",
      description: "Available transport types",
    },
    netmaskFilterValues: {
      values: ["OFF", "AUTO", "ON"],
      default: "AUTO",
      description: "Netmask filter options for transport",
    },
    // Field availability by transport type
    fieldAvailability: {
      UDP: ["TTL", "non_blocking_send", "output_port"],
      TCP: [
        "wan_addr",
        "keep_alive_frequency_ms",
        "keep_alive_timeout_ms",
        "max_logical_port",
        "logical_port_range",
        "logical_port_increment",
        "listening_ports",
        "tls",
        "calculate_crc",
        "check_crc",
        "enable_tcp_nodelay",
        "tcp_negotiation_timeout",
      ],
      SHM: [
        "segment_size",
        "port_queue_capacity",
        "healthy_check_timeout_ms",
        "rtps_dump_file",
      ],
      TCPv4: ["wan_addr"],
    },
  },
  // Interface configuration
  interfacesConfiguration: {
    default: {
      allowlist: [],
      blocklist: [],
    },
    interface: {
      default: {
        name: "",
        netmask_filter: "AUTO",
      },
      descriptions: {
        name: "Network interface name",
        netmask_filter: "Netmask filter for this specific interface",
      },
    },
  },
  // Interface whitelist configuration
  interfaceWhiteList: {
    default: {
      address: "",
      interface: "",
    },
    descriptions: {
      address: "IP address to whitelist",
      interface: "Interface name to whitelist",
    },
  },
};
export const rtpsSettings = {
  default: {
    name: "",
    defaultUnicastLocatorList: [],
    defaultMulticastLocatorList: [],
    default_external_unicast_locators: [],
    ignore_non_matching_locators: false,
    sendSocketBufferSize: 0, // 0 means system default
    listenSocketBufferSize: 0, // 0 means system default
    netmask_filter: "AUTO",
    participantID: -1, // -1 means auto-generated
    easy_mode_ip: "",
    userTransports: [],
    useBuiltinTransports: true,
    builtinTransports: "DEFAULT",
    userData: { value: "" },
    prefix: "",
  },
  descriptions: {
    name: "The DomainParticipant's name",
    defaultUnicastLocatorList:
      "List of default reception unicast locators for user data traffic",
    defaultMulticastLocatorList:
      "List of default reception multicast locators for user data traffic",
    default_external_unicast_locators:
      "List of External Locators to announce for the default user traffic of this participant",
    ignore_non_matching_locators:
      "Whether to ignore locators received on announcements from other participants when they don't match with any of the locators announced by this participant",
    sendSocketBufferSize:
      "Size in bytes of the send socket buffer. If the value is zero then Fast DDS will use the system default socket size",
    listenSocketBufferSize:
      "Size in bytes of the reception socket buffer. If the value is zero then Fast DDS will use the system default socket size",
    netmask_filter: "Participant's netmask filtering configuration",
    participantID:
      "DomainParticipant's identifier. Typically it will be automatically generated by the DomainParticipantFactory",
    easy_mode_ip:
      "IP address of the remote discovery server to connect to using Discovery Server Easy Mode",
    userTransports: "Transport descriptors to be used by the DomainParticipant",
    useBuiltinTransports:
      "Boolean field to indicate whether the DomainParticipant will use the default builtin transports in addition to its userTransports",
    builtinTransports:
      "Configuration option to determine which transports will be instantiated if useBuiltinTransports is set to true",
    userData:
      "Additional information attached to the DomainParticipant and transmitted with the discovery information",
    prefix:
      "DomainParticipant's GuidPrefix_t identifies peers running in the same process",
  },
  netmaskFilterKind: {
    values: ["OFF", "AUTO", "ON"],
    default: "AUTO",
    descriptions: {
      OFF: "No netmask filtering",
      AUTO: "Automatic netmask filtering based on network interfaces",
      ON: "Force netmask filtering",
    },
  },
  port: {
    default: {
      portBase: 7400,
      domainIDGain: 250,
      participantIDGain: 2,
      offsetd0: 0,
      offsetd1: 10,
      offsetd2: 1,
      offsetd3: 11,
    },
    descriptions: {
      portBase: "Base port for RTPS communication",
      domainIDGain: "Port increment for each domain ID",
      participantIDGain: "Port increment for each participant ID",
      offsetd0: "Multicast metadata offset",
      offsetd1: "Unicast metadata offset",
      offsetd2: "Multicast user data offset",
      offsetd3: "Unicast user data offset",
    },
  },
  types: {
    name: "string",
    defaultUnicastLocatorList: "LocatorList",
    defaultMulticastLocatorList: "LocatorList",
    default_external_unicast_locators: "ExternalLocatorList",
    ignore_non_matching_locators: "bool",
    sendSocketBufferSize: "uint32_t",
    listenSocketBufferSize: "uint32_t",
    netmask_filter: "NetmaskFilterKind",
    participantID: "int32_t",
    easy_mode_ip: "string",
    userTransports: "List<TransportDescriptor>",
    useBuiltinTransports: "bool",
    builtinTransports: "BuiltinTransports",
    userData: "UserData",
    prefix: "string",
  },
  threadNames: [
    "builtin_controllers_sender_thread",
    "timed_events_thread",
    "discovery_server_thread",
    "typelookup_service_thread",
    "builtin_transports_reception_threads",
    "security_log_thread",
  ],
};
// UserData structure
export const userDataSettings = {
  default: {
    value: "",
  },
  descriptions: {
    value: "The user data value to be transmitted with discovery information",
  },
  types: {
    value: "string",
  },
};
export const propertiesPolicy = {
  property: {
    default: {
      name: "",
      value: "",
      propagate: false,
    },
    descriptions: {
      name: "Name to identify the property",
      value: "Property's value",
      propagate:
        "Indicates if it is going to be serialized along with the object it belongs to",
    },
    types: {
      name: "string",
      value: "string",
      propagate: "bool",
    },
  },
  description:
    "Allows the user to define a set of generic properties. Useful for extended or custom configuration parameters",
};
export const discoverySettings = {
  discoveryProtocol: {
    values: ["SIMPLE", "CLIENT", "SERVER", "BACKUP", "SUPER_CLIENT", "NONE"],
    default: "SIMPLE",
    description:
      "Indicates which discovery protocol the DomainParticipant will use",
  },
  ignoreParticipantFlags: {
    values: [
      "NO_FILTER",
      "FILTER_DIFFERENT_HOST",
      "FILTER_DIFFERENT_PROCESS",
      "FILTER_SAME_PROCESS",
    ],
    default: "NO_FILTER",
    descriptions: {
      NO_FILTER: "All Discovery traffic is processed",
      FILTER_DIFFERENT_HOST: "Discovery traffic from another host is discarded",
      FILTER_DIFFERENT_PROCESS:
        "Discovery traffic from another process on the same host is discarded",
      FILTER_SAME_PROCESS:
        "Discovery traffic from DomainParticipant's own process is discarded",
    },
  },
  EDP: {
    values: ["SIMPLE", "STATIC"],
    default: "SIMPLE",
    description:
      "If set to SIMPLE, simpleEDP element would be used. If set to STATIC, EDPStatic will be performed",
  },
  simpleEDP: {
    default: {
      PUBWRITER_SUBREADER: true,
      PUBREADER_SUBWRITER: true,
    },
    descriptions: {
      PUBWRITER_SUBREADER:
        "Indicates if the participant must use Publication DataWriter and Subscription DataReader",
      PUBREADER_SUBWRITER:
        "Indicates if the participant must use Publication DataReader and Subscription DataWriter",
    },
  },
  durationType: {
    default: {
      sec: 0,
      nanosec: 0,
    },
    descriptions: {
      sec: "Number of seconds (int32_t)",
      nanosec: "Number of nanoseconds (uint32_t)",
    },
    infinityValues: [
      "DURATION_INFINITY",
      "DURATION_INFINITE_SEC",
      "DURATION_INFINITE_NSEC",
    ],
  },
  initialAnnouncements: {
    default: {
      count: 5,
      period: {
        sec: 0,
        nanosec: 100000000, // 100ms in nanoseconds
      },
    },
    descriptions: {
      count:
        "Number of initial discovery messages to send at the period specified by period",
      period:
        "The period for the DomainParticipant to send its discovery messages",
    },
  },
  // Default durations for various discovery timings
  defaultDurations: {
    leaseDuration: {
      sec: 20,
      nanosec: 0,
    },
    leaseAnnouncement: {
      sec: 3,
      nanosec: 0,
    },
    clientAnnouncementPeriod: {
      sec: 0,
      nanosec: 450000000, // 450ms in nanoseconds
    },
  },
  staticEDP: {
    description:
      "The XML filename(s) with the static EDP configuration. Only necessary if the EDP member is set to STATIC",
    type: "List<string>",
    default: [],
    example: [
      "file://filename1.xml",
      "file://filename2.xml",
      "file://filename3.xml",
    ],
  },
  discoveryServersList: {
    description: "List of locators for discovery servers. Used when discoveryProtocol is set to SERVER or CLIENT",
    type: "List<Locator>",
    default: [],
  },
};
export const threadSettings = {
  default: {
    scheduling_policy: -1,
    priority: 0,
    affinity: 0,
    stack_size: -1,
  },
  descriptions: {
    scheduling_policy:
      "Thread scheduling policy (-1 for system default, 0 for SCHED_OTHER, 1 for SCHED_FIFO, 2 for SCHED_RR)",
    priority:
      "Thread priority (0 for default, higher values for higher priority)",
    affinity: "CPU affinity mask (0 for no affinity)",
    stack_size: "Thread stack size in bytes (-1 for system default)",
  },
};
export const memorySettings = {
  historyMemoryPolicy: {
    values: [
      "PREALLOCATED",
      "PREALLOCATED_WITH_REALLOC",
      "DYNAMIC",
      "DYNAMIC_REUSABLE",
    ],
    default: "PREALLOCATED",
    description: "Memory management policy for history",
    descriptions: {
      PREALLOCATED: "Memory is preallocated based on configuration limits",
      PREALLOCATED_WITH_REALLOC:
        "Memory is preallocated but can be reallocated if needed",
      DYNAMIC: "Memory is allocated dynamically as needed",
      DYNAMIC_REUSABLE:
        "Memory is allocated dynamically and reused when possible",
    },
  },
  remoteLocatorsAllocation: {
    default: {
      max_unicast_locators: 4,
      max_multicast_locators: 1,
    },
    descriptions: {
      max_unicast_locators:
        "Maximum number of unicast locators expected on a remote entity. It is recommended to use the maximum number of network interfaces available on the machine on which DomainParticipant is running",
      max_multicast_locators:
        "Maximum number of multicast locators expected on a remote entity. May be set to zero to disable multicast traffic",
    },
    types: {
      max_unicast_locators: "uint32_t",
      max_multicast_locators: "uint32_t",
    },
  },
  allocationConfiguration: {
    default: {
      initial: 0,
      maximum: 0, // 0 means no limit
      increment: 1,
    },
    descriptions: {
      initial: "Number of elements for which space is initially allocated",
      maximum:
        "Maximum number of elements for which space will be allocated (0 means no limit)",
      increment:
        "Number of new elements that will be allocated when more space is necessary",
    },
    types: {
      initial: "uint32_t",
      maximum: "uint32_t",
      increment: "uint32_t",
    },
    usedFor: [
      "total_participants",
      "total_readers",
      "total_writers",
      "send_buffers",
      "discovered_participants",
    ],
  },
  sendBuffersAllocation: {
    default: {
      preallocated_number: 0,
      dynamic: false,
      // network_buffers_config is not supported in XML format
      // Only available in C++ API
    },
    descriptions: {
      preallocated_number: "Initial number of send buffers to allocate",
      dynamic: "Whether the number of send buffers is allowed to grow",
    },
    types: {
      preallocated_number: "uint32_t",
      dynamic: "bool",
    },
  },
};
export const networkSettings = {
  locator: {
    default: {
      port: 0,
      physical_port: 0,
      address: "",
      unique_lan_id: "",
      wan_address: "0.0.0.0",
    },
    descriptions: {
      port: "RTPS port number of the locator. Physical port in UDP, logical port in TCP",
      physical_port: "TCP's physical port",
      address: "IP address of the locator (IPv4/IPv6 format or DNS name)",
      unique_lan_id:
        "The LAN ID uniquely identifies the LAN the locator belongs to (TCPv4 only, 16 bytes)",
      wan_address: "WAN IPv4 address (TCPv4 only)",
    },
    types: {
      port: "uint16_t",
      physical_port: "uint16_t",
      address: "string",
      unique_lan_id: "string",
      wan_address: "string",
    },
  },
  locatorKinds: ["udpv4", "udpv6", "tcpv4", "tcpv6"],
  // Common locator list types used in FastDDS
  locatorListTypes: [
    "defaultUnicastLocatorList",
    "defaultMulticastLocatorList",
    "unicastLocatorList",
    "multicastLocatorList",
    "metatrafficUnicastLocatorList",
    "metatrafficMulticastLocatorList",
    "initialPeersList",
  ],
  // External locator settings
  externalLocator: {
    default: {
      externality: 1,
      cost: 0,
      mask: {
        udpv4: 24,
        udpv6: 48,
      },
      port: 0,
      address: "",
    },
    descriptions: {
      externality:
        "Number of hops from the participant's host to the LAN represented by the external locator. Valid values: from 1 to 255",
      cost: "Communication cost relative to other locators on the same externality level. Valid values: from 0 to 255",
      mask: "Number of significant bits on the LAN represented by the external locator. Valid values: from 1 to 31 (UDPv4) or 127 (UDPv6)",
      port: "UDP port number of the locator. The UDP port number should be valid",
      address: "IP address of the locator (IPv4/IPv6 format or DNS name)",
    },
    types: {
      externality: "uint8_t",
      cost: "uint8_t",
      mask: "uint8_t",
      port: "uint16_t",
      address: "string",
    },
    validation: {
      externality: { min: 1, max: 255 },
      cost: { min: 0, max: 255 },
      mask: {
        udpv4: { min: 1, max: 31 },
        udpv6: { min: 1, max: 127 },
      },
    },
  },
  // External locator list types
  externalLocatorListTypes: ["default_external_unicast_locators"],
};
export const securitySettings = {};

export const tlsSettings = {
  default: {
    password: "",
    private_key_file: "",
    rsa_private_key_file: "",
    cert_chain_file: "",
    tmp_dh_file: "",
    verify_file: "",
    verify_mode: [],
    options: [],
    verify_paths: [],
    verify_depth: 0,
    default_verify_path: false,
    handshake_role: "DEFAULT",
    server_name: "",
  },
  descriptions: {
    password:
      "Password of the <private_key_file> or <rsa_private_key_file> if provided",
    private_key_file: "Path to the private key certificate file",
    rsa_private_key_file: "Path to the private key RSA certificate file",
    cert_chain_file: "Path to the public certificate chain file",
    tmp_dh_file: "Path to the Diffie-Hellman parameters file",
    verify_file: "Path to the Certification Authority (CA) file",
    verify_mode:
      "Establishes the verification mode mask. Several verification options can be combined in the same <transport_descriptor>",
    options:
      "Establishes the SSL Context options mask. Several options can be combined in the same <transport_descriptor>",
    verify_paths: "Paths where the system will look for verification files",
    verify_depth: "Maximum allowed depth to verify intermediate certificates",
    default_verify_path:
      "Specifies whether the system will look on the default paths for the verification files",
    handshake_role:
      "Role that the transport will take on handshaking. On default, the acceptors act as SERVER and the connectors as CLIENT",
    server_name:
      "server name or host name required in case Server Name Indication (SNI) is used",
  },
  types: {
    password: "string",
    private_key_file: "string",
    rsa_private_key_file: "string",
    cert_chain_file: "string",
    tmp_dh_file: "string",
    verify_file: "string",
    verify_mode: "List<TLSVerifyMode>",
    options: "List<TLSOptions>",
    verify_paths: "List<string>",
    verify_depth: "uint32_t",
    default_verify_path: "bool",
    handshake_role: "TLSHandshakeRole",
    server_name: "string",
  },
  verifyModes: {
    values: [
      "VERIFY_NONE",
      "VERIFY_PEER",
      "VERIFY_FAIL_IF_NO_PEER_CERT",
      "VERIFY_CLIENT_ONCE",
    ],
    description: "TLS verification mode options",
  },
  options: {
    values: [
      "DEFAULT_WORKAROUNDS",
      "NO_COMPRESSION",
      "NO_SSLV2",
      "NO_SSLV3",
      "NO_TLSV1",
      "NO_TLSV1_1",
      "NO_TLSV1_2",
      "NO_TLSV1_3",
      "SINGLE_DH_USE",
    ],
    description: "SSL Context options",
  },
  handshakeRoles: {
    values: ["DEFAULT", "SERVER", "CLIENT"],
    default: "DEFAULT",
    description: "TLS handshake role options",
  },
};
