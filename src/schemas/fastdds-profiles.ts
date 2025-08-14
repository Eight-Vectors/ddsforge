/**
 * FastDDS Default Profiles
 * This file contains default profile configurations for FastDDS
 * Settings are imported from fastdds-settings.ts for reusability
 */

import {
  threadSettings,
  networkSettings,
  discoverySettings,
  qosSettings,
  memorySettings,
  fastDDSSettings,
  propertiesPolicy,
  rtpsSettings,
  transportSettings,
} from "./fastdds-settings";

// Helper function to create an empty locator list
// In FastDDS, empty locator lists must be represented as {locator: {}}
export const createEmptyLocatorList = () => ({ locator: {} });

// Helper function to create a locator with specific transport
export const createLocator = (kind: string, settings: any) => {
  const locator: any = {};
  locator[kind] = { ...networkSettings.locator.default, ...settings };
  return locator;
};

// Helper function to create an external locator
export const createExternalLocator = (
  kind: "udpv4" | "udpv6",
  settings: any
) => {
  const defaultMask =
    kind === "udpv4"
      ? networkSettings.externalLocator.default.mask.udpv4
      : networkSettings.externalLocator.default.mask.udpv6;

  return {
    [`@_externality`]:
      settings.externality ||
      networkSettings.externalLocator.default.externality,
    [`@_cost`]: settings.cost || networkSettings.externalLocator.default.cost,
    [`@_mask`]: settings.mask || defaultMask,
    address:
      settings.address || networkSettings.externalLocator.default.address,
    port: settings.port || networkSettings.externalLocator.default.port,
  };
};

// Helper function to create a duration type
export const createDuration = (
  sec: number | string = 0,
  nanosec: number = 0
) => {
  // Handle infinity values
  if (
    typeof sec === "string" &&
    discoverySettings.durationType.infinityValues.includes(sec)
  ) {
    return { sec };
  }
  return {
    sec,
    nanosec,
  };
};

// Helper function to create default discovery config
export const createDefaultDiscoveryConfig = () => ({
  discoveryProtocol: discoverySettings.discoveryProtocol.default,
  ignoreParticipantFlags: discoverySettings.ignoreParticipantFlags.default,
  EDP: discoverySettings.EDP.default,
  simpleEDP: { ...discoverySettings.simpleEDP.default },
  leaseDuration: createDuration(
    discoverySettings.defaultDurations.leaseDuration.sec,
    discoverySettings.defaultDurations.leaseDuration.nanosec
  ),
  leaseAnnouncement: createDuration(
    discoverySettings.defaultDurations.leaseAnnouncement.sec,
    discoverySettings.defaultDurations.leaseAnnouncement.nanosec
  ),
  initialAnnouncements: {
    count: discoverySettings.initialAnnouncements.default.count,
    period: createDuration(
      discoverySettings.initialAnnouncements.default.period.sec,
      discoverySettings.initialAnnouncements.default.period.nanosec
    ),
  },
  clientAnnouncementPeriod: createDuration(
    discoverySettings.defaultDurations.clientAnnouncementPeriod.sec,
    discoverySettings.defaultDurations.clientAnnouncementPeriod.nanosec
  ),
  // static_edp_xml_config is an array, empty by default
  static_edp_xml_config: discoverySettings.staticEDP.default,
  // discoveryServersList is an array of locators for discovery servers
  discoveryServersList: [],
});

// Helper function to create a flow controller configuration
export const createFlowController = (name: string, overrides: any = {}) => ({
  name: name || qosSettings.flowControllers.default.name,
  scheduler:
    overrides.scheduler || qosSettings.flowControllers.default.scheduler,
  max_bytes_per_period:
    overrides.max_bytes_per_period !== undefined
      ? overrides.max_bytes_per_period
      : qosSettings.flowControllers.default.max_bytes_per_period,
  period_ms:
    overrides.period_ms || qosSettings.flowControllers.default.period_ms,
  sender_thread: overrides.sender_thread || threadSettings.default,
});

