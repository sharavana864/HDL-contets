import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hdl_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('hdl_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (participantId, password) => {
    const res = await api.post('/auth/login', { participantId, password });
    localStorage.setItem('hdl_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (participantId, name, password) => {
    const res = await api.post('/auth/register', { participantId, name, password });
    localStorage.setItem('hdl_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('hdl_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
