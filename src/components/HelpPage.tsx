import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Globe,
  Lightbulb,
  Mail,
  Settings,
  Upload,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface HelpPageProps {
  onBack: () => void;
}

export function HelpPage({ onBack }: HelpPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 px-6 py-4 border-b bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            onClick={onBack}
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Help — DDS Forge</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* About Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                About DDS Forge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 leading-relaxed">
                DDS Forge is a free, browser-based DDS XML config generator for
                CycloneDDS & Fast DDS. It supports CycloneDDS and Fast DDS
                formats, runs entirely in your browser, and never stores or
                sends your data anywhere.
              </p>
            </CardContent>
          </Card>

          {/* Getting Started Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Create
                  </h3>
                  <p className="text-slate-600">
                    Choose between CycloneDDS or Fast DDS and start configuring.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload or Import
                  </h3>
                  <div className="text-slate-600 space-y-1">
                    <p>
                      • Click Drag & Drop XML to load an existing (full or
                      partial) DDS configuration.
                    </p>
                    <p>• The file will be parsed into editable sections.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Configure
                  </h3>
                  <p className="text-slate-600">
                    Simply configure the parameters in various sections such as
                    profiles, domains, transport settings, and logs visually.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Preview XML
                  </h3>
                  <p className="text-slate-600">
                    Click Preview XML to preview your vendor-compliant
                    configuration file. Choosing "Minimal output (non-defaults
                    only)" will allow you to preview only the updated sections
                    making it easy to verify the changes.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                  5
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download XML
                  </h3>
                  <p className="text-slate-600">
                    Change the filename as per your preference. Click Download
                    XML to save your vendor-compliant configuration file.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Features Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">No Install</h4>
                    <p className="text-sm text-slate-600">
                      Runs in your browser — desktop or laptop.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">No Login</h4>
                    <p className="text-sm text-slate-600">
                      No accounts, no sign-ups.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">No Storage</h4>
                    <p className="text-sm text-slate-600">
                      Nothing is stored or uploaded; your files stay local.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      Live Preview
                    </h4>
                    <p className="text-sm text-slate-600">
                      See your updated XML in real time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 md:col-span-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      Vendor Neutral
                    </h4>
                    <p className="text-sm text-slate-600">
                      Switch between CycloneDDS and Fast DDS.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-slate-700">
                    Use the Reset button to start fresh without refreshing the
                    page.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-slate-700">
                    Keep XML naming conventions consistent for topics and
                    profiles.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-slate-700">
                    Download once you are done. There's no auto-save.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-slate-700">
                    Works offline if loaded once (PWA-capable).
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Pro tip: Bookmark the link for instant access.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Limitations Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Limitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-slate-700">
                    Currently supports only CycloneDDS and Fast DDS.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-slate-700">
                    No validation for vendor-specific extensions outside
                    supported schema.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-slate-700">
                    Does not include simulation or live DDS connectivity.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support & Feedback Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Support & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-700">
                    For feature requests, bug reports, or vendor support
                    requests: write to{" "}
                    <a
                      href="mailto:support@eightvectors.com"
                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      support@eightvectors.com
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="w-full py-4 px-6 bg-white border-t">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <a
              href="https://www.eightvectors.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
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
