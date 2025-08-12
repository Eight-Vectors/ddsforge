import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (content: string, fileName: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          onFileUpload(reader.result as string, file.name);
        }
      };
      reader.readAsText(file);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'application/json': ['.json', '.json5'],
      'text/json': ['.json', '.json5']
    },
    maxFiles: 1
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      {isDragActive ? (
        <p className="text-lg text-gray-600">Drop the configuration file here...</p>
      ) : (
        <>
          <p className="text-lg text-gray-600">
            Drag & drop a configuration file here
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supports XML (.xml)
          </p>
        </>
      )}
      {acceptedFiles.length > 0 && (
        <div className="mt-4 flex items-center justify-center text-sm text-green-600">
          <FileText className="h-4 w-4 mr-2" />
          {acceptedFiles[0].name}
        </div>
      )}
    </div>
  );
};