'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { BUDGET_CATEGORIES } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';

interface BudgetEntry {
  id: string;
  fiscal_year: number;
  category: string;
  allocated_amount: number;
  description: string;
  status?: string;
}

export default function ManageBudgetPage() {
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchBudget();
  }, []);

  async function fetchBudget() {
    setLoading(true);

    try {
      const token = localStorage.getItem('cyfer_token');
      const res = await fetch('/api/budget', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();

      if (json.success) {
        setEntries(Array.isArray(json.data) ? json.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch budget:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormLoading(true);

    try {
      const token = localStorage.getItem('cyfer_token');
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fiscal_year: fiscalYear,
          category,
          allocated_amount: parseFloat(amount),
          description,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setSuccess(`Budget entry for ${category} submitted for approval.`);
        setCategory('');
        setAmount('');
        setDescription('');
        setShowForm(false);
        fetchBudget();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save budget:', error);
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Budget workspace"
        title="Manage budget entries"
        description="Add new budget allocations, review their workflow status, and keep the public dashboard current."
        actions={
          <Button onClick={() => setShowForm((current) => !current)}>
            <Plus size={16} />
            {showForm ? 'Cancel' : 'Add entry'}
          </Button>
        }
      />

      {success ? (
        <div className="card mb-6 p-4" style={{ background: 'var(--ok-soft)', borderColor: 'var(--ok-line)' }}>
          <div className="row text-sm text-[var(--ok)]">
            <CheckCircle2 size={16} />
            {success}
          </div>
        </div>
      ) : null}

      {showForm ? (
        <div className="card mb-6 p-6">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-900)]">Add budget entry</h2>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
            <Input
              label="Fiscal year"
              type="number"
              value={String(fiscalYear)}
              onChange={(event) => setFiscalYear(parseInt(event.target.value, 10))}
              required
            />
            <div>
              <label className="field-label">Category</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
                className="select"
              >
                <option value="">Select category...</option>
                {BUDGET_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Allocated amount (PHP)"
              type="number"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
            <Input
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Brief description..."
            />
            <div className="md:col-span-2">
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit for approval'
                )}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[var(--text-mute)]" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="font-serif text-2xl font-semibold text-[var(--ink-900)]">No budget entries yet</div>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            Add the first budget entry to begin tracking allocations through CYFER.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Fiscal year</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <tbody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.category}</TableCell>
                <TableCell>{entry.fiscal_year}</TableCell>
                <TableCell>{formatCurrency(entry.allocated_amount)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      entry.status === 'published'
                        ? 'success'
                        : entry.status === 'rejected'
                          ? 'error'
                          : 'warning'
                    }
                  >
                    {entry.status ?? 'pending'}
                  </Badge>
                </TableCell>
                <TableCell>{entry.description}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
