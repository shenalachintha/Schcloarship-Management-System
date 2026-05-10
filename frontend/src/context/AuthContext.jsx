import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const data = localStorage.getItem('user');
    if (token && data) {
      try {
        setUser(JSON.parse(data));
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = (data) => {
    const userData = {
      username: data.username || data.Username,
      role: data.role || data.Role,
      studentId: data.studentId || data.StudentId,
      userId: data.userId || data.UserId,
      isApproved: data.isApproved ?? data.IsApproved ?? false,
      faculty: data.faculty || data.Faculty,
      department: data.department || data.Department,
      name: data.name || data.Name
    };
    localStorage.setItem('token', data.token || data.Token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isApproved', userData.isApproved.toString());
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isApproved');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
