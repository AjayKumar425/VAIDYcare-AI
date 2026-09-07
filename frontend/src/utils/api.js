// frontend/src/utils/api.js
const rawUrl = import.meta.env.VITE_API_URL || 'https://vaidycare-ai.onrender.com';
export const API_BASE = rawUrl.replace(/\/+$/, '');