// Helper function to create builtin configuration
export const createBuiltinConfig = (overrides: any = {}) => {
  const builtin: any = {
    avoid_builtin_multicast:
      overrides.avoid_builtin_multicast !== undefined
        ? overrides.avoid_builtin_multicast
        : fastDDSSettings.builtin.default.avoid_builtin_multicast,
    use_WriterLivelinessProtocol:
      overrides.use_WriterLivelinessProtocol !== undefined
        ? overrides.use_WriterLivelinessProtocol
        : fastDDSSettings.builtin.default.use_WriterLivelinessProtocol,
    readerHistoryMemoryPolicy:
      overrides.readerHistoryMemoryPolicy ||
      fastDDSSettings.builtin.default.readerHistoryMemoryPolicy,
    writerHistoryMemoryPolicy:
      overrides.writerHistoryMemoryPolicy ||
      fastDDSSettings.builtin.default.writerHistoryMemoryPolicy,
    readerPayloadSize:
      overrides.readerPayloadSize ||
      fastDDSSettings.builtin.default.readerPayloadSize,
    writerPayloadSize:
      overrides.writerPayloadSize ||
      fastDDSSettings.builtin.default.writerPayloadSize,
    mutation_tries:
      overrides.mutation_tries ||
      fastDDSSettings.builtin.default.mutation_tries,
  };

  // Add discovery_config if provided
  if (overrides.discovery_config) {
    builtin.discovery_config = overrides.discovery_config;
  } else {
    // Use default discovery config
    builtin.discovery_config = createDefaultDiscoveryConfig();
  }

  // Add locator lists only if provided (empty by default)
  if (
    overrides.metatrafficUnicastLocatorList &&
    overrides.metatrafficUnicastLocatorList.length > 0
  ) {
    builtin.metatrafficUnicastLocatorList =
      overrides.metatrafficUnicastLocatorList;
  } else {
    builtin.metatrafficUnicastLocatorList = createEmptyLocatorList();
  }

  if (
    overrides.metatrafficMulticastLocatorList &&
    overrides.metatrafficMulticastLocatorList.length > 0
  ) {
    builtin.metatrafficMulticastLocatorList =
      overrides.metatrafficMulticastLocatorList;
  } else {
    builtin.metatrafficMulticastLocatorList = createEmptyLocatorList();
  }

  if (overrides.initialPeersList && overrides.initialPeersList.length > 0) {
    builtin.initialPeersList = overrides.initialPeersList;
  } else {
    builtin.initialPeersList = createEmptyLocatorList();
  }

  // Add external locators if provided
  if (overrides.metatraffic_external_unicast_locators) {
    builtin.metatraffic_external_unicast_locators =
      overrides.metatraffic_external_unicast_locators;
  }

  // Add flow controller name if provided
  if (overrides.flow_controller_name) {
    builtin.flow_controller_name = overrides.flow_controller_name;
  }

  return builtin;
};

// Helper function to create a property
export const createProperty = (
  name: string,
  value: string,
  propagate: boolean = false
) => ({
  name,
  value,
  propagate,
});

// Helper function to create a properties policy
export const createPropertiesPolicy = (
  properties: Array<{ name: string; value: string; propagate?: boolean }> = []
) => {
  if (properties.length === 0) {
    // Return empty properties element (will be rendered as <properties/>)
    return {
      properties: {},
    };
  }

  return {
    properties: {
      property: properties.map((p) =>
        createProperty(p.name, p.value, p.propagate || false)
      ),
    },
  };
};

// Helper function to create remote locators allocation
export const createRemoteLocatorsAllocation = (overrides: any = {}) => ({
  max_unicast_locators:
    overrides.max_unicast_locators ||
    memorySettings.remoteLocatorsAllocation.default.max_unicast_locators,
  max_multicast_locators:
    overrides.max_multicast_locators !== undefined
      ? overrides.max_multicast_locators
      : memorySettings.remoteLocatorsAllocation.default.max_multicast_locators,
});

// Helper function to create allocation configuration
export const createAllocationConfig = (overrides: any = {}) => ({
  initial:
    overrides.initial !== undefined
      ? overrides.initial
      : memorySettings.allocationConfiguration.default.initial,
  maximum:
    overrides.maximum !== undefined
      ? overrides.maximum
      : memorySettings.allocationConfiguration.default.maximum,
  increment:
    overrides.increment ||
    memorySettings.allocationConfiguration.default.increment,
});

// Helper function to create send buffers configuration
export const createSendBuffersConfig = (overrides: any = {}) => ({
  preallocated_number:
    overrides.preallocated_number !== undefined
      ? overrides.preallocated_number
      : memorySettings.sendBuffersAllocation.default.preallocated_number,
  dynamic:
    overrides.dynamic !== undefined
      ? overrides.dynamic
      : memorySettings.sendBuffersAllocation.default.dynamic,
  // Note: network_buffers_config is not supported in FastDDS XML format
  // It's only available in the C++ API
});

