import { useState, useEffect, useCallback } from "react";
import type { FormField } from "../types/dds";
import { ProfileManager } from "./ProfileManager";
import { FormField as FormFieldComponent } from "./FormField";
import { TypesEditor, type TypeDefinition } from "./TypesEditor";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { xmlToFormFields, buildXML } from "../utils/xmlParser";
import { isFieldModified, findFieldByPath } from "../utils/fieldUtils";
import { getDefaultProfileData } from "../utils/profileUtils";
import { FastDDSValidator } from "../utils/fastddsRules";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { fastDDSSchema } from "../schemas/fastdds-schema";
import { typeDefinitionsToTypesXml } from "../utils/typesXml";

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

  const [modifiedLogData, setModifiedLogData] = useState<any>({});
  const [logFields, setLogFields] = useState<FormField[]>([]);
  const [originalLogFields, setOriginalLogFields] = useState<FormField[]>([]);
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
      { name: "default_data_writer", type: "data_writer", isDefault: true },
      { name: "default_data_reader", type: "data_reader", isDefault: true },
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

    // Initialize Log fields from schema defaults
    const logDefaults = fastDDSSchema.dds.log;
    const lf = xmlToFormFields(logDefaults);
    setLogFields(lf);
    setOriginalLogFields(JSON.parse(JSON.stringify(lf)));

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
          const matchesDefault =
            JSON.stringify(value) === JSON.stringify(currentField.defaultValue);
          shouldInclude = !matchesDefault;
        } else {
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

  // Build log data while pruning defaults and empty structures
  const buildLogDataPruned = (fields: FormField[]): any => {
    const build = (fs: FormField[]): any => {
      const data: any = {};

      fs.forEach((f) => {
        // Arrays
        if (f.type === "array" && Array.isArray(f.value)) {
          if (f.fields && f.fields.length > 0) {
            // Array of objects
            const items = f.value
              .map((item: any) => {
                let itemData: any = {};
                let itemClassValue: any = undefined;

                f.fields!.forEach((childField) => {
                  const childVal = item[childField.name];

                  // Nested arrays within an item (e.g., consumer.property)
                  if (
                    childField.type === "array" &&
                    Array.isArray(childVal)
                  ) {
                    if (childField.fields && childField.fields.length > 0) {
                      const nestedItems = childVal
                        .map((nestedItem: any) => {
                          let nestedItemData: any = {};
                          childField.fields!.forEach((nestedChildField) => {
                            const nestedVal = nestedItem[nestedChildField.name];
                            const nestedPerItemForced =
                              nestedItem?.__forceInclude &&
                              nestedItem.__forceInclude[nestedChildField.name] === true;
                            const nestedInclude =
                              nestedPerItemForced ||
                              nestedChildField.forceInclude === true ||
                              (nestedChildField.defaultValue !== undefined
                                ? JSON.stringify(nestedVal) !==
                                  JSON.stringify(
                                    nestedChildField.defaultValue
                                  )
                                : nestedVal !== undefined && nestedVal !== "");
                            if (nestedInclude) {
                              nestedItemData[nestedChildField.name] = nestedVal;
                            }
                          });
                          return nestedItemData;
                        })
                        .filter((ni: any) => Object.keys(ni).length > 0);

                      if (nestedItems.length > 0 || childField.forceInclude) {
                        itemData[childField.name] = nestedItems;
                      }
                    } else {
                      if (childVal.length > 0 || childField.forceInclude) {
                        itemData[childField.name] = childVal;
                      }
                    }
                    return;
                  }

                  // Nested object within an item
                  if (childField.fields && childField.fields.length > 0) {
                    const nestedObj = build(childField.fields.map((cf) => ({
                      ...cf,
                      // Provide values from the item for nested object properties
                      value:
                        item[childField.name] !== undefined
                          ? item[childField.name][cf.name]
                          : undefined,
                    })));
                    if (Object.keys(nestedObj).length > 0 || childField.forceInclude) {
                      itemData[childField.name] = nestedObj;
                    }
                    return;
                  }

                  // Primitive child within an item
                  if (childField.name === "class") {
                    itemClassValue = childVal;
                  }

                  const childHasValue = childVal !== undefined && childVal !== "";
                  const perItemForced =
                    item?.__forceInclude &&
                    item.__forceInclude[childField.name] === true;
                  const childInclude =
                    perItemForced ||
                    childField.forceInclude === true ||
                    (childField.defaultValue !== undefined
                      ? JSON.stringify(childVal) !==
                        JSON.stringify(childField.defaultValue)
                      : childHasValue);

                  if (childInclude) {
                    itemData[childField.name] = childVal;
                  }
                });

                // Special-case: for FastDDS log consumer, include class if properties exist
                if (
                  f.name === "consumer" &&
                  itemData.property &&
                  !itemData.class &&
                  itemClassValue !== undefined
                ) {
                  itemData.class = itemClassValue;
                }

                return itemData;
              })
              .filter((it: any) => Object.keys(it).length > 0);

            if (items.length > 0 || f.forceInclude) {
              data[f.name] = items;
            }
          } else {
            // Array of primitives
            if (f.value.length > 0 || f.forceInclude) {
              data[f.name] = f.value;
            }
          }
          return;
        }

        // Objects
        if (f.fields && f.fields.length > 0) {
          const childObj = build(f.fields);
          if (Object.keys(childObj).length > 0 || f.forceInclude) {
            data[f.name] = childObj;
          }
          return;
        }

        // Primitives
        const val = f.value;
        const hasValue = val !== undefined && val !== "";
        const include =
          f.forceInclude === true ||
          (f.defaultValue !== undefined
            ? JSON.stringify(val) !== JSON.stringify(f.defaultValue)
            : hasValue);
        if (include) {
          data[f.name] = val;
        }
      });

      return data;
    };

    return build(fields);
  };

  const handleForceIncludeChange = (path: string[], forceInclude: boolean) => {
    if (selectedProfile) {
      const profileKey = `${selectedProfile.type}_${selectedProfile.name}`;
      const fields = profileFieldsMap.get(profileKey);
      const originalFields = originalFieldsMap.get(profileKey) || [];

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
          const isReallyModified = isFieldModified(field as any, originalFields);
          const shouldRemoveWhenUnchecked = matchesDefault || isEmpty || !isReallyModified;

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
      data.log = modifiedLogData;
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

      if (modifiedData || profileNameModified || isDefaultModified) {
        // Always include required attributes when emitting a modified profile
        const baseAttrs: any = {
          "@_profile_name": profileName,
        };
        if (isDefaultField) {
          baseAttrs["@_is_default_profile"] = isDefaultField.value === true;
        }
        const entry = { ...baseAttrs, ...(modifiedData || {}) };

        if (!profilesByType.has(profile.type)) {
          profilesByType.set(profile.type, []);
        }
        profilesByType.get(profile.type)!.push(entry);
      }
    });

    const orderedTypes = [
      "domainparticipant_factory",
      "participant",
      "transport_descriptor",
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
      const typesXml = typeDefinitionsToTypesXml(types);
      if (typesXml) {
        data.types = typesXml;
      }
    }

    // only include profiles section if there's actual content
    const hasProfiles = data.profiles && Object.keys(data.profiles).length > 0;
    const hasTypes = data.types && ((Array.isArray(data.types) && data.types.length > 0) || (data.types.type && data.types.type.length > 0));

    if (!hasProfiles && !hasTypes && !data.log) {
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
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Log Configuration</CardTitle>
                </CardHeader>
              </Card>
              <div className="space-y-6">
                {logFields.map((field) => (
                  <FormFieldComponent
                    key={field.name}
                    field={field}
                    onChange={(path, value) => {
                      const updatedFields = updateFieldValue([...logFields], path, value);
                      setLogFields(updatedFields);
                      // Update modified log data with pruning
                      setModifiedLogData(buildLogDataPruned(updatedFields));
                    }}
                    isModified={isFieldModified(field, originalLogFields)}
                    originalFields={originalLogFields}
                    validationError={undefined}
                    excludeDefaults={excludeDefaults}
                    onForceIncludeChange={(path, forceInclude) => {
                      const isIndex = (s: string) => /^\d+$/.test(s);

                      // Handle per-item (and nested) forceInclude for arrays like consumer[i].property[j].name
                      const idxPos = path.findIndex(isIndex);
                      if (idxPos > 0) {
                        const updateNestedItemForce = (
                          fields: FormField[],
                          targetPath: string[]
                        ): FormField[] => {
                          const arrayRootPath = targetPath.slice(0, idxPos);
                          const firstIndex = parseInt(targetPath[idxPos], 10);
                          const rest = targetPath.slice(idxPos + 1); // e.g., ["property","0","name"] or ["class"]

                          return fields.map((f) => {
                            if (JSON.stringify(f.path) === JSON.stringify(arrayRootPath)) {
                              if (!Array.isArray(f.value)) return f;
                              const newArr = f.value.map((item: any, i: number) => {
                                if (i !== firstIndex) return item;

                                // Walk inside the selected item using the remaining segments
                                const setFlag = (obj: any, segs: string[]): any => {
                                  if (segs.length === 1) {
                                    const fieldName = segs[0];
                                    const fi = { ...(obj.__forceInclude || {}) };
                                    fi[fieldName] = forceInclude;
                                    return { ...obj, __forceInclude: fi };
                                  }

                                  const [fieldName, maybeIndex, ...tail] = segs;
                                  if (/^\d+$/.test(fieldName)) {
                                    // Should not happen; field name expected before index
                                    return obj;
                                  }
                                  const value: any = obj[fieldName];
                                  if (Array.isArray(value) && maybeIndex !== undefined && /^\d+$/.test(maybeIndex)) {
                                    const idx = parseInt(maybeIndex, 10);
                                    const updatedArr: any[] = value.map((child: any, ci: number) => {
                                      if (ci !== idx) return child;
                                      return setFlag(child || {}, tail as string[]);
                                    });
                                    return { ...obj, [fieldName]: updatedArr };
                                  }
                                  // Nested object
                                  const nextObj: any = setFlag(value || {}, [maybeIndex!, ...tail].filter(Boolean) as string[]);
                                  return { ...obj, [fieldName]: nextObj };
                                };

                                return setFlag(item || {}, rest);
                              });
                              return { ...f, value: newArr };
                            }
                            if (f.fields && targetPath.length > f.path.length) {
                              const prefix = f.path.every((p, i) => p === arrayRootPath[i]);
                              if (prefix) {
                                return {
                                  ...f,
                                  fields: updateNestedItemForce(f.fields, targetPath),
                                };
                              }
                            }
                            return f;
                          });
                        };

                        const updated = updateNestedItemForce([...logFields], path);
                        setLogFields(updated);
                        setModifiedLogData(buildLogDataPruned(updated));
                        return;
                      }

                      // Fallback: non-array paths
                      const updateFieldForceInclude = (
                        fields: FormField[],
                        targetPath: string[]
                      ): FormField[] => {
                        const pathsEqual = (a: string[], b: string[]) =>
                          a.length === b.length &&
                          a.every((seg, i) => seg === b[i] || (isIndex(seg) && isIndex(b[i])));

                        const isPrefix = (a: string[], b: string[]) =>
                          a.every((seg, i) => seg === b[i] || (isIndex(seg) && isIndex(b[i])));

                        return fields.map((f) => {
                          if (pathsEqual(f.path as any, targetPath)) {
                            return { ...f, forceInclude };
                          }
                          if (f.fields && targetPath.length > f.path.length) {
                            const pathMatches = isPrefix(f.path as any, targetPath);
                            if (pathMatches) {
                              return {
                                ...f,
                                fields: updateFieldForceInclude(f.fields, targetPath),
                              };
                            }
                          }
                          return f;
                        });
                      };
                      const updatedFields = updateFieldForceInclude([...logFields], path);
                      setLogFields(updatedFields);
                      setModifiedLogData(buildLogDataPruned(updatedFields));
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "types" && (
          <div className="flex-1 p-6 overflow-y-scroll">
            <div className="max-w-6xl mx-auto">
              <TypesEditor types={types} onChange={setTypes} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
