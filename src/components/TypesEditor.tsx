import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export interface TypeDefinition {
  kind:
    | "struct"
    | "enum"
    | "union"
    | "typedef"  // Changed from alias
    | "bitmask"
    | "bitset";
  name: string;
  baseType?: string;
  // For struct
  member?: Array<{
    name: string;
    type: string;
    arrayDimensions?: string;
    nonBasicTypeName?: string;
    sequenceMaxLength?: number | string; // For sequence members
    key_type?: string; // For map members
    mapMaxLength?: number | string; // For map members
  }>;
  // For enum - using attributes
  enumerator?: Array<{
    name: string;
    value?: number;
  }>;
  // For bitmask
  bit_value?: Array<{
    name: string;
    position?: number;
  }>;
  bit_bound?: number;
  // For union
  discriminator?: {
    type: string;
  };
  case?: Array<{
    caseDiscriminator: Array<{
      value: string | number | 'default';
    }>;
    member: {
      name: string;
      type: string;
      nonBasicTypeName?: string;
    };
  }>;
  // For typedef (alias)
  type?: string; // For typedef
  nonBasicTypeName?: string; // For typedef with nonBasic type
  // For bitset
  bitfield?: Array<{
    name?: string;
    bit_bound: number;
    type?: string;
  }>;
}

interface TypesEditorProps {
  types: TypeDefinition[];
  onChange: (types: TypeDefinition[]) => void;
}

const PRIMITIVE_TYPES = [
  "boolean",
  "char8",
  "char16",
  "int8",
  "uint8",
  "int16",
  "uint16",
  "int32",
  "uint32",
  "int64",
  "uint64",
  "float32",
  "float64",
  "float80",
  "float128",
  "string",
  "wstring",
];

