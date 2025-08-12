import type { FormField } from "../types/dds";
import { fastDDSSchema } from "../schemas/fastdds-schema";

export interface ProfileData {
  profileName: string;
  profileType: string;
  isDefault: boolean;
  fields: FormField[];
}

export interface ProfilesStructure {
  participant: ProfileData[];
  data_writer: ProfileData[];
  data_reader: ProfileData[];
  topic: ProfileData[];
}

export const schemaToProfiles = (schema: any): ProfilesStructure => {
  const profiles: ProfilesStructure = {
    participant: [],
    data_writer: [],
    data_reader: [],
    topic: [],
  };

  if (schema.profiles) {
    if (Array.isArray(schema.profiles.participant)) {
      profiles.participant = schema.profiles.participant.map((p: any) => ({
        profileName: p["@_profile_name"] || "default_participant",
        profileType: "participant",
        isDefault: p["@_is_default_profile"] === true,
        fields: [],
      }));
    }

    if (Array.isArray(schema.profiles.data_writer)) {
      profiles.data_writer = schema.profiles.data_writer.map((p: any) => ({
        profileName: p["@_profile_name"] || "default_datawriter",
        profileType: "data_writer",
        isDefault: p["@_is_default_profile"] === true,
        fields: [],
      }));
    }

    if (Array.isArray(schema.profiles.data_reader)) {
      profiles.data_reader = schema.profiles.data_reader.map((p: any) => ({
        profileName: p["@_profile_name"] || "default_datareader",
        profileType: "data_reader",
        isDefault: p["@_is_default_profile"] === true,
        fields: [],
      }));
    }
    if (Array.isArray(schema.profiles.topic)) {
      profiles.topic = schema.profiles.topic.map((p: any) => ({
        profileName: p["@_profile_name"] || "default_topic",
        profileType: "topic",
        isDefault: p["@_is_default_profile"] === true,
        fields: [],
      }));
    }
  }

  return profiles;
};

export const xmlToProfiles = (xmlData: any): ProfilesStructure => {
  const profiles: ProfilesStructure = {
    participant: [],
    data_writer: [],
    data_reader: [],
    topic: [],
  };

  if (xmlData.profiles) {
    const profileTypes = [
      "participant",
      "data_writer",
      "data_reader",
      "topic",
    ] as const;

    profileTypes.forEach((type) => {
      if (xmlData.profiles[type]) {
        const profileData = xmlData.profiles[type];

        const profileArray = Array.isArray(profileData)
          ? profileData
          : [profileData];

        profiles[type] = profileArray.map((p: any) => ({
          profileName: p["@_profile_name"] || `default_${type}`,
          profileType: type,
          isDefault: p["@_is_default_profile"] === true,
          fields: [],
        }));
      }
    });
  }

  return profiles;
};

export const profilesToXML = (
  profiles: ProfilesStructure,
  fieldsMap: Map<string, FormField[]>
): any => {
  const result: any = {
    "@_xmlns": "http://www.eprosima.com/XMLSchemas/fastRTPS_Profiles",
  };

  const profileTypes = [
    "participant",
    "data_writer",
    "data_reader",
    "topic",
  ] as const;

  profileTypes.forEach((type) => {
    const typeProfiles = profiles[type];
    if (typeProfiles.length > 0) {
      result[type] = typeProfiles.map((profile) => {
        const fields = fieldsMap.get(`${type}_${profile.profileName}`) || [];
        const profileData: any = {
          "@_profile_name": profile.profileName,
          "@_is_default_profile": profile.isDefault,
        };

        fields.forEach((field) => {
          if (
            field.value !== null &&
            field.value !== undefined &&
            field.value !== ""
          ) {
            profileData[field.name] = field.value;
          }
        });

        return profileData;
      });
    }
  });

  return result;
};

export const getDefaultProfileData = (profileType: string): any => {
  const schema = fastDDSSchema.dds.profiles;

  switch (profileType) {
    case "participant":
      return schema.participant?.[0] || null;
    case "data_writer":
      return schema.data_writer?.[0] || null;
    case "data_reader":
      return schema.data_reader?.[0] || null;
    case "topic":
      return schema.topic?.[0] || null;
    case "transport_descriptor":
      return {
        transport_id: "new_transport",
        type: "UDPv4",
        sendBufferSize: 65536,
        receiveBufferSize: 65536,
      };
    default:
      return null;
  }
};

export const validateProfileNames = (profiles: ProfilesStructure): string[] => {
  const errors: string[] = [];
  const allNames = new Set<string>();

  const profileTypes = [
    "participant",
    "data_writer",
    "data_reader",
    "topic",
  ] as const;

  profileTypes.forEach((type) => {
    profiles[type].forEach((profile) => {
      if (allNames.has(profile.profileName)) {
        errors.push(`Duplicate profile name: "${profile.profileName}"`);
      }
      allNames.add(profile.profileName);
    });
  });

  return errors;
};

export const validateDefaultProfiles = (
  profiles: ProfilesStructure
): string[] => {
  const errors: string[] = [];
  const profileTypes = [
    "participant",
    "data_writer",
    "data_reader",
    "topic",
  ] as const;

  profileTypes.forEach((type) => {
    const defaultProfiles = profiles[type].filter((p) => p.isDefault);
    if (defaultProfiles.length > 1) {
      errors.push(`Multiple default profiles for ${type}`);
    }
  });

  return errors;
};
