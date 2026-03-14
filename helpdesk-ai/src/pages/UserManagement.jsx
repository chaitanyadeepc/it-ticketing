import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

export default function UserManagement() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null); // userId being updated

  useEffect(() => {
    api.get('/users')
      .then(({ data }) => { setUsers(data.users); setLoading(false); })
      .catch(() => { setError('Failed to load users'); setLoading(false); });
  }, []);

  const patch = async (userId, payload) => {
    setUpdating(userId);
    try {
      const { data } = await api.patch(`/users/${userId}`, payload);
      setUsers((prev) => prev.map((u) => u._id === userId ? data.user : u));
      addToast('User updated successfully');
    } catch {
      addToast('Failed to update user', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const myId = (() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      return JSON.parse(atob(token.split('.')[1])).id;
    } catch { return null; }
  })();

  if (loading) return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="skeleton h-4 w-24 rounded mb-5" />
        <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-5 mb-5 flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-6 w-40 rounded" />
            <div className="skeleton h-3 w-28 rounded" />
          </div>
          <div className="skeleton h-9 w-24 rounded-lg" />
        </div>
        <div className="skeleton h-10 w-full max-w-sm rounded-lg mb-4" />
        <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-[#27272a] last:border-0">
              <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-4 w-40 rounded" />
                <div className="skeleton h-3 w-52 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-6 w-16 rounded-full" />
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 p-5 rounded-2xl bg-gradient-to-r from-[#a855f7]/8 via-[#6366f1]/4 to-transparent border border-[#a855f7]/15">
          <div>
            <h1 className="text-[24px] font-bold text-[#fafafa] mb-0.5">User Management</h1>
            <p className="text-[14px] text-[#a1a1aa]">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-1.5 text-[13px] text-[#a1a1aa] hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[13px]">{error}</div>
        )}

        <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[12px] text-[#52525b] border-b border-[#27272a]">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user._id === myId;
                  const isUpdating = updating === user._id;
                  return (
                    <tr key={user._id} className="border-b border-[#27272a] last:border-0 hover:bg-[#27272a]/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
                            {user.name?.slice(0, 2).toUpperCase() || user.email.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-[#fafafa]">{user.name || '—'}</p>
                            <p className="text-[11px] text-[#52525b]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[#a1a1aa]">{user.department || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                          user.role === 'admin'
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'bg-zinc-700/50 text-zinc-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                          user.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[12px] text-[#52525b]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        {isSelf ? (
                          <span className="text-[12px] text-[#52525b] italic">You</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {/* Toggle role */}
                            <button
                              disabled={isUpdating}
                              onClick={() => patch(user._id, { role: user.role === 'admin' ? 'user' : 'admin' })}
                              className="text-[11px] px-2.5 py-1 rounded-lg border border-[#3f3f46] text-[#a1a1aa] hover:border-violet-500 hover:text-violet-400 disabled:opacity-40 transition-colors"
                            >
                              {isUpdating ? '…' : user.role === 'admin' ? 'Make User' : 'Make Admin'}
                            </button>
                            {/* Toggle active */}
                            <button
                              disabled={isUpdating}
                              onClick={() => patch(user._id, { isActive: !user.isActive })}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border disabled:opacity-40 transition-colors ${
                                user.isActive
                                  ? 'border-[#3f3f46] text-[#a1a1aa] hover:border-red-500 hover:text-red-400'
                                  : 'border-[#3f3f46] text-[#a1a1aa] hover:border-green-500 hover:text-green-400'
                              }`}
                            >
                              {isUpdating ? '…' : user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
