import React, { useState } from "react";
import type { FormField as FormFieldType } from "../types/dds";
import { FormField } from "./FormField";
import { Plus, Trash2, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { isFieldModified } from "../utils/fieldUtils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

interface ArrayFieldProps {
  field: FormFieldType;
  onChange: (path: string[], value: any) => void;
  originalFields?: FormFieldType[];
  disableModifiedCheck?: boolean;
  excludeDefaults?: boolean;
  onForceIncludeChange?: (path: string[], forceInclude: boolean) => void;
}

export const ArrayField: React.FC<ArrayFieldProps> = ({
  field,
  onChange,
  originalFields = [],
  disableModifiedCheck = false,
  excludeDefaults = false,
  onForceIncludeChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const addItem = () => {
    const newItem =
      field.fields && field.fields.length > 0
        ? { ...createEmptyObject(field.fields), __forceInclude: {} }
        : "";
    const newArray = [...(field.value || []), newItem];
    onChange(field.path, newArray);
  };

  const removeItem = (index: number) => {
    const newArray = field.value.filter((_: any, i: number) => i !== index);
    onChange(field.path, newArray);
  };

  const updateItem = (index: number, value: any) => {
    const newArray = [...field.value];
    newArray[index] = value;
    onChange(field.path, newArray);
  };

  const updateItemField = (index: number, fieldPath: string[], value: any) => {
    const fullPath = [...field.path, index.toString(), ...fieldPath];
    onChange(fullPath, value);
  };

  const createEmptyObject = (fields: FormFieldType[]): any => {
    const obj: any = {};
    fields.forEach((f) => {
      if (f.type === "object" && f.fields) {
        obj[f.name] = createEmptyObject(f.fields);
      } else if (f.type === "array") {
        obj[f.name] = [];
      } else {
        obj[f.name] = f.defaultValue;
      }
    });
    return obj;
  };

  const hasModifiedChildren = disableModifiedCheck
    ? false
    : (field.value || []).some((item: any, index: number) => {
        if (!field.fields || field.fields.length === 0) return false;
        return field.fields.some((subField) => {
          const itemPath = [...field.path, index.toString(), subField.name];
          const currentField: FormFieldType = {
            ...subField,
            path: itemPath,
            value:
              item && typeof item === "object"
                ? item[subField.name]
                : undefined,
          };
          return isFieldModified(currentField, originalFields);
        });
      });

  const arrayIsModified = disableModifiedCheck
    ? false
    : isFieldModified(field, originalFields) || hasModifiedChildren;

  return (
    <div
      className={
        !disableModifiedCheck && arrayIsModified
          ? "border border-blue-500 rounded-xl shadow-md shadow-blue-100"
          : ""
      }
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center space-x-3 text-left focus:outline-none"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Layers className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    {field.label}
                    {!disableModifiedCheck && arrayIsModified && (
                      <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        Modified
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-600">
                    {field.value?.length || 0}{" "}
                    {field.value?.length === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
            </button>
          </CollapsibleTrigger>
          <button
            onClick={addItem}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <Plus size={16} />
            <span className="font-medium">Add Item</span>
          </button>
        </div>

        <CollapsibleContent>
          <div className="space-y-4 p-4 pt-3 bg-white rounded-b-xl">
            {field.value?.map((item: any, index: number) => (
              <div
                key={index}
                className="group relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500"></div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-700 rounded-full text-xs font-bold mr-2">
                        {index + 1}
                      </span>
                      {/* For primitive arrays, show the value; for object arrays show the item number */}
                      {field.fields && field.fields.length > 0
                        ? `${field.label} ${index + 1}`
                        : typeof item === "string"
                        ? item
                        : String(item)}
                    </h4>
                    <button
                      onClick={() => removeItem(index)}
                      className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-all duration-200"
                    >
                      <Trash2 size={16} />
                      <span className="text-sm font-medium">Remove</span>
                    </button>
                  </div>

                  {field.fields && field.fields.length > 0 ? (
                    <div className="space-y-4">
                      {field.fields.map((subField) => {
                        const itemPath = [
                          ...field.path,
                          index.toString(),
                          subField.name,
                  ];

                  let itemValue = item[subField.name];
                  const itemForceInclude =
                    item && typeof item === "object" && item.__forceInclude
                      ? item.__forceInclude
                      : {};

                  let currentField;
                  if (subField.type === "object" && subField.fields) {
                    // Recursively update nested fields with current values
                    const nestedFields = subField.fields.map((nestedField) => {
                      const nestedValue = itemValue?.[nestedField.name];
                      const nestedForceInclude =
                        itemValue &&
                        typeof itemValue === "object" &&
                        itemValue.__forceInclude
                          ? itemValue.__forceInclude
                          : {};
                      return {
                        ...nestedField,
                        value:
                          nestedValue !== undefined
                            ? nestedValue
                            : nestedField.defaultValue,
                        path: [...itemPath, nestedField.name],
                        forceInclude:
                          nestedForceInclude[nestedField.name] ??
                          nestedField.forceInclude,
                      };
                    });

                    currentField = {
                      ...subField,
                      value:
                        itemValue !== undefined
                          ? itemValue
                          : subField.defaultValue,
                      path: itemPath,
                      fields: nestedFields,
                      forceInclude:
                        Object.prototype.hasOwnProperty.call(
                          itemForceInclude,
                          subField.name
                        )
                          ? itemForceInclude[subField.name]
                          : subField.forceInclude,
                    };
                  } else {
                    currentField = {
                      ...subField,
                      value:
                        itemValue !== undefined
                          ? itemValue
                          : subField.defaultValue,
                      path: itemPath,
                      forceInclude:
                        Object.prototype.hasOwnProperty.call(
                          itemForceInclude,
                          subField.name
                        )
                          ? itemForceInclude[subField.name]
                          : subField.forceInclude,
                    };
                  }

                        return (
                          <FormField
                            key={`${subField.name}-${index}`}
                            field={currentField}
                            onChange={(path, value) => {
                              const itemStartIndex = field.path.length + 1; // +1 to skip the index
                              const relativePath = path.slice(itemStartIndex);

                              if (relativePath.length > 0) {
                                updateItemField(index, relativePath, value);
                              } else {
                                updateItem(index, value);
                              }
                            }}
                            originalFields={originalFields}
                            isModified={
                              disableModifiedCheck
                                ? false
                                : isFieldModified(currentField, originalFields)
                            }
                            disableModifiedCheck={disableModifiedCheck}
                            excludeDefaults={excludeDefaults}
                            onForceIncludeChange={onForceIncludeChange}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={item || ""}
                      onChange={(e) => updateItem(index, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()} value`}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Force Include checkbox for arrays */}
            {excludeDefaults && onForceIncludeChange && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.forceInclude || false}
                    onChange={(e) =>
                      onForceIncludeChange(field.path, e.target.checked)
                    }
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-gray-600">
                    Force include in minimal output
                  </span>
                </label>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