// Helper function to create port configuration
export const createPortConfig = (overrides: any = {}) => ({
  portBase: overrides.portBase || rtpsSettings.port.default.portBase,
  domainIDGain:
    overrides.domainIDGain || rtpsSettings.port.default.domainIDGain,
  participantIDGain:
    overrides.participantIDGain || rtpsSettings.port.default.participantIDGain,
  offsetd0:
    overrides.offsetd0 !== undefined
      ? overrides.offsetd0
      : rtpsSettings.port.default.offsetd0,
  offsetd1:
    overrides.offsetd1 !== undefined
      ? overrides.offsetd1
      : rtpsSettings.port.default.offsetd1,
  offsetd2:
    overrides.offsetd2 !== undefined
      ? overrides.offsetd2
      : rtpsSettings.port.default.offsetd2,
  offsetd3:
    overrides.offsetd3 !== undefined
      ? overrides.offsetd3
      : rtpsSettings.port.default.offsetd3,
});

// Helper function to create RTPS configuration
export const createRTPSConfig = (overrides: any = {}) => {
  const rtps: any = {
    name:
      overrides.name !== undefined ? overrides.name : rtpsSettings.default.name,
    sendSocketBufferSize:
      overrides.sendSocketBufferSize !== undefined
        ? overrides.sendSocketBufferSize
        : rtpsSettings.default.sendSocketBufferSize,
    listenSocketBufferSize:
      overrides.listenSocketBufferSize !== undefined
        ? overrides.listenSocketBufferSize
        : rtpsSettings.default.listenSocketBufferSize,
    builtin: overrides.builtin || createBuiltinConfig(),
    port: overrides.port || createPortConfig(),
    participantID:
      overrides.participantID !== undefined
        ? overrides.participantID
        : rtpsSettings.default.participantID,
    useBuiltinTransports:
      overrides.useBuiltinTransports !== undefined
        ? overrides.useBuiltinTransports
        : rtpsSettings.default.useBuiltinTransports,
    propertiesPolicy: overrides.propertiesPolicy || createPropertiesPolicy(),
    // Always include these fields with defaults
    defaultUnicastLocatorList:
      overrides.defaultUnicastLocatorList || createEmptyLocatorList(),
    defaultMulticastLocatorList:
      overrides.defaultMulticastLocatorList || createEmptyLocatorList(),
    ignore_non_matching_locators:
      overrides.ignore_non_matching_locators !== undefined
        ? overrides.ignore_non_matching_locators
        : rtpsSettings.default.ignore_non_matching_locators,
    netmask_filter:
      overrides.netmask_filter !== undefined
        ? overrides.netmask_filter
        : rtpsSettings.default.netmask_filter,
    builtinTransports:
      overrides.builtinTransports !== undefined
        ? overrides.builtinTransports
        : rtpsSettings.default.builtinTransports,
    userData:
      overrides.userData !== undefined
        ? overrides.userData
        : rtpsSettings.default.userData,
    prefix:
      overrides.prefix !== undefined
        ? overrides.prefix
        : rtpsSettings.default.prefix,
    easy_mode_ip:
      overrides.easy_mode_ip !== undefined
        ? overrides.easy_mode_ip
        : rtpsSettings.default.easy_mode_ip,
  };

  // Add default_external_unicast_locators if provided
  if (overrides.default_external_unicast_locators) {
    rtps.default_external_unicast_locators =
      overrides.default_external_unicast_locators;
  }

  // Always include userTransports field (empty array by default)
  rtps.userTransports = overrides.userTransports || [];

  // Add allocation if provided
  if (overrides.allocation) {
    rtps.allocation = overrides.allocation;
  }

  // Add thread settings if provided
  rtpsSettings.threadNames.forEach((threadName) => {
    if (overrides[threadName]) {
      rtps[threadName] = overrides[threadName];
    }
  });

  // Add flow controller descriptor list if provided
  if (overrides.flow_controller_descriptor_list) {
    rtps.flow_controller_descriptor_list =
      overrides.flow_controller_descriptor_list;
  }

  return rtps;
};

// Helper function to create HistoryQoS
export const createHistoryQos = (
  kind: string = qosSettings.historyQos.default.kind,
  depth: number = qosSettings.historyQos.default.depth
) => ({
  kind,
  depth,
});

