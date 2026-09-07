import React, { useState } from 'react';
import { 
  Search, 
  Camera, 
  FileText, 
  Download, 
  Volume2, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Stethoscope,
  Plus,
  Trash2
} from 'lucide-react';
import jsPDF from 'jspdf';
import QRScannerModal from '../components/QRScannerModal';
import { API_BASE } from '../utils/api';

export default function DoctorPortal({ doctor }) {
  const [tokenInput, setTokenInput] = useState('');
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  // Physician Clinical Prescription States
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState([
    { medicine: 'Paracetamol', dosage: '650mg', frequency: 'TDS (After meals)', duration: '3 Days' }
  ]);

  // Audio Token Calling (Text-to-Speech)
  const handleAnnounceToken = (tokenNumber, room = 'Room 1') => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const announcement = new SpeechSynthesisUtterance(
      `Token number ${tokenNumber.replace('-', ' ')}. Please proceed to Doctor ${room}.`
    );
    announcement.rate = 0.9;
    announcement.pitch = 1.0;
    announcement.lang = 'en-IN';
    window.speechSynthesis.speak(announcement);
  };

  const fetchEncounter = async (tokenToFetch) => {
    const token = tokenToFetch || tokenInput;
    if (!token) return;
    setLoading(true);
    setError('');
    setEncounter(null);

    try {
      const base = (API_BASE || 'https://vaidycare-ai.onrender.com').replace(/\/+$/, '');
      const res = await fetch(`${base}/api/doctor/encounter/${encodeURIComponent(token)}`);
      
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please retry in 10 seconds.');
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No encounter record found for this token.');
      }

      setEncounter(data.encounter);
      handleAnnounceToken(data.encounter.token_number || token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = () => {
    setPrescriptions([...prescriptions, { medicine: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleUpdateMedication = (index, field, value) => {
    const updated = [...prescriptions];
    updated[index][field] = value;
    setPrescriptions(updated);
  };

  const handleRemoveMedication = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  // Generate Official PDF Slip
  const handleDownloadPDF = () => {
    if (!encounter) return;
    const doc = new jsPDF();

    // Slate Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('VAIDYcare-AI | OFFICIAL OPD PRESCRIPTION', 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Token: ${encounter.token_number} | Date: ${new Date().toLocaleDateString()} | ABDM Gateway Simulation`, 14, 26);

    // Patient Details Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Patient Name: ${encounter.patient?.full_name || 'Anonymous'}`, 14, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(`Age/Gender: ${encounter.patient?.age} Y / ${encounter.patient?.gender} | Phone: ${encounter.patient?.phone || 'N/A'}`, 14, 52);
    doc.text(`Care Mode: ${(encounter.care_mode || 'general').toUpperCase()} | Triage Risk: ${encounter.triage_summary?.risk_level || 'SAFE'}`, 14, 58);
    doc.text(`Chief Complaint: ${encounter.chief_complaint || 'N/A'}`, 14, 64);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 70, 196, 70);

    // AI Biomarkers Summary
    doc.setFont('helvetica', 'bold');
    doc.text('Multimodal AI Document Findings:', 14, 78);
    doc.setFont('helvetica', 'normal');

    let y = 85;
    if (encounter.documents && encounter.documents.length > 0) {
      encounter.documents.forEach((d) => {
        doc.text(`• ${d.doc_type || 'Scan'}: ${d.predicted_condition || 'Normal baseline'}`, 18, y);
        y += 6;
      });
    } else {
      doc.text('• No critical abnormal lab findings detected.', 18, y);
      y += 6;
    }

    // Prescribed Medications
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Prescribed Rx & Dosage Protocol:', 14, y);
    y += 7;

    prescriptions.forEach((p, idx) => {
      if (p.medicine) {
        doc.setFont('helvetica', 'normal');
        doc.text(`${idx + 1}. ${p.medicine} (${p.dosage || 'Standard'}) - ${p.frequency || 'OD'} [Duration: ${p.duration || '3 Days'}]`, 18, y);
        y += 6;
      }
    });

    // Clinical Advice
    if (doctorNotes) {
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Physician Advice / Instructions:', 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(doctorNotes, 18, y, { maxWidth: 175 });
    }

    // Signature Block
    doc.line(14, 255, 196, 255);
    doc.setFontSize(8);
    doc.text('Attending Medical Officer Signature', 14, 262);
    doc.text(`Dr. ${doctor?.name || 'Physician Console'} (Reg No: AI-OPD-${Math.floor(1000 + Math.random() * 9000)})`, 14, 267);

    doc.save(`Prescription_${encounter.token_number}.pdf`);
  };

  return (
    <div className="space-y-6">
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(token) => {
          setTokenInput(token);
          fetchEncounter(token);
        }}
      />

      {/* Top Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" />
            Physician Console
          </span>
          <h2 className="text-xl font-black font-heading text-white tracking-tight mt-0.5">Clinical Intake & Diagnostic Desk</h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search token e.g. V-1001"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-cyan-400 w-full sm:w-56"
          />
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
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {encounter && (
        <div className="space-y-6">
          {/* Patient Overview Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-white">{encounter.patient?.full_name || 'Anonymous Patient'}</span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700">
                  {encounter.token_number}
                </span>
                <button
                  onClick={() => handleAnnounceToken(encounter.token_number)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-colors"
                  title="Announce Token Audio"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                {encounter.patient?.age} Y • {encounter.patient?.gender} • Phone: {encounter.patient?.phone || 'N/A'} • Care Mode: <span className="uppercase text-teal-400 font-bold">{encounter.care_mode || 'General'}</span>
              </p>
              <p className="text-xs text-slate-300 pt-1">
                <span className="font-bold text-slate-400">Primary Complaint: </span>
                {encounter.chief_complaint || 'No complaint specified'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Triage Stratification</span>
              <div className={`text-2xl font-black my-1 ${
                encounter.triage_summary?.risk_level === 'SEVERE' ? 'text-rose-400' :
                encounter.triage_summary?.risk_level === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {encounter.triage_summary?.risk_level || 'SAFE'} PRIORITY
              </div>
              <span className="text-[10px] text-slate-400">Acuity Risk Score: {encounter.triage_summary?.risk_score || 10}/100</span>
            </div>
          </div>

          {/* Multimodal Gemini Vision Results */}
          {encounter.documents && encounter.documents.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Multimodal Gemini AI Document Analysis</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {encounter.documents.map((doc, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase">
                        {doc.doc_type || 'Report'}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">{doc.predicted_condition || 'Normal'}</span>
                    </div>

                    {doc.essential_bullet_points && (
                      <ul className="text-xs space-y-1 text-slate-300">
                        {doc.essential_bullet_points.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-1.5">
                            <span className="text-cyan-400">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Electronic Prescription Builder */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Digital Prescription & Advice Builder</h3>
              </div>
              <button
                onClick={handleAddMedication}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold flex items-center gap-1 border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Drug</span>
              </button>
            </div>

            <div className="space-y-3">
              {prescriptions.map((p, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 items-center">
                  <input
                    type="text"
                    placeholder="Medicine Name"
                    value={p.medicine}
                    onChange={(e) => handleUpdateMedication(idx, 'medicine', e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 500mg)"
                    value={p.dosage}
                    onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    placeholder="Frequency (e.g. BD / TDS)"
                    value={p.frequency}
                    onChange={(e) => handleUpdateMedication(idx, 'frequency', e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Duration (e.g. 5 Days)"
                      value={p.duration}
                      onChange={(e) => handleUpdateMedication(idx, 'duration', e.target.value)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-400 flex-1"
                    />
                    {prescriptions.length > 1 && (
                      <button
                        onClick={() => handleRemoveMedication(idx)}
                        className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Doctor Clinical Notes / Dietary Advice</label>
              <textarea
                rows={2}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Type additional clinical instructions, follow-up schedule, or dietary guidelines..."
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            <button
              onClick={handleDownloadPDF}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Official ABDM Prescription PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}