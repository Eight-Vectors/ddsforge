export const zenohSchema = {
  id: null,
  mode: "peer",
  metadata: {
    name: "strawberry",
    location: "Penny Lane",
  },
  connect: {
    timeout_ms: { router: -1, peer: -1, client: 0 },
    endpoints: [],
    exit_on_failure: { router: false, peer: false, client: true },
    retry: {
      period_init_ms: 1000,
      period_max_ms: 4000,
      period_increase_factor: 2,
    },
  },
  listen: {
    timeout_ms: 0,
    endpoints: { router: ["tcp/[::]:7447"], peer: ["tcp/[::]:0"] },
    exit_on_failure: true,
    retry: {
      period_init_ms: 1000,
      period_max_ms: 4000,
      period_increase_factor: 2,
    },
  },
  open: {
    return_conditions: {
      connect_scouted: true,
      declares: true,
    },
  },
  scouting: {
    timeout: 3000,
    delay: 500,
    multicast: {
      enabled: true,
      address: "224.0.0.224:7446",
      interface: "auto",
      ttl: 1,
      autoconnect: { router: [], peer: ["router", "peer"], client: ["router"] },
      autoconnect_strategy: {
        peer: { to_router: "always", to_peer: "always" },
      },
      listen: true,
    },
    gossip: {
      enabled: true,
      multihop: false,
      target: { router: ["router", "peer"], peer: ["router", "peer"] },
      autoconnect: { router: [], peer: ["router", "peer"] },
      autoconnect_strategy: {
        peer: { to_router: "always", to_peer: "always" },
      },
    },
  },
  timestamping: {
    enabled: { router: true, peer: false, client: false },
    drop_future_timestamp: false,
  },
  queries_default_timeout: 10000,
  routing: {
    router: {
      peers_failover_brokering: true,
      linkstate: {
        transport_weights: [{ dst_zid: "1", weight: "10" }],
      },
    },
    peer: {
      mode: "peer_to_peer",
      linkstate: {
        transport_weights: [{ dst_zid: "1", weight: "10" }],
      },
    },
    interests: {
      timeout: 10000,
    },
  },
  qos: {
    publication: [
      {
        key_exprs: ["demo/**"],
        config: {
          congestion_control: "block",
          priority: "data_high",
          express: true,
          reliability: "best_effort",
          allowed_destination: "remote",
        },
      },
    ],
    network: [
      {
        id: "lo0_en0_qos_overwrite",
        interfaces: ["lo0", "en0"],
        link_protocols: [
          "tcp",
          "udp",
          "tls",
          "quic",
          "ws",
          "serial",
          "unixsock-stream",
          "unixpipe",
          "vsock",
        ],
        messages: ["put", "delete", "query", "reply"],
        flows: ["egress", "ingress"],
        qos: {
          congestion_control: "drop",
          priority: "data",
          express: true,
          reliability: "reliable",
        },
        payload_size: "1000000..",
        key_exprs: ["test/demo"],
        overwrite: {
          priority: "real_time",
          congestion_control: "block",
          express: true,
        },
      },
    ],
  },
  aggregation: {
    subscribers: ["demo/**"],
    publishers: ["demo/**"],
  },
  namespace: "my/namespace",
  downsampling: [
    {
      id: "wlan0egress",
      interfaces: ["wlan0"],
      link_protocols: [
        "tcp",
        "udp",
        "tls",
        "quic",
        "ws",
        "serial",
        "unixsock-stream",
        "unixpipe",
        "vsock",
      ],
      flows: ["ingress", "egress"],
      messages: ["delete", "put", "query", "reply"],
      rules: [{ key_expr: "demo/example/zenoh-rs-pub", freq: 0.1 }],
    },
  ],
  access_control: {
    enabled: false,
    default_permission: "deny",
    rules: [
      {
        id: "rule1",
        messages: [
          "put",
          "delete",
          "declare_subscriber",
          "query",
          "reply",
          "declare_queryable",
          "liveliness_token",
          "liveliness_query",
          "declare_liveliness_subscriber",
        ],
        flows: ["egress", "ingress"],
        permission: "allow",
        key_exprs: ["test/demo"],
      },
      {
        id: "rule2",
        messages: [
          "put",
          "delete",
          "declare_subscriber",
          "query",
          "reply",
          "declare_queryable",
        ],
        flows: ["ingress"],
        permission: "allow",
        key_exprs: ["**"],
      },
    ],
    subjects: [
      {
        id: "subject1",
        interfaces: ["lo0", "en0"],
        cert_common_names: ["example.zenoh.io"],
        usernames: ["zenoh-example"],
      },
      {
        id: "subject2",
        interfaces: ["lo0", "en0"],
        cert_common_names: ["example2.zenoh.io"],
      },
      { id: "subject3" },
      {
        id: "subject4",
        link_protocols: [
          "tcp",
          "udp",
          "tls",
          "quic",
          "ws",
          "serial",
          "unixsock-stream",
          "unixpipe",
          "vsock",
        ],
        zids: ["38a4829bce9166ee"],
      },
    ],
    policies: [
      { id: "policy1", rules: ["rule1"], subjects: ["subject1", "subject2"] },
      { rules: ["rule2"], subjects: ["subject3", "subject4"] },
    ],
  },
  low_pass_filter: [
    {
      id: "filter1",
      interfaces: ["wlan0"],
      link_protocols: [
        "tcp",
        "udp",
        "tls",
        "quic",
        "ws",
        "serial",
        "unixsock-stream",
        "unixpipe",
        "vsock",
      ],
      flows: ["ingress", "egress"],
      messages: ["put", "delete", "query", "reply"],
      key_exprs: ["demo/**"],
      size_limit: 8192,
    },
  ],
  transport: {
    unicast: {
      open_timeout: 10000,
      accept_timeout: 10000,
      accept_pending: 100,
      max_sessions: 1000,
      max_links: 1,
      lowlatency: false,
      qos: { enabled: true },
      compression: { enabled: false },
    },
    multicast: {
      join_interval: 2500,
      max_sessions: 1000,
      qos: { enabled: false },
      compression: { enabled: false },
    },
    link: {
      protocols: [
        "tcp",
        "udp",
        "tls",
        "quic",
        "ws",
        "unixsock-stream",
        "vsock",
      ],
      tx: {
        sequence_number_resolution: "32bit",
        lease: 10000,
        keep_alive: 4,
        batch_size: 65535,
        queue: {
          size: {
            control: 2,
            real_time: 2,
            interactive_high: 2,
            interactive_low: 2,
            data_high: 2,
            data: 2,
            data_low: 2,
            background: 2,
          },
          congestion_control: {
            drop: {
              wait_before_drop: 1000,
              max_wait_before_drop_fragments: 50000,
            },
            block: {
              wait_before_close: 5000000,
            },
          },
          batching: {
            enabled: true,
            time_limit: 1,
          },
          allocation: {
            mode: "lazy",
          },
        },
      },
      rx: {
        buffer_size: 65535,
        max_message_size: 1073741824,
      },
      tls: {
        root_ca_certificate: null,
        listen_private_key: null,
        listen_certificate: null,
        enable_mtls: false,
        connect_private_key: null,
        connect_certificate: null,
        verify_name_on_connect: true,
        close_link_on_expiration: false,
      },
    },
    shared_memory: {
      enabled: true,
      mode: "lazy",
      transport_optimization: {
        enabled: true,
        pool_size: 16777216,
        message_size_threshold: 3072,
      },
    },
    auth: {
      usrpwd: {
        user: null,
        password: null,
        dictionary_file: null,
      },
      pubkey: {
        public_key_pem: null,
        private_key_pem: null,
        public_key_file: null,
        private_key_file: null,
        key_size: null,
        known_keys_file: null,
      },
    },
  },
  adminspace: {
    enabled: false,
    permissions: {
      read: true,
      write: false,
    },
  },
  plugins_loading: {
    enabled: false,
    search_dirs: [
      { kind: "current_exe_parent", value: null },
      { kind: "path", value: "." },
      { kind: "path", value: "~/.zenoh/lib" },
      { kind: "path", value: "/opt/homebrew/lib" },
      { kind: "path", value: "/usr/local/lib" },
      { kind: "path", value: "/usr/lib" },
    ],
  },
  plugins: {
    rest: {
      __required__: true,
      __config__: "./plugins/zenoh-plugin-rest/config.json5",
      http_port: 8000,
      work_thread_num: 2,
      max_block_thread_num: 50,
    },
    storage_manager: {
      __path__: [
        "./target/release/libzenoh_plugin_storage_manager.so",
        "./target/release/libzenoh_plugin_storage_manager.dylib",
      ],
      backend_search_dirs: [],
      volumes: {
        influxdb: {
          url: "https://myinfluxdb.example",
          private: {
            username: "user1",
            password: "pw1",
          },
        },
        influxdb2: {
          backend: "influxdb",
          private: {
            username: "user2",
            password: "pw2",
          },
          url: "https://localhost:8086",
        },
      },
      storages: [
        {
          id: "demo",
          key_expr: "demo/memory/**",
          volume: "memory",
        },
        {
          id: "demo2",
          key_expr: "demo/memory2/**",
          strip_prefix: "demo/memory2",
          volume: "memory",
          garbage_collection: {
            period: 30,
            lifespan: 86400,
          },
          replication: {
            interval: 10,
            sub_intervals: 5,
            hot: 6,
            warm: 30,
            propagation_delay: 250,
          },
        },
        {
          id: "demo3",
          key_expr: "demo/memory3/**",
          volume: "memory",
          complete: true,
        },
        {
          id: "influx_demo",
          key_expr: "demo/influxdb/**",
          strip_prefix: "demo/influxdb",
          volume: {
            id: "influxdb",
            db: "example",
          },
        },
        {
          id: "influx_demo2",
          key_expr: "demo/influxdb2/**",
          strip_prefix: "demo/influxdb2",
          volume: {
            id: "influxdb2",
            db: "example",
          },
        },
      ],
    },
  },
};

