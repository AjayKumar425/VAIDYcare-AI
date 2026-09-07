import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [error, setError] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const qrCodeRegionId = 'reader-qr-box';
    const html5QrCode = new Html5Qrcode(qrCodeRegionId);
    scannerRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        // Extract token if text is URL or direct string like V-1001
        let token = decodedText.trim();
        if (token.includes('token=')) {
          token = token.split('token=')[1].split('&')[0];
        }
        onScanSuccess(token);
        stopScanner();
        onClose();
      },
      (errorMessage) => {
        // Continuous scan errors are expected until QR is in frame
      }
    ).catch((err) => {
      console.error('Camera startup error:', err);
      setError('Unable to access camera. Please grant camera permissions.');
    });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
      }).catch(err => console.error(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full relative shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>Scan Patient Slip QR Code</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-cyan-500/40 bg-black">
            <div id="reader-qr-box" className="w-full aspect-square" />
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center mt-4">
          Align the QR code from the patient's mobile or printed appointment slip inside the frame.
        </p>
      </div>
    </div>
  );
}