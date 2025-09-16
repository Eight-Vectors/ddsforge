import { XMLParser } from "fast-xml-parser";

export const parseXMLInBrowser = (xmlString: string): any => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
    trimValues: true,
    parseTagValue: true,
    ignoreDeclaration: false,
    removeNSPrefix: false,
    processEntities: true,
    preserveOrder: false,
    alwaysCreateTextNode: false,
  });

  try {
    return parser.parse(xmlString);
  } catch (error) {
    throw new Error("XML parsing error: " + (error as Error).message);
  }
};
