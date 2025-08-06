import React, { useState } from 'react';
import type { FormField as FormFieldType } from '../types/dds';
import { FormField } from './FormField';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { isFieldModified } from '../utils/fieldUtils';

interface ObjectFieldProps {
  field: FormFieldType;
  onChange: (path: string[], value: any) => void;
  originalFields?: FormFieldType[];
  isModified?: boolean;
  disableModifiedCheck?: boolean;
}

export const ObjectField: React.FC<ObjectFieldProps> = ({ field, onChange, originalFields = [], isModified = false, disableModifiedCheck = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if any child field is modified
  // If disableModifiedCheck is true, don't check for modifications
  const hasModifiedChildren = disableModifiedCheck ? false : (field.fields?.some(subField => 
    isFieldModified(subField, originalFields)
  ) || false);

  return (
    <Card className={!disableModifiedCheck && (isModified || hasModifiedChildren) ? "border-blue-500 shadow-md shadow-blue-100" : ""}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <CardTitle className="text-lg flex items-center gap-2">
                {field.label}
                {!disableModifiedCheck && (isModified || hasModifiedChildren) && (
                  <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Modified
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {field.fields?.map((subField) => {
              // For nested fields (object or array), render them as cards
              if (subField.type === 'object' || subField.type === 'array') {
                return (
                  <FormField
                    key={subField.name}
                    field={subField}
                    onChange={onChange}
                    isModified={disableModifiedCheck ? false : isFieldModified(subField, originalFields)}
                    originalFields={originalFields}
                    disableModifiedCheck={disableModifiedCheck}
                  />
                );
              }
              
              // For simple fields inside object, render inline
              const fieldIsModified = disableModifiedCheck ? false : isFieldModified(subField, originalFields);
              return (
                <div key={subField.name} className={fieldIsModified ? "p-2 rounded-md bg-blue-50 border border-blue-200" : ""}>
                  <label htmlFor={subField.name} className="text-base font-medium flex items-center gap-2">
                    {subField.label}
                    {!disableModifiedCheck && fieldIsModified && (
                      <span className="text-xs font-normal text-blue-600 bg-white px-2 py-0.5 rounded">
                        Modified
                      </span>
                    )}
                  </label>
                  {subField.description && (
                    <p className="text-sm text-gray-600 italic mb-1">{subField.description}</p>
                  )}
                  <FormField
                    field={subField}
                    onChange={onChange}
                    isInline={true}
                    isModified={fieldIsModified}
                    disableModifiedCheck={disableModifiedCheck}
                  />
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};