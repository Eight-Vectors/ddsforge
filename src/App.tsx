import { useState } from "react";
import type { DDSVendor, FormField } from "./types/dds";
import { FileUpload } from "./components/FileUpload";
import { FormField as FormFieldComponent } from "./components/FormField";
import {
  detectVendor,
  formFieldsToXML,
  xmlToFormFields,
  buildXML,
  mergeUploadedDataIntoSchema,
  getSchemaForVendor,
} from "./utils/xmlParser";
import { parseXMLInBrowser } from "./utils/browserXmlParser";
import { isFieldModified } from "./utils/fieldUtils";
import { smartMergeFastDDS } from "./utils/fastddsUtils";
import { Download, FileText, RotateCcw, Code2, X } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";

function App() {
  const [vendor, setVendor] = useState<DDSVendor | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [originalFields, setOriginalFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState<string>("");
  const [excludeDefaults, setExcludeDefaults] = useState<boolean>(true); // Default to minimal output

  const handleFileUpload = async (content: string, fileName?: string) => {
    setIsLoading(true);
    setError(null);
    
    // Set the download filename to the uploaded filename (without extension)
    if (fileName) {
      const nameWithoutExt = fileName.replace(/\.xml$/i, '');
      setDownloadFilename(nameWithoutExt);
    }

    try {
      const detectedVendor = detectVendor(content);
      if (!detectedVendor) {
        throw new Error("Unable to detect DDS vendor from XML file");
      }

      setVendor(detectedVendor);
      const parsed = parseXMLInBrowser(content);

      // Extract the root element based on vendor
      let uploadedData;
      if (detectedVendor === "cyclonedds") {
        uploadedData = parsed.CycloneDDS || parsed.cyclonedds;
      } else {
        uploadedData = parsed.dds || parsed.DDS;
      }

      // Get the complete schema for this vendor
      const schema = getSchemaForVendor(detectedVendor);
      
      // Merge uploaded data into the schema
      let mergedData;
      if (detectedVendor === "cyclonedds") {
        // For CycloneDDS, use the standard merge (it handles partial files well)
        mergedData = mergeUploadedDataIntoSchema(uploadedData, schema.CycloneDDS);
      } else {
        // For FastDDS, use smart merge to avoid adding default profiles
        mergedData = smartMergeFastDDS(uploadedData, schema.dds);
      }

      // Generate form fields from the merged data (which includes all schema fields)
      const formFields = xmlToFormFields(mergedData);
      setFields(formFields);
      setOriginalFields(JSON.parse(JSON.stringify(formFields))); // Deep clone for reset
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse XML file");
    } finally {
      setIsLoading(false);
    }
  };

  // Function for creating new DDS files
  const handleVendorSelect = (selectedVendor: DDSVendor) => {
    setVendor(selectedVendor);
    
    // Set default filename for new files
    const defaultName = selectedVendor === "cyclonedds" ? "cyclonedds-config" : "fastdds-config";
    setDownloadFilename(defaultName);
    
    // Get the complete schema for this vendor
    const schema = getSchemaForVendor(selectedVendor);
    const schemaData = selectedVendor === "cyclonedds" ? schema.CycloneDDS : schema.dds;
    
    // Generate form fields from the schema (all default values)
    const formFields = xmlToFormFields(schemaData);
    setFields(formFields);
    setOriginalFields(JSON.parse(JSON.stringify(formFields)));
    setError(null);
  };

  const handleFieldChange = (path: string[], value: any) => {
    const updateField = (
      fields: FormField[],
      targetPath: string[],
      newValue: any
    ): FormField[] => {
      return fields.map((field) => {
        // Check if this is the target field
        if (JSON.stringify(field.path) === JSON.stringify(targetPath)) {
          return { ...field, value: newValue };
        }

        // Check if we need to recurse into nested fields
        if (field.fields && targetPath.length > field.path.length) {
          // Check if the target path starts with this field's path
          const pathMatches = field.path.every((p, i) => p === targetPath[i]);
          if (pathMatches) {
            return {
              ...field,
              fields: updateField(field.fields, targetPath, newValue),
            };
          }
        }

        return field;
      });
    };

    // Create a new array to ensure React detects the change
    const updatedFields = updateField([...fields], path, value);
    setFields(updatedFields);
  };

  const generateXML = () => {
    if (!vendor) return "";

    // Generate XML based on user preference
    const xmlData = formFieldsToXML(fields, excludeDefaults, vendor);
    return buildXML(xmlData, vendor);
  };

  const downloadXML = () => {
    const xml = generateXML();
    const blob = new Blob([xml], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${downloadFilename || vendor + '-config'}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setVendor(null);
    setFields([]);
    setOriginalFields([]);
    setError(null);
    setDownloadFilename("");
  };

  const resetToOriginal = () => {
    if (originalFields.length > 0) {
      setFields(JSON.parse(JSON.stringify(originalFields))); // Deep clone to reset
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto h-screen flex flex-col">
        {/* Header - Always visible */}
        <div className="px-6 py-4 border-b bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6" />
              <h1 className="text-2xl font-bold">
                DDS XML Configuration Editor
              </h1>
            </div>
            <p className="text-gray-600">Edit DDS XML files</p>
          </div>
          {vendor && (
            <p className="text-sm text-gray-500 mt-2">
              Edit values below • Modified fields will be highlighted
            </p>
          )}
        </div>

        {!vendor ? (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">
                    Upload DDS Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-6 text-center">
                    Upload an existing DDS XML configuration file to edit
                  </p>

                  {/* Create new DDS file buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Button
                    onClick={() => handleVendorSelect('fastdds')}
                    variant="outline"
                    className="h-auto flex flex-col items-center gap-2 p-6"
                  >
                    <FileText className="h-8 w-8" />
                    <div className="text-center">
                      <h3 className="font-semibold">FastDDS</h3>
                      <p className="text-sm text-gray-600">eProsima Fast DDS Configuration</p>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => handleVendorSelect('cyclonedds')}
                    variant="outline"
                    className="h-auto flex flex-col items-center gap-2 p-6"
                  >
                    <FileText className="h-8 w-8" />
                    <div className="text-center">
                      <h3 className="font-semibold">CycloneDDS</h3>
                      <p className="text-sm text-gray-600">Eclipse CycloneDDS Configuration</p>
                    </div>
                  </Button>
                </div>
              
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-50 text-gray-600">Or upload existing XML</span>
                  </div>
                </div>

                  <FileUpload onFileUpload={handleFileUpload} />

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-600">{error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Action Buttons */}
            <div className="px-6 py-4 bg-white border-b flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={downloadFilename}
                  onChange={(e) => setDownloadFilename(e.target.value)}
                  placeholder="filename"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-gray-500">.xml</span>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeDefaults}
                    onChange={(e) => setExcludeDefaults(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Minimal output (non-defaults only)</span>
                </label>
              </div>
              
              <Button
                onClick={downloadXML}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              >
                <Download className="w-4 h-4" />
                Download XML
              </Button>
              <Button
                variant="outline"
                onClick={reset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </Button>
              {originalFields.length > 0 && (
                <Button
                  variant="outline"
                  onClick={resetToOriginal}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Original
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowMobilePreview(!showMobilePreview)}
                className="lg:hidden flex items-center gap-2"
              >
                <Code2 className="w-4 h-4" />
                {showMobilePreview ? "Hide" : "Show"} Preview
              </Button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Configuration Form - Scrollable */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6 max-w-2xl">
                  {isLoading ? (
                    <div className="flex justify-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-transparent"></div>
                    </div>
                  ) : fields.length === 0 ? (
                    <Card>
                      <CardContent className="py-16">
                        <p className="text-center text-gray-500">
                          No configuration fields available.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    fields.map((field) => (
                      <FormFieldComponent
                        key={field.name}
                        field={field}
                        onChange={handleFieldChange}
                        isModified={isFieldModified(field, originalFields)}
                        originalFields={originalFields}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* XML Preview - Sticky */}
              <div className="hidden lg:block lg:w-1/2 p-6 bg-gray-50 border-l overflow-y-auto">
                <div className="sticky top-0">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-mono">{"</>"}</span>
                        <CardTitle className="text-lg">
                          Generated XML Preview
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-100 p-4 rounded-md text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-[calc(100vh-300px)] overflow-y-auto">
                        {generateXML() || "<!-- No modifications yet -->"}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Mobile Preview Modal */}
            {showMobilePreview && (
              <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">XML Preview</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMobilePreview(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <pre className="bg-gray-100 p-4 rounded-md text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                      {generateXML() || "<!-- No modifications yet -->"}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
