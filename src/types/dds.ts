export type DDSVendor = 'fastdds' | 'cyclonedds' | 'zenoh';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'array' | 'object';
  value: any;
  defaultValue: any;
  required: boolean;
  options?: string[];
  fields?: FormField[];
  description?: string;
  path: string[];
  forceInclude?: boolean; // Flag to force include this field even in minimal mode
}

export interface DDSConfig {
  vendor: DDSVendor;
  fields: FormField[];
  rawXml?: string;
}

export interface FastDDSProfile {
  transport_descriptors?: TransportDescriptor[];
  participant?: ParticipantProfile;
  data_writer?: DataWriterProfile;
  data_reader?: DataReaderProfile;
  topic?: TopicProfile;
}

export interface TransportDescriptor {
  transport_id?: string;
  type?: string;
  sendBufferSize?: number;
  receiveBufferSize?: number;
  TTL?: number;
  maxMessageSize?: number;
  maxInitialPeersRange?: number;
  interfaceWhiteList?: string[];
  wan_addr?: string;
}

export interface ParticipantProfile {
  profile_name?: string;
  domainId?: number;
  rtps?: {
    name?: string;
    defaultUnicastLocatorList?: LocatorList;
    defaultMulticastLocatorList?: LocatorList;
    sendSocketBufferSize?: number;
    listenSocketBufferSize?: number;
    builtin?: {
      discovery_config?: {
        discoveryProtocol?: string;
        ignoreParticipantFlags?: string;
        EDP?: string;
        leaseDuration?: Duration;
        leaseAnnouncement?: Duration;
      };
      use_WriterLivelinessProtocol?: boolean;
    };
  };
  userTransports?: string[];
}

export interface DataWriterProfile {
  profile_name?: string;
  topic?: {
    historyQos?: HistoryQos;
    resourceLimitsQos?: ResourceLimitsQos;
    durabilityQos?: DurabilityQos;
    liveliness?: LivelinessQos;
  };
  qos?: {
    reliability?: ReliabilityQos;
    publishMode?: PublishModeQos;
  };
}

export interface DataReaderProfile {
  profile_name?: string;
  topic?: {
    historyQos?: HistoryQos;
    resourceLimitsQos?: ResourceLimitsQos;
    durabilityQos?: DurabilityQos;
  };
  qos?: {
    reliability?: ReliabilityQos;
  };
}

export interface TopicProfile {
  profile_name?: string;
  historyQos?: HistoryQos;
  resourceLimitsQos?: ResourceLimitsQos;
}

export interface CycloneDDSConfig {
  domain?: {
    id?: string;
    general?: {
      interfaces?: {
        name?: string;
        autodetermine?: boolean;
        priority?: string;
        multicast?: boolean;
      };
      allowMulticast?: string;
      maxMessageSize?: string;
      fragmentSize?: string;
    };
    discovery?: {
      peers?: string[];
      maxAutoParticipantIndex?: number;
    };
    tracing?: {
      enable?: boolean;
      verbosity?: string;
      outputFile?: string;
    };
  };
}

interface LocatorList {
  locator?: Locator[];
}

interface Locator {
  kind?: string;
  address?: string;
  port?: number;
}

interface Duration {
  sec?: number;
  nanosec?: number;
}

interface HistoryQos {
  kind?: string;
  depth?: number;
}

interface ResourceLimitsQos {
  max_samples?: number;
  max_instances?: number;
  max_samples_per_instance?: number;
  allocated_samples?: number;
}

interface DurabilityQos {
  kind?: string;
}

interface LivelinessQos {
  kind?: string;
  lease_duration?: Duration;
  announcement_period?: Duration;
}

interface ReliabilityQos {
  kind?: string;
  max_blocking_time?: Duration;
}

interface PublishModeQos {
  kind?: string;
}