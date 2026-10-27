// Every call to the backend lives here. Components never use fetch directly.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'career_analyzer_token';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(`Cannot reach the API at ${BASE_URL}. Make sure the backend is running (cd backend && npm start) and try again.`);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok || !payload || payload.success === false) {
    // An expired or invalid token on a protected call logs the user out.
    if (res.status === 401 && token) {
      clearToken();
      window.dispatchEvent(new Event('auth:logout'));
    }
    const detail = payload?.error?.details?.[0]?.message;
    throw new ApiError(
      detail || payload?.error?.message || 'Something went wrong. Please try again.',
      res.status
    );
  }
  return payload.data;
}

// ---------- Auth ----------
export const registerUser = (data) => request('/auth/register', { method: 'POST', body: data });
export const loginUser = (data) => request('/auth/login', { method: 'POST', body: data });
export const getMe = () => request('/auth/me');
export const updateMe = (data) => request('/auth/me', { method: 'PUT', body: data });

// ---------- Careers ----------
export const getCareers = () => request('/careers');
export const getCareer = (id) => request(`/careers/${id}`);

// ---------- Skills ----------
export const getSkills = () => request('/skills');

// Normalised to [{ skillId, level }] whatever field name the backend uses.
export async function getMySkills() {
  const data = await request('/skills/me');
  const list = Array.isArray(data) ? data : data?.skills || [];
  return list.map((s) => ({ skillId: s.skillId, level: s.currentLevel ?? s.level ?? null }));
}

// ratings: [{ skillId, level }] where level null clears the rating.
export const saveMySkills = (ratings) =>
  request('/skills/me', { method: 'PUT', body: { skills: ratings } });

// ---------- Analysis ----------
export const runSkillGap = (careerId) =>
  request('/analysis/skill-gap', { method: 'POST', body: { careerId } });
export const getAnalysisHistory = () => request('/analysis/history');
export const getDashboard = () => request(`/analysis/dashboard?today=${localToday()}`);
export const getAnalysis = (id) => request(`/analysis/${id}`);

// ---------- Roadmaps ----------
export const createRoadmap = (assessmentId, weeklyHours) =>
  request('/roadmaps', {
    method: 'POST',
    body: weeklyHours ? { assessmentId, weeklyHours } : { assessmentId },
  });
export const getRoadmaps = () => request('/roadmaps');
export const getRoadmap = (id) => request(`/roadmaps/${id}`);
export const updateRoadmapItem = (roadmapId, itemId, status) =>
  request(`/roadmaps/${roadmapId}/items/${itemId}`, { method: 'PATCH', body: { status } });
export const deleteRoadmap = (id) => request(`/roadmaps/${id}`, { method: 'DELETE' });

// ---------- Skill quiz (evidence) ----------
export const getQuizSkills = () => request('/quiz/skills');
export const getQuizEvidence = () => request('/quiz/evidence');
export const getQuiz = (skillId) => request(`/quiz/skills/${skillId}`);
export const submitQuiz = (skillId, answers, applyToRating = false) =>
  request(`/quiz/skills/${skillId}/submit`, { method: 'POST', body: { answers, applyToRating } });

// ---------- AI Project Lab ----------
export const getProjects = () => request('/projects');
export const suggestProjects = () => request('/projects/suggest', { method: 'POST' });
export const updateProjectStatus = (id, status) =>
  request(`/projects/${id}`, { method: 'PATCH', body: { status } });
export const deleteProject = (id) => request(`/projects/${id}`, { method: 'DELETE' });

// ---------- Weekly planner ----------
// Dates are 'YYYY-MM-DD' in the browser's local time, so "today" matches the user's own day.
export function localToday(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
export const getPlannerWeek = (week) =>
  request(`/planner/week?today=${localToday()}${week ? `&week=${week}` : ''}`);
export const getPlannerItems = () => request('/planner/items');
export const autoPlanWeek = (week) =>
  request('/planner/auto-plan', { method: 'POST', body: { today: localToday(), ...(week ? { week } : {}) } });
export const createStudySession = (data) => request('/planner/sessions', { method: 'POST', body: data });
export const updateStudySession = (id, data) =>
  request(`/planner/sessions/${id}`, { method: 'PATCH', body: data });
export const deleteStudySession = (id) => request(`/planner/sessions/${id}`, { method: 'DELETE' });
