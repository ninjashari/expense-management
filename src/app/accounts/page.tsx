'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Account } from '@/types/database';
import { toast } from 'sonner';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
    balance: number;
    credit_limit?: number;
    bill_generation_date?: number;
    payment_due_date?: number;
    status: 'active' | 'inactive' | 'closed';
    opening_date: string;
    currency: string;
  }>({
    name: '',
    type: 'checking',
    balance: 0,
    status: 'active',
    opening_date: new Date().toISOString().split('T')[0],
    currency: 'INR',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
      } else {
        toast.error('Failed to fetch accounts');
      }
    } catch (error) {
      toast.error('Error fetching accounts :: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts';
      const method = editingAccount ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(editingAccount ? 'Account updated successfully!' : 'Account created successfully!');
        setDialogOpen(false);
        resetForm();
        fetchAccounts();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed :: ' + error);
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance,
      credit_limit: account.credit_limit,
      bill_generation_date: account.bill_generation_date,
      payment_due_date: account.payment_due_date,
      status: account.status,
      opening_date: new Date(account.opening_date).toISOString().split('T')[0],
      currency: account.currency,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (account: Account) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Account deleted successfully!');
        fetchAccounts();
      } else {
        toast.error(data.error || 'Failed to delete account');
      }
    } catch (error) {
      toast.error('Failed to delete account :: ' + error);
    }
  };

  const resetForm = () => {
    setEditingAccount(null);
    setFormData({
      name: '',
      type: 'checking',
      balance: 0,
      credit_limit: undefined,
      bill_generation_date: undefined,
      payment_due_date: undefined,
      status: 'active',
      opening_date: new Date().toISOString().split('T')[0],
      currency: 'INR',
    });
  };

  const formatAccountType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatCurrency = (amount: number, currency = 'INR') => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground">
              Manage your bank accounts, credit cards, and other financial accounts
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? 'Edit Account' : 'Create New Account'}
                </DialogTitle>
                <DialogDescription>
                  {editingAccount 
                    ? 'Update the account information below.' 
                    : 'Add a new financial account to track your money.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Account Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Main Checking"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Account Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'checking' | 'savings' | 'credit' | 'cash' | 'investment') => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="credit">Credit Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="balance">Initial Balance</Label>
                    <Input
                      id="balance"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: 'active' | 'inactive' | 'closed') => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value: string) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="opening_date">Opening Date</Label>
                    <Input
                      id="opening_date"
                      type="date"
                      value={formData.opening_date}
                      onChange={(e) => setFormData({ ...formData, opening_date: e.target.value })}
                    />
                  </div>
                  
                  {formData.type === 'credit' && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="credit_limit">Credit Limit</Label>
                        <Input
                          id="credit_limit"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.credit_limit || ''}
                          onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || undefined })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="bill_generation_date">Bill Generation Date</Label>
                          <Input
                            id="bill_generation_date"
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Day of month (1-31)"
                            value={formData.bill_generation_date || ''}
                            onChange={(e) => setFormData({ ...formData, bill_generation_date: parseInt(e.target.value) || undefined })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="payment_due_date">Payment Due Date</Label>
                          <Input
                            id="payment_due_date"
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Day of month (1-31)"
                            value={formData.payment_due_date || ''}
                            onChange={(e) => setFormData({ ...formData, payment_due_date: parseInt(e.target.value) || undefined })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAccount ? 'Update Account' : 'Create Account'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Accounts</CardTitle>
            <CardDescription>
              A list of all your financial accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No accounts found. Create your first account to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Credit Details</TableHead>
                    <TableHead>Opening Date</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{account.name}</div>
                          <div className="text-xs text-muted-foreground">{account.currency}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatAccountType(account.type)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          account.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : account.status === 'inactive'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right ${account.balance < 0 ? 'text-red-600' : ''}`}>
                        {formatCurrency(account.balance, account.currency)}
                      </TableCell>
                      <TableCell>
                        {account.type === 'credit' ? (
                          <div className="space-y-1 text-sm">
                            {account.credit_limit && (
                              <div>Limit: {formatCurrency(account.credit_limit, account.currency)}</div>
                            )}
                            {account.bill_generation_date && (
                              <div>Bill: {account.bill_generation_date}th</div>
                            )}
                            {account.payment_due_date && (
                              <div>Due: {account.payment_due_date}th</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(account.opening_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(account)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(account)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}