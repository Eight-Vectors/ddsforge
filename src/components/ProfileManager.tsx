import { useState } from "react";
import { Plus, Trash2, Copy, Edit2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface Profile {
  name: string;
  type: string;
  isDefault: boolean;
}

interface ProfileManagerProps {
  profiles: Profile[];
  selectedProfile: Profile | null;
  onProfileSelect: (profile: Profile) => void;
  onProfileAdd: (profile: Profile) => void;
  onProfileDelete: (profileName: string) => void;
  onProfileRename: (oldName: string, newName: string) => void;
  onProfileDuplicate: (profileName: string, newName: string) => void;
  disableMultipleProfiles?: boolean;
  hideActionButtons?: boolean;
}

export function ProfileManager({
  profiles,
  selectedProfile,
  onProfileSelect,
  onProfileAdd,
  onProfileDelete,
  onProfileRename,
  onProfileDuplicate,
  disableMultipleProfiles = false,
  hideActionButtons = false,
}: ProfileManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileType, setNewProfileType] = useState<string>("participant");
  const [profileToRename, setProfileToRename] = useState<string>("");
  const [profileToDuplicate, setProfileToDuplicate] = useState<string>("");
  const [error, setError] = useState("");

  const profilesByType = profiles.reduce((acc, profile) => {
    if (!acc[profile.type]) acc[profile.type] = [];
    acc[profile.type].push(profile);
    return acc;
  }, {} as Record<string, Profile[]>);

  const validateProfileName = (name: string): boolean => {
    if (!name.trim()) {
      setError("Profile name cannot be empty");
      return false;
    }
    if (profiles.some((p) => p.name === name)) {
      setError("Profile name already exists");
      return false;
    }
    setError("");
    return true;
  };

  const handleAddProfile = () => {
    if (validateProfileName(newProfileName)) {
      onProfileAdd({
        name: newProfileName,
        type: newProfileType,
        isDefault:
          profiles.filter((p) => p.type === newProfileType).length === 0,
      });
      setShowAddDialog(false);
      setNewProfileName("");
      setNewProfileType("participant");
    }
  };

  const handleRenameProfile = () => {
    if (validateProfileName(newProfileName)) {
      onProfileRename(profileToRename, newProfileName);
      setShowRenameDialog(false);
      setNewProfileName("");
      setProfileToRename("");
    }
  };

  const handleDuplicateProfile = () => {
    if (validateProfileName(newProfileName)) {
      onProfileDuplicate(profileToDuplicate, newProfileName);
      setShowDuplicateDialog(false);
      setNewProfileName("");
      setProfileToDuplicate("");
    }
  };

  const profileTypeLabels: Record<string, string> = {
    domainparticipant_factory: "Domain Participant Factory",
    participant: "Domain Participant",
    data_writer: "Data Writer",
    data_reader: "Data Reader",
    topic: "Topic",
    transport_descriptor: "Transport Descriptor",
  };

  const getProfileTypeLabel = (type: string): string => {
    return (
      profileTypeLabels[type] ||
      type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Profiles</h3>
        {!(disableMultipleProfiles && profiles.length > 0) && (
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
          >
            <Plus className="w-4 h-4" />
            Add Profile
          </Button>
        )}
      </div>

      {Object.entries(profilesByType).map(([type, typeProfiles]) => (
        <Card key={type} className="gap-2">
          <CardHeader className="py-0">
            <CardTitle className="text-sm">
              {getProfileTypeLabel(type)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3">
            {typeProfiles.map((profile) => (
              <div
                key={profile.name}
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  selectedProfile?.name === profile.name
                    ? "bg-purple-50 border border-purple-200"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => onProfileSelect(profile)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium truncate" title={profile.name}>
                    {profile.name}
                  </span>
                </div>
                {!hideActionButtons && (
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfileToRename(profile.name);
                        setShowRenameDialog(true);
                      }}
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    {!disableMultipleProfiles && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileToDuplicate(profile.name);
                          setShowDuplicateDialog(true);
                        }}
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onProfileDelete(profile.name);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Add Profile Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Profile</DialogTitle>
            <DialogDescription>
              Create a new profile configuration. The profile name must be
              unique.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-4">
              <Label htmlFor="profile-name">Profile Name</Label>
              <Input
                id="profile-name"
                value={newProfileName}
                onChange={(e) => {
                  setNewProfileName(e.target.value);
                  setError("");
                }}
                placeholder="Enter profile name"
              />
              {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
            </div>
            <div className="space-y-4">
              <Label htmlFor="profile-type">Profile Type</Label>
              <Select value={newProfileType} onValueChange={setNewProfileType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domainparticipant_factory">
                    Domain Participant Factory
                  </SelectItem>
                  <SelectItem value="participant">Domain Participant</SelectItem>
                  <SelectItem value="topic">Topic</SelectItem>
                  <SelectItem value="transport_descriptor">
                    Transport Descriptor
                  </SelectItem>
                  <SelectItem value="data_writer" disabled>
                    Data Writer (Coming Soon)
                  </SelectItem>
                  <SelectItem value="data_reader" disabled>
                    Data Reader (Coming Soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              onClick={handleAddProfile}
            >
              Add Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Profile Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Profile</DialogTitle>
            <DialogDescription>
              Enter a new name for the profile "{profileToRename}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="new-profile-name">New Profile Name</Label>
            <Input
              id="new-profile-name"
              value={newProfileName}
              onChange={(e) => {
                setNewProfileName(e.target.value);
                setError("");
              }}
              placeholder="Enter new profile name"
            />
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              onClick={handleRenameProfile}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Profile Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Profile</DialogTitle>
            <DialogDescription>
              Enter a name for the duplicate of profile "{profileToDuplicate}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="duplicate-profile-name">New Profile Name</Label>
            <Input
              id="duplicate-profile-name"
              value={newProfileName}
              onChange={(e) => {
                setNewProfileName(e.target.value);
                setError("");
              }}
              placeholder="Enter profile name"
            />
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDuplicateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleDuplicateProfile}>Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
