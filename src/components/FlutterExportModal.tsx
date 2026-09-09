import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  Copy,
  Check,
  Code2,
  Terminal,
  ExternalLink,
  Layers,
  FileCode,
} from 'lucide-react';
import JSZip from 'jszip';
import { FLUTTER_CODEBASE, FLUTTER_BUILD_INSTRUCTIONS } from '../lib/flutterExport';

interface FlutterExportModalProps {
  onClose: () => void;
}

export const FlutterExportModal: React.FC<FlutterExportModalProps> = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState<keyof typeof FLUTTER_CODEBASE>('pubspec.yaml');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const fileKeys = Object.keys(FLUTTER_CODEBASE) as (keyof typeof FLUTTER_CODEBASE)[];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(FLUTTER_CODEBASE[selectedFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Root files
      zip.file('pubspec.yaml', FLUTTER_CODEBASE['pubspec.yaml']);
      zip.file('README.md', FLUTTER_BUILD_INSTRUCTIONS);

      // lib folder
      const lib = zip.folder('lib');
      if (lib) {
        lib.file('main.dart', FLUTTER_CODEBASE['lib/main.dart']);

        const models = lib.folder('models');
        if (models) {
          models.file('customer.dart', FLUTTER_CODEBASE['lib/models/customer.dart']);
          models.file('driver.dart', FLUTTER_CODEBASE['lib/models/driver.dart']);
        }

        const services = lib.folder('services');
        if (services) {
          services.file('customer_service.dart', FLUTTER_CODEBASE['lib/services/customer_service.dart']);
        }

        const screens = lib.folder('screens');
        if (screens) {
          screens.file('home_screen.dart', FLUTTER_CODEBASE['lib/screens/home_screen.dart']);
        }

        const widgets = lib.folder('widgets');
        if (widgets) {
          widgets.file('send_to_driver_sheet.dart', FLUTTER_CODEBASE['lib/widgets/send_to_driver_sheet.dart']);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'musteri_gps_flutter_project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate ZIP', err);
      alert('ZIP faylı yaradıla bilmədi.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Flutter Kod Bazası (Android APK, iOS IPA, Web)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Eyni kod bazasından bütün platformalara tətbiqi derləyin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'ZIP hazırlanır...' : 'Flutter ZIP Yüklə'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Build Commands Overview */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <span>🤖 Android APK</span>
            </div>
            <code className="block mt-1 font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              flutter build apk --release
            </code>
          </div>

          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <span>🍎 iOS IPA</span>
            </div>
            <code className="block mt-1 font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              flutter build ipa
            </code>
          </div>

          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <span>🌐 Web Sayt</span>
            </div>
            <code className="block mt-1 font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              flutter build web
            </code>
          </div>
        </div>

        {/* Code Viewer Layout */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* File tabs sidebar */}
          <div className="w-full sm:w-56 p-2 bg-slate-100/70 dark:bg-slate-950/40 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 overflow-x-auto sm:overflow-y-auto shrink-0 flex sm:flex-col gap-1">
            {fileKeys.map((key) => {
              const isActive = selectedFile === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedFile(key)}
                  className={`px-2.5 py-2 rounded-xl text-left text-xs font-mono transition flex items-center gap-2 shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{key}</span>
                </button>
              );
            })}
          </div>

          {/* Code content viewer */}
          <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
            <div className="p-2.5 px-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
              <span className="font-mono text-xs text-slate-400">{selectedFile}</span>
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-sans flex items-center gap-1 transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Kopyalandı' : 'Kodu kopyala'}</span>
              </button>
            </div>

            <pre className="p-4 overflow-auto flex-1 font-mono text-xs leading-relaxed text-slate-200">
              <code>{FLUTTER_CODEBASE[selectedFile]}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
