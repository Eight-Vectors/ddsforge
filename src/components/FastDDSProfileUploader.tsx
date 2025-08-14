import { useState, useEffect, useCallback } from "react";
import type { FormField } from "../types/dds";
import { ProfileManager } from "./ProfileManager";
import { FormField as FormFieldComponent } from "./FormField";
import { type TypeDefinition } from "./TypesEditor";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { xmlToFormFields, formFieldsToXML, buildXML, mergeUploadedDataIntoSchema } from "../utils/xmlParser";
import { getDefaultProfileData } from "../utils/profileUtils";
import { isFieldModified, findFieldByPath } from "../utils/fieldUtils";
import { fastDDSSchema } from "../schemas/fastdds-schema";
import { FastDDSValidator } from "../utils/fastddsRules";
import { AlertCircle, AlertTriangle, X, FileCode } from "lucide-react";

// Check if a field value exists in uploaded XML data
function hasValueInUploadedFastDDSData(
  path: string[],
  uploadedData: any,
  profileType?: string,
  profileName?: string
): boolean {
  if (!uploadedData || !Array.isArray(path) || path.length === 0) {
    return false;
  }

  if (profileType && profileName && uploadedData.profiles) {
    let current = uploadedData.profiles[profileType];
    if (!current) return false;

    if (Array.isArray(current)) {
      current = current.find(
        (profile: any) =>
          profile["@_profile_name"] === profileName ||
          profile.profile_name === profileName ||
          profile.transport_id === profileName
      );
    }

    if (!current) return false;

    // Now paths don't have profile type and name prefix, so use the full path
    for (const key of path) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return false;
      }
    }

    return current !== undefined;
  }

  let current = uploadedData;
  for (const key of path) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }

  return current !== undefined;
}

interface FastDDSProfileEditorProps {
  uploadedData?: any;
  onXMLGenerate: (xml: string) => void;
}

interface Profile {
  name: string;
  type: string;
  isDefault: boolean;
}

