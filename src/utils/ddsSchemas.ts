import type { FormField } from '../types/dds';

export const getFastDDSDefaultSchema = (): FormField[] => {
  return [
    {
      name: 'profiles',
      label: 'FastDDS Configuration',
      type: 'object',
      value: {},
      defaultValue: {},
      required: false,
      path: ['profiles'],
      fields: [
        {
          name: 'transport_descriptors',
          label: 'Transport Descriptors',
          type: 'array',
          value: [],
          defaultValue: [],
          required: false,
          path: ['profiles', 'transport_descriptors'],
          fields: [
            {
              name: 'transport_descriptor',
              label: 'Transport Descriptor',
              type: 'object',
              value: {},
              defaultValue: {},
              required: false,
              path: ['profiles', 'transport_descriptors', 'transport_descriptor'],
              fields: [
                {
                  name: 'transport_id',
                  label: 'Transport ID',
                  type: 'text',
                  value: '',
                  defaultValue: '',
                  required: false,
                  path: ['profiles', 'transport_descriptors', 'transport_descriptor', 'transport_id']
                },
                {
                  name: 'type',
                  label: 'Type',
                  type: 'select',
                  value: 'UDPv4',
                  defaultValue: 'UDPv4',
                  required: false,
                  options: ['UDPv4', 'UDPv6', 'TCPv4', 'TCPv6', 'SHM'],
                  path: ['profiles', 'transport_descriptors', 'transport_descriptor', 'type']
                },
                {
                  name: 'sendBufferSize',
                  label: 'Send Buffer Size',
                  type: 'number',
                  value: 0,
                  defaultValue: 0,
                  required: false,
                  path: ['profiles', 'transport_descriptors', 'transport_descriptor', 'sendBufferSize']
                },
                {
                  name: 'receiveBufferSize',
                  label: 'Receive Buffer Size',
                  type: 'number',
                  value: 0,
                  defaultValue: 0,
                  required: false,
                  path: ['profiles', 'transport_descriptors', 'transport_descriptor', 'receiveBufferSize']
                }
              ]
            }
          ]
        },
        {
          name: 'participant',
          label: 'Domain Participant',
          type: 'array',
          value: [],
          defaultValue: [],
          required: false,
          path: ['profiles', 'participant'],
          fields: [
            {
              name: 'participant_profile',
              label: 'Participant Profile',
              type: 'object',
              value: {},
              defaultValue: {},
              required: false,
              path: ['profiles', 'participant', 'participant_profile'],
              fields: [
                {
                  name: 'profile_name',
                  label: 'Profile Name',
                  type: 'text',
                  value: '',
                  defaultValue: '',
                  required: true,
                  path: ['profiles', 'participant', 'participant_profile', 'profile_name']
                },
                {
                  name: 'domainId',
                  label: 'Domain ID',
                  type: 'number',
                  value: 0,
                  defaultValue: 0,
                  required: false,
                  path: ['profiles', 'participant', 'participant_profile', 'domainId']
                },
                {
                  name: 'rtps',
                  label: 'RTPS',
                  type: 'object',
                  value: {},
                  defaultValue: {},
                  required: false,
                  path: ['profiles', 'participant', 'participant_profile', 'rtps'],
                  fields: [
                    {
                      name: 'name',
                      label: 'Name',
                      type: 'text',
                      value: '',
                      defaultValue: '',
                      required: false,
                      path: ['profiles', 'participant', 'participant_profile', 'rtps', 'name']
                    },
                    {
                      name: 'sendSocketBufferSize',
                      label: 'Send Socket Buffer Size',
                      type: 'number',
                      value: 0,
                      defaultValue: 0,
                      required: false,
                      path: ['profiles', 'participant', 'participant_profile', 'rtps', 'sendSocketBufferSize']
                    },
                    {
                      name: 'listenSocketBufferSize',
                      label: 'Listen Socket Buffer Size',
                      type: 'number',
                      value: 0,
                      defaultValue: 0,
                      required: false,
                      path: ['profiles', 'participant', 'participant_profile', 'rtps', 'listenSocketBufferSize']
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'data_writer',
          label: 'Data Writer',
          type: 'array',
          value: [],
          defaultValue: [],
          required: false,
          path: ['profiles', 'data_writer'],
          fields: [
            {
              name: 'datawriter_profile',
              label: 'DataWriter Profile',
              type: 'object',
              value: {},
              defaultValue: {},
              required: false,
              path: ['profiles', 'data_writer', 'datawriter_profile'],
              fields: [
                {
                  name: 'profile_name',
                  label: 'Profile Name',
                  type: 'text',
                  value: '',
                  defaultValue: '',
                  required: true,
                  path: ['profiles', 'data_writer', 'datawriter_profile', 'profile_name']
                },
                {
                  name: 'topic',
                  label: 'Topic',
                  type: 'object',
                  value: {},
                  defaultValue: {},
                  required: false,
                  path: ['profiles', 'data_writer', 'datawriter_profile', 'topic'],
                  fields: [
                    {
                      name: 'historyQos',
                      label: 'History QoS',
                      type: 'object',
                      value: {},
                      defaultValue: {},
                      required: false,
                      path: ['profiles', 'data_writer', 'datawriter_profile', 'topic', 'historyQos'],
                      fields: [
                        {
                          name: 'kind',
                          label: 'Kind',
                          type: 'select',
                          value: 'KEEP_LAST',
                          defaultValue: 'KEEP_LAST',
                          required: false,
                          options: ['KEEP_LAST', 'KEEP_ALL'],
                          path: ['profiles', 'data_writer', 'datawriter_profile', 'topic', 'historyQos', 'kind']
                        },
                        {
                          name: 'depth',
                          label: 'Depth',
                          type: 'number',
                          value: 1,
                          defaultValue: 1,
                          required: false,
                          path: ['profiles', 'data_writer', 'datawriter_profile', 'topic', 'historyQos', 'depth']
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'data_reader',
          label: 'Data Reader',
          type: 'array',
          value: [],
          defaultValue: [],
          required: false,
          path: ['profiles', 'data_reader'],
          fields: [
            {
              name: 'datareader_profile',
              label: 'DataReader Profile',
              type: 'object',
              value: {},
              defaultValue: {},
              required: false,
              path: ['profiles', 'data_reader', 'datareader_profile'],
              fields: [
                {
                  name: 'profile_name',
                  label: 'Profile Name',
                  type: 'text',
                  value: '',
                  defaultValue: '',
                  required: true,
                  path: ['profiles', 'data_reader', 'datareader_profile', 'profile_name']
                },
                {
                  name: 'topic',
                  label: 'Topic',
                  type: 'object',
                  value: {},
                  defaultValue: {},
                  required: false,
                  path: ['profiles', 'data_reader', 'datareader_profile', 'topic'],
                  fields: [
                    {
                      name: 'historyQos',
                      label: 'History QoS',
                      type: 'object',
                      value: {},
                      defaultValue: {},
                      required: false,
                      path: ['profiles', 'data_reader', 'datareader_profile', 'topic', 'historyQos'],
                      fields: [
                        {
                          name: 'kind',
                          label: 'Kind',
                          type: 'select',
                          value: 'KEEP_LAST',
                          defaultValue: 'KEEP_LAST',
                          required: false,
                          options: ['KEEP_LAST', 'KEEP_ALL'],
                          path: ['profiles', 'data_reader', 'datareader_profile', 'topic', 'historyQos', 'kind']
                        },
                        {
                          name: 'depth',
                          label: 'Depth',
                          type: 'number',
                          value: 1,
                          defaultValue: 1,
                          required: false,
                          path: ['profiles', 'data_reader', 'datareader_profile', 'topic', 'historyQos', 'depth']
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ];
};

export const getCycloneDDSDefaultSchema = (): FormField[] => {
  return [
    {
      name: 'Domain',
      label: 'Domain',
      type: 'object',
      value: {},
      defaultValue: {},
      required: false,
      path: ['Domain'],
      fields: [
        {
          name: 'Id',
          label: 'Domain ID',
          type: 'text',
          value: 'any',
          defaultValue: 'any',
          required: false,
          path: ['Domain', 'Id'],
          description: 'Domain ID (use "any" for default)'
        },
        {
          name: 'General',
          label: 'General',
          type: 'object',
          value: {},
          defaultValue: {},
          required: false,
          path: ['Domain', 'General'],
          fields: [
            {
              name: 'Interfaces',
              label: 'Network Interfaces',
              type: 'object',
              value: {},
              defaultValue: {},
              required: false,
              path: ['Domain', 'General', 'Interfaces'],
              fields: [
                {
                  name: 'NetworkInterface',
                  label: 'Network Interface',
                  type: 'array',
                  value: [],
                  defaultValue: [],
                  required: false,
                  path: ['Domain', 'General', 'Interfaces', 'NetworkInterface'],
                  fields: [
                    {
                      name: 'name',
                      label: 'Interface Name',
                      type: 'text',
                      value: '',
                      defaultValue: '',
                      required: false,
                      path: ['Domain', 'General', 'Interfaces', 'NetworkInterface', 'name'],
                      description: 'Network interface name or IP address'
                    },
                    {
                      name: 'autodetermine',
                      label: 'Auto Determine',
                      type: 'boolean',
                      value: true,
                      defaultValue: true,
                      required: false,
                      path: ['Domain', 'General', 'Interfaces', 'NetworkInterface', 'autodetermine']
                    },
                    {
                      name: 'priority',
                      label: 'Priority',
                      type: 'select',
                      value: 'default',
                      defaultValue: 'default',
                      required: false,
                      options: ['default', 'highest', 'higher', 'high', 'normal', 'low', 'lower', 'lowest'],
                      path: ['Domain', 'General', 'Interfaces', 'NetworkInterface', 'priority']
                    },
                    {
                      name: 'multicast',
                      label: 'Multicast',
                      type: 'boolean',
                      value: true,
                      defaultValue: true,
                      required: false,
                      path: ['Domain', 'General', 'Interfaces', 'NetworkInterface', 'multicast']
                    }
                  ]
                }
              ]
            },
            {
              name: 'AllowMulticast',
              label: 'Allow Multicast',
              type: 'select',
              value: 'default',
              defaultValue: 'default',
              required: false,
              options: ['true', 'false', 'default', 'spdp', 'asm'],
              path: ['Domain', 'General', 'AllowMulticast']
            },
            {
              name: 'MaxMessageSize',
              label: 'Max Message Size',
              type: 'text',
              value: '65500B',
              defaultValue: '65500B',
              required: false,
              path: ['Domain', 'General', 'MaxMessageSize'],
              description: 'Maximum message size (e.g., 65500B, 64KB)'
            },
            {
              name: 'FragmentSize',
              label: 'Fragment Size',
              type: 'text',
              value: '1300B',
              defaultValue: '1300B',
              required: false,
              path: ['Domain', 'General', 'FragmentSize'],
              description: 'Fragment size for large messages'
            }
          ]
        },
        {
          name: 'Discovery',
          label: 'Discovery',
          type: 'object',
          value: {},
          defaultValue: {},
          required: false,
          path: ['Domain', 'Discovery'],
          fields: [
            {
              name: 'Peers',
              label: 'Peers',
              type: 'array',
              value: [],
              defaultValue: [],
              required: false,
              path: ['Domain', 'Discovery', 'Peers'],
              fields: [
                {
                  name: 'Peer',
                  label: 'Peer Address',
                  type: 'text',
                  value: '',
                  defaultValue: '',
                  required: false,
                  path: ['Domain', 'Discovery', 'Peers', 'Peer'],
                  description: 'Peer address (e.g., localhost, 192.168.1.1)'
                }
              ]
            },
            {
              name: 'MaxAutoParticipantIndex',
              label: 'Max Auto Participant Index',
              type: 'number',
              value: 9,
              defaultValue: 9,
              required: false,
              path: ['Domain', 'Discovery', 'MaxAutoParticipantIndex']
            }
          ]
        },
        {
          name: 'Tracing',
          label: 'Tracing',
          type: 'object',
          value: {},
          defaultValue: {},
          required: false,
          path: ['Domain', 'Tracing'],
          fields: [
            {
              name: 'Enable',
              label: 'Enable Tracing',
              type: 'boolean',
              value: false,
              defaultValue: false,
              required: false,
              path: ['Domain', 'Tracing', 'Enable']
            },
            {
              name: 'Verbosity',
              label: 'Verbosity',
              type: 'select',
              value: 'warning',
              defaultValue: 'warning',
              required: false,
              options: ['none', 'severe', 'error', 'warning', 'info', 'config', 'fine', 'finer', 'finest'],
              path: ['Domain', 'Tracing', 'Verbosity']
            },
            {
              name: 'OutputFile',
              label: 'Output File',
              type: 'text',
              value: '',
              defaultValue: '',
              required: false,
              path: ['Domain', 'Tracing', 'OutputFile'],
              description: 'Log file path (e.g., /tmp/cyclonedds.log)'
            }
          ]
        }
      ]
    }
  ];
};