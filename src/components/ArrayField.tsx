import React from 'react';
import type { FormField as FormFieldType } from '../types/dds';
import { FormField } from './FormField';
import { Plus, Trash2, Layers } from 'lucide-react';
import { isFieldModified } from '../utils/fieldUtils';

interface ArrayFieldProps {
  field: FormFieldType;
  onChange: (path: string[], value: any) => void;
  originalFields?: FormFieldType[];
  disableModifiedCheck?: boolean;
}

export const ArrayField: React.FC<ArrayFieldProps> = ({ field, onChange, originalFields = [], disableModifiedCheck = false }) => {
  const addItem = () => {
    const newItem = field.fields && field.fields.length > 0 ? createEmptyObject(field.fields) : '';
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

  const createEmptyObject = (fields: FormFieldType[]): any => {
    const obj: any = {};
    fields.forEach(f => {
      if (f.type === 'object' && f.fields) {
        obj[f.name] = createEmptyObject(f.fields);
      } else if (f.type === 'array') {
        obj[f.name] = [];
      } else {
        obj[f.name] = f.defaultValue;
      }
    });
    return obj;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Layers className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">{field.label}</h4>
            <p className="text-xs text-gray-600">
              {field.value?.length || 0} {field.value?.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
        <button
          onClick={addItem}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
        >
          <Plus size={16} />
          <span className="font-medium">Add Item</span>
        </button>
      </div>
      
      {field.value?.map((item: any, index: number) => (
        <div key={index} className="group relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500"></div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-700 rounded-full text-xs font-bold mr-2">
                  {index + 1}
                </span>
                {/* For primitive arrays, show the value; for object arrays show the item number */}
                {field.fields && field.fields.length > 0 ? `${field.label} ${index + 1}` : (typeof item === 'string' ? item : String(item))}
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
                  const itemPath = [...field.path, index.toString(), subField.name];
                  const itemValue = item[subField.name];
                  
                  const currentField = {
                    ...subField,
                    value: itemValue !== undefined ? itemValue : subField.defaultValue,
                    path: itemPath,
                  };
                  
                  return (
                    <FormField
                      key={subField.name}
                      field={currentField}
                      onChange={(_path, value) => {
                        const newItem = { ...item };
                        newItem[subField.name] = value;
                        updateItem(index, newItem);
                      }}
                      originalFields={originalFields}
                      isModified={disableModifiedCheck ? false : isFieldModified(currentField, originalFields)}
                      disableModifiedCheck={disableModifiedCheck}
                    />
                  );
                })}
              </div>
            ) : (
              <input
                type="text"
                value={item || ''}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()} value`}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};