import { useState, useEffect, useCallback } from "react";
import type { FormField } from "../types/dds";
import { ProfileManager } from "./ProfileManager";
import { FormField as FormFieldComponent } from "./FormField";
import { TypesEditor, type TypeDefinition } from "./TypesEditor";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { xmlToFormFields, formFieldsToXML, buildXML } from "../utils/xmlParser";
import { getDefaultProfileData } from "../utils/profileUtils";
import { isFieldModified } from "../utils/fieldUtils";
import { fastDDSSchema } from "../schemas/fastdds-schema";

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

    for (const key of path.slice(2)) {
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
  excludeDefaults: boolean;
}

interface Profile {
  name: string;
  type: string;
  isDefault: boolean;
}

export function FastDDSProfileEditor({
  uploadedData,
  onXMLGenerate,
  excludeDefaults,
}: FastDDSProfileEditorProps) {
  const [activeTab, setActiveTab] = useState<"profiles" | "log" | "types">(
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

  const [logFields, setLogFields] = useState<FormField[]>([]);
  const [typeDefinitions, setTypeDefinitions] = useState<TypeDefinition[]>([]);
  const [originalLogFields, setOriginalLogFields] = useState<FormField[]>([]);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (uploadedData?.profiles) {
      const parsedProfiles: Profile[] = [];
      const fieldsMap = new Map<string, FormField[]>();

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

            const fields = xmlToFormFields(desc, [
              "transport_descriptor",
              profileName,
            ]);
            fieldsMap.set(`transport_descriptor_${profileName}`, fields);
          });
        } else {
          profileArray.forEach((p: any) => {
            const profileName = p["@_profile_name"] || `default_${type}`;
            const profile: Profile = {
              name: profileName,
              type: type,
              isDefault: p["@_is_default_profile"] === true,
            };
            parsedProfiles.push(profile);

            const fields = xmlToFormFields(p, [type, profileName]);
            fieldsMap.set(`${type}_${profileName}`, fields);
          });
        }
      });

      setProfiles(parsedProfiles);
      setProfileFieldsMap(fieldsMap);
      const originalMap = new Map();
      fieldsMap.forEach((fields, key) => {
        originalMap.set(key, JSON.parse(JSON.stringify(fields)));
      });
      setOriginalFieldsMap(originalMap);

      if (uploadedData.log) {
        const fields = xmlToFormFields(uploadedData.log, ["log"]);
        setLogFields(fields);
        setOriginalLogFields(JSON.parse(JSON.stringify(fields)));
      } else {
        const fields = xmlToFormFields(fastDDSSchema.dds.log, ["log"]);
        setLogFields(fields);
        setOriginalLogFields(JSON.parse(JSON.stringify(fields)));
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

      if (parsedProfiles.length > 0) {
        setSelectedProfile(parsedProfiles[0]);
      }
    } else {
      const defaultProfiles: Profile[] = [
        { name: "default_participant", type: "participant", isDefault: true },
        { name: "default_datawriter", type: "data_writer", isDefault: true },
        { name: "default_datareader", type: "data_reader", isDefault: true },
        { name: "default_topic", type: "topic", isDefault: true },
      ];

      const fieldsMap = new Map<string, FormField[]>();
      defaultProfiles.forEach((profile) => {
        const defaultData = getDefaultProfileData(profile.type);
        if (defaultData) {
          const fields = xmlToFormFields(defaultData, [
            profile.type,
            profile.name,
          ]);
          fieldsMap.set(`${profile.type}_${profile.name}`, fields);
        }
      });

      setProfiles(defaultProfiles);
      setProfileFieldsMap(fieldsMap);
      const originalMap = new Map();
      fieldsMap.forEach((fields, key) => {
        originalMap.set(key, JSON.parse(JSON.stringify(fields)));
      });
      setOriginalFieldsMap(originalMap);
      setSelectedProfile(defaultProfiles[0]);

      if (fastDDSSchema.dds.log) {
        const fields = xmlToFormFields(fastDDSSchema.dds.log, ["log"]);
        setLogFields(fields);
        setOriginalLogFields(JSON.parse(JSON.stringify(fields)));
      }
      if (fastDDSSchema.dds.types && fastDDSSchema.dds.types.type) {
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
    }

    setIsInitialLoad(false);
  }, [uploadedData]);

  const generateAndNotifyXML = useCallback(() => {
    if (
      profiles.length > 0 ||
      logFields.length > 0 ||
      typeDefinitions.length > 0
    ) {
      const profilesData: any = {
        "@_xmlns": "http://www.eprosima.com/XMLSchemas/fastRTPS_Profiles",
      };

      const profilesByType = new Map<string, any[]>();

      profiles.forEach((profile) => {
        const fields =
          profileFieldsMap.get(`${profile.type}_${profile.name}`) || [];
        const profileData: any = {};

        if (profile.type === "transport_descriptor") {
          profileData["transport_id"] = profile.name;
        } else {
          profileData["@_profile_name"] = profile.name;
          if (profile.isDefault) {
            profileData["@_is_default_profile"] = true;
          }
        }

        const convertFields = (fields: FormField[], data: any) => {
          fields.forEach((field) => {
            if (
              field.value !== null &&
              field.value !== undefined &&
              field.value !== ""
            ) {
              if (excludeDefaults && field.defaultValue !== undefined) {
                const isDefault =
                  JSON.stringify(field.value) ===
                  JSON.stringify(field.defaultValue);
                if (isDefault && !field.forceInclude) {
                  if (uploadedData) {
                    const wasInUploadedData = hasValueInUploadedFastDDSData(
                      field.path,
                      uploadedData,
                      profile.type,
                      profile.name
                    );
                    if (!wasInUploadedData) return;
                  } else {
                    const originalFieldsForProfile =
                      originalFieldsMap.get(
                        `${profile.type}_${profile.name}`
                      ) || [];
                    const isModified = isFieldModified(
                      field,
                      originalFieldsForProfile
                    );
                    if (!isModified) return;
                  }
                }
              }

              if (field.type === "object" && field.fields) {
                const objData: any = {};

                let childFields = field.fields;
                if (field.forceInclude && excludeDefaults) {
                  childFields = field.fields.map((childField) => ({
                    ...childField,
                    forceInclude: true,
                  }));
                }
                convertFields(childFields, objData);

                if (Object.keys(objData).length > 0 || field.forceInclude) {
                  data[field.name] = objData;
                }
              } else if (
                field.type === "array" &&
                field.fields &&
                field.fields.length > 0
              ) {
                const arrData = field.value
                  .map((item: any) => {
                    const itemData: any = {};
                    field.fields!.forEach((subField) => {
                      if (
                        item[subField.name] !== undefined &&
                        item[subField.name] !== null &&
                        item[subField.name] !== ""
                      ) {
                        itemData[subField.name] = item[subField.name];
                      }
                    });
                    return itemData;
                  })
                  .filter((item: any) => Object.keys(item).length > 0);

                if (arrData.length > 0) {
                  data[field.name] = arrData;
                }
              } else {
                data[field.name] = field.value;
              }
            }
          });
        };

        convertFields(fields, profileData);

        const hasData = Object.keys(profileData).some(
          (key) => !key.startsWith("@_") && key !== "transport_id"
        );

        if (
          hasData ||
          (profile.type === "transport_descriptor" && profileData.transport_id)
        ) {
          if (!profilesByType.has(profile.type)) {
            profilesByType.set(profile.type, []);
          }
          profilesByType.get(profile.type)!.push(profileData);
        }
      });

      profilesByType.forEach((profileList, type) => {
        if (type === "transport_descriptor") {
          profilesData["transport_descriptors"] = {
            transport_descriptor:
              profileList.length === 1 ? profileList[0] : profileList,
          };
        } else {
          profilesData[type] =
            profileList.length === 1 ? profileList[0] : profileList;
        }
      });

      const logData =
        logFields.length > 0
          ? formFieldsToXML(
              logFields,
              excludeDefaults,
              "fastdds",
              uploadedData,
              originalLogFields
            )
          : null;
      const hasLogData = logData && Object.keys(logData).length > 0;

      let typesData: any = null;
      if (typeDefinitions.length > 0) {
        const typeElements: any[] = [];

        typeDefinitions.forEach((typeDef) => {
          if (typeDef.kind === "typedef") {
            const typedefXml: any = {
              "@_name": typeDef.name,
              "@_type": typeDef.type || "int32",
            };
            if (typeDef.type === "nonBasic" && typeDef.nonBasicTypeName) {
              typedefXml["@_nonBasicTypeName"] = typeDef.nonBasicTypeName;
            }
            typeElements.push({ typedef: typedefXml });
          } else if (typeDef.kind === "enum") {
            const enumXml: any = {
              "@_name": typeDef.name,
            };
            if (typeDef.enumerator && typeDef.enumerator.length > 0) {
              enumXml.enumerator = typeDef.enumerator.map((e) => {
                const enumItem: any = { "@_name": e.name };
                if (e.value !== undefined) {
                  enumItem["@_value"] = e.value;
                }
                return enumItem;
              });
            }
            typeElements.push({ enum: enumXml });
          } else if (typeDef.kind === "bitmask") {
            const bitmaskXml: any = {
              "@_name": typeDef.name,
              "@_bit_bound": typeDef.bit_bound || 32,
            };
            if (typeDef.bit_value && typeDef.bit_value.length > 0) {
              bitmaskXml.bit_value = typeDef.bit_value.map((b) => {
                const bitItem: any = { "@_name": b.name };
                if (b.position !== undefined) {
                  bitItem["@_position"] = b.position;
                }
                return bitItem;
              });
            }
            typeElements.push({ bitmask: bitmaskXml });
          } else if (typeDef.kind === "struct") {
            const structXml: any = {
              "@_name": typeDef.name,
            };
            if (typeDef.baseType) structXml["@_baseType"] = typeDef.baseType;

            if (typeDef.member && typeDef.member.length > 0) {
              structXml.member = typeDef.member.map((m) => {
                const memberXml: any = {
                  "@_name": m.name,
                  "@_type": m.type,
                };
                if (m.type === "nonBasic" && m.nonBasicTypeName) {
                  memberXml["@_nonBasicTypeName"] = m.nonBasicTypeName;
                }
                if (m.arrayDimensions) {
                  memberXml["@_arrayDimensions"] = m.arrayDimensions;
                }
                if (m.sequenceMaxLength !== undefined) {
                  memberXml["@_sequenceMaxLength"] = m.sequenceMaxLength;
                }
                if (m.key_type) {
                  memberXml["@_key_type"] = m.key_type;
                  if (m.mapMaxLength !== undefined) {
                    memberXml["@_mapMaxLength"] = m.mapMaxLength;
                  }
                }
                return memberXml;
              });
            }
            typeElements.push({ struct: structXml });
          } else if (typeDef.kind === "union") {
            const unionXml: any = {
              "@_name": typeDef.name,
            };
            if (typeDef.discriminator) {
              unionXml.discriminator = {
                "@_type": typeDef.discriminator.type || "int32",
              };
            }
            if (typeDef.case && typeDef.case.length > 0) {
              unionXml.case = typeDef.case.map((c) => {
                const caseXml: any = {};
                if (c.caseDiscriminator && c.caseDiscriminator.length > 0) {
                  caseXml.caseDiscriminator = c.caseDiscriminator.map((cd) => ({
                    "@_value": cd.value,
                  }));
                }
                if (c.member) {
                  caseXml.member = {
                    "@_name": c.member.name,
                    "@_type": c.member.type,
                  };
                  if (
                    c.member.type === "nonBasic" &&
                    c.member.nonBasicTypeName
                  ) {
                    caseXml.member["@_nonBasicTypeName"] =
                      c.member.nonBasicTypeName;
                  }
                }
                return caseXml;
              });
            }
            typeElements.push({ union: unionXml });
          } else if (typeDef.kind === "bitset") {
            const bitsetXml: any = {
              "@_name": typeDef.name,
            };
            if (typeDef.baseType) bitsetXml["@_baseType"] = typeDef.baseType;
            if (typeDef.bitfield && typeDef.bitfield.length > 0) {
              bitsetXml.bitfield = typeDef.bitfield.map((bf) => {
                const bitfieldXml: any = {
                  "@_bit_bound": bf.bit_bound,
                };
                if (bf.name) bitfieldXml["@_name"] = bf.name;
                if (bf.type) bitfieldXml["@_type"] = bf.type;
                return bitfieldXml;
              });
            }
            typeElements.push({ bitset: bitsetXml });
          }
        });

        typesData = {};
        typeElements.forEach((element) => {
          const key = Object.keys(element)[0];
          if (!typesData[key]) {
            typesData[key] = [];
          }
          typesData[key].push(element[key]);
        });

        Object.keys(typesData).forEach((key) => {
          if (typesData[key].length === 1) {
            typesData[key] = typesData[key][0];
          }
        });
      }
      const hasTypesData = typesData && Object.keys(typesData).length > 0;

      const xmlData: any = {
        "@_xmlns": "http://www.eprosima.com/XMLSchemas/fastRTPS_Profiles",
      };

      if (Object.keys(profilesData).length > 1) {
        xmlData.profiles = profilesData;
      }

      if (hasLogData) {
        xmlData.log = logData;
      }

      if (hasTypesData) {
        xmlData.types = typesData;
      }

      const xml = buildXML(xmlData, "fastdds");
      onXMLGenerate(xml);
    }
  }, [
    profiles,
    profileFieldsMap,
    logFields,
    typeDefinitions,
    excludeDefaults,
    uploadedData,
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
      fields = xmlToFormFields(defaultData, [profile.type, profile.name]);
    } else {
      // Set default data for transport descriptors
      if (profile.type === "transport_descriptor") {
        const minimalData = {
          transport_id: profile.name,
          type: "UDPv4",
          sendBufferSize: 65536,
          receiveBufferSize: 65536,
        };
        fields = xmlToFormFields(minimalData, [profile.type, profile.name]);
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

  const handleLogFieldChange = (path: string[], value: any) => {
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

    const updatedFields = updateField([...logFields], path, value);
    setLogFields(updatedFields);
  };

  return (
    <div className="flex flex-col h-full">
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
        </nav>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "profiles" ? (
          <div className="flex h-full">
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
              />
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {selectedProfile ? (
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
                    {getCurrentFields().map((field) => (
                      <FormFieldComponent
                        key={field.path.join("-")}
                        field={field}
                        onChange={handleFieldChange}
                        isModified={false}
                        originalFields={getOriginalFields()}
                        disableModifiedCheck={true}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Select a profile to edit</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "log" ? (
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
                {logFields.length > 0 ? (
                  logFields.map((field) => (
                    <FormFieldComponent
                      key={field.path.join("-")}
                      field={field}
                      onChange={handleLogFieldChange}
                      isModified={false}
                      originalFields={originalLogFields}
                      disableModifiedCheck={true}
                    />
                  ))
                ) : (
                  <div className="text-center py-16">
                    <p className="text-gray-500">Log configuration removed</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <TypesEditor
                types={typeDefinitions}
                onChange={setTypeDefinitions}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