// Helper function to create ResourceLimitsQos
export const createResourceLimitsQos = (overrides: any = {}) => ({
  max_samples:
    overrides.max_samples !== undefined
      ? overrides.max_samples
      : qosSettings.resourceLimitsQos.default.max_samples,
  max_instances:
    overrides.max_instances !== undefined
      ? overrides.max_instances
      : qosSettings.resourceLimitsQos.default.max_instances,
  max_samples_per_instance:
    overrides.max_samples_per_instance !== undefined
      ? overrides.max_samples_per_instance
      : qosSettings.resourceLimitsQos.default.max_samples_per_instance,
  allocated_samples:
    overrides.allocated_samples !== undefined
      ? overrides.allocated_samples
      : qosSettings.resourceLimitsQos.default.allocated_samples,
  extra_samples:
    overrides.extra_samples !== undefined
      ? overrides.extra_samples
      : qosSettings.resourceLimitsQos.default.extra_samples,
});

export const createParticipantProfile = (
  name: string,
  domainId: number = 0,
  rtpsConfig: any = {}
) => ({
  "@_profile_name": name,
  "@_is_default_profile": false,
  domainId: domainId,
  rtps: createRTPSConfig(rtpsConfig),
});

export const fastDDSProfiles = {
  domainparticipant_factory: {
    "@_profile_name": "domainparticipant_factory_profile_name",
    qos: {
      entity_factory: {
        autoenable_created_entities: true,
      },
      shm_watchdog_thread: threadSettings.default,
      file_watch_threads: threadSettings.default,
    },
  },
  // Default participant profile
  participant: createParticipantProfile("default_participant", 0, {
    name: "Default Domain Participant",
    builtin: createBuiltinConfig({
      discovery_config: createDefaultDiscoveryConfig(),
      avoid_builtin_multicast: false,
      use_WriterLivelinessProtocol: true,
    }),
    allocation: {
      remote_locators: createRemoteLocatorsAllocation(),
      total_participants: createAllocationConfig(),
      total_readers: createAllocationConfig(),
      total_writers: createAllocationConfig(),
      max_partitions: 256,
      max_user_data: 256,
      max_properties: 512,
      send_buffers: createSendBuffersConfig(),
    },
  }),
};

// Helper function to create a topic profile
export const createTopicProfile = (name: string, overrides: any = {}) => ({
  "@_profile_name": name,
  "@_is_default_profile": overrides.is_default_profile || false,
  historyQos: overrides.historyQos || createHistoryQos(),
  resourceLimitsQos: overrides.resourceLimitsQos || createResourceLimitsQos(),
});

// Export individual profiles for easier access
export const domainParticipantFactoryProfile =
  fastDDSProfiles.domainparticipant_factory;
export const defaultParticipantProfile = fastDDSProfiles.participant;

// Default topic profile
export const defaultTopicProfile = createTopicProfile("default_topic", {
  is_default_profile: false,
  historyQos: createHistoryQos("KEEP_LAST", 1),
  resourceLimitsQos: createResourceLimitsQos({
    max_samples: 5000,
    max_instances: 10,
    max_samples_per_instance: 400,
    allocated_samples: 100,
    extra_samples: 1,
  }),
});