export function FastDDSProfileUploader({
  uploadedData,
  onXMLGenerate,
}: FastDDSProfileEditorProps) {
  // Always exclude defaults - this is the default behavior
  const excludeDefaults = true;
  const [activeTab, setActiveTab] = useState<"profiles" | "log" | "types" | "modified">(
    "profiles"
  );

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const [profileFieldsMap, setProfileFieldsMap] = useState<
    Map<string, FormField[]>
  >(new Map());
  const [originalFieldsMap, setOriginalFieldsMap] = useState<
    Map<string, FormField[]>
  >(new Map());
  
  // Track which profiles were from uploaded data vs defaults
  const [uploadedProfileKeys, setUploadedProfileKeys] = useState<Set<string>>(new Set());
  // New state to track only modified data for XML generation (like FastDDSProfileCreator)
  const [modifiedProfilesData, setModifiedProfilesData] = useState<Map<string, any>>(new Map());
  const [modifiedLogData, setModifiedLogData] = useState<any>({});
  // Track which default profiles have been actually modified by the user
  const [modifiedDefaultProfiles, setModifiedDefaultProfiles] = useState<Set<string>>(new Set());
  // Store original uploaded data for each profile
  const [originalUploadedData, setOriginalUploadedData] = useState<Map<string, any>>(new Map());

  const [logFields, setLogFields] = useState<FormField[]>([]);
  const [typeDefinitions, setTypeDefinitions] = useState<TypeDefinition[]>([]);
  const [originalLogFields, setOriginalLogFields] = useState<FormField[]>([]);

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

            // Store original uploaded data
            uploadedDataMap.set(`transport_descriptor_${profileName}`, desc);
            // Merge uploaded data with schema defaults to show all fields
            const schemaData = getDefaultProfileData("transport_descriptor");
            const mergedData = mergeUploadedDataIntoSchema(desc, schemaData);
            // Use nested structure - don't pass path prefix
            const fields = xmlToFormFields(mergedData);
            fieldsMap.set(`transport_descriptor_${profileName}`, fields);
          });
        } else if (type === "domainparticipant_factory") {
          // Handle domainparticipant_factory as a special case (singleton, not array)
          const profileName = profileData["@_profile_name"] || "domainparticipant_factory_profile";
          const profile: Profile = {
            name: profileName,
            type: "domainparticipant_factory",
            isDefault: false,
          };
          parsedProfiles.push(profile);
          // Track this profile type immediately
          uploadedProfileTypes.add("domainparticipant_factory");

          // Store original uploaded data
          uploadedDataMap.set(`domainparticipant_factory_${profileName}`, profileData);
          // Merge uploaded data with schema defaults to show all fields
          const schemaData = getDefaultProfileData("domainparticipant_factory");
          const mergedData = mergeUploadedDataIntoSchema(profileData, schemaData);
          // Use nested structure - don't pass path prefix
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

            // Store original uploaded data
            uploadedDataMap.set(`${type}_${profileName}`, p);
            
            // Debug logging for participant profiles
            if (type === "participant") {
              console.log("FastDDSProfileUploader - Processing participant:", {
                profileName,
                uploadedData: p,
                hasRtps: !!p.rtps,
                hasUserTransports: !!p.rtps?.userTransports,
                userTransportsValue: p.rtps?.userTransports
              });
            }
            
            // Merge uploaded data with schema defaults to show all fields
            const schemaData = getDefaultProfileData(type);
            const mergedData = schemaData ? mergeUploadedDataIntoSchema(p, schemaData) : p;
            
            // Debug merged data
            if (type === "participant") {
              console.log("FastDDSProfileUploader - After merge:", {
                profileName,
                mergedUserTransports: mergedData.rtps?.userTransports,
                mergedUseBuiltinTransports: mergedData.rtps?.useBuiltinTransports
              });
            }
            
            // Use nested structure - don't pass path prefix
            const fields = xmlToFormFields(mergedData);
            
            // Debug userTransports field
            if (type === "participant") {
              const rtpsField = fields.find((f: any) => f.name === "rtps");
              if (rtpsField && rtpsField.fields) {
                const userTransportsField = rtpsField.fields.find((f: any) => f.name === "userTransports");
                console.log("FastDDSProfileUploader - userTransports field:", {
                  profileName,
                  userTransportsField,
                  value: userTransportsField?.value
                });
              }
            }
            
            fieldsMap.set(`${type}_${profileName}`, fields);
          });
        }
      });

      // Track which profiles were loaded from uploaded data BEFORE adding defaults
      // This is important to distinguish between uploaded and default profiles
      parsedProfiles.forEach(profile => {
        uploadedProfileNames.add(`${profile.type}_${profile.name}`);
      });

      if (uploadedData.log) {
        // Use nested structure - don't pass path prefix
        const fields = xmlToFormFields(uploadedData.log);
        setLogFields(fields);
        setOriginalLogFields(JSON.parse(JSON.stringify(fields)));
      } else {
        // Don't add log section if it wasn't in the uploaded data
        setLogFields([]);
        setOriginalLogFields([]);
      }

      if (uploadedData.types && uploadedData.types.type) {
        const typeArray = Array.isArray(uploadedData.types.type)
          ? uploadedData.types.type
          : [uploadedData.types.type];
        const parsedTypes: TypeDefinition[] = typeArray.map((t: any) => {
          const typeDef: TypeDefinition = {
            kind: t.kind || "struct",
            name: t.name || "UnnamedType",
          };

          Object.keys(t).forEach((key) => {
            if (key !== "kind" && key !== "name") {
              (typeDef as any)[key] = t[key];
            }
          });

          return typeDef;
        });
        setTypeDefinitions(parsedTypes);
      } else {
        const defaultTypes: TypeDefinition[] = [];
        if (fastDDSSchema.dds.types && fastDDSSchema.dds.types.type) {
          const typeArray = Array.isArray(fastDDSSchema.dds.types.type)
            ? fastDDSSchema.dds.types.type
            : [fastDDSSchema.dds.types.type];
          typeArray.forEach((t: any) => {
            if (t.kind && t.name) {
              defaultTypes.push(t as TypeDefinition);
            }
          });
        }
        setTypeDefinitions(defaultTypes);
      }

    }
    
    console.log('Uploaded profile types:', Array.from(uploadedProfileTypes));
    console.log('Parsed profiles from upload:', parsedProfiles.map(p => ({ type: p.type, name: p.name })));
    
    // Always add default profiles that don't exist in uploaded data
    const defaultProfiles: Profile[] = [
      { name: "domainparticipant_factory_profile", type: "domainparticipant_factory", isDefault: false },
      { name: "default_participant", type: "participant", isDefault: true },
      { name: "default_topic", type: "topic", isDefault: false }, // Changed to match schema
      { name: "default_transport", type: "transport_descriptor", isDefault: false },
    ];
    
    defaultProfiles.forEach((profile) => {
      const profileKey = `${profile.type}_${profile.name}`;
      
      // Skip adding default profiles if:
      // 1. The exact same profile already exists (same type and name)
      // 2. OR if uploaded data already has a profile of this type (to avoid duplicates)
      console.log(`Checking default profile: ${profile.type} - ${profile.name}`);
      console.log(`  Has exact match: ${uploadedProfileNames.has(profileKey)}`);
      console.log(`  Has type already: ${uploadedProfileTypes.has(profile.type)}`);
      
      if (!uploadedProfileNames.has(profileKey) && !uploadedProfileTypes.has(profile.type)) {
        const defaultData = getDefaultProfileData(profile.type);
        if (defaultData) {
          parsedProfiles.push(profile);
          // Use nested structure - don't pass path prefix
          const fields = xmlToFormFields(defaultData);
          fieldsMap.set(profileKey, fields);
          // Don't add default profiles to uploadedProfileNames - they should remain as defaults
          // uploadedProfileNames.add(profileKey);
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
    
    // Handle log section
    if (!uploadedData) {
      // Don't add log section by default for new files
      setLogFields([]);
      setOriginalLogFields([]);
    }
    
    // Handle types section  
    if (!uploadedData && fastDDSSchema.dds.types && fastDDSSchema.dds.types.type) {
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

  // Helper to update modified data structure (from FastDDSProfileCreator)
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
  const findFieldByPath = (fields: FormField[], targetPath: string[]): FormField | null => {
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
    const data: any = {};

    // Include log configuration if modified
    if (Object.keys(modifiedLogData).length > 0) {
      if (!data.profiles) data.profiles = {};
      data.profiles.log = modifiedLogData;
    }

    // Add profiles from modified data
    const profilesByType = new Map<string, any[]>();

    profiles.forEach((profile) => {
      const profileKey = `${profile.type}_${profile.name}`;
      const modifiedData = modifiedProfilesData.get(profileKey);
      
      // Get the profile name from the fields
      const fields = profileFieldsMap.get(profileKey);
      const profileNameField = fields?.find((f) => f.name === "@_profile_name");
      const profileName = profileNameField?.value || profile.name;
      
      // Check if profile name was modified
      const originalFields = originalFieldsMap.get(profileKey) || [];
      const originalProfileNameField = originalFields.find((f) => f.name === "@_profile_name");
      const profileNameModified = profileNameField && originalProfileNameField && 
        profileNameField.value !== originalProfileNameField.value;
      
      // Check if is_default_profile was modified
      const isDefaultField = fields?.find((f) => f.name === "@_is_default_profile");
      const originalIsDefaultField = originalFields.find((f) => f.name === "@_is_default_profile");
      const isDefaultModified = isDefaultField && originalIsDefaultField &&
        isDefaultField.value !== originalIsDefaultField.value;

      // For transport descriptors, check if transport_id or type was modified or force included
      let transportIdModified = false;
      let typeModified = false;
      let transportIdForceInclude = false;
      let typeForceInclude = false;
      
      if (profile.type === "transport_descriptor") {
        const transportIdField = fields?.find((f) => f.name === "transport_id");
        const originalTransportIdField = originalFields.find((f) => f.name === "transport_id");
        transportIdModified = !!(transportIdField && originalTransportIdField && 
          transportIdField.value !== originalTransportIdField.value);
        transportIdForceInclude = !!(transportIdField?.forceInclude);
          
        const typeField = fields?.find((f) => f.name === "type");
        const originalTypeField = originalFields.find((f) => f.name === "type");
        typeModified = !!(typeField && originalTypeField && 
          typeField.value !== originalTypeField.value);
        typeForceInclude = !!(typeField?.forceInclude);
      }

      // Include the profile if:
      // 1. It's from uploaded data (always include)
      // 2. OR it has modified data
      // 3. OR key attributes were modified or force included
      const isFromUploadedData = uploadedProfileKeys.has(profileKey);
      
      if (isFromUploadedData || 
          (modifiedData && Object.keys(modifiedData).length > 0) || 
          profileNameModified || isDefaultModified || 
          transportIdModified || typeModified ||
          transportIdForceInclude || typeForceInclude) {
        const profileData: any = {};

        // Add profile/transport attributes
        if (profile.type !== "transport_descriptor") {
          profileData["@_profile_name"] = profileName;
          // Always include is_default_profile for participant profiles
          profileData["@_is_default_profile"] = isDefaultField?.value || false;
        } else {
          // For transport descriptors, include transport_id and type
          const transportIdField = fields?.find((f) => f.name === "transport_id");
          const typeField = fields?.find((f) => f.name === "type");
          profileData["transport_id"] = transportIdField?.value || profile.name;
          profileData["type"] = typeField?.value || "UDPv4";
        }

        // For uploaded profiles, use the original uploaded data
        if (isFromUploadedData) {
          const originalData = originalUploadedData.get(profileKey);
          if (originalData) {
            // Start with the original uploaded data
            const uploadedContent = { ...originalData };
            // Remove profile attributes as they're already handled above
            delete uploadedContent["@_profile_name"];
            delete uploadedContent["@_is_default_profile"];
            delete uploadedContent["transport_id"];
            delete uploadedContent["type"];
            
            // Apply any modifications from the UI
            if (modifiedData) {
              // Deep merge modifications into uploaded data
              const deepMerge = (target: any, source: any) => {
                Object.keys(source).forEach(key => {
                  if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    deepMerge(target[key], source[key]);
                  } else {
                    target[key] = source[key];
                  }
                });
              };
              deepMerge(uploadedContent, modifiedData);
            }
            
            Object.assign(profileData, uploadedContent);
          }
        } else {
          // For non-uploaded profiles, add modified data if any
          if (modifiedData) {
            Object.assign(profileData, modifiedData);
          }
        }

        if (!profilesByType.has(profile.type)) {
          profilesByType.set(profile.type, []);
        }
        profilesByType.get(profile.type)!.push(profileData);
      }
    });

    profilesByType.forEach((profileList, type) => {
      if (!data.profiles) data.profiles = {};

      if (type === "transport_descriptor") {
        data.profiles["transport_descriptors"] = {
          transport_descriptor:
            profileList.length === 1 ? profileList[0] : profileList,
        };
      } else if (type === "domainparticipant_factory") {
        data.profiles[type] = profileList[0];
      } else {
        data.profiles[type] =
          profileList.length === 1 ? profileList[0] : profileList;
      }
    });

    // Add types if any
    if (typeDefinitions.length > 0) {
      // Types handling remains the same as before
      // For now, we'll just include all types as-is
      data.types = {
        type: typeDefinitions.map((t) => ({
          "@_name": t.name,
          kind: t.kind,
          // Add other properties based on type
        })),
      };
    }

    // Only include profiles section if there's actual content
    const hasProfiles = data.profiles && Object.keys(data.profiles).length > 0;
    const hasTypes = data.types && data.types.type && data.types.type.length > 0;

    if (!hasProfiles && !hasTypes) {
      const xml = buildXML({}, "fastdds");
      onXMLGenerate(xml);
    } else {
      // Validate configuration before generating XML
      const validator = new FastDDSValidator();
      const validation = validator.validateConfig(data);
      setValidationResult(validation);

      // Generate XML with auto-fix if there are issues
      const xml = buildXML(data, "fastdds", { 
        autoFix: validation.autoFixAvailable.length > 0 
      });
      onXMLGenerate(xml);
    }
  }, [
    profiles,
    profileFieldsMap,
    modifiedProfilesData,
    modifiedLogData,
    typeDefinitions,
    uploadedProfileKeys,
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
    const originalFields = originalFieldsMap.get(profileKey) || [];
    
    // Special handling for @_is_default_profile field
    if (path.length > 0 && path[path.length - 1] === "@_is_default_profile") {
      // Update the profile's isDefault property
      const updatedProfiles = profiles.map(p => 
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
    
    // Find the current field to check forceInclude flag and defaultValue
    const currentField = findFieldByPath(updatedFields, path);
    
    // Check if the field is modified by comparing with original
    const originalField = findFieldByPath(originalFields, path);
    
    // For boolean fields, we need to check against the actual default value
    let isModified = false;
    if (!originalField) {
      isModified = true;
    } else if (typeof value === 'boolean' && currentField) {
      // For boolean fields, consider it modified if it's different from the schema default
      const schemaDefault = currentField.defaultValue;
      isModified = value !== schemaDefault;
    } else {
      // For other field types, use the original comparison
      isModified = JSON.stringify(value) !== JSON.stringify(originalField.value);
    }
    const hasForceInclude = currentField?.forceInclude || false;

    // Update modified data for XML generation
    const fieldPath = path;

    // Special handling for @_profile_name, @_is_default_profile, transport_id and type
    // These are handled separately in XML generation
    if (
      fieldPath[0] === "@_profile_name" ||
      fieldPath[0] === "@_is_default_profile" ||
      fieldPath[0] === "transport_id" ||
      (fieldPath[0] === "type" && selectedProfile.type === "transport_descriptor")
    ) {
      return; // Don't add these to modified data
    }

    // For uploaded profiles, we don't track modifications - we always include all data
    // For default profiles, track modifications
    const isFromUploadedProfile = uploadedProfileKeys.has(profileKey);
    if (!isFromUploadedProfile) {
      // For all other fields:
      // Include in modified data if:
      // 1. Value is different from default (isModified = true)
      // 2. OR value is default but forceInclude is checked
      const shouldInclude = isModified || hasForceInclude;
      updateModifiedData(profileKey, fieldPath, value, shouldInclude);
    }
  };

  const handleForceIncludeChange = (path: string[], forceInclude: boolean) => {
    if (!selectedProfile) return;

    const profileKey = `${selectedProfile.type}_${selectedProfile.name}`;
    const currentFields = profileFieldsMap.get(profileKey) || [];
    const originalFields = originalFieldsMap.get(profileKey) || [];

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
    
    // Find the field to get its current value
    const field = findFieldByPath(updatedFields, path);
    
    if (field) {
      const originalField = findFieldByPath(originalFields, path);
      const isDefault = originalField &&
        JSON.stringify(field.value) === JSON.stringify(originalField.value);

      // Also consider empty values as "default" for removal purposes
      const isEmpty = field.value === "" || field.value === null || field.value === undefined;
      const shouldRemoveWhenUnchecked = isDefault || isEmpty;

      const fieldPath = path;

      // Special handling for @_profile_name, @_is_default_profile, transport_id and type
      if (
        fieldPath[0] === "@_profile_name" ||
        fieldPath[0] === "@_is_default_profile" ||
        fieldPath[0] === "transport_id" ||
        (fieldPath[0] === "type" && selectedProfile.type === "transport_descriptor")
      ) {
        return; // Don't add these to modified data
      }

      // For uploaded profiles, we don't track modifications - we always include all data
      const isFromUploadedProfile = uploadedProfileKeys.has(profileKey);
      if (!isFromUploadedProfile) {
        // For all other fields, handle force include
        if (forceInclude) {
          // Force include is checked - add the field value to modified data
          updateModifiedData(profileKey, fieldPath, field.value, true);
        } else {
          // Force include is unchecked
          if (shouldRemoveWhenUnchecked) {
            // Remove from modified data if it's default/empty
            updateModifiedData(profileKey, fieldPath, field.value, false);
          }
          // If has non-default, non-empty value, keep it in modified data
        }
      }
    }
  };

  const getCurrentFields = (): FormField[] => {
    if (!selectedProfile) return [];
    return (
      profileFieldsMap.get(`${selectedProfile.type}_${selectedProfile.name}`) ||
      []
    );
  };

  const getOriginalFields = (): FormField[] => {
    if (!selectedProfile) return [];
    return (
      originalFieldsMap.get(
        `${selectedProfile.type}_${selectedProfile.name}`
      ) || []
    );
  };

  // Render modified configurations panel
  const renderModifiedConfigs = () => {
    const modifiedConfigs: React.ReactElement[] = [];

    // Add modified profiles
    modifiedProfilesData.forEach((data, profileKey) => {
      const [profileType, ...profileNameParts] = profileKey.split("_");
      const profileName = profileNameParts.join("_");

      const renderConfigItem = (
        key: string,
        value: any,
        path: string[] = [],
        indent: number = 0
      ) => {
        const fullPath = [...path, key];
        const pathString = fullPath.join(".");

        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          return (
            <div key={pathString} style={{ marginLeft: `${indent * 20}px` }}>
              <div className="font-medium text-sm text-gray-700 mt-2">
                {key}:
              </div>
              {Object.entries(value).map(([k, v]) =>
                renderConfigItem(k, v, fullPath, indent + 1)
              )}
            </div>
          );
        }

        return (
          <div
            key={pathString}
            className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded group"
            style={{ marginLeft: `${indent * 20}px` }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-600">{key}:</span>
              <span className="text-sm font-medium ml-2 break-words">
                {Array.isArray(value)
                  ? `[${value.length} items]`
                  : String(value)}
              </span>
            </div>
            <button
              className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200 flex-shrink-0"
              onClick={() => {
                // Remove this field from modified data
                const newModifiedData = new Map(modifiedProfilesData);
                const profileData = newModifiedData.get(profileKey);
                if (!profileData) return;
                
                let current = profileData;
                for (let i = 0; i < fullPath.length - 1; i++) {
                  if (!current[fullPath[i]]) return;
                  current = current[fullPath[i]];
                }
                
                delete current[fullPath[fullPath.length - 1]];
                
                // Clean up empty objects
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
                
                if (Object.keys(profileData).length === 0) {
                  newModifiedData.delete(profileKey);
                } else {
                  newModifiedData.set(profileKey, profileData);
                }
                
                setModifiedProfilesData(newModifiedData);
              }}
              title="Remove this configuration"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      };

      modifiedConfigs.push(
        <Card key={profileKey} className="mb-3">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                {profileName} ({profileType})
              </CardTitle>
            </div>
          </CardHeader>
          <div className="px-4 pb-3">
            {Object.entries(data).map(([key, value]) =>
              renderConfigItem(key, value)
            )}
          </div>
        </Card>
      );
    });

    // Add modified log configs
    if (Object.keys(modifiedLogData).length > 0) {
      modifiedConfigs.push(
        <Card key="log-config" className="mb-3">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Log Configuration
              </CardTitle>
            </div>
          </CardHeader>
          <div className="px-4 pb-3">
            <p className="text-sm text-gray-500">Log configuration details...</p>
          </div>
        </Card>
      );
    }

    if (modifiedConfigs.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 text-sm">
          No configurations modified yet
        </div>
      );
    }

    return <div>{modifiedConfigs}</div>;
  };

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

  return (
    <div className="flex flex-col h-full">
      {/* Sticky tabs header */}
      <div className="flex-shrink-0 bg-white border-b sticky top-0 z-10">
        <div className="border-b bg-white px-4">
          <nav className="flex space-x-8" aria-label="Tabs">
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
            <button
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
            </button>
          </nav>
        </div>
      </div>

      {/* Content area - scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Alerts and notices - inside scrollable area */}
        <div className="flex-shrink-0">
          {/* Validation alerts */}
          {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
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
                  Auto-fix applied for: {validationResult.autoFixAvailable.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Coming soon notice for Data Writer and Data Reader */}
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center space-x-2 text-sm text-blue-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p>
                <span className="font-medium">Coming Soon:</span> Support for Data Writer and Data Reader profiles will be available in a future update.
              </p>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === "profiles" && (
            <>
              <div className="w-[28rem] min-w-[24rem] border-r bg-gray-50 p-4 overflow-y-auto">
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
              <div className="flex-1 p-6 overflow-y-auto">
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

          {activeTab === "log" && (
          <div className="h-full overflow-hidden flex flex-col">
            <div className="p-6 pb-0">
              <Card className="mb-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Log Configuration</CardTitle>
                  {logFields.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLogFields([]);
                        setOriginalLogFields([]);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove Log Config
                    </Button>
                  )}
                </CardHeader>
              </Card>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-6 max-w-4xl">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-gray-100 rounded-lg p-8 max-w-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
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
            </div>
          </div>
        )}

          {activeTab === "types" && (
          <div className="h-full overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-gray-100 rounded-lg p-8 max-w-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
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
          </div>
        )}

          {activeTab === "modified" && (
          <div className="flex-1 p-6 overflow-y-auto">
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
          )}
        </div>
      </div>
    </div>
  );
}