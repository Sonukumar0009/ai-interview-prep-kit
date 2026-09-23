const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorBody: { error?: { code: string; message: string } } = {};
    try {
      errorBody = await response.json();
    } catch {
      // response had no JSON body
    }
    throw new ApiError(
      errorBody.error?.code || "UNKNOWN_ERROR",
      errorBody.error?.message || `Request failed with status ${response.status}`,
      response.status
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// --- Auth ---
export interface User {
  id: string;
  email: string;
}

export const authApi = {
  register: (email: string, password: string) =>
    request<User>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<User>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  me: () => request<User>("/api/auth/me"),
};

// --- Kits ---
export interface KitListItem {
  _id: string;
  status: "pending" | "generating" | "completed" | "failed";
  input: { jobDescription: string; companyUrl: string; daysAvailable: number };
  createdAt: string;
  updatedAt: string;
}

export interface KitDetail extends KitListItem {
  kit: any | null; // full Appendix A structure once completed
  warnings: string[];
  error: { code: string; message: string } | null;
}

export const kitApi = {
  create: (jobDescription: string, companyUrl: string, daysAvailable: number) =>
    request<{ id: string; status: string; duplicate?: boolean }>("/api/kits", {
      method: "POST",
      body: JSON.stringify({ jobDescription, companyUrl, daysAvailable }),
    }),
  list: () => request<KitListItem[]>("/api/kits"),
  get: (id: string) => request<KitDetail>(`/api/kits/${id}`),
  remove: (id: string) => request<{ message: string }>(`/api/kits/${id}`, { method: "DELETE" }),

  patchQuestion: (kitId: string, questionId: string, updates: Record<string, unknown>) =>
    request<KitDetail["kit"]>(`/api/kits/${kitId}/questions/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),
  addQuestion: (kitId: string, input: Record<string, unknown>) =>
    request<KitDetail["kit"]>(`/api/kits/${kitId}/questions`, { method: "POST", body: JSON.stringify(input) }),
  deleteQuestion: (kitId: string, questionId: string) =>
    request<KitDetail["kit"]>(`/api/kits/${kitId}/questions/${questionId}`, { method: "DELETE" }),
  reorderQuestions: (kitId: string, orderedIds: string[]) =>
    request<KitDetail["kit"]>(`/api/kits/${kitId}/questions/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ orderedIds }),
    }),

  patchFlashcard: (kitId: string, flashcardId: string, updates: Record<string, unknown>) =>
    request<KitDetail["kit"]>(`/api/kits/${kitId}/flashcards/${flashcardId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),
  addFlashcard: (kitId: string, input: Record<string, unknown>) =>
    request<KitDetail["kit"]>(`/api/kits/${kitId}/flashcards`, { method: "POST", body: JSON.stringify(input) }),
  deleteFlashcard: (kitId: string, flashcardId: string) =>
    request<KitDetail["kit"]>(`/api/kits/${kitId}/flashcards/${flashcardId}`, { method: "DELETE" }),

  patchCompanyBrief: (kitId: string, updates: Record<string, unknown>) =>
    request<KitDetail["kit"]>(`/api/kits/${kitId}/company-brief`, { method: "PATCH", body: JSON.stringify(updates) }),

  regenerateQuestionCategory: (kitId: string, category: string) =>
    request<KitDetail["kit"]>(`/api/kits/${kitId}/regenerate/questions/${category}`, { method: "POST" }),
  regenerateCompanyBrief: (kitId: string) =>
    request<KitDetail["kit"]>(`/api/kits/${kitId}/regenerate/company-brief`, { method: "POST" }),
  regenerateSchedule: (kitId: string, daysAvailable: number) =>
    request<KitDetail["kit"]>(`/api/kits/${kitId}/regenerate/schedule`, {
      method: "POST",
      body: JSON.stringify({ daysAvailable }),
    }),

  getPractice: (kitId: string) =>
    request<{ flashcards: any[]; practiceState: Record<string, any>; coverage: { covered: number; total: number } }>(
      `/api/kits/${kitId}/practice`
    ),
  recordConfidence: (kitId: string, flashcardId: string, confidence: 1 | 2 | 3) =>
    request(`/api/kits/${kitId}/practice/${flashcardId}/confidence`, {
      method: "POST",
      body: JSON.stringify({ confidence }),
    }),
};