// Helper function to create a transport descriptor
export const createTransportDescriptor = (
  id: string,
  type: string = "UDPv4",
  overrides: any = {}
) => {
  const descriptor: any = {
    transport_id: id,
    type: overrides.type || type,
    sendBufferSize:
      overrides.sendBufferSize !== undefined
        ? overrides.sendBufferSize
        : transportSettings.transportDescriptor.default.sendBufferSize,
    receiveBufferSize:
      overrides.receiveBufferSize !== undefined
        ? overrides.receiveBufferSize
        : transportSettings.transportDescriptor.default.receiveBufferSize,
    maxMessageSize:
      overrides.maxMessageSize !== undefined
        ? overrides.maxMessageSize
        : transportSettings.transportDescriptor.default.maxMessageSize,
    maxInitialPeersRange:
      overrides.maxInitialPeersRange !== undefined
        ? overrides.maxInitialPeersRange
        : transportSettings.transportDescriptor.default.maxInitialPeersRange,
    netmask_filter:
      overrides.netmask_filter !== undefined
        ? overrides.netmask_filter
        : transportSettings.transportDescriptor.default.netmask_filter,
  };

  // Add type-specific fields based on transport type
  if (type === "UDPv4" || type === "UDPv6") {
    descriptor.TTL =
      overrides.TTL !== undefined
        ? overrides.TTL
        : transportSettings.transportDescriptor.default.TTL;
    descriptor.non_blocking_send =
      overrides.non_blocking_send !== undefined
        ? overrides.non_blocking_send
        : transportSettings.transportDescriptor.default.non_blocking_send;
    descriptor.output_port =
      overrides.output_port !== undefined
        ? overrides.output_port
        : transportSettings.transportDescriptor.default.output_port;
  }

  if (type === "TCPv4" || type === "TCPv6") {
    descriptor.keep_alive_frequency_ms =
      overrides.keep_alive_frequency_ms !== undefined
        ? overrides.keep_alive_frequency_ms
        : transportSettings.transportDescriptor.default.keep_alive_frequency_ms;
    descriptor.keep_alive_timeout_ms =
      overrides.keep_alive_timeout_ms !== undefined
        ? overrides.keep_alive_timeout_ms
        : transportSettings.transportDescriptor.default.keep_alive_timeout_ms;
    descriptor.max_logical_port =
      overrides.max_logical_port !== undefined
        ? overrides.max_logical_port
        : transportSettings.transportDescriptor.default.max_logical_port;
    descriptor.logical_port_range =
      overrides.logical_port_range !== undefined
        ? overrides.logical_port_range
        : transportSettings.transportDescriptor.default.logical_port_range;
    descriptor.logical_port_increment =
      overrides.logical_port_increment !== undefined
        ? overrides.logical_port_increment
        : transportSettings.transportDescriptor.default.logical_port_increment;
    descriptor.listening_ports =
      overrides.listening_ports ||
      transportSettings.transportDescriptor.default.listening_ports;
    descriptor.tls =
      overrides.tls !== undefined
        ? overrides.tls
        : transportSettings.transportDescriptor.default.tls;
    descriptor.calculate_crc =
      overrides.calculate_crc !== undefined
        ? overrides.calculate_crc
        : transportSettings.transportDescriptor.default.calculate_crc;
    descriptor.check_crc =
      overrides.check_crc !== undefined
        ? overrides.check_crc
        : transportSettings.transportDescriptor.default.check_crc;
    descriptor.enable_tcp_nodelay =
      overrides.enable_tcp_nodelay !== undefined
        ? overrides.enable_tcp_nodelay
        : transportSettings.transportDescriptor.default.enable_tcp_nodelay;
    descriptor.tcp_negotiation_timeout =
      overrides.tcp_negotiation_timeout !== undefined
        ? overrides.tcp_negotiation_timeout
        : transportSettings.transportDescriptor.default.tcp_negotiation_timeout;

    if (type === "TCPv4") {
      descriptor.wan_addr =
        overrides.wan_addr !== undefined
          ? overrides.wan_addr
          : transportSettings.transportDescriptor.default.wan_addr;
    }
  }

  if (type === "SHM") {
    descriptor.segment_size =
      overrides.segment_size !== undefined
        ? overrides.segment_size
        : transportSettings.transportDescriptor.default.segment_size;
    descriptor.port_queue_capacity =
      overrides.port_queue_capacity !== undefined
        ? overrides.port_queue_capacity
        : transportSettings.transportDescriptor.default.port_queue_capacity;
    descriptor.healthy_check_timeout_ms =
      overrides.healthy_check_timeout_ms !== undefined
        ? overrides.healthy_check_timeout_ms
        : transportSettings.transportDescriptor.default
            .healthy_check_timeout_ms;
    descriptor.rtps_dump_file =
      overrides.rtps_dump_file !== undefined
        ? overrides.rtps_dump_file
        : transportSettings.transportDescriptor.default.rtps_dump_file;
  }

  // Add optional fields if provided
  if (overrides.interfaceWhiteList) {
    descriptor.interfaceWhiteList = overrides.interfaceWhiteList;
  }

  if (overrides.interfaces) {
    descriptor.interfaces = overrides.interfaces;
  }

  return descriptor;
};

// Default transport descriptor
export const defaultTransportDescriptor = createTransportDescriptor(
  "default_transport",
  "UDPv4"
);

// Topic profile structure
export const topicProfileStructure = {
  attributes: {
    profile_name: {
      description:
        "Sets the name under which the <topic> profile is registered in the DDS Domain, so that it can be loaded later by the DataWriter or the DataReader",
      use: "Mandatory",
      type: "string",
    },
    is_default_profile: {
      description:
        "Sets the <topic> profile as the default profile. Thus, if a default profile exists, it will be used when no other Topic profile is specified at the Topic's creation",
      use: "Optional",
      type: "boolean",
      default: false,
    },
  },
  configuration: {
    historyQos: {
      description:
        "It controls the behavior of Fast DDS when the value of an instance changes before it is finally communicated to some of its existing DataReaders",
      type: "HistoryQoS",
    },
    resourceLimitsQos: {
      description:
        "It controls the resources that Fast DDS can use in order to meet the requirements imposed by the application and other QoS settings",
      type: "ResourceLimitsQos",
    },
  },
};
