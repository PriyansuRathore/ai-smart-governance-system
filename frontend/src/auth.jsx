import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

function getAuthBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, '');
  }

  return 'http://localhost:5000';
}

const authClient = axios.create({ baseURL: getAuthBaseUrl() });
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  });
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;
    setIsLoading(true);

    authClient.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data }) => {
      if (!isMounted) return;
      setUser(data.user);
      localStorage.setItem('authUser', JSON.stringify(data.user));
    }).catch(() => {
      if (!isMounted) return;
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      setToken(null);
      setUser(null);
    }).finally(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const persistSession = (payload) => {
    setToken(payload.token);
    setUser(payload.user);
    localStorage.setItem('authToken', payload.token);
    localStorage.setItem('authUser', JSON.stringify(payload.user));
  };

  const login = async (credentials) => {
    const { data } = await authClient.post('/auth/login', credentials);
    persistSession(data);
    return data;
  };

  const register = async (details) => {
    const { data } = await authClient.post('/auth/register', details);
    persistSession(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    token,
    user,
    isLoading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
  }), [token, user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return value;
}
