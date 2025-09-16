import {
  domainParticipantFactoryProfile,
  defaultParticipantProfile,
  defaultTopicProfile,
  defaultTransportDescriptor,
  defaultDataWriterProfile,
  defaultDataReaderProfile,
} from "./fastdds-profiles";

export const fastDDSSchema = {
  dds: {
    "@_xmlns": "http://www.eprosima.com",
    profiles: {
      // Transport descriptors section
      transport_descriptors: [
        {
          transport_descriptor: defaultTransportDescriptor,
        },
      ],

      // Domain Participant Factory
      domainparticipant_factory: domainParticipantFactoryProfile,

      // Participant profiles
      participant: [defaultParticipantProfile],

      // Data Writer profiles
      data_writer: [defaultDataWriterProfile],

      // Data Reader profiles
      data_reader: [defaultDataReaderProfile],

      // Topic profiles
      topic: [defaultTopicProfile],
    },

    // Library settings
    library_settings: {
      intraprocess_delivery: "INTRAPROCESS_FULL",
    },

    // Log configuration
    log: {
      use_default: true,
      consumer: [
        {
          class: "StdoutConsumer",
        },
      ],
      thread_settings: {
        scheduling_policy: -1,
        priority: 0,
        affinity: 0,
        stack_size: -1,
      },
    },

    // Types definition
    types: {
      type: [],
    },
  },
};
