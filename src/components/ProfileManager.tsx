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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface Profile {
  name: string;
  type: 'participant' | 'data_writer' | 'data_reader' | 'topic';
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
}

export function ProfileManager({
  profiles,
  selectedProfile,
  onProfileSelect,
  onProfileAdd,
  onProfileDelete,
  onProfileRename,
  onProfileDuplicate,
}: ProfileManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileType, setNewProfileType] = useState<Profile['type']>("participant");
  const [profileToRename, setProfileToRename] = useState<string>("");
  const [profileToDuplicate, setProfileToDuplicate] = useState<string>("");
  const [error, setError] = useState("");

  // Group profiles by type
  const profilesByType = profiles.reduce((acc, profile) => {
    if (!acc[profile.type]) acc[profile.type] = [];
    acc[profile.type].push(profile);
    return acc;
  }, {} as Record<Profile['type'], Profile[]>);

  const validateProfileName = (name: string): boolean => {
    if (!name.trim()) {
      setError("Profile name cannot be empty");
      return false;
    }
    if (profiles.some(p => p.name === name)) {
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
        isDefault: profiles.filter(p => p.type === newProfileType).length === 0,
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

  const profileTypeLabels = {
    participant: "Participant",
    data_writer: "Data Writer",
    data_reader: "Data Reader",
    topic: "Topic"
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Profiles</h3>
        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Profile
        </Button>
      </div>

      {Object.entries(profilesByType).map(([type, typeProfiles]) => (
        <Card key={type}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">{profileTypeLabels[type as Profile['type']]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {typeProfiles.map(profile => (
              <div
                key={profile.name}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  selectedProfile?.name === profile.name 
                    ? 'bg-purple-50 border border-purple-200' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onProfileSelect(profile)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{profile.name}</span>
                  {profile.isDefault && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileToRename(profile.name);
                      setShowRenameDialog(true);
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileToDuplicate(profile.name);
                      setShowDuplicateDialog(true);
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  {!profile.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onProfileDelete(profile.name);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
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
              Create a new profile configuration. The profile name must be unique.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
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
            <div>
              <Label htmlFor="profile-type">Profile Type</Label>
              <Select value={newProfileType} onValueChange={(value: Profile['type']) => setNewProfileType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">Participant</SelectItem>
                  <SelectItem value="data_writer">Data Writer</SelectItem>
                  <SelectItem value="data_reader">Data Reader</SelectItem>
                  <SelectItem value="topic">Topic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProfile}>Add Profile</Button>
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
          <div>
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
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameProfile}>Rename</Button>
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
          <div>
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
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicateProfile}>Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}