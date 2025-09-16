import type { FormField } from '../types/dds';

export const getSimpleFastDDSSchema = (): FormField[] => {
  return [
    {
      name: 'domainId',
      label: 'Domain ID',
      type: 'number',
      value: 0,
      defaultValue: 0,
      required: false,
      path: ['domainId'],
      description: 'The DDS domain ID (0-232)'
    },
    {
      name: 'participantName',
      label: 'Participant Name',
      type: 'text',
      value: '',
      defaultValue: '',
      required: false,
      path: ['participantName'],
      description: 'Name for the domain participant'
    },
    {
      name: 'transport',
      label: 'Transport Configuration',
      type: 'object',
      value: {},
      defaultValue: {},
      required: false,
      path: ['transport'],
      fields: [
        {
          name: 'type',
          label: 'Transport Type',
          type: 'select',
          value: 'UDPv4',
          defaultValue: 'UDPv4',
          required: false,
          options: ['UDPv4', 'UDPv6', 'TCPv4', 'TCPv6', 'SHM'],
          path: ['transport', 'type']
        },
        {
          name: 'sendBufferSize',
          label: 'Send Buffer Size',
          type: 'number',
          value: 0,
          defaultValue: 0,
          required: false,
          path: ['transport', 'sendBufferSize'],
          description: 'Socket send buffer size in bytes'
        },
        {
          name: 'receiveBufferSize',
          label: 'Receive Buffer Size',
          type: 'number',
          value: 0,
          defaultValue: 0,
          required: false,
          path: ['transport', 'receiveBufferSize'],
          description: 'Socket receive buffer size in bytes'
        }
      ]
    },
    {
      name: 'discovery',
      label: 'Discovery Settings',
      type: 'object',
      value: {},
      defaultValue: {},
      required: false,
      path: ['discovery'],
      fields: [
        {
          name: 'protocol',
          label: 'Discovery Protocol',
          type: 'select',
          value: 'SIMPLE',
          defaultValue: 'SIMPLE',
          required: false,
          options: ['SIMPLE', 'STATIC', 'CLIENT', 'SERVER'],
          path: ['discovery', 'protocol']
        },
        {
          name: 'leaseDuration',
          label: 'Lease Duration (seconds)',
          type: 'number',
          value: 12,
          defaultValue: 12,
          required: false,
          path: ['discovery', 'leaseDuration']
        }
      ]
    }
  ];
};

export const getSimpleCycloneDDSSchema = (): FormField[] => {
  return [
    {
      name: 'domainId',
      label: 'Domain ID',
      type: 'text',
      value: 'any',
      defaultValue: 'any',
      required: false,
      path: ['domainId'],
      description: 'Domain ID (use "any" for default)'
    },
    {
      name: 'networkInterface',
      label: 'Network Interface',
      type: 'text',
      value: '127.0.0.1',
      defaultValue: '',
      required: false,
      path: ['networkInterface'],
      description: 'Network interface or IP address (e.g., 127.0.0.1 for localhost)'
    },
    {
      name: 'multicast',
      label: 'Enable Multicast',
      type: 'boolean',
      value: true,
      defaultValue: true,
      required: false,
      path: ['multicast']
    },
    {
      name: 'maxMessageSize',
      label: 'Max Message Size',
      type: 'text',
      value: '65500B',
      defaultValue: '65500B',
      required: false,
      path: ['maxMessageSize'],
      description: 'Maximum message size (e.g., 65500B, 64KB)'
    },
    {
      name: 'tracing',
      label: 'Tracing Configuration',
      type: 'object',
      value: {},
      defaultValue: {},
      required: false,
      path: ['tracing'],
      fields: [
        {
          name: 'enable',
          label: 'Enable Tracing',
          type: 'boolean',
          value: false,
          defaultValue: false,
          required: false,
          path: ['tracing', 'enable']
        },
        {
          name: 'verbosity',
          label: 'Verbosity Level',
          type: 'select',
          value: 'warning',
          defaultValue: 'warning',
          required: false,
          options: ['none', 'severe', 'error', 'warning', 'info', 'config', 'fine', 'finer', 'finest'],
          path: ['tracing', 'verbosity']
        },
        {
          name: 'outputFile',
          label: 'Output File',
          type: 'text',
          value: '',
          defaultValue: '',
          required: false,
          path: ['tracing', 'outputFile'],
          description: 'Log file path (leave empty for stdout)'
        }
      ]
    }
  ];
};