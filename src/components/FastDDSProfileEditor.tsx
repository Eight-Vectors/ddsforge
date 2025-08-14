import { FastDDSProfileCreator } from "./FastDDSProfileCreator";
import { FastDDSProfileUploader } from "./FastDDSProfileUploader";

interface FastDDSProfileEditorProps {
  uploadedData?: any;
  onXMLGenerate: (xml: string) => void;
}

export function FastDDSProfileEditor({
  uploadedData,
  onXMLGenerate,
}: FastDDSProfileEditorProps) {
  // If uploadedData is provided, use the uploader component (edit mode)
  // Otherwise, use the creator component (create mode)
  
  if (uploadedData) {
    return (
      <FastDDSProfileUploader
        uploadedData={uploadedData}
        onXMLGenerate={onXMLGenerate}
      />
    );
  }
  
  return (
    <FastDDSProfileCreator
      onXMLGenerate={onXMLGenerate}
    />
  );
}