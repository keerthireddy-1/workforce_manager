import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';

interface SignUpData {
  name: string;
  employeeKey: string;
  password: string;
  role: string;
  department: string;
  preferences?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (employeeKey: string, password: string) => Promise<boolean>;
  signUp: (data: SignUpData) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sm_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Sessions saved before the employee key change have no employeeKey: force a fresh login
        if (parsed && parsed.employeeKey) {
          setUser(parsed);
        } else {
          localStorage.removeItem('sm_user');
          localStorage.removeItem('sm_token');
        }
      }
    } catch (e) {
      localStorage.removeItem('sm_user');
      localStorage.removeItem('sm_token');
    }
    setLoading(false);
  }, []);

  const signIn = async (employeeKey: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeKey, password })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('sm_user', JSON.stringify(data.user));
        localStorage.setItem('sm_token', data.token);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const signUp = async (formData: SignUpData) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('sm_user', JSON.stringify(data.user));
        localStorage.setItem('sm_token', data.token);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('sm_user');
    localStorage.removeItem('sm_token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}