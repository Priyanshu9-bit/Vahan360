'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, CheckCircle2, X } from 'lucide-react';

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }

    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Fallback: alert instructions
    alert('To install Vahaan360 on your computer or phone, click the Install icon in your browser address bar or use Browser Menu > "Install Vahaan360".');
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-blue-200 bg-blue-900/40 hover:bg-blue-900/70 border border-blue-500/30 transition-all group cursor-pointer"
        title="Install Vahaan360 App"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600/80 flex items-center justify-center text-white">
            <Smartphone className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-bold text-white leading-tight">Install Vahaan360</p>
            <p className="text-[9px] text-blue-300">Desktop & Mobile App</p>
          </div>
        </div>
        <Download className="w-3.5 h-3.5 text-blue-400 group-hover:translate-y-0.5 transition-transform" />
      </button>

      {/* iOS Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 text-white p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Install Vahaan360 on iPhone</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Tap the <span className="font-bold text-white">Share</span> button at the bottom of Safari.</li>
              <li>Scroll down and select <span className="font-bold text-blue-400">Add to Home Screen</span>.</li>
              <li>Tap <span className="font-bold text-white">Add</span> in the top-right corner.</li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