export function TypesEditor({ types, onChange }: TypesEditorProps) {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [editingType, setEditingType] = useState<string | null>(null);

  const toggleExpanded = (typeName: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeName)) {
      newExpanded.delete(typeName);
    } else {
      newExpanded.add(typeName);
    }
    setExpandedTypes(newExpanded);
  };

  const addType = () => {
    const newType: TypeDefinition = {
      kind: "struct",
      name: `NewType${types.length + 1}`,
      member: [],
    };
    onChange([...types, newType]);
    setEditingType(newType.name);
    setExpandedTypes(new Set([...expandedTypes, newType.name]));
  };

  const updateType = (index: number, updates: Partial<TypeDefinition>) => {
    const newTypes = [...types];
    newTypes[index] = { ...newTypes[index], ...updates };
    onChange(newTypes);
  };

  const deleteType = (index: number) => {
    const newTypes = types.filter((_, i) => i !== index);
    onChange(newTypes);
  };

  const addStructMember = (typeIndex: number) => {
    const type = types[typeIndex];
    if (type.kind === "struct") {
      const newMember = {
        name: `member${(type.member?.length || 0) + 1}`,
        type: "int32",
      };
      updateType(typeIndex, {
        member: [...(type.member || []), newMember],
      });
    }
  };

  const updateStructMember = (
    typeIndex: number,
    memberIndex: number,
    updates: any
  ) => {
    const type = types[typeIndex];
    if (type.kind === "struct" && type.member) {
      const newMembers = [...type.member];
      newMembers[memberIndex] = { ...newMembers[memberIndex], ...updates };
      updateType(typeIndex, { member: newMembers });
    }
  };

  const deleteStructMember = (typeIndex: number, memberIndex: number) => {
    const type = types[typeIndex];
    if (type.kind === "struct" && type.member) {
      const newMembers = type.member.filter((_, i) => i !== memberIndex);
      updateType(typeIndex, { member: newMembers });
    }
  };

  const addEnumerator = (typeIndex: number) => {
    const type = types[typeIndex];
    if (type.kind === "enum") {
      const newEnumerator = {
        name: `VALUE${(type.enumerator?.length || 0) + 1}`,
        value: type.enumerator?.length || 0,
      };
      updateType(typeIndex, {
        enumerator: [...(type.enumerator || []), newEnumerator],
      });
    }
  };

  const updateEnumerator = (
    typeIndex: number,
    enumIndex: number,
    updates: any
  ) => {
    const type = types[typeIndex];
    if (type.kind === "enum" && type.enumerator) {
      const newEnumerators = [...type.enumerator];
      newEnumerators[enumIndex] = { ...newEnumerators[enumIndex], ...updates };
      updateType(typeIndex, { enumerator: newEnumerators });
    }
  };

  const deleteEnumerator = (typeIndex: number, enumIndex: number) => {
    const type = types[typeIndex];
    if (type.kind === "enum" && type.enumerator) {
      const newEnumerators = type.enumerator.filter((_, i) => i !== enumIndex);
      updateType(typeIndex, { enumerator: newEnumerators });
    }
  };

  // Bitmask bit_value functions
  const addBitValue = (typeIndex: number) => {
    const type = types[typeIndex];
    if (type.kind === "bitmask") {
      const newBitValue = {
        name: `flag${(type.bit_value?.length || 0)}`,
        position: type.bit_value?.length || 0
      };
      updateType(typeIndex, {
        bit_value: [...(type.bit_value || []), newBitValue]
      });
    }
  };

  const updateBitValue = (typeIndex: number, bitIndex: number, updates: any) => {
    const type = types[typeIndex];
    if (type.kind === "bitmask" && type.bit_value) {
      const newBitValues = [...type.bit_value];
      newBitValues[bitIndex] = { ...newBitValues[bitIndex], ...updates };
      updateType(typeIndex, { bit_value: newBitValues });
    }
  };

  const deleteBitValue = (typeIndex: number, bitIndex: number) => {
    const type = types[typeIndex];
    if (type.kind === "bitmask" && type.bit_value) {
      const newBitValues = type.bit_value.filter((_, i) => i !== bitIndex);
      updateType(typeIndex, { bit_value: newBitValues });
    }
  };

  // Union case functions
  const addUnionCase = (typeIndex: number) => {
    const type = types[typeIndex];
    if (type.kind === "union") {
      const newCase = {
        caseDiscriminator: [{ value: type.case?.length || 0 }],
        member: {
          name: `member${(type.case?.length || 0) + 1}`,
          type: "int32"
        }
      };
      updateType(typeIndex, {
        case: [...(type.case || []), newCase]
      });
    }
  };

  const updateUnionCase = (typeIndex: number, caseIndex: number, updates: any) => {
    const type = types[typeIndex];
    if (type.kind === "union" && type.case) {
      const newCases = [...type.case];
      newCases[caseIndex] = { ...newCases[caseIndex], ...updates };
      updateType(typeIndex, { case: newCases });
    }
  };

  const deleteUnionCase = (typeIndex: number, caseIndex: number) => {
    const type = types[typeIndex];
    if (type.kind === "union" && type.case) {
      const newCases = type.case.filter((_, i) => i !== caseIndex);
      updateType(typeIndex, { case: newCases });
    }
  };

  // Bitset bitfield functions
  const addBitfield = (typeIndex: number) => {
    const type = types[typeIndex];
    if (type.kind === "bitset") {
      const newBitfield = {
        name: `field${(type.bitfield?.length || 0) + 1}`,
        bit_bound: 1
      };
      updateType(typeIndex, {
        bitfield: [...(type.bitfield || []), newBitfield]
      });
    }
  };

  const updateBitfield = (typeIndex: number, fieldIndex: number, updates: any) => {
    const type = types[typeIndex];
    if (type.kind === "bitset" && type.bitfield) {
      const newBitfields = [...type.bitfield];
      newBitfields[fieldIndex] = { ...newBitfields[fieldIndex], ...updates };
      updateType(typeIndex, { bitfield: newBitfields });
    }
  };

  const deleteBitfield = (typeIndex: number, fieldIndex: number) => {
    const type = types[typeIndex];
    if (type.kind === "bitset" && type.bitfield) {
      const newBitfields = type.bitfield.filter((_, i) => i !== fieldIndex);
      updateType(typeIndex, { bitfield: newBitfields });
    }
  };

  const renderTypeEditor = (type: TypeDefinition, index: number) => {
    const isExpanded = expandedTypes.has(type.name);

    return (
      <Card key={type.name} className="mb-4">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleExpanded(type.name)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              {editingType === type.name ? (
                <Input
                  value={type.name}
                  onChange={(e) => updateType(index, { name: e.target.value })}
                  onBlur={() => setEditingType(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingType(null);
                  }}
                  className="w-48 h-7 text-sm"
                  autoFocus
                />
              ) : (
                <CardTitle
                  className="text-sm cursor-pointer"
                  onClick={() => setEditingType(type.name)}
                >
                  {type.name}
                </CardTitle>
              )}
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                {type.kind}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteType(index)}
              title="Delete type"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4">
            {/* Type Kind Selector */}
            <div className="space-y-3">
              <Label>Type Kind</Label>
              <Select
                value={type.kind}
                onValueChange={(value: TypeDefinition["kind"]) => {
                  // Reset type-specific fields when changing kind
                  const baseUpdate: TypeDefinition = {
                    kind: value,
                    name: type.name,
                  };
                  if (value === "struct") {
                    baseUpdate.member = [];
                  } else if (value === "enum") {
                    baseUpdate.enumerator = [];
                  } else if (value === "union") {
                    baseUpdate.discriminator = { type: "int32" };
                    baseUpdate.case = [];
                  } else if (value === "typedef") {
                    baseUpdate.type = "int32";
                  } else if (value === "bitmask") {
                    baseUpdate.bit_bound = 32;
                    baseUpdate.bit_value = [];
                  } else if (value === "bitset") {
                    baseUpdate.bitfield = [];
                  }
                  updateType(index, baseUpdate);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="struct">Struct</SelectItem>
                  <SelectItem value="enum">Enumeration</SelectItem>
                  <SelectItem value="union">Union</SelectItem>
                  <SelectItem value="typedef">Typedef (Alias)</SelectItem>
                  <SelectItem value="bitmask">Bitmask</SelectItem>
                  <SelectItem value="bitset">Bitset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Struct Members */}
            {type.kind === "struct" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Members</Label>
                  <Button
                    size="sm"
                    onClick={() => addStructMember(index)}
                    className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  >
                    <Plus className="w-3 h-3" />
                    Add Member
                  </Button>
                </div>
                {type.baseType && (
                  <div className="space-y-2">
                    <Label>Base Type</Label>
                    <Input
                      value={type.baseType}
                      onChange={(e) =>
                        updateType(index, { baseType: e.target.value })
                      }
                      placeholder="Base type name"
                    />
                  </div>
                )}
                {type.member?.map((member, memberIndex) => (
                  <div key={memberIndex} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={member.name}
                        onChange={(e) =>
                          updateStructMember(index, memberIndex, {
                            name: e.target.value,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={member.type}
                        onValueChange={(value) =>
                          updateStructMember(index, memberIndex, {
                            type: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIMITIVE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                          <SelectItem value="nonBasic">Custom Type</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {member.type === "nonBasic" && (
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Type Name</Label>
                        <Input
                          value={member.nonBasicTypeName || ""}
                          onChange={(e) =>
                            updateStructMember(index, memberIndex, {
                              nonBasicTypeName: e.target.value,
                            })
                          }
                          className="h-8"
                          placeholder="Custom type"
                        />
                      </div>
                    )}
                    {/* Sequence attributes */}
                    {member.nonBasicTypeName && (
                      <div className="w-32 space-y-1">
                        <Label className="text-xs">Seq Max Length</Label>
                        <Input
                          value={member.sequenceMaxLength || ""}
                          onChange={(e) =>
                            updateStructMember(index, memberIndex, {
                              sequenceMaxLength: e.target.value,
                            })
                          }
                          className="h-8"
                          placeholder="-1 for unbounded"
                        />
                      </div>
                    )}
                    {/* Array dimensions */}
                    {member.type !== "nonBasic" && (
                      <div className="w-32 space-y-1">
                        <Label className="text-xs">Array Dims</Label>
                        <Input
                          value={member.arrayDimensions || ""}
                          onChange={(e) =>
                            updateStructMember(index, memberIndex, {
                              arrayDimensions: e.target.value,
                            })
                          }
                          className="h-8"
                          placeholder="e.g., 2,3,4"
                        />
                      </div>
                    )}
                    {/* Map attributes */}
                    {member.type !== "nonBasic" && (
                      <>
                        <div className="w-32 space-y-1">
                          <Label className="text-xs">Key Type</Label>
                          <Input
                            value={member.key_type || ""}
                            onChange={(e) =>
                              updateStructMember(index, memberIndex, {
                                key_type: e.target.value,
                              })
                            }
                            className="h-8"
                            placeholder="e.g., string"
                          />
                        </div>
                        {member.key_type && (
                          <div className="w-32 space-y-1">
                            <Label className="text-xs">Map Max Len</Label>
                            <Input
                              value={member.mapMaxLength || ""}
                              onChange={(e) =>
                                updateStructMember(index, memberIndex, {
                                  mapMaxLength: e.target.value,
                                })
                              }
                              className="h-8"
                              placeholder="-1"
                            />
                          </div>
                        )}
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteStructMember(index, memberIndex)}
                      className="h-8"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Enum Values */}
            {type.kind === "enum" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Enumerators</Label>
                  <Button
                    size="sm"
                    onClick={() => addEnumerator(index)}
                    className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  >
                    <Plus className="w-3 h-3" />
                    Add Value
                  </Button>
                </div>
                {type.enumerator?.map((enumerator, enumIndex) => (
                  <div key={enumIndex} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={enumerator.name}
                        onChange={(e) =>
                          updateEnumerator(index, enumIndex, {
                            name: e.target.value,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Value (optional)</Label>
                      <Input
                        type="number"
                        value={enumerator.value !== undefined ? enumerator.value : ""}
                        onChange={(e) =>
                          updateEnumerator(index, enumIndex, {
                            value: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        className="h-8"
                        placeholder="auto"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteEnumerator(index, enumIndex)}
                      className="h-8"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Typedef (Alias) Type */}
            {type.kind === "typedef" && (
              <div className="space-y-2">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={type.type || "int32"}
                    onValueChange={(value) => {
                      if (value === "nonBasic") {
                        updateType(index, { type: value, nonBasicTypeName: "" });
                      } else {
                        updateType(index, { type: value, nonBasicTypeName: undefined });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIMITIVE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                      <SelectItem value="nonBasic">Custom Type</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {type.type === "nonBasic" && (
                  <div>
                    <Label>Type Name</Label>
                    <Input
                      value={type.nonBasicTypeName || ""}
                      onChange={(e) =>
                        updateType(index, { nonBasicTypeName: e.target.value })
                      }
                      placeholder="Custom type name"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Bitmask */}
            {type.kind === "bitmask" && (
              <div className="space-y-2">
                <div>
                  <Label>Bit Bound</Label>
                  <Input
                    type="number"
                    value={type.bit_bound || 32}
                    onChange={(e) =>
                      updateType(index, { bit_bound: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Bit Values</Label>
                    <Button
                      size="sm"
                      onClick={() => addBitValue(index)}
                      className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    >
                      <Plus className="w-3 h-3" />
                      Add Bit Value
                    </Button>
                  </div>
                  {type.bit_value?.map((bitValue, bitIndex) => (
                    <div key={bitIndex} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={bitValue.name}
                          onChange={(e) =>
                            updateBitValue(index, bitIndex, {
                              name: e.target.value,
                            })
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Position</Label>
                        <Input
                          type="number"
                          value={bitValue.position !== undefined ? bitValue.position : ""}
                          onChange={(e) =>
                            updateBitValue(index, bitIndex, {
                              position: e.target.value ? parseInt(e.target.value) : undefined,
                            })
                          }
                          className="h-8"
                          placeholder="auto"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteBitValue(index, bitIndex)}
                        className="h-8"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Union */}
            {type.kind === "union" && (
              <div className="space-y-2">
                <div>
                  <Label>Discriminator Type</Label>
                  <Select
                    value={type.discriminator?.type || "int32"}
                    onValueChange={(value) =>
                      updateType(index, { discriminator: { type: value } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIMITIVE_TYPES.filter(t => 
                        t.includes('int') || t.includes('uint') || t === 'boolean' || t.includes('char')
                      ).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Cases</Label>
                    <Button
                      size="sm"
                      onClick={() => addUnionCase(index)}
                      className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    >
                      <Plus className="w-3 h-3" />
                      Add Case
                    </Button>
                  </div>
                  {type.case?.map((unionCase, caseIndex) => (
                    <div key={caseIndex} className="border p-3 rounded space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Case Values (comma separated, or "default")</Label>
                          <Input
                            value={unionCase.caseDiscriminator.map(c => c.value).join(", ")}
                            onChange={(e) => {
                              const values = e.target.value.split(',').map(v => v.trim());
                              updateUnionCase(index, caseIndex, {
                                caseDiscriminator: values.map(v => ({ 
                                  value: v === 'default' ? 'default' : !isNaN(Number(v)) ? Number(v) : v 
                                }))
                              });
                            }}
                            className="h-8"
                            placeholder="0, 1, default"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteUnionCase(index, caseIndex)}
                          className="h-8 mt-5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Member Name</Label>
                          <Input
                            value={unionCase.member.name}
                            onChange={(e) =>
                              updateUnionCase(index, caseIndex, {
                                member: { ...unionCase.member, name: e.target.value }
                              })
                            }
                            className="h-8"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Member Type</Label>
                          <Select
                            value={unionCase.member.type}
                            onValueChange={(value) =>
                              updateUnionCase(index, caseIndex, {
                                member: { ...unionCase.member, type: value }
                              })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PRIMITIVE_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                              <SelectItem value="nonBasic">Custom Type</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {unionCase.member.type === "nonBasic" && (
                          <div className="flex-1">
                            <Label className="text-xs">Type Name</Label>
                            <Input
                              value={unionCase.member.nonBasicTypeName || ""}
                              onChange={(e) =>
                                updateUnionCase(index, caseIndex, {
                                  member: { ...unionCase.member, nonBasicTypeName: e.target.value }
                                })
                              }
                              className="h-8"
                              placeholder="Custom type"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bitset */}
            {type.kind === "bitset" && (
              <div className="space-y-2">
                {type.baseType && (
                  <div>
                    <Label>Base Type</Label>
                    <Input
                      value={type.baseType}
                      onChange={(e) =>
                        updateType(index, { baseType: e.target.value })
                      }
                      placeholder="Base bitset name"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Bitfields</Label>
                    <Button
                      size="sm"
                      onClick={() => addBitfield(index)}
                      className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    >
                      <Plus className="w-3 h-3" />
                      Add Bitfield
                    </Button>
                  </div>
                  {type.bitfield?.map((bitfield, fieldIndex) => (
                    <div key={fieldIndex} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Name (optional)</Label>
                        <Input
                          value={bitfield.name || ""}
                          onChange={(e) =>
                            updateBitfield(index, fieldIndex, {
                              name: e.target.value || undefined,
                            })
                          }
                          className="h-8"
                          placeholder="field name"
                        />
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Bit Bound</Label>
                        <Input
                          type="number"
                          value={bitfield.bit_bound}
                          onChange={(e) =>
                            updateBitfield(index, fieldIndex, {
                              bit_bound: parseInt(e.target.value) || 1,
                            })
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={bitfield.type || "auto"}
                          onValueChange={(value) =>
                            updateBitfield(index, fieldIndex, {
                              type: value === "auto" ? undefined : value,
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="auto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">auto</SelectItem>
                            <SelectItem value="int16">int16</SelectItem>
                            <SelectItem value="uint16">uint16</SelectItem>
                            <SelectItem value="int32">int32</SelectItem>
                            <SelectItem value="uint32">uint32</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteBitfield(index, fieldIndex)}
                        className="h-8"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Type Definitions</h3>
        <Button
          onClick={addType}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
        >
          <Plus className="w-4 h-4" />
          Add Type
        </Button>
      </div>

      {types.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              No type definitions. Click "Add Type" to create a new type.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {types.map((type, index) => renderTypeEditor(type, index))}
        </div>
      )}
    </div>
  );
}
