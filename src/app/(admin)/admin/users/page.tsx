'use client';

import { useEffect, useState } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Badge } from '@/components/ui/Badge';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatDate } from '@/utils/formatters';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  created_at: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = localStorage.getItem('cyfer_token');
        const res = await fetch('/api/auth', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();

        if (json.success && json.data) {
          setUsers([json.data]);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Access control"
        title="User management"
        description="View the currently authenticated account details and the role information available through the existing admin API."
      />

      <div className="card mb-6 p-5" style={{ background: 'var(--warn-soft)', borderColor: 'var(--warn-line)' }}>
        <div className="row flex-nowrap items-start gap-3">
          <Shield size={18} className="mt-0.5 text-[var(--warn)]" />
          <p className="m-0 text-sm leading-6 text-[var(--text-soft)]">
            Full user management is still limited by the current backend endpoints.
            This screen reflects the data available today without changing the API surface.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[var(--text-mute)]" />
        </div>
      ) : users.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="font-serif text-2xl font-semibold text-[var(--ink-900)]">No users found</div>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            The authenticated user endpoint did not return any user records.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <tbody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'super_admin' ? 'accent' : 'info'}>
                    {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </Badge>
                </TableCell>
                <TableCell>{user.department}</TableCell>
                <TableCell>{user.created_at ? formatDate(user.created_at) : '-'}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
