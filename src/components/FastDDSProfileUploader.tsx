import { useState, useEffect, useCallback } from "react";
import type { FormField } from "../types/dds";
import { ProfileManager } from "./ProfileManager";
import { FormField as FormFieldComponent } from "./FormField";
import { type TypeDefinition } from "./TypesEditor";
import { Card, CardHeader, CardTitle } from "./ui/card";
import {
  xmlToFormFields,
  buildXML,
  mergeUploadedDataIntoSchema,
} from "../utils/xmlParser";
import { getDefaultProfileData } from "../utils/profileUtils";
import { isFieldModified } from "../utils/fieldUtils";
import { fastDDSSchema } from "../schemas/fastdds-schema";
import { FastDDSValidator } from "../utils/fastddsRules";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { typeDefinitionsToTypesXml, parseTypesFromObject } from "../utils/typesXml";

interface FastDDSProfileEditorProps {
  uploadedData?: any;
  onXMLGenerate: (xml: string) => void;
}

interface Profile {
  name: string;
  type: string;
  isDefault: boolean;
}

export default function FastDDSProfileUploader({
  uploadedData,
  onXMLGenerate,
}: FastDDSProfileEditorProps) {
  // Always exclude defaults - this is the default behavior
  const excludeDefaults = true;
  const [activeTab, setActiveTab] = useState<
    "profiles" | "log" | "types" | "modified"
  >("profiles");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const [profileFieldsMap, setProfileFieldsMap] = useState<
    Map<string, FormField[]>
  >(new Map());
  const [originalFieldsMap, setOriginalFieldsMap] = useState<
    Map<string, FormField[]>
  >(new Map());

  const [, setUploadedProfileKeys] = useState<Set<string>>(new Set());
  const [modifiedProfilesData, setModifiedProfilesData] = useState<
    Map<string, any>
  >(new Map());
  const [modifiedLogData] = useState<any>({});

  const [, setOriginalUploadedData] = useState<
    Map<string, any>
  >(new Map());

  const [, setLogFields] = useState<FormField[]>([]);
  const [typeDefinitions, setTypeDefinitions] = useState<TypeDefinition[]>([]);
  const [, setOriginalLogFields] = useState<FormField[]>([]);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    autoFixAvailable: string[];
  } | null>(null);

  useEffect(() => {
    const parsedProfiles: Profile[] = [];
    const fieldsMap = new Map<string, FormField[]>();
    const uploadedProfileNames = new Set<string>();
    const uploadedProfileTypes = new Set<string>();
    const uploadedDataMap = new Map<string, any>();

    // First, process uploaded data if it exists
    if (uploadedData?.profiles) {
      Object.keys(uploadedData.profiles).forEach((type) => {
        if (type.startsWith("@_") || type === "#text") return;

        const profileData = uploadedData.profiles[type];
        if (!profileData) return;

        const profileArray = Array.isArray(profileData)
          ? profileData
          : [profileData];

        // Handle transport descriptors differently
        if (
          type === "transport_descriptors" &&
          profileData.transport_descriptor
        ) {
          const descriptors = Array.isArray(profileData.transport_descriptor)
            ? profileData.transport_descriptor
            : [profileData.transport_descriptor];

          descriptors.forEach((desc: any) => {
            const profileName =
              desc["@_transport_id"] ||
              desc["transport_id"] ||
              `default_${type}`;
            const profile: Profile = {
              name: profileName,
              type: "transport_descriptor",
              isDefault: false,
            };
            parsedProfiles.push(profile);
            // Track this profile type immediately
            uploadedProfileTypes.add("transport_descriptor");

            uploadedDataMap.set(`transport_descriptor_${profileName}`, desc);
            // Merge uploaded data with schema defaults to show all fields
            const schemaData = getDefaultProfileData("transport_descriptor");
            const mergedData = mergeUploadedDataIntoSchema(desc, schemaData);
            const fields = xmlToFormFields(mergedData);
            fieldsMap.set(`transport_descriptor_${profileName}`, fields);
          });
        } else if (type === "domainparticipant_factory") {
          // Handle domainparticipant_factory as a special case (singleton, not array)
          const profileName =
            profileData["@_profile_name"] ||
            "domainparticipant_factory_profile";
          const profile: Profile = {
            name: profileName,
            type: "domainparticipant_factory",
            isDefault: false,
          };
          parsedProfiles.push(profile);
          // Track this profile type immediately
          uploadedProfileTypes.add("domainparticipant_factory");

          uploadedDataMap.set(
            `domainparticipant_factory_${profileName}`,
            profileData
          );
          // Merge uploaded data with schema defaults to show all fields
          const schemaData = getDefaultProfileData("domainparticipant_factory");
          const mergedData = mergeUploadedDataIntoSchema(
            profileData,
            schemaData
          );
          const fields = xmlToFormFields(mergedData);
          fieldsMap.set(`domainparticipant_factory_${profileName}`, fields);
        } else {
          profileArray.forEach((p: any) => {
            const profileName = p["@_profile_name"] || `default_${type}`;
            const profile: Profile = {
              name: profileName,
              type: type,
              isDefault: p["@_is_default_profile"] === true,
            };
            parsedProfiles.push(profile);
            // Track this profile type immediately
            uploadedProfileTypes.add(type);

            uploadedDataMap.set(`${type}_${profileName}`, p);

            // Merge uploaded data with schema defaults to show all fields
            const schemaData = getDefaultProfileData(type);
            const mergedData = schemaData
              ? mergeUploadedDataIntoSchema(p, schemaData)
              : p;

            // Use nested structure - don't pass path prefix
            const fields = xmlToFormFields(mergedData);

            fieldsMap.set(`${type}_${profileName}`, fields);
          });
        }
      });

      // Track which profiles were loaded from uploaded data BEFORE adding defaults
      // This is important to distinguish between uploaded and default profiles
      parsedProfiles.forEach((profile) => {
        uploadedProfileNames.add(`${profile.type}_${profile.name}`);
      });

      if (uploadedData.log) {
        // Use nested structure
        const fields = xmlToFormFields(uploadedData.log);
        setLogFields(fields);
        setOriginalLogFields(JSON.parse(JSON.stringify(fields)));
      } else {
        // Set defaults from schema
        const defaults = fastDDSSchema.dds.log;
        const fields = xmlToFormFields(defaults);
        setLogFields(fields);
        setOriginalLogFields(JSON.parse(JSON.stringify(fields)));
      }

      if (uploadedData.types && uploadedData.types.type) {
        const parsedTypes: TypeDefinition[] = parseTypesFromObject(uploadedData.types);
        setTypeDefinitions(parsedTypes);
      } else {
        const defaultTypes: TypeDefinition[] = [];
        if (fastDDSSchema.dds.types && fastDDSSchema.dds.types.type) {
          const typeArray = Array.isArray(fastDDSSchema.dds.types.type)
            ? fastDDSSchema.dds.types.type
            : [fastDDSSchema.dds.types.type];
          typeArray.forEach((t: any) => {
            const parsed = parseTypesFromObject({ type: t });
            if (parsed.length > 0) defaultTypes.push(parsed[0]);
          });
        }
        setTypeDefinitions(defaultTypes);
      }
    }

    // add default profiles that don't exist in uploaded data
    const defaultProfiles: Profile[] = [
      {
        name: "domainparticipant_factory_profile",
        type: "domainparticipant_factory",
        isDefault: false,
      },
      { name: "default_participant", type: "participant", isDefault: true },
      { name: "default_topic", type: "topic", isDefault: false }, // Changed to match schema
      {
        name: "default_transport",
        type: "transport_descriptor",
        isDefault: false,
      },
      { name: "default_data_writer", type: "data_writer", isDefault: false },
      { name: "default_data_reader", type: "data_reader", isDefault: false },
    ];

    defaultProfiles.forEach((profile) => {
      const profileKey = `${profile.type}_${profile.name}`;

      if (
        !uploadedProfileNames.has(profileKey) &&
        !uploadedProfileTypes.has(profile.type)
      ) {
        const defaultData = getDefaultProfileData(profile.type);
        if (defaultData) {
          parsedProfiles.push(profile);
          const fields = xmlToFormFields(defaultData);
          fieldsMap.set(profileKey, fields);
        }
      }
    });

    // Set all the state
    setProfiles(parsedProfiles);
    setProfileFieldsMap(fieldsMap);
    const originalMap = new Map();
    fieldsMap.forEach((fields, key) => {
      originalMap.set(key, JSON.parse(JSON.stringify(fields)));
    });
    setOriginalFieldsMap(originalMap);

    if (parsedProfiles.length > 0) {
      setSelectedProfile(parsedProfiles[0]);
    }

    // Update the tracking of which profiles came from uploaded data
    setUploadedProfileKeys(uploadedProfileNames);
    // Store the original uploaded data
    setOriginalUploadedData(uploadedDataMap);

    if (!uploadedData) {
      setLogFields([]);
      setOriginalLogFields([]);
    }

    if (
      !uploadedData &&
      fastDDSSchema.dds.types &&
      fastDDSSchema.dds.types.type
    ) {
      const typeArray = Array.isArray(fastDDSSchema.dds.types.type)
        ? fastDDSSchema.dds.types.type
        : [fastDDSSchema.dds.types.type];
      const defaultTypes: TypeDefinition[] = typeArray.map((t: any) => ({
        kind: t.kind || "struct",
        name: t.name || "UnnamedType",
        ...t,
      }));
      setTypeDefinitions(defaultTypes);
    }

    setIsInitialLoad(false);
  }, [uploadedData]);

  const updateModifiedData = (
    profileKey: string,
    path: string[],
    value: any,
    shouldInclude: boolean
  ) => {
    const newModifiedData = new Map(modifiedProfilesData);

    if (!shouldInclude) {
      // Remove the field from modified data
      const profileData = newModifiedData.get(profileKey);
      if (!profileData) return;

      let current = profileData;

      // Navigate to parent of the field
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) return;
        current = current[path[i]];
      }

      // Delete the field
      delete current[path[path.length - 1]];

      // Clean up empty objects recursively
      const cleanEmptyObjects = (obj: any): any => {
        Object.keys(obj).forEach((key) => {
          if (
            typeof obj[key] === "object" &&
            obj[key] !== null &&
            !Array.isArray(obj[key])
          ) {
            cleanEmptyObjects(obj[key]);
            if (Object.keys(obj[key]).length === 0) {
              delete obj[key];
            }
          }
        });
        return obj;
      };

      cleanEmptyObjects(profileData);

      // Remove profile if empty
      if (Object.keys(profileData).length === 0) {
        newModifiedData.delete(profileKey);
      } else {
        newModifiedData.set(profileKey, profileData);
      }
    } else {
      // Add/update the field in modified data
      const profileData = newModifiedData.get(profileKey) || {};
      let current = profileData;

      // Navigate to the field location
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }

      // Set the value
      current[path[path.length - 1]] = value;
      newModifiedData.set(profileKey, profileData);
    }

    setModifiedProfilesData(newModifiedData);
  };

  // Helper to find field by path
  const findFieldByPath = (
    fields: FormField[],
    targetPath: string[]
  ): FormField | null => {
    for (const field of fields) {
      if (JSON.stringify(field.path) === JSON.stringify(targetPath)) {
        return field;
      }
      if (field.fields) {
        const found = findFieldByPath(field.fields, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  const generateAndNotifyXML = useCallback(() => {
    // Start from the uploaded data as baseline so preview reflects the file contents
    let data: any = {};
    if (uploadedData && typeof uploadedData === "object") {
      try {
        data = JSON.parse(JSON.stringify(uploadedData));
      } catch {
        data = {};
      }
    }

    // Simple deep merge helper for objects
    const deepMerge = (target: any, source: any): any => {
      Object.keys(source || {}).forEach((key) => {
        const sourceValue = source[key];
        const targetValue = target[key];
        if (
          sourceValue &&
          typeof sourceValue === "object" &&
          !Array.isArray(sourceValue)
        ) {
          if (
            !targetValue ||
            typeof targetValue !== "object" ||
            Array.isArray(targetValue)
          ) {
            target[key] = {};
          }
          deepMerge(target[key], sourceValue);
        } else {
          target[key] = sourceValue;
        }
      });
      return target;
    };

    // Merge modified log configuration (if any) onto baseline
    if (Object.keys(modifiedLogData).length > 0) {
      data.log = deepMerge({ ...(data.log || {}) }, modifiedLogData);
    }

    // Apply profile-level modifications and renames onto baseline
    profiles.forEach((profile) => {
      const profileKey = `${profile.type}_${profile.name}`;
      const modifiedData = modifiedProfilesData.get(profileKey);

      const fields = profileFieldsMap.get(profileKey);
      const profileNameField = fields?.find((f) => f.name === "@_profile_name");
      const profileName = profileNameField?.value || profile.name;

      const originalFields = originalFieldsMap.get(profileKey) || [];
      const originalProfileNameField = originalFields.find(
        (f) => f.name === "@_profile_name"
      );
      const profileNameModified =
        profileNameField &&
        originalProfileNameField &&
        profileNameField.value !== originalProfileNameField.value;

      const isDefaultField = fields?.find(
        (f) => f.name === "@_is_default_profile"
      );
      const originalIsDefaultField = originalFields.find(
        (f) => f.name === "@_is_default_profile"
      );
      const isDefaultModified =
        isDefaultField &&
        originalIsDefaultField &&
        isDefaultField.value !== originalIsDefaultField.value;

      if (!modifiedData && !profileNameModified && !isDefaultModified) {
        return;
      }

      const changes: any = { ...(modifiedData || {}) };
      if (profileNameModified) {
        changes["@_profile_name"] = profileName;
      }
      if (isDefaultModified) {
        changes["@_is_default_profile"] = isDefaultField?.value;
      }

      if (!data.profiles) data.profiles = {};

      if (profile.type === "transport_descriptor") {
        const tdRoot =
          data.profiles["transport_descriptors"] ||
          (data.profiles["transport_descriptors"] = {});
        let baseList = tdRoot.transport_descriptor;

        const transportIdFromFields =
          fields?.find((f) => f.name === "transport_id")?.value ||
          fields?.find((f) => f.name === "@_transport_id")?.value ||
          profile.name;

        if (!baseList) {
          tdRoot.transport_descriptor = { ...changes };
          return;
        }
        if (!Array.isArray(baseList)) {
          baseList = [baseList];
          tdRoot.transport_descriptor = baseList;
        }

        const found = baseList.find(
          (p: any) =>
            (p && (p["@_transport_id"] || p.transport_id)) === transportIdFromFields
        );
        if (found) {
          deepMerge(found, changes);
        } else {
          baseList.push({ ...changes });
        }
        return;
      }

      if (profile.type === "domainparticipant_factory") {
        if (data.profiles["domainparticipant_factory"]) {
          deepMerge(data.profiles["domainparticipant_factory"], changes);
        } else {
          data.profiles["domainparticipant_factory"] = { ...changes };
        }
        return;
      }

      // Standard profile types (participant, topic, data_writer, data_reader, etc.)
      const typeKey = profile.type;
      let base = data.profiles[typeKey];

      let list: any[] = [];
      if (!base) {
        // Section did not exist in uploaded file; create if there are changes
        list = [];
      } else if (Array.isArray(base)) {
        list = base;
      } else {
        list = [base];
      }

      const matchName =
        profileNameModified && originalProfileNameField
          ? originalProfileNameField.value
          : profileName;

      const index = list.findIndex(
        (p: any) => p && p["@_profile_name"] === matchName
      );

      if (index >= 0) {
        // Ensure required attributes are present when updating existing entries
        const baseAttrs: any = {
          "@_profile_name": profileName,
        };
        if (isDefaultField) {
          baseAttrs["@_is_default_profile"] = isDefaultField.value === true;
        }
        deepMerge(list[index], { ...baseAttrs, ...changes });
      } else {
        // Create a new entry with required attributes
        const baseAttrs: any = {
          "@_profile_name": profileName,
          "@_is_default_profile": isDefaultField
            ? isDefaultField.value === true
            : false,
        };
        list.push({ ...baseAttrs, ...changes });
      }

      data.profiles[typeKey] = list.length === 1 ? list[0] : list;
    });

    // Types section (always rebuild from editor state if present)
    if (typeDefinitions.length > 0) {
      const typesXml = typeDefinitionsToTypesXml(typeDefinitions);
      if (typesXml) {
        data.types = typesXml;
      }
    }

    const hasProfiles = data.profiles && Object.keys(data.profiles).length > 0;
    const hasTypes =
      data.types && data.types.type && data.types.type.length > 0;

    if (!hasProfiles && !hasTypes && !data.log) {
      const xml = buildXML({}, "fastdds");
      onXMLGenerate(xml);
    } else {
      const validator = new FastDDSValidator();
      const validation = validator.validateConfig(data);
      setValidationResult(validation);

      const xml = buildXML(data, "fastdds", {
        autoFix: validation.autoFixAvailable.length > 0,
      });
      onXMLGenerate(xml);
    }
  }, [
    profiles,
    profileFieldsMap,
    modifiedProfilesData,
    modifiedLogData,
    typeDefinitions,
    uploadedData,
    originalFieldsMap,
    onXMLGenerate,
  ]);

  useEffect(() => {
    if (!isInitialLoad) {
      generateAndNotifyXML();
    }
  }, [isInitialLoad, generateAndNotifyXML]);

  const handleProfileAdd = (profile: Profile) => {
    const defaultData = getDefaultProfileData(profile.type);
    let fields: FormField[] = [];

    if (defaultData) {
      // Use nested structure - don't pass path prefix
      fields = xmlToFormFields(defaultData);
    } else {
      // Set default data for transport descriptors
      if (profile.type === "transport_descriptor") {
        const minimalData = {
          transport_id: profile.name,
          type: "UDPv4",
          sendBufferSize: 65536,
          receiveBufferSize: 65536,
        };
        // Use nested structure - don't pass path prefix
        fields = xmlToFormFields(minimalData);
      } else {
        fields = [];
      }
    }

    const newFieldsMap = new Map(profileFieldsMap);
    newFieldsMap.set(`${profile.type}_${profile.name}`, fields);

    const newOriginalFieldsMap = new Map(originalFieldsMap);
    newOriginalFieldsMap.set(
      `${profile.type}_${profile.name}`,
      JSON.parse(JSON.stringify(fields))
    );

    setProfiles([...profiles, profile]);
    setProfileFieldsMap(newFieldsMap);
    setOriginalFieldsMap(newOriginalFieldsMap);
    setSelectedProfile(profile);
  };

  const handleProfileDelete = (profileName: string) => {
    const profileToDelete = profiles.find((p) => p.name === profileName);
    if (!profileToDelete) return;

    const newProfiles = profiles.filter((p) => p.name !== profileName);

    const newFieldsMap = new Map(profileFieldsMap);
    newFieldsMap.delete(`${profileToDelete.type}_${profileName}`);

    const newOriginalFieldsMap = new Map(originalFieldsMap);
    newOriginalFieldsMap.delete(`${profileToDelete.type}_${profileName}`);

    setProfiles(newProfiles);
    setProfileFieldsMap(newFieldsMap);
    setOriginalFieldsMap(newOriginalFieldsMap);

    if (selectedProfile?.name === profileName && newProfiles.length > 0) {
      setSelectedProfile(newProfiles[0]);
    }
  };

  const handleProfileRename = (oldName: string, newName: string) => {
    const profile = profiles.find((p) => p.name === oldName);
    if (!profile) return;

    const newProfiles = profiles.map((p) =>
      p.name === oldName ? { ...p, name: newName } : p
    );

    const fields = profileFieldsMap.get(`${profile.type}_${oldName}`);
    const originalFields = originalFieldsMap.get(`${profile.type}_${oldName}`);
    if (fields) {
      const newFieldsMap = new Map(profileFieldsMap);
      newFieldsMap.delete(`${profile.type}_${oldName}`);
      newFieldsMap.set(`${profile.type}_${newName}`, fields);
      setProfileFieldsMap(newFieldsMap);

      if (originalFields) {
        const newOriginalFieldsMap = new Map(originalFieldsMap);
        newOriginalFieldsMap.delete(`${profile.type}_${oldName}`);
        newOriginalFieldsMap.set(`${profile.type}_${newName}`, originalFields);
        setOriginalFieldsMap(newOriginalFieldsMap);
      }
    }

    setProfiles(newProfiles);

    if (selectedProfile?.name === oldName) {
      setSelectedProfile({ ...selectedProfile, name: newName });
    }
  };

  const handleProfileDuplicate = (profileName: string, newName: string) => {
    const profile = profiles.find((p) => p.name === profileName);
    if (!profile) return;

    const newProfile: Profile = {
      name: newName,
      type: profile.type,
      isDefault: false,
    };

    const originalFields = profileFieldsMap.get(
      `${profile.type}_${profileName}`
    );
    const originalFieldsForComparison = originalFieldsMap.get(
      `${profile.type}_${profileName}`
    );
    if (originalFields) {
      const duplicatedFields = JSON.parse(JSON.stringify(originalFields));
      const newFieldsMap = new Map(profileFieldsMap);
      newFieldsMap.set(`${newProfile.type}_${newName}`, duplicatedFields);
      setProfileFieldsMap(newFieldsMap);

      if (originalFieldsForComparison) {
        const newOriginalFieldsMap = new Map(originalFieldsMap);
        newOriginalFieldsMap.set(
          `${newProfile.type}_${newName}`,
          JSON.parse(JSON.stringify(originalFieldsForComparison))
        );
        setOriginalFieldsMap(newOriginalFieldsMap);
      }
    }

    setProfiles([...profiles, newProfile]);
    setSelectedProfile(newProfile);
  };

  const handleFieldChange = (path: string[], value: any) => {
    if (!selectedProfile) return;

    const profileKey = `${selectedProfile.type}_${selectedProfile.name}`;
    const currentFields = profileFieldsMap.get(profileKey) || [];

    // handling for @_is_default_profile field
    if (path.length > 0 && path[path.length - 1] === "@_is_default_profile") {
      // Update the profile's isDefault property
      const updatedProfiles = profiles.map((p) =>
        p.name === selectedProfile.name && p.type === selectedProfile.type
          ? { ...p, isDefault: value === true }
          : p
      );
      setProfiles(updatedProfiles);

      // Also update the selected profile
      setSelectedProfile({ ...selectedProfile, isDefault: value === true });
    }

    const updateField = (
      fields: FormField[],
      targetPath: string[],
      newValue: any
    ): FormField[] => {
      return fields.map((field) => {
        if (JSON.stringify(field.path) === JSON.stringify(targetPath)) {
          return { ...field, value: newValue };
        }

        if (field.fields && targetPath.length > field.path.length) {
          const pathMatches = field.path.every((p, i) => p === targetPath[i]);
          if (pathMatches) {
            return {
              ...field,
              fields: updateField(field.fields, targetPath, newValue),
            };
          }
        }

        return field;
      });
    };

    const updatedFields = updateField([...currentFields], path, value);
    const newFieldsMap = new Map(profileFieldsMap);
    newFieldsMap.set(profileKey, updatedFields);
    setProfileFieldsMap(newFieldsMap);

    //  the current field to check forceInclude flag and defaultValue
    const currentField = findFieldByPath(updatedFields, path);

    const hasForceInclude = currentField?.forceInclude || false;

    // Update modified data for XML generation
    const fieldPath = path;

    // handling for @_profile_name, @_is_default_profile, transport_id and type
    if (
      fieldPath[0] === "@_profile_name" ||
      fieldPath[0] === "@_is_default_profile" ||
      fieldPath[0] === "transport_id" ||
      (fieldPath[0] === "type" &&
        selectedProfile.type === "transport_descriptor")
    ) {
      return; // Don't add these to modified data
    }

    // for all fields (both uploaded and default profiles):
    // determine if the field should be included in modified data
    let shouldInclude = false;

    // check if value matches the default value from the schema
    const matchesDefault =
      currentField &&
      currentField.defaultValue !== undefined &&
      JSON.stringify(value) === JSON.stringify(currentField.defaultValue);

    if (hasForceInclude) {
      // always include if force include is checked
      shouldInclude = true;
    } else if (matchesDefault) {
      // if value matches default and force include is not checked, don't include
      shouldInclude = false;
    } else {
      // include if value is different from default
      shouldInclude = true;
    }

    updateModifiedData(profileKey, fieldPath, value, shouldInclude);
  };

  const handleForceIncludeChange = (path: string[], forceInclude: boolean) => {
    if (!selectedProfile) return;

    const profileKey = `${selectedProfile.type}_${selectedProfile.name}`;
    const currentFields = profileFieldsMap.get(profileKey) || [];

    const updateField = (
      fields: FormField[],
      targetPath: string[],
      newForceInclude: boolean
    ): FormField[] => {
      return fields.map((field) => {
        if (JSON.stringify(field.path) === JSON.stringify(targetPath)) {
          return { ...field, forceInclude: newForceInclude };
        }

        if (field.fields && targetPath.length > field.path.length) {
          const pathMatches = field.path.every((p, i) => p === targetPath[i]);
          if (pathMatches) {
            return {
              ...field,
              fields: updateField(field.fields, targetPath, newForceInclude),
            };
          }
        }

        return field;
      });
    };

    const updatedFields = updateField([...currentFields], path, forceInclude);
    const newFieldsMap = new Map(profileFieldsMap);
    newFieldsMap.set(profileKey, updatedFields);
    setProfileFieldsMap(newFieldsMap);

    // find the field to get its current value
    const field = findFieldByPath(updatedFields, path);

    if (field) {
      // check if value matches the field's defaultValue (schema default)
      const matchesDefault =
        field.defaultValue !== undefined &&
        JSON.stringify(field.value) === JSON.stringify(field.defaultValue);

      // consider empty values as "default" for removal purposes
      const isEmpty =
        field.value === "" || field.value === null || field.value === undefined;
      const shouldRemoveWhenUnchecked = matchesDefault || isEmpty;

      const fieldPath = path;

      // handling for @_profile_name, @_is_default_profile, transport_id and type
      if (
        fieldPath[0] === "@_profile_name" ||
        fieldPath[0] === "@_is_default_profile" ||
        fieldPath[0] === "transport_id" ||
        (fieldPath[0] === "type" &&
          selectedProfile.type === "transport_descriptor")
      ) {
        return;
      }

      if (forceInclude) {
        // Force include is checked - add the field value to modified data
        updateModifiedData(profileKey, fieldPath, field.value, true);
      } else {
        // Force include is unchecked
        if (shouldRemoveWhenUnchecked) {
          // Remove from modified data if it's default/empty
          updateModifiedData(profileKey, fieldPath, field.value, false);
        }
      }
    }
  };

  // // Render modified configurations panel
  // const renderModifiedConfigs = () => {
  //   const modifiedConfigs: React.ReactElement[] = [];

  //   // Add modified profiles
  //   modifiedProfilesData.forEach((data, profileKey) => {
  //     const [profileType, ...profileNameParts] = profileKey.split("_");
  //     const profileName = profileNameParts.join("_");

  //     const renderConfigItem = (
  //       key: string,
  //       value: any,
  //       path: string[] = [],
  //       indent: number = 0
  //     ) => {
  //       const fullPath = [...path, key];
  //       const pathString = fullPath.join(".");

  //       if (
  //         typeof value === "object" &&
  //         value !== null &&
  //         !Array.isArray(value)
  //       ) {
  //         return (
  //           <div key={pathString} style={{ marginLeft: `${indent * 20}px` }}>
  //             <div className="font-medium text-sm text-gray-700 mt-2">
  //               {key}:
  //             </div>
  //             {Object.entries(value).map(([k, v]) =>
  //               renderConfigItem(k, v, fullPath, indent + 1)
  //             )}
  //           </div>
  //         );
  //       }

  //       return (
  //         <div
  //           key={pathString}
  //           className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded group"
  //           style={{ marginLeft: `${indent * 20}px` }}
  //         >
  //           <div className="flex-1 min-w-0">
  //             <span className="text-sm text-gray-600">{key}:</span>
  //             <span className="text-sm font-medium ml-2 break-words">
  //               {Array.isArray(value)
  //                 ? `[${value.length} items]`
  //                 : String(value)}
  //             </span>
  //           </div>
  //           <button
  //             className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200 flex-shrink-0"
  //             onClick={() => {
  //               // Remove this field from modified data
  //               const newModifiedData = new Map(modifiedProfilesData);
  //               const profileData = newModifiedData.get(profileKey);
  //               if (!profileData) return;

  //               let current = profileData;
  //               for (let i = 0; i < fullPath.length - 1; i++) {
  //                 if (!current[fullPath[i]]) return;
  //                 current = current[fullPath[i]];
  //               }

  //               delete current[fullPath[fullPath.length - 1]];

  //               // Clean up empty objects
  //               const cleanEmptyObjects = (obj: any): any => {
  //                 Object.keys(obj).forEach((key) => {
  //                   if (
  //                     typeof obj[key] === "object" &&
  //                     obj[key] !== null &&
  //                     !Array.isArray(obj[key])
  //                   ) {
  //                     cleanEmptyObjects(obj[key]);
  //                     if (Object.keys(obj[key]).length === 0) {
  //                       delete obj[key];
  //                     }
  //                   }
  //                 });
  //                 return obj;
  //               };

  //               cleanEmptyObjects(profileData);

  //               if (Object.keys(profileData).length === 0) {
  //                 newModifiedData.delete(profileKey);
  //               } else {
  //                 newModifiedData.set(profileKey, profileData);
  //               }

  //               setModifiedProfilesData(newModifiedData);
  //             }}
  //             title="Remove this configuration"
  //             type="button"
  //           >
  //             <X className="h-4 w-4" />
  //           </button>
  //         </div>
  //       );
  //     };

  //     modifiedConfigs.push(
  //       <Card key={profileKey} className="mb-3">
  //         <CardHeader className="py-3">
  //           <div className="flex items-center justify-between">
  //             <CardTitle className="text-sm flex items-center gap-2">
  //               <FileCode className="h-4 w-4" />
  //               {profileName} ({profileType})
  //             </CardTitle>
  //           </div>
  //         </CardHeader>
  //         <div className="px-4 pb-3">
  //           {Object.entries(data).map(([key, value]) =>
  //             renderConfigItem(key, value)
  //           )}
  //         </div>
  //       </Card>
  //     );
  //   });

  //   // Add modified log configs
  //   if (Object.keys(modifiedLogData).length > 0) {
  //     modifiedConfigs.push(
  //       <Card key="log-config" className="mb-3">
  //         <CardHeader className="py-3">
  //           <div className="flex items-center justify-between">
  //             <CardTitle className="text-sm flex items-center gap-2">
  //               <FileCode className="h-4 w-4" />
  //               Log Configuration
  //             </CardTitle>
  //           </div>
  //         </CardHeader>
  //         <div className="px-4 pb-3">
  //           <p className="text-sm text-gray-500">
  //             Log configuration details...
  //           </p>
  //         </div>
  //       </Card>
  //     );
  //   }

  //   if (modifiedConfigs.length === 0) {
  //     return (
  //       <div className="text-center py-8 text-gray-500 text-sm">
  //         No configurations modified yet
  //       </div>
  //     );
  //   }

  //   return <div>{modifiedConfigs}</div>;
  // };

  const renderSelectedProfile = () => {
    if (!selectedProfile) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          Select a profile to edit
        </div>
      );
    }

    const profileKey = `${selectedProfile.type}_${selectedProfile.name}`;
    const fields = profileFieldsMap.get(profileKey);
    const originalFields = originalFieldsMap.get(profileKey) || [];

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return (
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>No configuration available</CardTitle>
            </CardHeader>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedProfile.name} Configuration
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({selectedProfile.type})
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {fields.map((field) => (
            <FormFieldComponent
              key={field.name}
              field={field}
              onChange={handleFieldChange}
              isModified={isFieldModified(field, originalFields)}
              originalFields={originalFields}
              validationError={undefined}
              excludeDefaults={excludeDefaults}
              onForceIncludeChange={handleForceIncludeChange}
            />
          ))}
        </div>
      </div>
    );
  };

  // base height: viewport - header (72px) - control bar (88px) - footer (88px) - Coming Soon div (64px)
  const baseHeight = "calc(100vh - 72px - 88px - 88px)";

  return (
    <div className="flex flex-col" style={{ height: baseHeight }}>
      {/* Tabs header */}
      <div className="flex-shrink-0 px-6 border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("profiles")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "profiles"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Profiles
          </button>
          <button
            onClick={() => setActiveTab("log")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "log"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Log
          </button>
          <button
            onClick={() => setActiveTab("types")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "types"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Types
          </button>
          {/* <button
            onClick={() => setActiveTab("modified")}
            className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
              activeTab === "modified"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Modified Configs
            {(modifiedProfilesData.size > 0 ||
              Object.keys(modifiedLogData).length > 0) && (
              <span className="absolute -top-1 -right-2 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {modifiedProfilesData.size +
                  (Object.keys(modifiedLogData).length > 0 ? 1 : 0)}
              </span>
            )}
          </button> */}
        </nav>
      </div>

      {/* Content area - scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Alerts and notices - inside scrollable area */}
        <div className="flex-shrink-0">
          {/* Validation alerts */}
          {validationResult &&
            (validationResult.errors.length > 0 ||
              validationResult.warnings.length > 0) && (
              <div className="p-4 space-y-2 border-b bg-red-50">
                {validationResult.errors.length > 0 && (
                  <div className="flex items-start space-x-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Errors:</p>
                      <ul className="list-disc list-inside">
                        {validationResult.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {validationResult.warnings.length > 0 && (
                  <div className="flex items-start space-x-2 text-sm text-yellow-600">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Warnings:</p>
                      <ul className="list-disc list-inside">
                        {validationResult.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {validationResult.autoFixAvailable.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Auto-fix applied for:{" "}
                    {validationResult.autoFixAvailable.join(", ")}
                  </p>
                )}
              </div>
            )}

          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center space-x-2 text-sm text-blue-700">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p>
                <span className="font-medium">Coming Soon:</span> Support for
                Log and Types profiles will be available in a
                future update.
              </p>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === "profiles" && (
            <>
              <div className="w-[28rem] min-w-[24rem] border-r bg-gray-50 p-4 overflow-y-scroll">
                <ProfileManager
                  profiles={profiles}
                  selectedProfile={selectedProfile}
                  onProfileSelect={setSelectedProfile}
                  onProfileAdd={handleProfileAdd}
                  onProfileDelete={handleProfileDelete}
                  onProfileRename={handleProfileRename}
                  onProfileDuplicate={handleProfileDuplicate}
                  disableMultipleProfiles={true}
                  hideActionButtons={true}
                />
              </div>
              <div className="flex-1 p-6 overflow-y-scroll">
                {selectedProfile ? (
                  renderSelectedProfile()
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Select a profile to edit</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* {activeTab === "log" && (
            <div className="flex-1 overflow-y-scroll p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {logFields.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Log
                    </h3>
                    <p className="text-gray-600">No log fields available.</p>
                  </div>
                ) : (
                  <>
                    {logFields.map((field) => (
                      <FormFieldComponent
                        key={field.name}
                        field={field}
                        onChange={(path, value) => {
                          const updateFieldValue = (
                            fields: FormField[],
                            targetPath: string[],
                            newValue: any
                          ): FormField[] => {
                            return fields.map((f) => {
                              if (
                                JSON.stringify(f.path) ===
                                JSON.stringify(targetPath)
                              ) {
                                return { ...f, value: newValue } as any;
                              }
                              if (
                                f.type === "array" &&
                                f.value &&
                                Array.isArray(f.value)
                              ) {
                                const pathMatches = f.path.every(
                                  (p, i) => p === targetPath[i]
                                );
                                if (
                                  pathMatches &&
                                  targetPath.length > f.path.length
                                ) {
                                  const arrayIndex = parseInt(
                                    targetPath[f.path.length]
                                  );
                                  if (
                                    !isNaN(arrayIndex) &&
                                    arrayIndex < f.value.length
                                  ) {
                                    const itemPath = targetPath.slice(
                                      f.path.length + 1
                                    );
                                    if (itemPath.length === 0) {
                                      const newArray = [...f.value];
                                      newArray[arrayIndex] = newValue;
                                      return { ...f, value: newArray } as any;
                                    } else {
                                      const newArray = [...f.value];
                                      let current = newArray[arrayIndex];
                                      for (
                                        let i = 0;
                                        i < itemPath.length - 1;
                                        i++
                                      ) {
                                        if (!current[itemPath[i]]) {
                                          current[itemPath[i]] = {};
                                        }
                                        current = current[itemPath[i]];
                                      }
                                      current[itemPath[itemPath.length - 1]] =
                                        newValue;
                                      return { ...f, value: newArray } as any;
                                    }
                                  }
                                }
                              }
                              if (f.fields && targetPath.length > f.path.length) {
                                const pathMatches = f.path.every(
                                  (p, i) => p === targetPath[i]
                                );
                                if (pathMatches) {
                                  return {
                                    ...f,
                                    fields: updateFieldValue(
                                      f.fields,
                                      targetPath,
                                      newValue
                                    ),
                                  } as any;
                                }
                              }
                              return f as any;
                            });
                          };

                          const updated = updateFieldValue(logFields, path, value);
                          setLogFields(updated);
                          const xml = formFieldsToXML(
                            updated,
                            true,
                            "fastdds",
                            undefined,
                            originalLogFields
                          );
                          setModifiedLogData(xml);
                        }}
                        isModified={isFieldModified(field, originalLogFields)}
                        originalFields={originalLogFields}
                        excludeDefaults={true}
                        onForceIncludeChange={(path, forceInclude) => {
                          const apply = (
                            fields: FormField[],
                            targetPath: string[]
                          ): FormField[] =>
                            fields.map((f) => {
                              if (
                                JSON.stringify(f.path) ===
                                JSON.stringify(targetPath)
                              ) {
                                return { ...f, forceInclude } as any;
                              }
                              if (f.fields && targetPath.length > f.path.length) {
                                const pathMatches = f.path.every(
                                  (p, i) => p === targetPath[i]
                                );
                                if (pathMatches) {
                                  return {
                                    ...f,
                                    fields: apply(f.fields, targetPath),
                                  } as any;
                                }
                              }
                              return f as any;
                            });
                          const updated = apply(logFields, path);
                          setLogFields(updated);
                          const xml = formFieldsToXML(
                            updated,
                            true,
                            "fastdds",
                            undefined,
                            originalLogFields
                          );
                          setModifiedLogData(xml);
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "types" && (
            <div className="flex-1 p-6 overflow-y-scroll">
              <div className="max-w-4xl mx-auto">
                <TypesEditor types={typeDefinitions} onChange={setTypeDefinitions} />
              </div>
            </div>
          )} */}

{activeTab === "log" && (
          <div className="flex-1 overflow-y-scroll p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Log Configuration
                </h3>
                <p className="text-gray-600">
                  Support for Log configuration is coming soon.
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  This feature will be available in a future release.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "types" && (
          <div className="flex-1 p-6 overflow-y-scroll">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Types Configuration
                </h3>
                <p className="text-gray-600">
                  Support for Types configuration is coming soon.
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  This feature will be available in a future release.
                </p>
              </div>
            </div>
          </div>
        )}

          {/* {activeTab === "modified" && (
            <div className="flex-1 p-6 overflow-y-scroll">
              <div className="max-w-4xl mx-auto">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Modified Configurations
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    These configurations will be included in the generated XML.
                    Hover over any item and click the × button to remove it.
                  </p>
                </div>
                {renderModifiedConfigs()}
              </div>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}
