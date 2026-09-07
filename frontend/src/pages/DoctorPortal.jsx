import React, { useState } from 'react';
import { Search, Camera, QrCode, AlertTriangle, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import QRScannerModal from '../components/QRScannerModal';
import { API_BASE } from '../utils/api';

export default function DoctorPortal({ doctor }) {
  const [tokenInput, setTokenInput] = useState('');
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const fetchEncounter = async (tokenToFetch) => {
    const token = tokenToFetch || tokenInput;
    if (!token) return;
    setLoading(true);
    setError('');
    setEncounter(null);

    try {
      const base = API_BASE || 'https://vaidycare-ai.onrender.com';
      const res = await fetch(`${base}/api/doctor/encounter/${encodeURIComponent(token)}`);
      
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please retry.');
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No encounter found for this token.');
      }

      setEncounter(data.encounter);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(scannedToken) => {
          setTokenInput(scannedToken);
          fetchEncounter(scannedToken);
        }}
      />

      {/* Top Search & QR Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black font-heading text-white">Physician Diagnostic Desk</h2>
          <p className="text-xs text-slate-400">Search queue token or scan patient slip QR</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="e.g. V-1001"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-cyan-400"
            />
          </div>
          <button
            onClick={() => fetchEncounter()}
            disabled={loading}
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={() => setScannerOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Scan QR</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Patient Encounter Details & Multimodal Diagnostics */}
      {encounter && (
        <div className="space-y-6">
          {/* Patient Bio & Risk Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl font-black text-white">{encounter.patient?.full_name || 'Anonymous Patient'}</span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700">
                  {encounter.token_number}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {encounter.patient?.age} Y • {encounter.patient?.gender} • Phone: {encounter.patient?.phone || 'N/A'} • Care Mode: <span className="uppercase text-teal-400 font-bold">{encounter.care_mode || 'General'}</span>
              </p>
              <p className="mt-2 text-xs text-slate-300">
                <span className="font-bold text-slate-400">Chief Complaint: </span>
                {encounter.chief_complaint || 'No complaint specified'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Triage Stratification</span>
              <div className={`text-xl font-black my-1 ${
                encounter.triage_summary?.risk_level === 'SEVERE' ? 'text-rose-400' :
                encounter.triage_summary?.risk_level === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {encounter.triage_summary?.risk_level || 'SAFE'} PRIORITY
              </div>
              <span className="text-[10px] text-slate-400">Acuity Score: {encounter.triage_summary?.risk_score || 10}/100</span>
            </div>
          </div>

          {/* AI Multimodal Analysis Cards */}
          {encounter.documents && encounter.documents.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Multimodal Vision Extraction (Gemini AI)</h3>
              </div>

              {encounter.documents.map((doc, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                      {doc.doc_type || 'Medical Document'}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      Condition: <span className="text-white">{doc.predicted_condition || 'Standard Evaluation'}</span>
                    </span>
                  </div>

                  {/* Bullet Findings */}
                  {doc.essential_bullet_points && doc.essential_bullet_points.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clinical Observations</span>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {doc.essential_bullet_points.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2">
                            <span className="text-cyan-400 mt-0.5">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Biomarkers Table */}
                  {doc.biomarkers && doc.biomarkers.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Extracted Biomarkers</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                            <tr>
                              <th className="p-2.5">Marker Name</th>
                              <th className="p-2.5">Value</th>
                              <th className="p-2.5">Standard Range</th>
                              <th className="p-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {doc.biomarkers.map((bm, bIdx) => (
                              <tr key={bIdx} className="hover:bg-slate-900/40">
                                <td className="p-2.5 font-semibold text-white">{bm.name}</td>
                                <td className="p-2.5 font-mono text-cyan-300">{bm.value}</td>
                                <td className="p-2.5 text-slate-400">{bm.reference_range || 'Normal'}</td>
                                <td className="p-2.5">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    bm.status === 'HIGH' || bm.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                                    bm.status === 'LOW' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                                  }`}>
                                    {bm.status || 'NORMAL'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}