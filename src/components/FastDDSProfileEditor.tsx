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
  if (uploadedData) {
    return (
      <FastDDSProfileUploader
        uploadedData={uploadedData}
        onXMLGenerate={onXMLGenerate}
      />
    );
  }

  return <FastDDSProfileCreator onXMLGenerate={onXMLGenerate} />;
}
