import { useState, useEffect } from "react";
import type { FormField } from "../types/dds";
import { ProfileManager } from "./ProfileManager";
import { FormField as FormFieldComponent } from "./FormField";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { 
  xmlToFormFields, 
  formFieldsToXML,
  buildXML,
} from "../utils/xmlParser";
import { 
  ProfileData, 
  ProfilesStructure,
  xmlToProfiles,
  profilesToXML,
  getDefaultProfileData,
  validateProfileNames,
} from "../utils/profileUtils";
import { isFieldModified } from "../utils/fieldUtils";
import { fastDDSSchema } from "../schemas/fastdds-schema";

interface FastDDSProfileEditorProps {
  uploadedData?: any;
  onXMLGenerate: (xml: string) => void;
  excludeDefaults: boolean;
}

interface Profile {
  name: string;
  type: 'participant' | 'data_writer' | 'data_reader' | 'topic';
  isDefault: boolean;
}

export function FastDDSProfileEditor({ 
  uploadedData, 
  onXMLGenerate,
  excludeDefaults 
}: FastDDSProfileEditorProps) {
  // Profile management state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  
  // Form fields state - maps profile key to fields
  const [profileFieldsMap, setProfileFieldsMap] = useState<Map<string, FormField[]>>(new Map());
  const [originalFieldsMap, setOriginalFieldsMap] = useState<Map<string, FormField[]>>(new Map());

  // Initialize profiles from uploaded data or schema
  useEffect(() => {
    if (uploadedData?.profiles) {
      // Parse uploaded profiles
      const profileTypes = ['participant', 'data_writer', 'data_reader', 'topic'] as const;
      const parsedProfiles: Profile[] = [];
      const fieldsMap = new Map<string, FormField[]>();

      profileTypes.forEach(type => {
        if (uploadedData.profiles[type]) {
          const profileData = Array.isArray(uploadedData.profiles[type]) 
            ? uploadedData.profiles[type] 
            : [uploadedData.profiles[type]];
          
          profileData.forEach((p: any) => {
            const profileName = p['@_profile_name'] || `default_${type}`;
            const profile: Profile = {
              name: profileName,
              type: type,
              isDefault: p['@_is_default_profile'] === true
            };
            parsedProfiles.push(profile);
            
            // Convert profile data to form fields
            const fields = xmlToFormFields(p, [type, profileName]);
            fieldsMap.set(`${type}_${profileName}`, fields);
          });
        }
      });

      setProfiles(parsedProfiles);
      setProfileFieldsMap(fieldsMap);
      setOriginalFieldsMap(new Map(fieldsMap));
      
      // Select first profile if available
      if (parsedProfiles.length > 0) {
        setSelectedProfile(parsedProfiles[0]);
      }
    } else {
      // Initialize with default profiles from schema
      const defaultProfiles: Profile[] = [
        { name: 'default_participant', type: 'participant', isDefault: true },
        { name: 'default_datawriter', type: 'data_writer', isDefault: true },
        { name: 'default_datareader', type: 'data_reader', isDefault: true },
        { name: 'default_topic', type: 'topic', isDefault: true }
      ];
      
      const fieldsMap = new Map<string, FormField[]>();
      defaultProfiles.forEach(profile => {
        const defaultData = getDefaultProfileData(profile.type);
        const fields = xmlToFormFields(defaultData, [profile.type, profile.name]);
        fieldsMap.set(`${profile.type}_${profile.name}`, fields);
      });

      setProfiles(defaultProfiles);
      setProfileFieldsMap(fieldsMap);
      setOriginalFieldsMap(new Map(fieldsMap));
      setSelectedProfile(defaultProfiles[0]);
    }
  }, [uploadedData]);

  // Generate XML whenever profiles or fields change
  useEffect(() => {
    if (profiles.length > 0) {
      const profilesStructure: ProfilesStructure = {
        participant: [],
        data_writer: [],
        data_reader: [],
        topic: []
      };

      profiles.forEach(profile => {
        profilesStructure[profile.type].push({
          profileName: profile.name,
          profileType: profile.type,
          isDefault: profile.isDefault,
          fields: profileFieldsMap.get(`${profile.type}_${profile.name}`) || []
        });
      });

      // Build XML structure
      const xmlData = {
        '@_xmlns': 'http://www.eprosima.com/XMLSchemas/fastRTPS_Profiles',
        profiles: profilesToXML(profilesStructure, profileFieldsMap),
        // Include other sections from uploadedData or schema
        log: uploadedData?.log || fastDDSSchema.dds.log,
        types: uploadedData?.types || fastDDSSchema.dds.types
      };

      const xml = buildXML(xmlData, 'fastdds');
      onXMLGenerate(xml);
    }
  }, [profiles, profileFieldsMap, onXMLGenerate, uploadedData]);

  const handleProfileAdd = (profile: Profile) => {
    // Get default fields for this profile type
    const defaultData = getDefaultProfileData(profile.type);
    const fields = xmlToFormFields(defaultData, [profile.type, profile.name]);
    
    // Update state
    const newFieldsMap = new Map(profileFieldsMap);
    newFieldsMap.set(`${profile.type}_${profile.name}`, fields);
    
    setProfiles([...profiles, profile]);
    setProfileFieldsMap(newFieldsMap);
    setSelectedProfile(profile);
  };

  const handleProfileDelete = (profileName: string) => {
    const profileToDelete = profiles.find(p => p.name === profileName);
    if (!profileToDelete) return;

    // Remove profile
    const newProfiles = profiles.filter(p => p.name !== profileName);
    
    // Remove fields
    const newFieldsMap = new Map(profileFieldsMap);
    newFieldsMap.delete(`${profileToDelete.type}_${profileName}`);
    
    setProfiles(newProfiles);
    setProfileFieldsMap(newFieldsMap);
    
    // Select another profile if current was deleted
    if (selectedProfile?.name === profileName && newProfiles.length > 0) {
      setSelectedProfile(newProfiles[0]);
    }
  };

  const handleProfileRename = (oldName: string, newName: string) => {
    const profile = profiles.find(p => p.name === oldName);
    if (!profile) return;

    // Update profile name
    const newProfiles = profiles.map(p => 
      p.name === oldName ? { ...p, name: newName } : p
    );
    
    // Move fields to new key
    const fields = profileFieldsMap.get(`${profile.type}_${oldName}`);
    if (fields) {
      const newFieldsMap = new Map(profileFieldsMap);
      newFieldsMap.delete(`${profile.type}_${oldName}`);
      newFieldsMap.set(`${profile.type}_${newName}`, fields);
      setProfileFieldsMap(newFieldsMap);
    }
    
    setProfiles(newProfiles);
    
    // Update selected profile if it was renamed
    if (selectedProfile?.name === oldName) {
      setSelectedProfile({ ...selectedProfile, name: newName });
    }
  };

  const handleProfileDuplicate = (profileName: string, newName: string) => {
    const profile = profiles.find(p => p.name === profileName);
    if (!profile) return;

    // Create new profile
    const newProfile: Profile = {
      name: newName,
      type: profile.type,
      isDefault: false
    };
    
    // Duplicate fields
    const originalFields = profileFieldsMap.get(`${profile.type}_${profileName}`);
    if (originalFields) {
      const duplicatedFields = JSON.parse(JSON.stringify(originalFields));
      const newFieldsMap = new Map(profileFieldsMap);
      newFieldsMap.set(`${newProfile.type}_${newName}`, duplicatedFields);
      setProfileFieldsMap(newFieldsMap);
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
    return profileFieldsMap.get(`${selectedProfile.type}_${selectedProfile.name}`) || [];
  };

  const getOriginalFields = (): FormField[] => {
    if (!selectedProfile) return [];
    return originalFieldsMap.get(`${selectedProfile.type}_${selectedProfile.name}`) || [];
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Profile Manager */}
      <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
        <ProfileManager
          profiles={profiles}
          selectedProfile={selectedProfile}
          onProfileSelect={setSelectedProfile}
          onProfileAdd={handleProfileAdd}
          onProfileDelete={handleProfileDelete}
          onProfileRename={handleProfileRename}
          onProfileDuplicate={handleProfileDuplicate}
        />
      </div>

      {/* Right Panel - Form Fields */}
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
                  isModified={isFieldModified(field, getOriginalFields())}
                  originalFields={getOriginalFields()}
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
  );
}