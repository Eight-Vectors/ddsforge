import { useState, useEffect, useCallback } from "react";
import type { FormField } from "../types/dds";
import { ProfileManager } from "./ProfileManager";
import { FormField as FormFieldComponent } from "./FormField";
import { type TypeDefinition } from "./TypesEditor";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { xmlToFormFields, buildXML } from "../utils/xmlParser";
import { isFieldModified, findFieldByPath } from "../utils/fieldUtils";
import { getDefaultProfileData } from "../utils/profileUtils";
import { FastDDSValidator } from "../utils/fastddsRules";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface Profile {
  name: string;
  type: string;
  isDefault: boolean;
}

interface FastDDSProfileCreatorProps {
  onXMLGenerate: (xml: string) => void;
}

export default function FastDDSProfileCreator({
  onXMLGenerate,
}: FastDDSProfileCreatorProps) {
  // always exclude defaults - this is the default behavior
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

  const [modifiedProfilesData, setModifiedProfilesData] = useState<
    Map<string, any>
  >(new Map());

  const [modifiedLogData, _setModifiedLogData] = useState<any>({});
  const [types, setTypes] = useState<TypeDefinition[]>([]);
  const [fieldValidationErrors] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    autoFixAvailable: string[];
  } | null>(null);

  const getProfileSchemaStructure = (profileType: string): any => {
    return getDefaultProfileData(profileType);
  };

  useEffect(() => {
    const defaultProfiles: Profile[] = [
      {
        name: "default_factory",
        type: "domainparticipant_factory",
        isDefault: true,
      },
      { name: "default_participant", type: "participant", isDefault: true },
      { name: "default_topic", type: "topic", isDefault: true },
      {
        name: "default_transport",
        type: "transport_descriptor",
        isDefault: true,
      },
    ];

    setProfiles(defaultProfiles);

    const newFieldsMap = new Map<string, FormField[]>();
    const newOriginalFieldsMap = new Map<string, FormField[]>();

    defaultProfiles.forEach((profile) => {
      const profileKey = `${profile.type}_${profile.name}`;

      const schemaData = getProfileSchemaStructure(profile.type);
      if (!schemaData) {
        console.warn(`No schema data found for profile type: ${profile.type}`);
        return;
      }

      const schemaFields = xmlToFormFields(schemaData);

      const resetToEmpty = (fields: FormField[]): FormField[] => {
        return fields.map((field) => {
          const emptyField = { ...field };

          // handle special fields that need to retain their values
          if (
            field.name === "@_profile_name" &&
            profile.type !== "transport_descriptor"
          ) {
            emptyField.value = profile.name;
            emptyField.defaultValue = profile.name;
          } else if (
            field.name === "transport_id" &&
            profile.type === "transport_descriptor"
          ) {
            emptyField.value = profile.name;
            emptyField.defaultValue = profile.name;
          } else if (
            field.name === "type" &&
            profile.type === "transport_descriptor"
          ) {
            emptyField.value = "UDPv4";

            emptyField.defaultValue = "UDPv4";
          }

          // recursively reset nested fields
          if (field.fields && field.fields.length > 0) {
            emptyField.fields = resetToEmpty(field.fields);
          }

          return emptyField;
        });
      };

      const emptyFields = resetToEmpty(schemaFields);

      // deep clone for original fields
      const originalFieldsCopy = JSON.parse(JSON.stringify(emptyFields));

      newFieldsMap.set(profileKey, emptyFields);
      newOriginalFieldsMap.set(profileKey, originalFieldsCopy);
    });

    setProfileFieldsMap(newFieldsMap);
    setOriginalFieldsMap(newOriginalFieldsMap);

    setTypes([]);
  }, []);

  const handleProfileSelect = (profile: Profile) => {
    setSelectedProfile(profile);

    // initialize fields if not already present
    const profileKey = `${profile.type}_${profile.name}`;
    if (!profileFieldsMap.has(profileKey)) {
      const schemaData = getProfileSchemaStructure(profile.type);
      if (!schemaData) {
        console.warn(`No schema data found for profile type: ${profile.type}`);
        return;
      }

      const schemaFields = xmlToFormFields(schemaData);

      const resetToEmpty = (fields: FormField[]): FormField[] => {
        return fields.map((field) => {
          const emptyField = { ...field };

          if (
            field.name === "@_profile_name" &&
            profile.type !== "transport_descriptor"
          ) {
            emptyField.value = profile.name;
            emptyField.defaultValue = profile.name;
          } else if (
            field.name === "transport_id" &&
            profile.type === "transport_descriptor"
          ) {
            emptyField.value = profile.name;
            emptyField.defaultValue = profile.name;
          } else if (
            field.name === "type" &&
            profile.type === "transport_descriptor"
          ) {
            emptyField.value = "UDPv4";

            emptyField.defaultValue = "UDPv4";
          }

          if (field.fields && field.fields.length > 0) {
            emptyField.fields = resetToEmpty(field.fields);
          }

          return emptyField;
        });
      };

      const emptyFields = resetToEmpty(schemaFields);

      // deep clone for original fields
      const originalFieldsCopy = JSON.parse(JSON.stringify(emptyFields));

      setProfileFieldsMap(
        new Map(profileFieldsMap.set(profileKey, emptyFields))
      );
      setOriginalFieldsMap(
        new Map(originalFieldsMap.set(profileKey, originalFieldsCopy))
      );
    }
  };

  // // helper to delete a specific field from modified data
  // const deleteModifiedField = (profileKey: string, path: string[]) => {
  //   const newModifiedData = new Map(modifiedProfilesData);
  //   const profileData = newModifiedData.get(profileKey);

  //   if (!profileData) return;

  //   let current = profileData;

  //   // Navigate to parent of the field
  //   for (let i = 0; i < path.length - 1; i++) {
  //     if (!current[path[i]]) return;
  //     current = current[path[i]];
  //   }

  //   // Delete the field
  //   delete current[path[path.length - 1]];

  //   // Clean up empty objects
  //   const cleanEmptyObjects = (obj: any): any => {
  //     Object.keys(obj).forEach((key) => {
  //       if (
  //         typeof obj[key] === "object" &&
  //         obj[key] !== null &&
  //         !Array.isArray(obj[key])
  //       ) {
  //         cleanEmptyObjects(obj[key]);
  //         if (Object.keys(obj[key]).length === 0) {
  //           delete obj[key];
  //         }
  //       }
  //     });
  //     return obj;
  //   };

  //   cleanEmptyObjects(profileData);

  //   if (Object.keys(profileData).length === 0) {
  //     newModifiedData.delete(profileKey);
  //   } else {
  //     newModifiedData.set(profileKey, profileData);
  //   }

  //   setModifiedProfilesData(newModifiedData);
  // };

  const updateModifiedData = (
    profileKey: string,
    path: string[],
    value: any,
    shouldInclude: boolean
  ) => {
    const newModifiedData = new Map(modifiedProfilesData);

    if (!shouldInclude) {
      // remove the field from modified data
      const profileData = newModifiedData.get(profileKey);
      if (!profileData) return;

      let current = profileData;

      // navigate to parent of the field
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) return;
        current = current[path[i]];
      }

      // delete the field
      delete current[path[path.length - 1]];

      // clean up empty objects recursively
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

      // remove profile if empty
      if (Object.keys(profileData).length === 0) {
        newModifiedData.delete(profileKey);
      } else {
        newModifiedData.set(profileKey, profileData);
      }
    } else {
      // add/update the field in modified data
      const profileData = newModifiedData.get(profileKey) || {};
      let current = profileData;

      // navigate to the field location
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      newModifiedData.set(profileKey, profileData);
    }

    setModifiedProfilesData(newModifiedData);
  };

  const handleFieldChange = (path: string[], value: any) => {
    if (selectedProfile) {
      const profileKey = `${selectedProfile.type}_${selectedProfile.name}`;
      const fields = profileFieldsMap.get(profileKey);
      const originalFields = originalFieldsMap.get(profileKey) || [];

      if (fields) {
        const updatedFields = updateFieldValue(fields, path, value);
        const newMap = new Map(profileFieldsMap);
        newMap.set(profileKey, updatedFields);
        setProfileFieldsMap(newMap);

        // find the current field to check forceInclude flag and defaultValue
        const currentField =
          updatedFields.find(
            (f) => JSON.stringify(f.path) === JSON.stringify(path)
          ) || findFieldByPath(updatedFields, path);

        // check if the field is modified by comparing with original
        const originalField =
          originalFields.find(
            (f) => JSON.stringify(f.path) === JSON.stringify(path)
          ) || findFieldByPath(originalFields, path);

        let isModified = false;

        if (!originalField) {
          isModified = true;
        } else if (typeof value === "boolean" && currentField) {
          // for boolean fields, check against the field's defaultValue (schema default)
          const fieldDefault = currentField.defaultValue;
          isModified = value !== fieldDefault;
        } else {
          // for other field types, use the original comparison
          isModified =
            JSON.stringify(value) !== JSON.stringify(originalField.value);
        }
        const hasForceInclude = currentField?.forceInclude || false;

        // update modified data for XML generation
        const fieldPath = path;

        // handling for @_profile_name, @_is_default_profile, transport_id and type
        // these are handled separately in XML generation
        if (
          fieldPath[0] === "@_profile_name" ||
          fieldPath[0] === "@_is_default_profile" ||
          fieldPath[0] === "transport_id" ||
          (fieldPath[0] === "type" &&
            selectedProfile.type === "transport_descriptor")
        ) {
          return;
        }

        // for all other fields:
        // include in modified data if:
        // 1. value is different from the field's default value
        // 2. OR forceInclude is checked
        // 3. OR for boolean fields, it was explicitly set
        let shouldInclude = false;

        if (hasForceInclude) {
          shouldInclude = true;
        } else if (currentField && currentField.defaultValue !== undefined) {
          // check against the field's defaultValue (schema default)
          const matchesDefault =
            JSON.stringify(value) === JSON.stringify(currentField.defaultValue);
          shouldInclude = !matchesDefault;
        } else {
          // if no default value is defined, include if modified from original
          shouldInclude = isModified;
        }
        updateModifiedData(profileKey, fieldPath, value, shouldInclude);
      }
    }
  };

  const updateFieldValue = (
    fields: FormField[],
    targetPath: string[],
    newValue: any
  ): FormField[] => {
    return fields.map((field) => {
      if (JSON.stringify(field.path) === JSON.stringify(targetPath)) {
        return { ...field, value: newValue };
      }

      if (field.type === "array" && field.value && Array.isArray(field.value)) {
        const pathMatches = field.path.every((p, i) => p === targetPath[i]);
        if (pathMatches && targetPath.length > field.path.length) {
          const arrayIndex = parseInt(targetPath[field.path.length]);
          if (!isNaN(arrayIndex) && arrayIndex < field.value.length) {
            const itemPath = targetPath.slice(field.path.length + 1);
            if (itemPath.length === 0) {
              const newArray = [...field.value];
              newArray[arrayIndex] = newValue;
              return { ...field, value: newArray };
            } else {
              const newArray = [...field.value];
              let current = newArray[arrayIndex];

              for (let i = 0; i < itemPath.length - 1; i++) {
                if (!current[itemPath[i]]) {
                  current[itemPath[i]] = {};
                }
                current = current[itemPath[i]];
              }

              current[itemPath[itemPath.length - 1]] = newValue;
              return { ...field, value: newArray };
            }
          }
        }
      }

      if (field.fields && targetPath.length > field.path.length) {
        const pathMatches = field.path.every((p, i) => p === targetPath[i]);
        if (pathMatches) {
          return {
            ...field,
            fields: updateFieldValue(field.fields, targetPath, newValue),
          };
        }
      }

      return field;
    });
  };

  const handleForceIncludeChange = (path: string[], forceInclude: boolean) => {
    if (selectedProfile) {
      const profileKey = `${selectedProfile.type}_${selectedProfile.name}`;
      const fields = profileFieldsMap.get(profileKey);

      if (fields) {
        // update the forceInclude flag using the same approach as CycloneDDS
        const updateField = (
          fields: FormField[],
          targetPath: string[]
        ): FormField[] => {
          return fields.map((field) => {
            if (JSON.stringify(field.path) === JSON.stringify(targetPath)) {
              return { ...field, forceInclude };
            }

            if (field.fields && targetPath.length > field.path.length) {
              const pathMatches = field.path.every(
                (p, i) => p === targetPath[i]
              );
              if (pathMatches) {
                return {
                  ...field,
                  fields: updateField(field.fields, targetPath),
                };
              }
            }

            return field;
          });
        };

        const updatedFields = updateField(fields, path);
        setProfileFieldsMap(
          new Map(profileFieldsMap.set(profileKey, updatedFields))
        );

        // find the field to get its current value
        const field = findFieldByPath(updatedFields, path);

        if (field) {
          // check if value matches the field's defaultValue (schema default)
          const matchesDefault =
            field.defaultValue !== undefined &&
            JSON.stringify(field.value) === JSON.stringify(field.defaultValue);

          //consider empty values as "default" for removal purposes
          const isEmpty =
            field.value === "" ||
            field.value === null ||
            field.value === undefined;
          const shouldRemoveWhenUnchecked = matchesDefault || isEmpty;

          const fieldPath = path;

          if (
            fieldPath[0] === "@_profile_name" ||
            fieldPath[0] === "@_is_default_profile" ||
            fieldPath[0] === "transport_id" ||
            (fieldPath[0] === "type" &&
              selectedProfile.type === "transport_descriptor")
          ) {
            return;
          }

          // for all other fields, handle force include
          if (forceInclude) {
            // force include is checked - add the field value to modified data
            updateModifiedData(profileKey, fieldPath, field.value, true);
          } else {
            // force include is unchecked
            if (shouldRemoveWhenUnchecked) {
              updateModifiedData(profileKey, fieldPath, field.value, false);
            }
          }
        }
      }
    }
  };

  const generateXML = useCallback(() => {
    const data: any = {};

    // include log configuration if modified
    if (Object.keys(modifiedLogData).length > 0) {
      if (!data.profiles) data.profiles = {};
      data.profiles.log = modifiedLogData;
    }

    // add profiles from modified data
    const profilesByType = new Map<string, any[]>();

    profiles.forEach((profile) => {
      const profileKey = `${profile.type}_${profile.name}`;
      const modifiedData = modifiedProfilesData.get(profileKey);

      // get the profile name from the fields
      const fields = profileFieldsMap.get(profileKey);
      const profileNameField = fields?.find((f) => f.name === "@_profile_name");
      const profileName = profileNameField?.value || profile.name;

      // check if profile name was modified
      const originalFields = originalFieldsMap.get(profileKey) || [];
      const originalProfileNameField = originalFields.find(
        (f) => f.name === "@_profile_name"
      );
      const profileNameModified =
        profileNameField &&
        originalProfileNameField &&
        profileNameField.value !== originalProfileNameField.value;

      // check if is_default_profile was modified
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

      // for transport descriptors, check if transport_id or type was modified or force included
      let transportIdModified = false;
      let typeModified = false;
      let transportIdForceInclude = false;
      let typeForceInclude = false;

      if (profile.type === "transport_descriptor") {
        const transportIdField = fields?.find((f) => f.name === "transport_id");
        const originalTransportIdField = originalFields.find(
          (f) => f.name === "transport_id"
        );
        transportIdModified = !!(
          transportIdField &&
          originalTransportIdField &&
          transportIdField.value !== originalTransportIdField.value
        );
        transportIdForceInclude = !!transportIdField?.forceInclude;

        const typeField = fields?.find((f) => f.name === "type");
        const originalTypeField = originalFields.find((f) => f.name === "type");
        typeModified = !!(
          typeField &&
          originalTypeField &&
          typeField.value !== originalTypeField.value
        );
        typeForceInclude = !!typeField?.forceInclude;
      }

      // include the profile if it has modified data OR if key attributes were modified or force included
      if (
        (modifiedData && Object.keys(modifiedData).length > 0) ||
        profileNameModified ||
        isDefaultModified ||
        transportIdModified ||
        typeModified ||
        transportIdForceInclude ||
        typeForceInclude
      ) {
        const profileData: any = {};

        // add profile/transport attributes
        if (profile.type !== "transport_descriptor") {
          profileData["@_profile_name"] = profileName;
          // always include is_default_profile for participant profiles
          profileData["@_is_default_profile"] = isDefaultField?.value || false;
        } else {
          // for transport descriptors, include transport_id and type
          const transportIdField = fields?.find(
            (f) => f.name === "transport_id"
          );
          const typeField = fields?.find((f) => f.name === "type");
          profileData["transport_id"] = transportIdField?.value || profile.name;
          profileData["type"] = typeField?.value || "UDPv4";
        }

        // add the modified data if any
        if (modifiedData) {
          Object.assign(profileData, modifiedData);
        }

        if (!profilesByType.has(profile.type)) {
          profilesByType.set(profile.type, []);
        }
        profilesByType.get(profile.type)!.push(profileData);
      }
    });

    // Process profiles in the required XML schema order: transport_descriptors MUST come first
    const orderedTypes = [
      "transport_descriptor",
      "domainparticipant_factory",
      "participant",
      "data_writer",
      "data_reader",
      "topic",
    ];

    orderedTypes.forEach((type) => {
      const profileList = profilesByType.get(type);
      if (!profileList || profileList.length === 0) return;

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

    // add types if any
    if (types.length > 0) {
      data.types = types.map((type) => ({
        type: {
          "@_name": type.name,
          ...(type.kind && { kind: type.kind }),
        },
      }));
    }

    // only include profiles section if there's actual content
    const hasProfiles = data.profiles && Object.keys(data.profiles).length > 0;
    const hasTypes = data.types && data.types.length > 0;

    if (!hasProfiles && !hasTypes) {
      setValidationResult(null);
      return buildXML({}, "fastdds");
    }

    // validate configuration before generating XML
    const validator = new FastDDSValidator();
    const validation = validator.validateConfig(data);
    setValidationResult(validation);

    return buildXML(data, "fastdds");
  }, [
    profiles,
    profileFieldsMap,
    modifiedProfilesData,
    modifiedLogData,
    types,
  ]);

  // generate XML whenever modified data changes
  useEffect(() => {
    const xml = generateXML();
    onXMLGenerate(xml);
  }, [
    modifiedProfilesData,
    modifiedLogData,
    types,
    onXMLGenerate,
    generateXML,
  ]);

  // // render modified configurations panel
  // const renderModifiedConfigs = () => {
  //   const modifiedConfigs: React.ReactElement[] = [];

  //   // add modified profiles
  //   modifiedProfilesData.forEach((data, profileKey) => {
  //     const [profileType, profileName] = profileKey.split("_");

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
  //             onClick={() => deleteModifiedField(profileKey, fullPath)}
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
  //     const renderLogItem = (
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
  //               renderLogItem(k, v, fullPath, indent + 1)
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
  //               const newLogData = { ...modifiedLogData };
  //               let current = newLogData;

  //               for (let i = 0; i < fullPath.length - 1; i++) {
  //                 if (!current[fullPath[i]]) return;
  //                 current = current[fullPath[i]];
  //               }

  //               delete current[fullPath[fullPath.length - 1]];
  //               setModifiedLogData(newLogData);
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
  //           {Object.entries(modifiedLogData).map(([key, value]) =>
  //             renderLogItem(key, value)
  //           )}
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
              validationError={
                fieldValidationErrors[field.path?.join(".") || ""]
              }
              excludeDefaults={excludeDefaults}
              onForceIncludeChange={handleForceIncludeChange}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 72px - 88px - 88px)" }}
    >
      <div className="px-6 border-b flex-shrink-0">
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
            Log Configuration
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

      {validationResult &&
        (validationResult.errors.length > 0 ||
          validationResult.warnings.length > 0) && (
          <div className="p-4 space-y-2 flex-shrink-0 border-b bg-red-50">
            {validationResult.errors.length > 0 && (
              <div className="flex items-start space-x-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Errors:</p>
                  <ul className="list-disc list-inside">
                    {validationResult.errors.map((error: string, i: number) => (
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
                    {validationResult.warnings.map(
                      (warning: string, i: number) => (
                        <li key={i}>{warning}</li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 p-4 flex items-center space-x-3 border-b">
        <svg
          className="w-5 h-5 text-blue-500 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm text-blue-800">
          <span className="font-medium">Coming Soon:</span> Support for Data
          Writer and Data Reader profiles will be available in a future update.
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {activeTab === "profiles" && (
          <>
            <div className="w-[28rem] min-w-[24rem] border-r bg-gray-50 p-4 overflow-y-scroll">
              <ProfileManager
                profiles={profiles}
                selectedProfile={selectedProfile}
                onProfileSelect={handleProfileSelect}
                onProfileAdd={() => {}}
                onProfileDelete={() => {}}
                onProfileRename={() => {}}
                onProfileDuplicate={() => {}}
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
  );
}
