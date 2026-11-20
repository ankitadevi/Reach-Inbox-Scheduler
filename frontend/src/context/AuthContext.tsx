import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, SlackStatus } from '../types/user.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  slackStatus: SlackStatus | null;
  login: (userData: User) => void;
  logout: () => void;
  refreshSlackStatus: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem('reachinbox_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          const status = await api.getSlackStatus(parsed.id);
          setSlackStatus(status);
        } else {
          // Default Oliver Brown persona from Figma for smooth demo
          const defaultUser = await api.getMe();
          setUser(defaultUser);
          localStorage.setItem('reachinbox_user', JSON.stringify(defaultUser));
          const status = await api.getSlackStatus(defaultUser.id);
          setSlackStatus(status);
        }
      } catch (err) {
        console.error('Failed to init user:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const refreshSlackStatus = async () => {
    if (!user) return;
    try {
      const status = await api.getSlackStatus(user.id);
      setSlackStatus(status);
      setUser((prev) => (prev ? { ...prev, slackConnected: status.connected } : null));
    } catch (err) {
      console.error('Error refreshing Slack status:', err);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('reachinbox_user', JSON.stringify(userData));
    refreshSlackStatus();
  };

  const logout = () => {
    setUser(null);
    setSlackStatus(null);
    localStorage.removeItem('reachinbox_user');
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('reachinbox_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        slackStatus,
        login,
        logout,
        refreshSlackStatus,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
