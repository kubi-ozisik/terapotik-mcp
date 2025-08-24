// Shared TypeScript types
export interface ApiResponse<T> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
}

export interface UserProfile {
    name: string;
    email: string;
    role: string;
}