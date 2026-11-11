import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { authApi } from '../services/api.js';
import { disconnectSocket } from '../services/socket.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: (email: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('codesync_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('codesync_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const profile = await authApi.me();
          setUser(profile);
          localStorage.setItem('codesync_user', JSON.stringify(profile));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };
    verifyUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('codesync_token', data.token);
    localStorage.setItem('codesync_user', JSON.stringify(data.user));
  };

  const loginDemo = async (email: string) => {
    await login(email, 'Password123!');
  };

  const register = async (email: string, password: string, name: string, role?: string) => {
    const data = await authApi.register({ email, password, name, role });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('codesync_token', data.token);
    localStorage.setItem('codesync_user', JSON.stringify(data.user));
  };

  const logout = () => {
    disconnectSocket();
    setToken(null);
    setUser(null);
    localStorage.removeItem('codesync_token');
    localStorage.removeItem('codesync_user');
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedUser };
      localStorage.setItem('codesync_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, loginDemo, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
