export const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const getAuthHeaders = () => {
  return {
    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };
};

export const getFormDataHeaders = () => {
  return {
    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_AUTH_TOKEN}`,
  };
};
