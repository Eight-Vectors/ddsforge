import React from 'react';
import type { FormField as FormFieldType } from '../types/dds';
import { ArrayField } from './ArrayField';
import { ObjectField } from './ObjectField';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { generateZenohId } from '../utils/jsonParser';
import { Shuffle } from 'lucide-react';

interface FormFieldProps {
  field: FormFieldType;
  onChange: (path: string[], value: any) => void;
  isInline?: boolean;
  isModified?: boolean;
  originalFields?: FormFieldType[];
  validationError?: string;
  disableModifiedCheck?: boolean;
  excludeDefaults?: boolean; // Whether we're in minimal output mode
  onForceIncludeChange?: (path: string[], forceInclude: boolean) => void;
}

export const FormField: React.FC<FormFieldProps> = ({
  field,
  onChange,
  isInline = false,
  isModified = false,
  originalFields = [],
  validationError,
  disableModifiedCheck = false,
  excludeDefaults = false,
  onForceIncludeChange,
}) => {
  const handleChange = (value: any) => {
    onChange(field.path, value);
  };

  const handleForceIncludeChange = (forceInclude: boolean) => {
    if (onForceIncludeChange) {
      onForceIncludeChange(field.path, forceInclude);
    }
  };

  const shouldShowForceInclude = () => {
    if (!excludeDefaults || !onForceIncludeChange) return false;
    
    if (field.type !== 'array' && field.type !== 'object') {
      const valueMatchesDefault = JSON.stringify(field.value) === JSON.stringify(field.defaultValue);
      
      if (field.name === 'id' && field.path.length === 1 && (!field.value || field.value === '')) {
        return false;
      }
      
      return valueMatchesDefault;
    }
    
    if (field.type === 'array') {
      const isEmpty = !field.value || (Array.isArray(field.value) && field.value.length === 0);
      const defaultIsEmpty = !field.defaultValue || (Array.isArray(field.defaultValue) && field.defaultValue.length === 0);
      return isEmpty && defaultIsEmpty;
    }
    
    if (field.type === 'object' && field.fields) {
      const allChildrenMatchDefaults = field.fields.every(childField => {
        if (childField.type === 'array') {
          const isEmpty = !childField.value || (Array.isArray(childField.value) && childField.value.length === 0);
          const defaultIsEmpty = !childField.defaultValue || (Array.isArray(childField.defaultValue) && childField.defaultValue.length === 0);
          return isEmpty && defaultIsEmpty;
        } else if (childField.type === 'object') {
          return false;
        } else {
          return JSON.stringify(childField.value) === JSON.stringify(childField.defaultValue);
        }
      });
      return allChildrenMatchDefaults;
    }
    
    return false;
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
        if (field.name === 'id' && field.path.length === 1) {
          return (
            <div className="flex gap-2">
              <Input
                type="text"
                value={field.value || ''}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Enter ID or generate one..."
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleChange(generateZenohId())}
                className="flex items-center gap-1 whitespace-nowrap"
              >
                <Shuffle className="w-4 h-4" />
                Generate
              </Button>
            </div>
          );
        }
        
        return (
          <Input
            type="text"
            value={field.value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.defaultValue || 'Enter value...'}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={field.value || 0}
            onChange={(e) => handleChange(Number(e.target.value))}
            min="0"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={field.value || false}
              onChange={(e) => handleChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm">{field.value ? 'Enabled' : 'Disabled'}</span>
          </label>
        );

      case 'select':
        return (
          <Select value={field.value || field.defaultValue} onValueChange={handleChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'array':
        return (
          <ArrayField
            field={field}
            onChange={onChange}
            originalFields={originalFields}
            disableModifiedCheck={disableModifiedCheck}
            excludeDefaults={excludeDefaults}
            onForceIncludeChange={onForceIncludeChange}
          />
        );

      case 'object':
        return (
          <ObjectField
            field={field}
            onChange={onChange}
            originalFields={originalFields}
            isModified={isModified}
            disableModifiedCheck={disableModifiedCheck}
            excludeDefaults={excludeDefaults}
            onForceIncludeChange={onForceIncludeChange}
          />
        );

      default:
        return null;
    }
  };

  if (field.type === 'array' || field.type === 'object') {
    return renderField();
  }

  if (isInline) {
    return (
      <div>
        {renderField()}
        {shouldShowForceInclude() && (
          <div className="mt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.forceInclude || false}
                onChange={(e) => handleForceIncludeChange(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <span className="text-gray-600">
                Force include in minimal output
              </span>
            </label>
          </div>
        )}
        {validationError && (
          <p className="text-sm text-red-600 mt-1">{validationError}</p>
        )}
      </div>
    );
  }

  return (
    <Card className={!disableModifiedCheck && isModified ? "border-blue-500 shadow-md shadow-blue-100" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {field.label}
          {!disableModifiedCheck && isModified && (
            <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Modified
            </span>
          )}
        </CardTitle>
        {field.description && (
          <p className="text-sm text-gray-600 italic">{field.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {renderField()}
        {shouldShowForceInclude() && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.forceInclude || false}
                onChange={(e) => handleForceIncludeChange(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <span className="text-gray-600">
                Force include in minimal output
              </span>
            </label>
          </div>
        )}
        {validationError && (
          <p className="text-sm text-red-600 mt-2">{validationError}</p>
        )}
      </CardContent>
    </Card>
  );
};