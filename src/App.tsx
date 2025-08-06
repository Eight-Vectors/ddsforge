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
import { validateXML, validateFieldValue } from "./utils/xmlValidator";
import { Download, FileText, RotateCcw, Eye } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";

function App() {
  const [vendor, setVendor] = useState<DDSVendor | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [originalFields, setOriginalFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>("");
  const [excludeDefaults, setExcludeDefaults] = useState<boolean>(true); // Default to minimal output
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [fieldValidationErrors, setFieldValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleFileUpload = async (content: string, fileName?: string) => {
    setIsLoading(true);
    setError(null);

    // Set the download filename to the uploaded filename (without extension)
    if (fileName) {
      const nameWithoutExt = fileName.replace(/\.xml$/i, "");
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
        mergedData = mergeUploadedDataIntoSchema(
          uploadedData,
          schema.CycloneDDS
        );
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
    const defaultName =
      selectedVendor === "cyclonedds" ? "cyclonedds-config" : "fastdds-config";
    setDownloadFilename(defaultName);

    // Get the complete schema for this vendor
    const schema = getSchemaForVendor(selectedVendor);
    const schemaData =
      selectedVendor === "cyclonedds" ? schema.CycloneDDS : schema.dds;

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

    // Validate the field value
    if (vendor) {
      const error = validateFieldValue(path, value, vendor);
      const pathKey = path.join(".");

      setFieldValidationErrors((prev) => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[pathKey] = error;
        } else {
          delete newErrors[pathKey];
        }
        return newErrors;
      });
    }
  };
  console.log("Vendor:", vendor);

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
    a.download = `${downloadFilename || vendor + "-config"}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadClick = () => {
    downloadXML();
  };

  const handlePreviewClick = () => {
    setValidationStatus('idle');
    setValidationErrors([]);
    setShowPreviewDialog(true);
  };

  const handleValidateClick = () => {
    const xml = generateXML();
    if (vendor) {
      const validation = validateXML(xml, vendor);
      setValidationErrors(validation.errors);
      setValidationStatus(validation.errors.length === 0 ? 'valid' : 'invalid');
    }
  };

  const handleSaveFromPreview = () => {
    downloadXML();
    setShowPreviewDialog(false);
  };

  const handleCancelFromPreview = () => {
    setShowPreviewDialog(false);
    setValidationStatus('idle');
    setValidationErrors([]);
  };

  const reset = () => {
    setVendor(null);
    setFields([]);
    setOriginalFields([]);
    setError(null);
    setDownloadFilename("");
    setFieldValidationErrors({});
    setValidationErrors([]);
  };

  const resetToOriginal = () => {
    if (originalFields.length > 0) {
      setFields(JSON.parse(JSON.stringify(originalFields))); // Deep clone to reset
    }
  };

  // Render fields based on vendor type
  const renderFieldsForVendor = (fieldsToRender: FormField[]) => {
    console.log("renderFieldsForVendor called with:", fieldsToRender);
    console.log("Current vendor:", vendor);
    
    // Extract top-level sections for two-column layout
    let sectionsToRender: FormField[] = [];
    let domainHeaderField: FormField | null = null;

    // For CycloneDDS: Look for Domain field which contains sections
    if (vendor === "cyclonedds") {
      // Find the Domain field - it could be nested at any level
      const findDomainField = (fields: FormField[]): FormField | undefined => {
        for (const field of fields) {
          if (
            field.name === "Domain" &&
            field.type === "object" &&
            field.fields
          ) {
            return field;
          }
          // Recursively search in nested fields
          if (field.fields) {
            const found = findDomainField(field.fields);
            if (found) return found;
          }
        }
        return undefined;
      };

      const domainField = findDomainField(fieldsToRender);

      if (domainField && domainField.fields) {
        // Extract any non-object/array fields as header fields (like Id)
        // Filter out duplicate ID fields (keep only attribute version @_id)
        const simpleFields = domainField.fields.filter((f) => {
          if (f.type === "object" || f.type === "array") return false;
          // If we have both 'Id' and '@_id', keep only '@_id'
          if (
            f.name === "Id" &&
            domainField.fields?.some((field) => field.name === "@_id")
          ) {
            return false;
          }
          return true;
        });

        if (simpleFields.length > 0) {
          // Create a header section with simple fields
          domainHeaderField = {
            name: "DomainHeader",
            label: "Domain Configuration",
            type: "object",
            path: domainField.path,
            fields: simpleFields,
            value: simpleFields.reduce(
              (acc, field) => ({
                ...acc,
                [field.name]: field.value,
              }),
              {}
            ),
            defaultValue: {},
            required: false,
          };
        }

        // Get all object-type fields as sections (General, Discovery, etc.)
        const sections = domainField.fields.filter(
          (f) => f.type === "object" || f.type === "array"
        );
        sectionsToRender.push(...sections);
      }
    } else if (vendor === "fastdds") {
      // Collect all fields/sections to display
      let allFieldsToDisplay: FormField[] = [];
      
      if (fieldsToRender.length === 1 && fieldsToRender[0].type === "object" && fieldsToRender[0].fields) {
        // Extract all base sections and their subsections
        const rootField = fieldsToRender[0];
        rootField.fields?.forEach((baseSection: FormField) => {
          if (baseSection.type === "object" && baseSection.fields) {
            // Add all subsections from this base section
            baseSection.fields.forEach((subsection: FormField) => {
              allFieldsToDisplay.push(subsection);
            });
          } else {
            // Add the base section itself
            allFieldsToDisplay.push(baseSection);
          }
        });
      } else {
        // If fields are already flat, use them directly
        fieldsToRender.forEach((field: FormField) => {
          if (field.type === "object" && field.fields) {
            field.fields.forEach((subfield: FormField) => {
              allFieldsToDisplay.push(subfield);
            });
          } else {
            allFieldsToDisplay.push(field);
          }
        });
      }

      // Split all fields into two halves
      const midpoint = Math.ceil(allFieldsToDisplay.length / 2);
      const leftFields = allFieldsToDisplay.slice(0, midpoint);
      const rightFields = allFieldsToDisplay.slice(midpoint);

      // Render split-screen layout
      return (
        <div className="flex h-full">
          {/* Left Section - 50% */}
          <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200">
            <div className="space-y-6">
              {leftFields.map((field) => (
                <FormFieldComponent
                  key={field.path.join("-")}
                  field={field}
                  onChange={handleFieldChange}
                  isModified={isFieldModified(field, originalFields)}
                  originalFields={originalFields}
                  validationError={fieldValidationErrors[field.path.join(".")]}
                />
              ))}
            </div>
          </div>
          
          {/* Right Section - 50% */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="space-y-6">
              {rightFields.map((field) => (
                <FormFieldComponent
                  key={field.path.join("-")}
                  field={field}
                  onChange={handleFieldChange}
                  isModified={isFieldModified(field, originalFields)}
                  originalFields={originalFields}
                  validationError={fieldValidationErrors[field.path.join(".")]}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    // If we have a domain header and sections, render with special layout (CycloneDDS)
    if (domainHeaderField && sectionsToRender.length > 0) {
      // Split sections into two halves
      const midpoint = Math.ceil(sectionsToRender.length / 2);
      const leftSections = sectionsToRender.slice(0, midpoint);
      const rightSections = sectionsToRender.slice(midpoint);

      return (
        <div className="flex flex-col h-full">
          {/* Domain Header - Compact */}
          <div className="px-6 pt-4 pb-2">
            <Card className="shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="text-lg">{domainHeaderField.label}</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-4">
                  {domainHeaderField.fields?.map((field) => (
                    <div key={field.name} className="flex items-center gap-2">
                      <label className="text-sm font-medium">{field.label}:</label>
                      <div className="w-32">
                        <FormFieldComponent
                          field={field}
                          onChange={handleFieldChange}
                          isInline={true}
                          isModified={isFieldModified(field, originalFields)}
                          originalFields={originalFields}
                          validationError={fieldValidationErrors[field.path.join(".")]}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Split-screen sections */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Section - 50% */}
            <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200">
              <div className="space-y-6">
                {leftSections.map((field) => (
                  <FormFieldComponent
                    key={field.name}
                    field={field}
                    onChange={handleFieldChange}
                    isModified={isFieldModified(field, originalFields)}
                    originalFields={originalFields}
                    validationError={fieldValidationErrors[field.path.join(".")]}
                  />
                ))}
              </div>
            </div>
            
            {/* Right Section - 50% */}
            <div className="w-1/2 p-6 overflow-y-auto">
              <div className="space-y-6">
                {rightSections.map((field) => (
                  <FormFieldComponent
                    key={field.name}
                    field={field}
                    onChange={handleFieldChange}
                    isModified={isFieldModified(field, originalFields)}
                    originalFields={originalFields}
                    validationError={fieldValidationErrors[field.path.join(".")]}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // If we found sections to render in columns, use two-column layout
    if (sectionsToRender.length > 0) {
      return renderFieldsInColumns(sectionsToRender);
    }

    // Otherwise, check if we need to look deeper in the structure
    // This handles cases where the XML structure might be slightly different
    if (vendor === "cyclonedds" && fieldsToRender.length > 0) {
      // Look for any top-level sections that should be displayed
      const allSections: FormField[] = [];

      const extractSections = (fields: FormField[]) => {
        fields.forEach((field) => {
          // Check if this field represents a major section
          const sectionNames = [
            "General",
            "Discovery",
            "Transport",
            "Tracing",
            "Security",
            "TCP",
            "SSL",
            "SharedMemory",
            "Monitoring",
            "Watchdog",
            "Internal",
          ];
          if (
            sectionNames.includes(field.name) &&
            (field.type === "object" || field.type === "array")
          ) {
            allSections.push(field);
          } else if (field.fields) {
            // Recursively look for sections
            extractSections(field.fields);
          }
        });
      };

      extractSections(fieldsToRender);

      if (allSections.length > 0) {
        return renderFieldsInColumns(allSections);
      }
    }

    // Fall back to default rendering
    return renderFieldsInColumns(fieldsToRender);
  };

  // Render fields in columns for better space utilization
  const renderFieldsInColumns = (fieldsToRender: FormField[]) => {
    // Calculate midpoint to split fields
    const totalFields = fieldsToRender.length;
    const midpoint = Math.ceil(totalFields / 2);

    console.log("Rendering fields :", fieldsToRender);

    // Split fields into two columns
    const leftColumnFields = fieldsToRender.slice(0, midpoint);
    const rightColumnFields = fieldsToRender.slice(midpoint);

    // For mobile or very few fields, use single column
    if (totalFields <= 3) {
      return (
        <div className="space-y-6">
          {fieldsToRender.map((field) => (
            <FormFieldComponent
              key={field.name}
              field={field}
              onChange={handleFieldChange}
              isModified={isFieldModified(field, originalFields)}
              originalFields={originalFields}
              validationError={fieldValidationErrors[field.path.join(".")]}
            />
          ))}
        </div>
      );
    }

    // For desktop, use two columns
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {leftColumnFields.map((field) => (
            <FormFieldComponent
              key={field.name}
              field={field}
              onChange={handleFieldChange}
              isModified={isFieldModified(field, originalFields)}
              originalFields={originalFields}
              validationError={fieldValidationErrors[field.path.join(".")]}
            />
          ))}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {rightColumnFields.map((field) => (
            <FormFieldComponent
              key={field.name}
              field={field}
              onChange={handleFieldChange}
              isModified={isFieldModified(field, originalFields)}
              originalFields={originalFields}
              validationError={fieldValidationErrors[field.path.join(".")]}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full h-screen flex flex-col">
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
                      onClick={() => handleVendorSelect("fastdds")}
                      variant="outline"
                      className="h-auto flex flex-col items-center gap-2 p-6"
                    >
                      <FileText className="h-8 w-8" />
                      <div className="text-center">
                        <h3 className="font-semibold">FastDDS</h3>
                        <p className="text-sm text-gray-600">
                          eProsima Fast DDS Configuration
                        </p>
                      </div>
                    </Button>

                    <Button
                      onClick={() => handleVendorSelect("cyclonedds")}
                      variant="outline"
                      className="h-auto flex flex-col items-center gap-2 p-6"
                    >
                      <FileText className="h-8 w-8" />
                      <div className="text-center">
                        <h3 className="font-semibold">CycloneDDS</h3>
                        <p className="text-sm text-gray-600">
                          Eclipse CycloneDDS Configuration
                        </p>
                      </div>
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-gray-50 text-gray-600">
                        Or upload existing XML
                      </span>
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
                  <span className="text-sm text-gray-700">
                    Minimal output (non-defaults only)
                  </span>
                </label>
              </div>

              <Button
                onClick={handlePreviewClick}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview XML
              </Button>
              <Button
                onClick={handleDownloadClick}
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
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Configuration Form - Scrollable */}
              <div className="flex-1 overflow-hidden">
                {isLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-transparent"></div>
                  </div>
                ) : fields.length === 0 ? (
                  <div className="p-6">
                    <Card>
                      <CardContent className="py-16">
                        <p className="text-center text-gray-500">
                          No configuration fields available.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  renderFieldsForVendor(fields)
                )}
              </div>
            </div>
          </div>
        )}

        {/* Download Preview Dialog */}
        {showPreviewDialog && (
          <>
            {/* Backdrop with blur */}
            <div className="fixed inset-0 z-40 backdrop-blur-sm bg-black/30" onClick={handleCancelFromPreview} />
            {/* Dialog */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto shadow-2xl">
              <div className="p-6 border-b">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">XML Preview</h2>
                    <p className="text-gray-600">
                      Review your XML configuration before downloading
                    </p>
                  </div>
                  <Button
                    onClick={handleValidateClick}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Validate XML
                  </Button>
                </div>
                
                {/* Show validation status */}
                {validationStatus === 'valid' && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-600 font-semibold flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Valid XML
                    </p>
                  </div>
                )}
                
                {validationStatus === 'invalid' && validationErrors.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 font-semibold mb-2">
                      Validation Errors:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-red-600 text-sm">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-auto p-6">
                <pre className="bg-gray-100 p-6 rounded-md text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                  {generateXML()}
                </pre>
              </div>
              <div className="p-6 border-t flex justify-end gap-4">
                <Button variant="outline" onClick={handleCancelFromPreview}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveFromPreview}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Save XML
                </Button>
              </div>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
