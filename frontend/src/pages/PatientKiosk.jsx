import React, { useState, useRef } from 'react';
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
  const [isListening, setIsListening] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const slipRef = useRef(null);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice dictation is supported on Chrome & Edge.');
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
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
      // 1. Initialize FormData correctly
      const formDataToSend = new FormData();

      // 2. Append Patient Demographics & Complaint
      formDataToSend.append('full_name', formData.full_name || patient.full_name || '');
      formDataToSend.append('age', formData.age || patient.age || '');
      formDataToSend.append('gender', formData.gender || patient.gender || 'Male');
      formDataToSend.append('phone', formData.phone || patient.phone || '');
      formDataToSend.append('abha_id', formData.abha_id || '');
      formDataToSend.append('chief_complaint', formData.chief_complaint || '');
      formDataToSend.append('care_mode', careMode || 'general');

      // 3. Append Symptoms (as JSON array string)
      formDataToSend.append('symptoms', JSON.stringify(selectedSymptoms || []));

      // 4. Append Structured HPI / Interview Data
      formDataToSend.append('interview_answers', JSON.stringify(interviewAnswers || {}));
      formDataToSend.append('structured_hpi', JSON.stringify(structuredHpi || {}));

      // 5. Append Uploaded Medical Image Files (X-Rays, Lab Reports, Prescriptions)
      if (selectedFiles && selectedFiles.length > 0) {
        Array.from(selectedFiles).forEach((file) => {
          formDataToSend.append('documents', file);
        });
      }

      // 6. Send Multipart Request to Live Render Backend
      const targetBase = API_BASE || 'https://vaidycare-ai.onrender.com';
      const res = await fetch(`${targetBase}/api/intake/submit`, {
        method: 'POST',
        body: formDataToSend // Note: Do NOT set 'Content-Type' header when sending FormData!
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Backend server is processing. Please retry in 10 seconds.');
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to submit intake record.');
      }

      // 7. Store Result & Move to QR Slip Display
      setSubmittedRecord(data.encounter || data);
      setIsSubmitted(true);
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
                VAIDY<span className="text-clinical-600">care</span><span className="text-brand-600">-AI</span>
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
            <span className="text-[10px] font-extrabold text-clinical-600 tracking-widest uppercase">
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
            className="flex-1 py-3 rounded-xl bg-clinical-600 hover:bg-clinical-700 text-white text-xs font-bold shadow-md shadow-clinical-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            🖨️ Download / Print Slip
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md"
          >
            New Check-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
          <div>
            <span className="text-xs font-bold text-clinical-600 uppercase tracking-wider">Patient Self-Kiosk</span>
            <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight mt-0.5">
              VAIDY<span className="text-clinical-600">care</span><span className="text-brand-600">-AI</span> Check-In
            </h1>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setCareMode('general')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                careMode === 'general' ? 'bg-white text-clinical-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              General OPD
            </button>
            <button
              type="button"
              onClick={() => setCareMode('ayush')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                careMode === 'ayush' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              🌿 AYUSH
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
              <input
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 outline-none transition-all"
                placeholder="Patient Full Name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Age</label>
              <input
                type="number"
                required
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 outline-none transition-all"
                placeholder="Years"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white outline-none"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white outline-none"
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Primary Complaint</label>
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-clinical-50 text-clinical-700 hover:bg-clinical-100 border border-clinical-200'
                }`}
              >
                <span>{isListening ? '🔴 Listening...' : '🎤 Voice Input'}</span>
              </button>
            </div>
            <textarea
              required
              rows={2}
              value={formData.chiefComplaint}
              onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              className="w-full p-3.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white outline-none resize-none"
              placeholder="Describe symptoms or tap the voice button..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Observable Symptoms</label>
            <div className="flex flex-wrap gap-2">
              {symptomOptions.map(({ label, icon }) => {
                const selected = formData.symptoms.includes(label);
                return (
                  <button
                    type="button"
                    key={label}
                    onClick={() => toggleSymptom(label)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      selected
                        ? 'bg-clinical-600 text-white border-clinical-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Medical Scans & Lab Reports (X-Rays, CBC, Handwritten Prescriptions)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {fileList.map((item, idx) => (
                <div key={idx} className="relative group rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 aspect-square shadow-sm">
                  <img src={item.preview} alt="Upload preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-md hover:bg-rose-700"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1 text-[10px] text-white truncate text-center">
                    {item.name}
                  </div>
                </div>
              ))}

              <label className="border-2 border-dashed border-clinical-300 hover:border-clinical-500 bg-clinical-50/40 hover:bg-clinical-50/80 rounded-2xl flex flex-col items-center justify-center cursor-pointer aspect-square transition-all group">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleAddFiles}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-clinical-600 text-white flex items-center justify-center text-2xl font-bold shadow-md group-hover:scale-110 transition-transform">
                  +
                </div>
                <span className="text-xs font-bold text-clinical-700 mt-2">Add Image</span>
                <span className="text-[10px] text-slate-400">Multi-upload</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-clinical-600 to-brand-600 text-white font-black text-sm shadow-lg shadow-clinical-600/20 hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Processing Medical Records with Gemini 3.6...' : 'Submit Records & Generate Slip →'}
          </button>
        </form>
      </div>
    </div>
  );
}