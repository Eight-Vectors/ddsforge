import { useState, useCallback, useEffect } from "react";
import type { DDSVendor, FormField } from "./types/dds";
import { FileUpload } from "./components/FileUpload";
import { FormField as FormFieldComponent } from "./components/FormField";
import { FastDDSProfileEditor } from "./components/FastDDSProfileEditor";
import { HelpPage } from "./components/HelpPage";
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
import { validateXML, validateFieldValue } from "./utils/xmlValidator";
import {
  parseJSON5,
  jsonToFormFields,
  formFieldsToJSON,
  buildJSON,
  getZenohSchema,
  mergeWithSchema,
} from "./utils/jsonParser";
import {
  ZENOH_PREDEFINED_CONFIG_JSON5,
  FASTDDS_PREDEFINED_XML,
  CYCLONEDDS_PREDEFINED_XML,
} from "./constants/predefinedConfigs";
import {
  Download,
  FileText,
  RotateCcw,
  Eye,
  AlertTriangle,
  HelpCircle,
  Share2,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Switch } from "./components/ui/switch";

function App() {
  const [vendor, setVendor] = useState<DDSVendor | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [originalFields, setOriginalFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>("");
  const excludeDefaults = true;
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationStatus, setValidationStatus] = useState<
    "idle" | "valid" | "invalid"
  >("idle");
  const [fieldValidationErrors, setFieldValidationErrors] = useState<
    Record<string, string>
  >({});
  const [uploadedFastDDSData, setUploadedFastDDSData] = useState<any>(null);
  const [originalFastDDSData, setOriginalFastDDSData] = useState<any>(null);
  const [fastDDSCreatedFromScratch, setFastDDSCreatedFromScratch] =
    useState<boolean>(false);
  const [fastDDSResetCounter, setFastDDSResetCounter] = useState<number>(0);
  const [uploadedCycloneDDSData, setUploadedCycloneDDSData] =
    useState<any>(null);
  const [uploadedZenohData, setUploadedZenohData] = useState<any>(null);
  const [generatedXML, setGeneratedXML] = useState<string>("");
  const [showHelpPage, setShowHelpPage] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [usePredefinedConfig, setUsePredefinedConfig] = useState(false);

  const handleXMLGenerate = useCallback((xml: string) => {
    setGeneratedXML(xml);
  }, []);

  const handleFileUpload = async (content: string, fileName?: string) => {
    setIsLoading(true);
    setError(null);
    setIsCreateMode(false);
    setUsePredefinedConfig(false);

    if (fileName) {
      const nameWithoutExt = fileName.replace(/\.(xml|json|json5)$/i, "");
      setDownloadFilename(nameWithoutExt);
    }

    try {
      const detectedVendor = detectVendor(content);
      if (!detectedVendor) {
        throw new Error("Unable to detect configuration type from file");
      }

      setVendor(detectedVendor);

      if (detectedVendor === "zenoh") {
        const parsed = parseJSON5(content);
        setUploadedZenohData(parsed);
        const schema = getZenohSchema();
        const mergedData = mergeWithSchema(parsed, schema);
        const formFields = jsonToFormFields(mergedData, schema);
        setFields(formFields);
        setOriginalFields(JSON.parse(JSON.stringify(formFields)));
      } else {
        const parsed = parseXMLInBrowser(content);
        let uploadedData;
        if (detectedVendor === "cyclonedds") {
          uploadedData = parsed.CycloneDDS || parsed.cyclonedds;
        } else {
          uploadedData = parsed.dds || parsed.DDS;
        }

        if (detectedVendor === "fastdds") {
          setUploadedFastDDSData(uploadedData);
          setOriginalFastDDSData(JSON.parse(JSON.stringify(uploadedData)));
          setFastDDSCreatedFromScratch(false);
        } else {
          setUploadedCycloneDDSData(uploadedData);
          const schema = getSchemaForVendor(detectedVendor);
          const mergedData = mergeUploadedDataIntoSchema(
            uploadedData,
            schema.CycloneDDS
          );
          const formFields = xmlToFormFields(mergedData);
          setFields(formFields);
          setOriginalFields(JSON.parse(JSON.stringify(formFields)));
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to parse configuration file"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVendorSelect = (selectedVendor: DDSVendor) => {
    setVendor(selectedVendor);
    setIsCreateMode(true);
    setUsePredefinedConfig(false);

    let defaultName = "";
    switch (selectedVendor) {
      case "cyclonedds":
        defaultName = "cyclonedds-config";
        break;
      case "fastdds":
        defaultName = "fastdds-config";
        break;
      case "zenoh":
        defaultName = "zenoh-config";
        break;
    }
    setDownloadFilename(defaultName);

    if (selectedVendor === "fastdds") {
      setUploadedFastDDSData(null);
      setOriginalFastDDSData(null);
      setFastDDSCreatedFromScratch(true);
    } else if (selectedVendor === "zenoh") {
      setUploadedZenohData(null);
      const schema = getZenohSchema();
      const formFields = jsonToFormFields(schema, schema);
      setFields(formFields);
      setOriginalFields(JSON.parse(JSON.stringify(formFields)));
    } else {
      const schema = getSchemaForVendor(selectedVendor);
      const schemaData = schema.CycloneDDS;
      const formFields = xmlToFormFields(schemaData);
      setFields(formFields);
      setOriginalFields(JSON.parse(JSON.stringify(formFields)));
    }
    setError(null);
  };

  const handleFieldChange = (path: string[], value: any) => {
    const updateField = (
      fields: FormField[],
      targetPath: string[],
      newValue: any
    ): FormField[] => {
      return fields.map((field) => {
        if (JSON.stringify(field.path) === JSON.stringify(targetPath)) {
          return { ...field, value: newValue };
        }

        // Special handling for Thread array inside Threads object
        if (
          field.name === "Thread" &&
          field.path.length > 1 &&
          field.path[field.path.length - 2] === "Threads"
        ) {
          const pathMatches = field.path.every((p, i) => p === targetPath[i]);
          if (pathMatches && targetPath.length > field.path.length) {
            const arrayIndex = parseInt(targetPath[field.path.length]);
            if (!isNaN(arrayIndex) && field.value && field.value[arrayIndex]) {
              const itemPath = targetPath.slice(field.path.length + 1);

              if (itemPath.length === 0) {
                const newArray = [...field.value];
                newArray[arrayIndex] = newValue;
                return { ...field, value: newArray };
              } else {
                const newArray = [...field.value];
                newArray[arrayIndex] = JSON.parse(
                  JSON.stringify(newArray[arrayIndex])
                );

                let current = newArray[arrayIndex];

                for (let i = 0; i < itemPath.length - 1; i++) {
                  if (!current[itemPath[i]]) {
                    current[itemPath[i]] = {};
                  }
                  current = current[itemPath[i]];
                }

                current[itemPath[itemPath.length - 1]] = newValue;

                return { ...field, value: newArray };
              }
            }
          }
        }

        if (
          field.type === "array" &&
          field.value &&
          Array.isArray(field.value)
        ) {
          const pathMatches = field.path.every((p, i) => p === targetPath[i]);
          if (pathMatches && targetPath.length > field.path.length) {
            const arrayIndex = parseInt(targetPath[field.path.length]);
            if (!isNaN(arrayIndex) && arrayIndex < field.value.length) {
              const itemPath = targetPath.slice(field.path.length + 1);
              if (itemPath.length === 0) {
                const newArray = [...field.value];
                newArray[arrayIndex] = newValue;
                return { ...field, value: newArray };
              } else {
                // Update nested field within array item
                const newArray = [...field.value];
                let current = newArray[arrayIndex];

                // Navigate to the nested field
                for (let i = 0; i < itemPath.length - 1; i++) {
                  if (!current[itemPath[i]]) {
                    current[itemPath[i]] = {};
                  }
                  current = current[itemPath[i]];
                }

                // Set the value
                current[itemPath[itemPath.length - 1]] = newValue;

                return { ...field, value: newArray };
              }
            }
          }
        }

        if (field.fields && targetPath.length > field.path.length) {
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

    const updatedFields = updateField([...fields], path, value);

    const forceUpdate = JSON.parse(JSON.stringify(updatedFields));
    setFields(forceUpdate);

    if (vendor) {
      try {
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
      } catch (err) {
        const pathKey = path.join(".");
        setFieldValidationErrors((prev) => ({
          ...prev,
          [pathKey]: `Validation error: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        }));
      }
    }
  };

  const handleForceIncludeChange = (path: string[], forceInclude: boolean) => {
    const isIndexSegment = (segment: string) => /^\d+$/.test(segment);
    const indexPos = path.findIndex(isIndexSegment);

    const setForceFlagOnItem = (item: any, segments: string[]): any => {
      if (segments.length === 0) {
        return item;
      }

      if (segments.length === 1) {
        const fieldName = segments[0];
        const fi = { ...(item?.__forceInclude || {}) };
        if (forceInclude) {
          fi[fieldName] = true;
        } else {
          delete fi[fieldName];
        }
        const clone = { ...(item || {}) };
        if (Object.keys(fi).length > 0) {
          clone.__forceInclude = fi;
        } else {
          delete clone.__forceInclude;
        }
        return clone;
      }

      const [segment, ...rest] = segments;
      if (segment === undefined) {
        return item;
      }

      if (isIndexSegment(segment)) {
        const idx = parseInt(segment, 10);
        const arrayClone = Array.isArray(item) ? [...item] : [];
        arrayClone[idx] = setForceFlagOnItem(arrayClone[idx] || {}, rest);
        return arrayClone;
      }

      const clone = { ...(item || {}) };
      const currentValue = clone[segment];

      const nextIsIndex = rest.length > 0 && isIndexSegment(rest[0]);
      if (nextIsIndex) {
        const idx = parseInt(rest[0], 10);
        const tail = rest.slice(1);
        const existingArray = Array.isArray(currentValue)
          ? [...currentValue]
          : [];
        existingArray[idx] = setForceFlagOnItem(existingArray[idx] || {}, tail);
        clone[segment] = existingArray;
        return clone;
      }

      clone[segment] = setForceFlagOnItem(currentValue || {}, rest);
      return clone;
    };

    if (indexPos > 0) {
      const arrayRootPath = path.slice(0, indexPos);
      const targetIndex = parseInt(path[indexPos], 10);
      const remainder = path.slice(indexPos + 1);

      const updateNestedArray = (
        fields: FormField[],
        targetPath: string[]
      ): FormField[] => {
        return fields.map((field) => {
          if (JSON.stringify(field.path) === JSON.stringify(arrayRootPath)) {
            if (!Array.isArray(field.value) || isNaN(targetIndex)) {
              return field;
            }
            const updatedArray = field.value.map((item: any, idx: number) => {
              if (idx !== targetIndex) return item;
              return setForceFlagOnItem(item || {}, remainder);
            });
            return { ...field, value: updatedArray };
          }

          if (field.fields && targetPath.length > field.path.length) {
            const prefixMatches =
              field.path.length <= arrayRootPath.length &&
              field.path.every(
                (segment, idx) => segment === arrayRootPath[idx]
              );
            if (prefixMatches) {
              return {
                ...field,
                fields: updateNestedArray(field.fields, targetPath),
              };
            }
          }
          return field;
        });
      };

      const updatedFields = updateNestedArray([...fields], path);
      setFields(updatedFields);
      return;
    }

    const updateField = (
      fields: FormField[],
      targetPath: string[]
    ): FormField[] => {
      return fields.map((field) => {
        if (JSON.stringify(field.path) === JSON.stringify(targetPath)) {
          return { ...field, forceInclude };
        }

        if (field.fields && targetPath.length > field.path.length) {
          const pathMatches = field.path.every((p, i) => p === targetPath[i]);
          if (pathMatches) {
            return {
              ...field,
              fields: updateField(field.fields, targetPath),
            };
          }
        }

        return field;
      });
    };

    const updatedFields = updateField([...fields], path);
    setFields(updatedFields);
  };

  const generateXML = () => {
    if (!vendor) return "";

    if (vendor === "fastdds") {
      return generatedXML;
    } else if (vendor === "zenoh") {
      const jsonData = formFieldsToJSON(
        fields,
        excludeDefaults,
        uploadedZenohData,
        originalFields
      );
      if (isCreateMode && usePredefinedConfig && !uploadedZenohData) {
        const predefined = parseJSON5(ZENOH_PREDEFINED_CONFIG_JSON5);
        const merged = mergeWithSchema(jsonData, predefined);
        return buildJSON(merged, true);
      }
      return buildJSON(jsonData, true);
    } else {
      const xmlData = formFieldsToXML(
        fields,
        excludeDefaults,
        vendor,
        uploadedCycloneDDSData,
        originalFields
      );
      return buildXML(xmlData, vendor);
    }
  };

  const downloadXML = () => {
    const content = generateXML();
    const isJSON = vendor === "zenoh";
    const mimeType = isJSON ? "application/json" : "text/xml";
    const extension = isJSON ? ".json5" : ".xml";

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${downloadFilename || vendor + "-config"}${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadClick = () => {
    downloadXML();
  };

  const handlePreviewClick = () => {
    setValidationStatus("idle");
    setValidationErrors([]);
    setShowPreviewDialog(true);
  };

  const handleValidateClick = () => {
    const xml = generateXML();
    if (vendor) {
      const validation = validateXML(xml, vendor);
      setValidationErrors(validation.errors);
      setValidationStatus(validation.errors.length === 0 ? "valid" : "invalid");
    }
  };

  const handleSaveFromPreview = () => {
    downloadXML();
    setShowPreviewDialog(false);
  };

  const handleCancelFromPreview = () => {
    setShowPreviewDialog(false);
    setValidationStatus("idle");
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
    setUploadedFastDDSData(null);
    setOriginalFastDDSData(null);
    setFastDDSCreatedFromScratch(false);
    setFastDDSResetCounter(0);
    setUploadedCycloneDDSData(null);
    setUploadedZenohData(null);
    setGeneratedXML("");
    setIsCreateMode(false);
    setUsePredefinedConfig(false);
  };

  const handleShowHelp = () => {
    setShowHelpPage(true);
  };

  const handleBackFromHelp = () => {
    setShowHelpPage(false);
  };

  const resetToOriginal = () => {
    if (originalFields.length > 0) {
      setFields(JSON.parse(JSON.stringify(originalFields)));
    }
  };

  const resetFastDDSToOriginal = () => {
    if (originalFastDDSData) {
      setUploadedFastDDSData(JSON.parse(JSON.stringify(originalFastDDSData)));
      setFastDDSResetCounter((prev) => prev + 1);
    }
  };

  const resetFastDDSToDefaults = () => {
    setUploadedFastDDSData(null);
    setFastDDSResetCounter((prev) => prev + 1);
  };

  // Handle predefined templates for FastDDS and CycloneDDS in create mode
  useEffect(() => {
    if (!isCreateMode) return;

    if (vendor === "fastdds") {
      if (usePredefinedConfig) {
        try {
          const parsed = parseXMLInBrowser(FASTDDS_PREDEFINED_XML);
          const data =
            parsed && parsed.profiles
              ? parsed
              : parsed && (parsed.dds || parsed.DDS)
              ? parsed.dds || parsed.DDS
              : parsed;

          setUploadedFastDDSData(data);
          setOriginalFastDDSData(JSON.parse(JSON.stringify(data)));
          setFastDDSCreatedFromScratch(false);
        } catch (e) {
          console.error("Failed to apply FastDDS predefined template", e);
        }
      } else {
        // Back to scratch defaults
        setUploadedFastDDSData(null);
        setOriginalFastDDSData(null);
        setFastDDSCreatedFromScratch(true);
      }
    } else if (vendor === "cyclonedds") {
      const schema = getSchemaForVendor("cyclonedds");

      if (usePredefinedConfig) {
        try {
          const parsed = parseXMLInBrowser(CYCLONEDDS_PREDEFINED_XML);
          const uploaded =
            parsed && (parsed.CycloneDDS || parsed.cyclonedds)
              ? parsed.CycloneDDS || parsed.cyclonedds
              : parsed;

          const mergedData = mergeUploadedDataIntoSchema(
            uploaded,
            schema.CycloneDDS
          );
          const formFields = xmlToFormFields(mergedData);
          setFields(formFields);
          setOriginalFields(JSON.parse(JSON.stringify(formFields)));
          setUploadedCycloneDDSData(uploaded);
        } catch (e) {
          console.error("Failed to apply CycloneDDS predefined template", e);
        }
      } else {
        const schemaData = schema.CycloneDDS;
        const formFields = xmlToFormFields(schemaData);
        setFields(formFields);
        setOriginalFields(JSON.parse(JSON.stringify(formFields)));
        setUploadedCycloneDDSData(null);
      }
    }
  }, [vendor, isCreateMode, usePredefinedConfig]);

  const renderFieldsForVendor = (fieldsToRender: FormField[]) => {
    let sectionsToRender: FormField[] = [];
    let domainHeaderField: FormField | null = null;

    if (vendor === "cyclonedds") {
      const findDomainField = (fields: FormField[]): FormField | undefined => {
        for (const field of fields) {
          if (
            field.name === "Domain" &&
            field.type === "object" &&
            field.fields
          ) {
            return field;
          }

          if (field.fields) {
            const found = findDomainField(field.fields);
            if (found) return found;
          }
        }
        return undefined;
      };

      const domainField = findDomainField(fieldsToRender);

      if (domainField && domainField.fields) {
        const simpleFields = domainField.fields.filter((f) => {
          if (f.type === "object" || f.type === "array") return false;

          if (
            f.name === "Id" &&
            domainField.fields?.some((field) => field.name === "@_id")
          ) {
            return false;
          }
          return true;
        });

        if (simpleFields.length > 0) {
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

        const sections = domainField.fields.filter(
          (f) => f.type === "object" || f.type === "array"
        );
        sectionsToRender.push(...sections);
      }
    } else if (vendor === "fastdds") {
      let allFieldsToDisplay: FormField[] = [];

      if (
        fieldsToRender.length === 1 &&
        fieldsToRender[0].type === "object" &&
        fieldsToRender[0].fields
      ) {
        const rootField = fieldsToRender[0];
        rootField.fields?.forEach((baseSection: FormField) => {
          if (baseSection.type === "object" && baseSection.fields) {
            baseSection.fields.forEach((subsection: FormField) => {
              allFieldsToDisplay.push(subsection);
            });
          } else {
            allFieldsToDisplay.push(baseSection);
          }
        });
      } else {
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

      return (
        <div className="flex h-full">
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
                  excludeDefaults={excludeDefaults}
                  onForceIncludeChange={handleForceIncludeChange}
                />
              ))}
            </div>
          </div>
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
                  excludeDefaults={excludeDefaults}
                  onForceIncludeChange={handleForceIncludeChange}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (domainHeaderField && sectionsToRender.length > 0) {
      // Split sections into two halves
      const midpoint = Math.ceil(sectionsToRender.length / 2);
      const leftSections = sectionsToRender.slice(0, midpoint);
      const rightSections = sectionsToRender.slice(midpoint);

      return (
        <div className="flex flex-col h-full">
          {/* Domain Header  */}
          <div className="px-6 pt-4 pb-2">
            <Card className="shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="text-lg">
                  {domainHeaderField.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-4">
                  {domainHeaderField.fields?.map((field) => (
                    <div key={field.name} className="flex items-center gap-2">
                      <label className="text-sm font-medium">
                        {field.label}:
                      </label>
                      <div className="w-32">
                        <FormFieldComponent
                          field={field}
                          onChange={handleFieldChange}
                          isInline={true}
                          isModified={isFieldModified(field, originalFields)}
                          originalFields={originalFields}
                          validationError={
                            fieldValidationErrors[field.path.join(".")]
                          }
                          excludeDefaults={excludeDefaults}
                          onForceIncludeChange={handleForceIncludeChange}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200">
              <div className="space-y-6">
                {leftSections.map((field) => (
                  <FormFieldComponent
                    key={field.name}
                    field={field}
                    onChange={handleFieldChange}
                    isModified={isFieldModified(field, originalFields)}
                    originalFields={originalFields}
                    validationError={
                      fieldValidationErrors[field.path.join(".")]
                    }
                    excludeDefaults={excludeDefaults}
                    onForceIncludeChange={handleForceIncludeChange}
                  />
                ))}
              </div>
            </div>

            <div className="w-1/2 p-6 overflow-y-auto">
              <div className="space-y-6">
                {rightSections.map((field) => (
                  <FormFieldComponent
                    key={field.name}
                    field={field}
                    onChange={handleFieldChange}
                    isModified={isFieldModified(field, originalFields)}
                    originalFields={originalFields}
                    validationError={
                      fieldValidationErrors[field.path.join(".")]
                    }
                    excludeDefaults={excludeDefaults}
                    onForceIncludeChange={handleForceIncludeChange}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (sectionsToRender.length > 0) {
      return renderFieldsInColumns(sectionsToRender);
    }

    if (vendor === "cyclonedds" && fieldsToRender.length > 0) {
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

  // Show form fields in columns
  const renderFieldsInColumns = (fieldsToRender: FormField[]) => {
    const totalFields = fieldsToRender.length;
    const midpoint = Math.ceil(totalFields / 2);

    // Split fields into two columns
    const leftColumnFields = fieldsToRender.slice(0, midpoint);
    const rightColumnFields = fieldsToRender.slice(midpoint);

    // Add extra padding for Zenoh forms
    const containerClass = vendor === "zenoh" ? "p-6 space-y-6" : "space-y-6";

    // For mobile or very few fields, use single column
    if (totalFields <= 3) {
      return (
        <div className={containerClass}>
          {fieldsToRender.map((field) => (
            <FormFieldComponent
              key={field.name}
              field={field}
              onChange={handleFieldChange}
              isModified={isFieldModified(field, originalFields)}
              originalFields={originalFields}
              validationError={fieldValidationErrors[field.path.join(".")]}
              excludeDefaults={excludeDefaults}
              onForceIncludeChange={handleForceIncludeChange}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        className={
          vendor === "zenoh"
            ? "p-6 grid grid-cols-1 lg:grid-cols-2 gap-6"
            : "grid grid-cols-1 lg:grid-cols-2 gap-6"
        }
      >
        <div className="space-y-6">
          {leftColumnFields.map((field) => (
            <FormFieldComponent
              key={field.name}
              field={field}
              onChange={handleFieldChange}
              isModified={isFieldModified(field, originalFields)}
              originalFields={originalFields}
              validationError={fieldValidationErrors[field.path.join(".")]}
              excludeDefaults={excludeDefaults}
              onForceIncludeChange={handleForceIncludeChange}
            />
          ))}
        </div>

        <div className="space-y-6">
          {rightColumnFields.map((field) => (
            <FormFieldComponent
              key={field.name}
              field={field}
              onChange={handleFieldChange}
              isModified={isFieldModified(field, originalFields)}
              originalFields={originalFields}
              validationError={fieldValidationErrors[field.path.join(".")]}
              excludeDefaults={excludeDefaults}
              onForceIncludeChange={handleForceIncludeChange}
            />
          ))}
        </div>
      </div>
    );
  };

  if (showHelpPage) {
    return <HelpPage onBack={handleBackFromHelp} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header  */}
      <header className="px-6 py-4 border-b bg-white sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <button
            onClick={reset}
            className="hover:opacity-80 transition-opacity cursor-pointer overflow-hidden"
            title="Start Over"
          >
            <img
              src="/logo.png"
              alt="DDS Forge Logo"
              className="h-10 w-40 object-cover"
            />
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            DDS Config Generator for CycloneDDS, Fast DDS & Zenoh
          </h1>
          <Button
            onClick={handleShowHelp}
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100"
            title="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {!vendor ? (
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              <Card className="flex flex-col h-full">
                <CardHeader>
                  <CardTitle className="text-center">
                    Create New Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-4 flex-1 flex flex-col justify-center">
                    <Button
                      onClick={() => handleVendorSelect("fastdds")}
                      variant="outline"
                      className="w-full h-auto flex flex-col items-center gap-3 p-6 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                      data-umami-event="Click Create Fastdds"
                    >
                      <FileText className="h-8 w-8 text-purple-600" />
                      <div className="text-center">
                        <h3 className="font-semibold text-lg">FastDDS</h3>
                        <p className="text-sm text-gray-600">
                          eProsima Fast DDS Configuration
                        </p>
                      </div>
                    </Button>

                    <Button
                      onClick={() => handleVendorSelect("cyclonedds")}
                      variant="outline"
                      className="w-full h-auto flex flex-col items-center gap-3 p-6 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      data-umami-event="Click Create Cyclonedds"
                    >
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="text-center">
                        <h3 className="font-semibold text-lg">CycloneDDS</h3>
                        <p className="text-sm text-gray-600">
                          Eclipse CycloneDDS Configuration
                        </p>
                      </div>
                    </Button>

                    <Button
                      onClick={() => handleVendorSelect("zenoh")}
                      variant="outline"
                      className="w-full h-auto flex flex-col items-center gap-3 p-6 hover:bg-green-50 hover:border-green-300 transition-colors"
                      data-umami-event="Click Create Zenoh"
                    >
                      <Share2 className="h-8 w-8 text-green-600" />
                      <div className="text-center">
                        <h3 className="font-semibold text-lg">Zenoh</h3>
                        <p className="text-sm text-gray-600">
                          Zenoh JSON Configuration
                        </p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex flex-col h-full">
                <CardHeader>
                  <CardTitle className="text-center">
                    Upload Existing Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 flex flex-col justify-center">
                    <FileUpload onFileUpload={handleFileUpload} />
                  </div>

                  {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <div>
                          <p className="text-red-600 font-medium">Error</p>
                          <p className="text-red-600 text-sm">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="px-6 py-4 bg-white border-b flex gap-3 items-center flex-wrap sticky top-[72px] z-10 shadow-sm">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={downloadFilename}
                onChange={(e) => setDownloadFilename(e.target.value)}
                placeholder="filename"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-gray-500">
                {vendor === "zenoh" ? ".json5" : ".xml"}
              </span>
            </div>

            {isCreateMode && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Switch
                  id="predefined-config-switch"
                  checked={usePredefinedConfig}
                  onCheckedChange={setUsePredefinedConfig}
                  className={
                    usePredefinedConfig
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                      : "bg-white"
                  }
                />
                <label
                  htmlFor="predefined-config-switch"
                  className="cursor-pointer"
                >
                  Use default template
                </label>
              </div>
            )}

            <Button
              onClick={handlePreviewClick}
              variant="outline"
              className="flex items-center gap-2"
              data-umami-event={`Click Preview ${
                vendor === "fastdds"
                  ? "Fastdds"
                  : vendor === "cyclonedds"
                  ? "Cyclonedds"
                  : "Unknown"
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview {vendor === "zenoh" ? "Config" : "XML"}
            </Button>
            <Button
              onClick={handleDownloadClick}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              data-umami-event="Click Download"
            >
              <Download className="w-4 h-4" />
              Download {vendor === "zenoh" ? "Config" : "XML"}
            </Button>

            {originalFields.length > 0 && vendor !== "fastdds" && (
              <Button
                variant="outline"
                onClick={resetToOriginal}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            )}
            {vendor === "fastdds" &&
              (originalFastDDSData || fastDDSCreatedFromScratch) && (
                <Button
                  variant="outline"
                  onClick={
                    originalFastDDSData
                      ? resetFastDDSToOriginal
                      : resetFastDDSToDefaults
                  }
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              )}
          </div>

          <div className="flex-1 flex overflow-auto">
            <div className="flex-1">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-transparent"></div>
                </div>
              ) : vendor === "fastdds" ? (
                <FastDDSProfileEditor
                  key={`fastdds-${
                    uploadedFastDDSData ? "uploaded" : "scratch"
                  }-${fastDDSResetCounter}`}
                  uploadedData={uploadedFastDDSData}
                  onXMLGenerate={handleXMLGenerate}
                />
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

      {showPreviewDialog && (
        <>
          <div
            className="fixed inset-0 z-40 backdrop-blur-sm bg-black/30"
            onClick={handleCancelFromPreview}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto shadow-2xl">
              <div className="p-6 border-b">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      {vendor === "zenoh" ? "Config" : "XML"} Preview
                    </h2>
                    <p className="text-gray-600">
                      Review your {vendor === "zenoh" ? "JSON" : "XML"}{" "}
                      configuration before downloading
                    </p>
                  </div>
                  <Button
                    onClick={handleValidateClick}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Validate {vendor === "zenoh" ? "Config" : "XML"}
                  </Button>
                </div>

                {validationStatus === "valid" && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-600 font-semibold flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Valid {vendor === "zenoh" ? "JSON Configuration" : "XML"}
                    </p>
                  </div>
                )}

                {validationStatus === "invalid" &&
                  validationErrors.length > 0 && (
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
                  Download {vendor === "zenoh" ? "Config" : "XML"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="w-full py-4 px-6 bg-white border-t">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <a
              href="https://www.eightvectors.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              data-umami-event="Click EightVectors Logo"
            >
              <img
                src="/eightvectors.avif"
                alt="EightVectors"
                className="h-8 w-auto"
              />
            </a>
          </div>
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()}{" "}
            <a
              href="https://www.eightvectors.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-600 hover:underline"
              data-umami-event="Click EightVectors Text"
            >
              by EightVectors
            </a>
            . All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