export interface ZenohConfig {
  id?: string | null;
  mode?: "router" | "peer" | "client";
  metadata?: {
    name?: string;
    location?: string;
    [key: string]: any;
  };
  connect?: {
    endpoints?: string[] | Record<string, string[]>;
    timeout_ms?: number | Record<string, number>;
    retry?: {
      period_init_ms?: number;
      period_max_ms?: number;
      period_increase_factor?: number;
    };
    exit_on_failure?: boolean | Record<string, boolean>;
  };
  listen?: {
    endpoints?: string[] | Record<string, string[]>;
    timeout_ms?: number | Record<string, number>;
    retry?: {
      period_init_ms?: number;
      period_max_ms?: number;
      period_increase_factor?: number;
    };
    exit_on_failure?: boolean | Record<string, boolean>;
  };
  scouting?: {
    timeout?: number;
    delay?: number;
    multicast?: {
      enabled?: boolean;
      address?: string;
      interface?: string;
      ttl?: number;
      autoconnect?: Record<string, string[]> | string[];
      autoconnect_strategy?: Record<string, any>;
      listen?: boolean;
    };
    gossip?: {
      enabled?: boolean;
      multihop?: boolean;
      target?: Record<string, string[]>;
      autoconnect?: Record<string, string[]>;
      autoconnect_strategy?: Record<string, any>;
    };
  };
  open?: {
    return_conditions?: {
      connect_scouted?: boolean;
      declares?: boolean;
    };
  };
  timestamping?: {
    enabled?: Record<string, boolean>;
    drop_future_timestamp?: boolean;
  };
  queries_default_timeout?: number;
  routing?: {
    router?: {
      peers_failover_brokering?: boolean;
      linkstate?: {
        transport_weights?: {
          dst_zid?: string;
          weight?: string;
        }[];
      };
    };
    peer?: {
      mode?: string;
      linkstate?: {
        transport_weights?: {
          dst_zid?: string;
          weight?: string;
        }[];
      };
    };
    interests?: {
      timeout?: number;
    };
  };
  qos?: {
    publication?: Array<{
      key_exprs?: string[];
      config?: Record<string, any>;
    }>;
    network?: Array<{
      id?: string;
      interfaces?: string[];
      link_protocols?: string[];
      messages?: string[];
      flows?: string[];
      qos?: Record<string, any>;
      payload_size?: string;
      key_exprs?: string[];
      overwrite?: Record<string, any>;
    }>;
  };
  aggregation?: {
    subscribers?: string[];
    publishers?: string[];
  };
  namespace?: string;
  downsampling?: Array<{
    id?: string;
    interfaces?: string[];
    link_protocols?: string[];
    flows?: string[];
    messages?: string[];
    rules?: Array<{ key_expr?: string; freq?: number }>;
  }>;
  access_control?: {
    enabled?: boolean;
    default_permission?: string;
    rules?: Array<{
      id?: string;
      messages?: string[];
      flows?: string[];
      permission?: string;
      key_exprs?: string[];
    }>;
    subjects?: Array<{
      id?: string;
      interfaces?: string[];
      cert_common_names?: string[];
      usernames?: string[];
      link_protocols?: string[];
      zids?: string[];
    }>;
    policies?: Array<{
      id?: string;
      rules?: string[];
      subjects?: string[];
    }>;
  };
  low_pass_filter?: Array<{
    id?: string;
    interfaces?: string[];
    link_protocols?: string[];
    flows?: string[];
    messages?: string[];
    key_exprs?: string[];
    size_limit?: number;
  }>;
  transport?: any; // Complex nested structure
  adminspace?: {
    enabled?: boolean;
    permissions?: {
      read?: boolean;
      write?: boolean;
    };
  };
  plugins_loading?: {
    enabled?: boolean;
    search_dirs?: Array<string | { kind?: string; value?: string | null }>;
  };
  plugins?: {
    [key: string]: any;
  };
  [key: string]: any;
}
