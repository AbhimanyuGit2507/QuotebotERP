import React, { useEffect, useMemo, useState } from 'react';
import PageLayout from '../components/common/PageLayout';
import { useApp, User, PermissionEntry } from '../context/AppContext';

const DEFAULT_PERMISSIONS: PermissionEntry[] = [
  { module: 'Dashboard', fullAccess: true, view: true, create: false, alter: false, delete: false, print: true, special: 'Analytics' },
  { module: 'RFQ Inbox', fullAccess: true, view: true, create: true, alter: true, delete: true, print: true, special: 'Convert to Quote' },
  { module: 'Quotations', fullAccess: true, view: true, create: true, alter: true, delete: true, print: true, special: 'Send/Approve' },
  { module: 'Products', fullAccess: true, view: true, create: true, alter: true, delete: false, print: true, special: 'Price Edit' },
  { module: 'Client Ledger', fullAccess: true, view: true, create: true, alter: true, delete: false, print: true, special: 'Credit Limit' },
  { module: 'Analytics', fullAccess: false, view: true, create: false, alter: false, delete: false, print: true, special: 'Export' },
  { module: 'System Config', fullAccess: false, view: false, create: false, alter: false, delete: false, print: false, special: 'Admin Only' },
];

const UserPermissions: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, showConfirmModal, showToast } = useApp();
  
  const [selectedId, setSelectedId] = useState<string | null>(users[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!users.length) {
      setSelectedId(null);
      return;
    }

    setSelectedId((current) =>
      current && users.some((user) => user.id === current) ? current : users[0].id,
    );
  }, [users]);

  // Permission state for selected user — loaded from backend or defaults
  const [permissions, setPermissions] = useState<PermissionEntry[]>(DEFAULT_PERMISSIONS);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const selectedUser = users.find(u => u.id === selectedId);

  // Reload permissions matrix whenever selected user changes
  useEffect(() => {
    if (!selectedUser) {
      setPermissions(DEFAULT_PERMISSIONS);
      return;
    }
    setPermissions(
      selectedUser.permissions?.modules && selectedUser.permissions.modules.length > 0
        ? selectedUser.permissions.modules
        : DEFAULT_PERMISSIONS,
    );
  }, [selectedUser]);

  const handleDelete = (user: User) => {
    showConfirmModal(
      'Delete User',
      `Are you sure you want to delete "${user.username}"? This action cannot be undone.`,
      () => {
        deleteUser(user.id);
        if (selectedId === user.id && users.length > 1) {
          setSelectedId(users.find(u => u.id !== user.id)?.id || null);
        }
      }
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      await new Promise<void>((resolve, reject) => {
        try {
          updateUser(selectedId, { permissions: { modules: permissions } });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      showToast('Permissions saved successfully', 'success');
    } catch {
      showToast('Failed to save permissions', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePermission = (moduleIndex: number, permType: keyof PermissionEntry) => {
    const updated = [...permissions];
    if (permType === 'fullAccess') {
      const newValue = !updated[moduleIndex].fullAccess;
      updated[moduleIndex].fullAccess = newValue;
      updated[moduleIndex].view = newValue;
      updated[moduleIndex].create = newValue;
      updated[moduleIndex].alter = newValue;
      updated[moduleIndex].delete = newValue;
      updated[moduleIndex].print = newValue;
    } else if (permType !== 'module' && permType !== 'special') {
      (updated[moduleIndex][permType] as boolean) = !updated[moduleIndex][permType];
    }
    setPermissions(updated);
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-red-100 text-red-700 border-red-200',
      manager: 'bg-purple-100 text-purple-700 border-purple-200',
      sales: 'bg-blue-100 text-blue-700 border-blue-200',
      viewer: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return styles[role] || styles.viewer;
  };

  const getStatusDot = (status: string) => {
    return status === 'online' ? 'bg-green-500' : 'bg-slate-300';
  };

  return (
    <PageLayout>
      {/* Left Panel - User List */}
      <aside className="w-80 border-r border-[var(--erp-border)] flex flex-col bg-white shrink-0">
        <div className="h-12 border-b border-[var(--erp-border)] bg-slate-50 flex items-center justify-between px-3 shrink-0">
          <h2 className="text-sm font-bold text-[var(--erp-text)] uppercase tracking-wider">Users</h2>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary btn-sm"
          >
            <span className="material-symbols-outlined !text-[14px]">add</span>
            ADD USER
          </button>
        </div>

        {/* Filters */}
        <div className="p-2 border-b border-[var(--erp-border)] space-y-2 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 !text-[16px]">search</span>
            <input 
              type="text" 
              placeholder="Search users..." 
              className="w-full text-[12px] border border-[var(--erp-border)] rounded pl-7 pr-2 py-1.5 focus:ring-1 focus:ring-[var(--erp-accent)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="w-full text-[11px] border border-[var(--erp-border)] rounded px-2 py-1 bg-white"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="sales">Sales</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map(user => (
            <div 
              key={user.id}
              onClick={() => setSelectedId(user.id)}
              className={`px-3 py-3 border-b border-[var(--erp-border)] cursor-pointer transition-colors ${
                selectedId === user.id ? 'bg-blue-50 border-l-[3px] border-l-[var(--erp-accent)]' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-[12px] font-bold text-slate-600">
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusDot(user.status)}`}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[var(--erp-text)] truncate">{user.username}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getRoleBadge(user.role)}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--erp-text-muted)] truncate">{user.email}</p>
                </div>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2">person_off</span>
              <p>No users found</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t border-[var(--erp-border)] bg-slate-50 text-[11px] text-[var(--erp-text-muted)]">
          {filteredUsers.length} of {users.length} users
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-[var(--erp-border)] flex items-center justify-between px-5 shrink-0 bg-slate-50">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold text-[var(--erp-text)]">
                  Permissions: <span className="text-[var(--erp-accent)]">{selectedUser.username}</span>
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleBadge(selectedUser.role)}`}>
                  {selectedUser.role.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSavePermissions}
                  disabled={isSaving}
                  className="btn btn-primary btn-md"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  onClick={() => setEditingUser(selectedUser)}
                  className="px-4 py-1.5 border border-[var(--erp-border)] bg-white text-[12px] font-medium rounded hover:bg-slate-50"
                >
                  Edit User
                </button>
                <button 
                  onClick={() => handleDelete(selectedUser)}
                  className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded"
                >
                  <span className="material-symbols-outlined !text-[18px]">delete</span>
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className="p-5 border-b border-[var(--erp-border)] bg-slate-50">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-[11px] text-[var(--erp-text-muted)] mb-0.5">Username</p>
                  <p className="text-sm font-semibold">{selectedUser.username}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--erp-text-muted)] mb-0.5">Email</p>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--erp-text-muted)] mb-0.5">Department</p>
                  <p className="text-sm">{selectedUser.department}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--erp-text-muted)] mb-0.5">Last Login</p>
                  <p className="text-sm">{selectedUser.lastLogin}</p>
                </div>
              </div>
            </div>

            {/* Permissions Table */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-bold text-[var(--erp-text-muted)] uppercase tracking-widest">Module Permissions</h3>
                <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded border-[var(--erp-border)] text-[var(--erp-accent)] w-4 h-4"
                    onChange={(e) => {
                      const val = e.target.checked;
                      setPermissions(permissions.map(p => ({
                        ...p,
                        fullAccess: val, view: val, create: val, alter: val, delete: val, print: val
                      } as PermissionEntry)));
                    }}
                  />
                  <span>Grant All Access</span>
                </label>
              </div>
              <div className="border border-[var(--erp-border)] rounded overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] text-[var(--erp-text-muted)] uppercase tracking-wider">
                      <th className="px-3 py-2 text-left w-40">Module</th>
                      <th className="px-3 py-2 text-center w-16">Full</th>
                      <th className="px-3 py-2 text-center w-16">View</th>
                      <th className="px-3 py-2 text-center w-16">Create</th>
                      <th className="px-3 py-2 text-center w-16">Alter</th>
                      <th className="px-3 py-2 text-center w-16">Delete</th>
                      <th className="px-3 py-2 text-center w-16">Print</th>
                      <th className="px-3 py-2 text-center">Special Permission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {permissions.map((perm, index) => (
                      <tr key={perm.module} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-[var(--erp-text)]">{perm.module}</td>
                        <td className="px-3 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={perm.fullAccess}
                            onChange={() => togglePermission(index, 'fullAccess')}
                            className="rounded border-[var(--erp-border)] text-[var(--erp-accent)] w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={perm.view}
                            onChange={() => togglePermission(index, 'view')}
                            className="rounded border-[var(--erp-border)] text-[var(--erp-accent)] w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={perm.create}
                            onChange={() => togglePermission(index, 'create')}
                            className="rounded border-[var(--erp-border)] text-[var(--erp-accent)] w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={perm.alter}
                            onChange={() => togglePermission(index, 'alter')}
                            className="rounded border-[var(--erp-border)] text-[var(--erp-accent)] w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={perm.delete}
                            onChange={() => togglePermission(index, 'delete')}
                            className="rounded border-[var(--erp-border)] text-[var(--erp-accent)] w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={perm.print}
                            onChange={() => togglePermission(index, 'print')}
                            className="rounded border-[var(--erp-border)] text-[var(--erp-accent)] w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-center text-[var(--erp-accent)] italic text-[11px]">{perm.special}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl mb-3">manage_accounts</span>
              <p className="text-sm">Select a user to manage permissions</p>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => { setShowAddModal(false); setEditingUser(null); }}
          onSave={(data) => {
            if (editingUser) {
              updateUser(editingUser.id, data);
            } else {
              addUser(data as Omit<User, 'id'>);
            }
            setShowAddModal(false);
            setEditingUser(null);
          }}
        />
      )}
    </PageLayout>
  );
};

// User Modal Component
interface UserModalProps {
  user: User | null;
  onClose: () => void;
  onSave: (data: Partial<User>) => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || 'viewer',
    department: user?.department || '',
    status: user?.status || 'offline',
    lastLogin: user?.lastLogin || 'Never',
  });

  const handleSubmit = () => {
    if (!formData.username || !formData.email) return;
    onSave(formData as Partial<User>);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--erp-border)] bg-slate-50">
          <h3 className="text-lg font-bold text-[var(--erp-text)]">{user ? 'Edit User' : 'Add New User'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Username *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
              placeholder="user@company.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2 bg-white"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="sales">Sales</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--erp-text-muted)] mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full text-sm border border-[var(--erp-border)] rounded px-3 py-2"
                placeholder="e.g., Sales"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--erp-border)] bg-slate-50">
          <button onClick={onClose} className="btn btn-ghost btn-md">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary btn-md">
            {user ? 'Update User' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserPermissions;
