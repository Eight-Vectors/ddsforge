export const cycloneDDSSchema = {
  CycloneDDS: {
    "@_xmlns": "https://cdds.io/config",
    "@_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@_xsi:schemaLocation":
      "https://cdds.io/config https://raw.githubusercontent.com/eclipse-cyclonedds/cyclonedds/master/etc/cyclonedds.xsd",
    Domain: {
      "@_Id": "any",

      // Compatibility section
      Compatibility: {
        AssumeRtiHasPmdEndpoints: false,
        ExplicitlyPublishQosSetToDefault: false,
        ManySocketsMode: "single", 
        ProtocolVersion: "2.5",
        StandardsConformance: "lax", 
      },

      // Discovery section
      Discovery: {
        DSGracePeriod: "30s",
        DefaultMulticastAddress: "auto",
        DiscoveredLocatorPruneDelay: "60s",
        EnableTopicDiscoveryEndpoints: false,
        ExternalDomainId: "default",
        InitialLocatorPruneDelay: "30s",
        LeaseDuration: "10s",
        MaxAutoParticipantIndex: 99,
        ParticipantIndex: "default",
        Peers: {
          "@_AddLocalhost": "default",
          Peer: [], // Array of peer objects with Address attribute
        },
        Ports: {
          Base: "default",
          DomainGain: 250,
          MulticastDataOffset: 0,
          MulticastMetaOffset: 1,
          ParticipantGain: 2,
          UnicastDataOffset: 10,
          UnicastMetaOffset: 11,
        },
        SPDPInterval: "default",
        SPDPMulticastAddress: "239.255.0.1",
        Tag: "",
      },

      // General section
      General: {
        AllowMulticast: "default",
        DontRoute: false,
        EnableMulticastLoopback: true,
        EntityAutoNaming: false,
        ExternalNetworkAddress: "auto",
        ExternalNetworkMask: "0.0.0.0",
        FragmentSize: "1344B",
        Interfaces: {
          NetworkInterface: [], // Array of network interface configurations
        },
        MaxMessageSize: "14720B",
        MaxRexmitMessageSize: "1456B",
        MulticastRecvNetworkInterfaceAddresses: "preferred",
        MulticastTimeToLive: 32,
        RedundantNetworking: false,
        Transport: "default",
        UseIPv6: false,
      },

      // Internal section
      Internal: {
        AccelerateRexmitBlockSize: 0,
        AckDelay: "10ms",
        AutoReschedNackDelay: "1s",
        BuiltinEndpointSet: "default",
        BurstSize: "4294967295B",
        ControlTopic: {
          Enable: true,
          InitialReset: "inf",
          ResetPeriod: "inf",
        },
        DefragReliableMaxSamples: 16,
        DefragUnreliableMaxSamples: 4,
        DeliveryQueueMaxSamples: 256,
        EnableExpensiveChecks: "",
        ExtendedPacketInfo: false,
        GenerateKeyhash: true,
        HeartbeatInterval: "100ms",
        LateAckMode: false,
        LivelinessMonitoring: {
          Enable: "default",
          Interval: "default",
        },
        MaxParticipants: 0,
        MaxQueuedRexmitBytes: 52428800,
        MaxQueuedRexmitMessages: 600,
        MaxSampleSize: "2147483647B",
        MeasureHbToAckLatency: false,
        MonitorPort: -1,
        MultipleReceiveThreads: {
          Enable: "default",
          MaxReceiveBufferSize: "default",
        },
        NackDelay: "10ms",
        PreEmptiveAckDelay: "10ms",
        PrimaryReorderMaxSamples: 128,
        PrioritizeRetransmit: true,
        RediscoveryBlacklistDuration: "10s",
        RetransmitMerging: "never",
        RetransmitMergingPeriod: "5ms",
        RetryOnRejectBestEffort: false,
        SPDPResponseMaxDelay: "0ms",
        SecondaryReorderMaxSamples: 128,
        SocketReceiveBufferSize: "default",
        SocketSendBufferSize: "default",
        SquashParticipants: false,
        SynchronousDeliveryLatencyBound: "inf",
        SynchronousDeliveryPriorityThreshold: 0,
        Test: {
          XmitLossiness: 0,
        },
        UseMulticastIfMreqn: 0,
        Watermarks: {
          WhcAdaptive: true,
          WhcHigh: "500kB",
          WhcHighInit: "30kB",
          WhcLow: "1kB",
        },
        WriterLingerDuration: "5ms",
      },

      // Partitioning section
      Partitioning: {
        IgnoredPartitions: {
          IgnoredPartition: [], // Array of DCPSPartitionTopic elements
        },
        NetworkPartitions: {
          NetworkPartition: [], // Array of network partition configurations
        },
        PartitionMappings: {
          PartitionMapping: [], // Array of partition mappings
        },
      },

      // Security section
      Security: {
        AccessControl: {
          Governance: "",
          Library: {
            "@_path": "",
            "@_initFunction": "init_access_control",
            "@_finalizeFunction": "finalize_access_control",
          },
          Permissions: "",
          PermissionsCA: "",
        },
        Authentication: {
          CRL: "",
          IdentityCA: "",
          IdentityCertificate: "",
          IncludeOptionalFields: false,
          Library: {
            "@_path": "",
            "@_initFunction": "init_authentication",
            "@_finalizeFunction": "finalize_authentication",
          },
          Password: "",
          PrivateKey: "",
          TrustedCADirectory: "",
        },
        Cryptographic: {
          Library: {
            "@_path": "",
            "@_initFunction": "init_crypto",
            "@_finalizeFunction": "finalize_crypto",
          },
        },
      },

      // Sizing section
      Sizing: {
        ReceiveBufferChunkSize: "128KiB",
        ReceiveBufferSize: "1MiB",
      },

      // SSL section
      SSL: {
        CertificateVerification: "default",
        Ciphers: "default",
        Enable: false,
        EntropyFile: "",
        KeyPassphrase: "",
        KeystoreFile: "",
        MinimumTLSVersion: "1.3",
        SelfSignedCertificates: false,
        VerifyClient: false,
      },

      // SharedMemory section
      SharedMemory: {
        Enable: true,
        Size: 134217728, // 128MB default
        LogLevel: "info",
        BufferSize: 8192,
      },

      // TCP section (updated)
      TCP: {
        AlwaysUsePeeraddrForUnicast: false,
        Enable: "default",
        NoDelay: true,
        Port: -1,
        ReadTimeout: "2s",
        WriteTimeout: "2s",
      },

      // Threads section
      Threads: {
        Thread: [],
      },

      // Tracing section (updated)
      Tracing: {
        AppendToFile: false,
        Category: [], // Array of categories
        EnableCategory: "", // Alternative to Category
        OutputFile: "cyclonedds.log",
        PacketCaptureFile: "",
        Verbosity: "none",
      },
    },
  },
};
