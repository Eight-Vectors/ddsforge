export function validateZenohConfig(jsonContent: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const config = JSON.parse(jsonContent);

    // Validate ID format if present
    if (config.id !== null && config.id !== undefined) {
      if (typeof config.id !== "string") {
        errors.push("ID must be a string");
      } else if (!/^[0-9a-f]{1,32}$/i.test(config.id)) {
        errors.push("ID must be a hexadecimal string (up to 32 characters)");
      }
    }

    // Validate mode
    if (config.mode && !["router", "peer", "client"].includes(config.mode)) {
      errors.push("Mode must be one of: router, peer, client");
    }

    // Validate endpoints format
    const validateEndpoints = (endpoints: any[], context: string) => {
      if (!Array.isArray(endpoints)) return;

      endpoints.forEach((endpoint, index) => {
        if (typeof endpoint !== "string") {
          errors.push(`${context}[${index}] must be a string`);
        } else if (!isValidEndpoint(endpoint)) {
          errors.push(
            `${context}[${index}] "${endpoint}" is not a valid endpoint format`
          );
        }
      });
    };

    if (config.connect?.endpoints) {
      validateEndpoints(config.connect.endpoints, "connect.endpoints");
    }

    if (config.listen?.endpoints) {
      validateEndpoints(config.listen.endpoints, "listen.endpoints");
    }

    // Validate multicast address
    if (config.scouting?.multicast?.address) {
      const addr = config.scouting.multicast.address;
      if (!isValidMulticastAddress(addr)) {
        errors.push(`Multicast address "${addr}" is not valid`);
      }
    }

    // Validate timeout values
    const validateTimeout = (value: any, path: string) => {
      if (value !== undefined && value !== null) {
        if (typeof value !== "number" || value < 0) {
          errors.push(`${path} must be a positive number`);
        }
      }
    };

    validateTimeout(config.connect?.timeout_ms, "connect.timeout_ms");
    validateTimeout(config.listen?.timeout_ms, "listen.timeout_ms");
    validateTimeout(config.queries_default_timeout, "queries_default_timeout");

    // Validate transport settings
    if (config.transport?.unicast?.max_sessions !== undefined) {
      const maxSessions = config.transport.unicast.max_sessions;
      if (typeof maxSessions !== "number" || maxSessions < 1) {
        errors.push("transport.unicast.max_sessions must be a positive number");
      }
    }
  } catch (e) {
    errors.push(
      `JSON parsing error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  return { isValid: errors.length === 0, errors };
}

// Validate endpoint format (basic validation)
function isValidEndpoint(endpoint: string): boolean {
  // Basic patterns for common endpoint formats
  const patterns = [
    /^tcp\/[^:]+:\d+$/, // tcp/hostname:port
    /^udp\/[^:]+:\d+$/, // udp/hostname:port
    /^quic\/[^:]+:\d+$/, // quic/hostname:port
    /^ws\/[^:]+:\d+$/, // ws/hostname:port
    /^ipc\/.+$/, // ipc/path
    /^tcp\/\d+\.\d+\.\d+\.\d+:\d+$/, // tcp/ip:port
    /^udp\/\d+\.\d+\.\d+\.\d+:\d+$/, // udp/ip:port
  ];

  return patterns.some((pattern) => pattern.test(endpoint));
}

// Validate multicast address format
function isValidMulticastAddress(address: string): boolean {
  const parts = address.split(":");
  if (parts.length !== 2) return false;

  const [ip, port] = parts;

  // Check port
  const portNum = parseInt(port);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) return false;

  // Check IP (basic multicast range validation)
  const ipParts = ip.split(".");
  if (ipParts.length !== 4) return false;

  const firstOctet = parseInt(ipParts[0]);
  if (isNaN(firstOctet) || firstOctet < 224 || firstOctet > 239) return false;

  return ipParts.every((part) => {
    const num = parseInt(part);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}

// Validate field value based on path
export function validateZenohFieldValue(
  path: string[],
  value: any
): string | null {
  const pathStr = path.join(".");

  // ID validation
  if (pathStr === "id" && value) {
    if (!/^[0-9a-f]{1,32}$/i.test(value)) {
      return "ID must be a hexadecimal string (up to 32 characters)";
    }
  }

  // Mode validation
  if (pathStr === "mode") {
    if (!["router", "peer", "client"].includes(value)) {
      return "Must be one of: router, peer, client";
    }
  }

  // Timeout validations
  if (pathStr.endsWith("timeout_ms") || pathStr.endsWith("timeout")) {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) {
      return "Must be a positive number";
    }
  }

  // Port validations
  if (pathStr.endsWith("port")) {
    const num = parseInt(value);
    if (isNaN(num) || num < 1 || num > 65535) {
      return "Port must be between 1 and 65535";
    }
  }

  // TTL validation
  if (pathStr.endsWith("ttl")) {
    const num = parseInt(value);
    if (isNaN(num) || num < 0 || num > 255) {
      return "TTL must be between 0 and 255";
    }
  }

  return null;
}
