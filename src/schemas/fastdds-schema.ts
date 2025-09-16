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
        transport_descriptors: [
        {
          transport_descriptor: defaultTransportDescriptor,
        },
      ],

      domainparticipant_factory: domainParticipantFactoryProfile,

      participant: [defaultParticipantProfile],

      data_writer: [defaultDataWriterProfile],

      data_reader: [defaultDataReaderProfile],

      topic: [defaultTopicProfile],
    },

    library_settings: {
      intraprocess_delivery: "INTRAPROCESS_FULL",
    },

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

    types: {
      type: [],
    },
  },
};
