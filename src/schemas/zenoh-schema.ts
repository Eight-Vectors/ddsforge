export const zenohSchema = {
  id: null,
  mode: "peer",
  metadata: {
    name: "",
    location: "",
  },
  connect: {
    endpoints: [],
    timeout_ms: 10000,
    retry: {
      period_init_ms: 1000,
      period_max_ms: 4000,
      period_increase_factor: 2,
    },
    exit_on_failure: false,
  },
  listen: {
    endpoints: [],
    timeout_ms: 10000,
    retry: {
      period_init_ms: 1000,
      period_max_ms: 4000,
      period_increase_factor: 2,
    },
    exit_on_failure: false,
  },
  scouting: {
    timeout: 1000,
    delay: 100,
    multicast: {
      enabled: true,
      address: "224.0.0.224:7446",
      interface: "auto",
      ttl: 1,
      autoconnect: {
        router: true,
        peer: true,
        client: false,
      },
    },
    gossip: {
      enabled: true,
      multihop: false,
      autoconnect: {
        router: false,
        peer: true,
        client: false,
      },
    },
  },
  open: {
    return_conditions: {
      connect_scouted: true,
      declares: true,
    },
  },
  timestamping: {
    enabled_at: [],
    drop_future_timestamp: false,
  },
  queries_default_timeout: 10000,
  routing: {
    router: {
      peers_failover_brokering: true,
    },
    peer: {
      mode: "peer_to_peer",
    },
  },
  transport: {
    unicast: {
      accept_timeout: 10000,
      accept_pending: 100,
      max_sessions: 1000,
      max_links: 1,
      lowlatency: false,
      qos: {
        enabled: false,
      },
      compression: {
        enabled: false,
      },
    },
    multicast: {
      join_interval: 2500,
      max_sessions: 1000,
      qos: {
        enabled: false,
      },
      compression: {
        enabled: false,
      },
    },
    link: {
      protocols: [],
      tx: {
        sequence_number_resolution: 268435456,
        lease: 10000,
        keep_alive: 4,
        batch_size: 65535,
        queue: {
          size: {
            control: 1,
            real_time: 1,
            interactive_high: 1,
            interactive_low: 1,
            data_high: 2,
            data: 4,
            data_low: 4,
            background: 4,
          },
          congestion_control: {
            wait_before_drop: 1000,
          },
          backoff: 100,
        },
        threads: 4,
      },
      rx: {
        buffer_size: 65536,
        max_message_size: 1073741824,
      },
    },
    shared_memory: {
      enabled: false,
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
        key_size: 2048,
        known_keys_file: null,
      },
    },
  },

  adminspace: {
    permissions: {
      read: true,
      write: false,
    },
  },

  plugins_loading: {
    enabled: false,
    search_dirs: [],
  },

  plugins: {
    rest: {
      http_port: 8000,
      enable: false,
    },
    storages: {
      enable: false,
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
    endpoints?: string[];
    timeout_ms?: number;
    retry?: {
      period_init_ms?: number;
      period_max_ms?: number;
      period_increase_factor?: number;
    };
    exit_on_failure?: boolean;
  };
  listen?: {
    endpoints?: string[];
    timeout_ms?: number;
    retry?: {
      period_init_ms?: number;
      period_max_ms?: number;
      period_increase_factor?: number;
    };
    exit_on_failure?: boolean;
  };
  scouting?: {
    timeout?: number;
    delay?: number;
    multicast?: {
      enabled?: boolean;
      address?: string;
      interface?: string;
      ttl?: number;
      autoconnect?: {
        router?: boolean;
        peer?: boolean;
        client?: boolean;
      };
    };
    gossip?: {
      enabled?: boolean;
      multihop?: boolean;
      autoconnect?: {
        router?: boolean;
        peer?: boolean;
        client?: boolean;
      };
    };
  };
  open?: {
    return_conditions?: {
      connect_scouted?: boolean;
      declares?: boolean;
    };
  };
  timestamping?: {
    enabled_at?: string[];
    drop_future_timestamp?: boolean;
  };
  queries_default_timeout?: number;
  routing?: {
    router?: {
      peers_failover_brokering?: boolean;
    };
    peer?: {
      mode?: string;
    };
  };
  transport?: any; // Complex nested structure
  adminspace?: {
    permissions?: {
      read?: boolean;
      write?: boolean;
    };
  };
  plugins_loading?: {
    enabled?: boolean;
    search_dirs?: string[];
  };
  plugins?: {
    [key: string]: any;
  };
  [key: string]: any;
}
