import React, { useState, useRef } from 'react';
import { 
  Mic, 
  Globe, 
  Upload, 
  X, 
  Printer, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function PatientKiosk({ user }) {
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    age: user?.age || '',
    gender: user?.gender || 'Male',
    phone: user?.phone || '',
    abhaId: user?.abhaId || '',
    chiefComplaint: '',
    symptoms: []
  });
  const [careMode, setCareMode] = useState('general');
  const [fileList, setFileList] = useState([]);
  const [voiceLang, setVoiceLang] = useState('en-IN'); // 'en-IN' | 'hi-IN'
  const [isListening, setIsListening] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const slipRef = useRef(null);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice dictation is supported on Google Chrome & Microsoft Edge browsers.');
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = voiceLang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setFormData((prev) => ({
        ...prev,
        chiefComplaint: prev.chiefComplaint ? `${prev.chiefComplaint} ${transcript}` : transcript
      }));
    };

    recognition.start();
  };

  const symptomOptions = [
    { label: 'Fever & Chills', icon: '🌡️' },
    { label: 'Chest Pressure / Pain', icon: '❤️' },
    { label: 'Shortness of Breath', icon: '💨' },
    { label: 'Persistent Cough', icon: '🫁' },
    { label: 'Severe Headache', icon: '🧠' },
    { label: 'Abdominal Discomfort', icon: '🩺' },
    { label: 'Body Aches & Fatigue', icon: '⚡' }
  ];

  const toggleSymptom = (s) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(s)
        ? prev.symptoms.filter((item) => item !== s)
        : [...prev.symptoms, s]
    }));
  };

  const handleAddFiles = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
        name: f.name
      }));
      setFileList((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index) => {
    setFileList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();

      formDataToSend.append('full_name', formData.fullName || user?.name || '');
      formDataToSend.append('age', formData.age || user?.age || '');
      formDataToSend.append('gender', formData.gender || user?.gender || 'Male');
      formDataToSend.append('phone', formData.phone || user?.phone || '');
      formDataToSend.append('abha_id', formData.abhaId || '');
      formDataToSend.append('chief_complaint', formData.chiefComplaint || '');
      formDataToSend.append('care_mode', careMode || 'general');

      formDataToSend.append('symptoms', JSON.stringify(formData.symptoms || []));
      formDataToSend.append('interview_answers', JSON.stringify({}));
      formDataToSend.append('structured_hpi', JSON.stringify({}));

      fileList.forEach((item) => {
        if (item.file) {
          formDataToSend.append('documents', item.file);
        }
      });

      const targetBase = (API_BASE || 'https://vaidycare-ai.onrender.com').replace(/\/+$/, '');
      const res = await fetch(`${targetBase}/api/intake/submit`, {
        method: 'POST',
        body: formDataToSend
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Backend server is processing. Please retry in 10 seconds.');
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to submit intake record.');
      }

      const record = data.encounter || data;
      setCompletedSession({
        tokenNumber: record.token_number || record.tokenNumber || 'V-1001',
        qrCodeBase64: record.qr_code_data || record.qrCodeBase64 || '',
        triage: record.triage_summary || record.triage || { risk_level: 'SAFE', risk_score: 10 }
      });
    } catch (err) {
      console.error('Submission Error:', err);
      setError(err.message || 'API Connection Error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  if (completedSession) {
    const riskLevel = completedSession?.triage?.risk_level || 'SAFE';

    return (
      <div className="max-w-md mx-auto my-6">
        <div
          ref={slipRef}
          id="printable-slip"
          className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-300 shadow-2xl text-slate-800 relative overflow-hidden"
        >
          <div className="flex items-center justify-between pb-4 border-b-2 border-dashed border-slate-200">
            <div>
              <h2 className="text-xl font-black font-heading text-slate-900 tracking-tight">
                VAIDY<span className="text-cyan-600">care</span><span className="text-teal-600">-AI</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Official OPD Appointment Slip
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-600">
              {new Date().toLocaleDateString()}
            </span>
          </div>

          <div className="my-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-extrabold text-cyan-600 tracking-widest uppercase">
              Queue Token Number
            </span>
            <div className="text-4xl font-black font-heading text-slate-900 tracking-tight my-1">
              {completedSession.tokenNumber}
            </div>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase inline-block ${
                riskLevel === 'SEVERE'
                  ? 'bg-rose-100 text-rose-800'
                  : riskLevel === 'MODERATE'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              Triage: {riskLevel} Priority
            </span>
          </div>

          <div className="space-y-1.5 text-xs border-y border-slate-100 py-3 mb-4">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Patient Name:</span>
              <span className="font-extrabold text-slate-900">{formData.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Age / Gender:</span>
              <span className="font-bold text-slate-800">{formData.age} Y • {formData.gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Phone:</span>
              <span className="font-bold text-slate-800">{formData.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Care Mode:</span>
              <span className="font-bold text-slate-800 uppercase">{careMode}</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Scan at Doctor Desk
            </p>
            <div className="p-2 bg-white inline-block border-2 border-slate-200 rounded-2xl shadow-inner">
              <img
                src={completedSession.qrCodeBase64}
                alt="Encounter QR"
                className="w-36 h-36 mx-auto rounded-lg"
              />
            </div>
          </div>

          <p className="text-[9px] text-center text-slate-400 mt-4 leading-normal">
            Show this digital slip or QR code at OPD Desk. Multimodal AI summary auto-synced.
          </p>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handlePrintSlip}
            className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Download Slip</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Check-In</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
          <div>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Patient Self-Kiosk
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight mt-0.5">
              VAIDY<span className="text-cyan-400">care</span><span className="text-teal-400">-AI</span> Check-In
            </h1>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setCareMode('general')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                careMode === 'general' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              General OPD
            </button>
            <button
              type="button"
              onClick={() => setCareMode('ayush')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                careMode === 'ayush' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌿 AYUSH
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name</label>
              <input
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-all"
                placeholder="Patient Full Name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Age</label>
              <input
                type="number"
                required
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-all"
                placeholder="Years"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 outline-none font-semibold"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-all"
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          {/* Chief Complaint & Multilingual Voice Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">Primary Complaint</label>
              
              {/* Dual Language & Voice Dictation Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 px-2 py-1 rounded-xl">
                  <Globe className="w-3 h-3 text-slate-400" />
                  <select
                    value={voiceLang}
                    onChange={(e) => setVoiceLang(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="en-IN" className="bg-slate-900 text-white">English (IN)</option>
                    <option value="hi-IN" className="bg-slate-900 text-white">हिंदी (Hindi)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40'
                      : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isListening ? 'Listening...' : 'Voice Dictate'}</span>
                </button>
              </div>
            </div>

            <textarea
              required
              rows={3}
              value={formData.chiefComplaint}
              onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              className="w-full p-3.5 text-sm rounded-2xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:border-cyan-400 outline-none resize-none transition-all"
              placeholder="Describe symptoms or switch language to speak your complaint in English or Hindi..."
            />
          </div>

          {/* Observable Symptoms */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">Observable Symptoms</label>
            <div className="flex flex-wrap gap-2">
              {symptomOptions.map(({ label, icon }) => {
                const selected = formData.symptoms.includes(label);
                return (
                  <button
                    type="button"
                    key={label}
                    onClick={() => toggleSymptom(label)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      selected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-500 font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multi-Image Upload Card */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Medical Scans & Lab Reports (X-Rays, CBC, Handwritten Prescriptions)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {fileList.map((item, idx) => (
                <div key={idx} className="relative group rounded-2xl border border-slate-700 overflow-hidden bg-slate-950 aspect-square shadow-sm">
                  <img src={item.preview} alt="Upload preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-md hover:bg-rose-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 px-2 py-1 text-[10px] text-white truncate text-center backdrop-blur-sm">
                    {item.name}
                  </div>
                </div>
              ))}

              <label className="border-2 border-dashed border-slate-700 hover:border-cyan-400 bg-slate-950/50 hover:bg-slate-950 rounded-2xl flex flex-col items-center justify-center cursor-pointer aspect-square transition-all group">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleAddFiles}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center text-xl font-bold shadow-md group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-300 mt-2">Add Files</span>
                <span className="text-[10px] text-slate-500">Multi-upload</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                Processing Records with Gemini Vision AI...
              </span>
            ) : (
              'Submit Records & Generate Queue Slip →'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}