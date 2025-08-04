import React from 'react';
import type { FormField as FormFieldType } from '../types/dds';
import { ArrayField } from './ArrayField';
import { ObjectField } from './ObjectField';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface FormFieldProps {
  field: FormFieldType;
  onChange: (path: string[], value: any) => void;
  isInline?: boolean;
  isModified?: boolean;
  originalFields?: FormFieldType[];
  validationError?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  field,
  onChange,
  isInline = false,
  isModified = false,
  originalFields = [],
  validationError,
}) => {
  const handleChange = (value: any) => {
    onChange(field.path, value);
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
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
          />
        );

      case 'object':
        return (
          <ObjectField
            field={field}
            onChange={onChange}
            originalFields={originalFields}
            isModified={isModified}
          />
        );

      default:
        return null;
    }
  };

  // For array and object fields, they render their own cards
  if (field.type === 'array' || field.type === 'object') {
    return renderField();
  }

  // If inline (inside an object), don't wrap in card
  if (isInline) {
    return (
      <div>
        {renderField()}
        {validationError && (
          <p className="text-sm text-red-600 mt-1">{validationError}</p>
        )}
      </div>
    );
  }

  // For simple fields at top level, wrap in a card
  return (
    <Card className={isModified ? "border-blue-500 shadow-md shadow-blue-100" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {field.label}
          {isModified && (
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
        {validationError && (
          <p className="text-sm text-red-600 mt-2">{validationError}</p>
        )}
      </CardContent>
    </Card>
  );
};