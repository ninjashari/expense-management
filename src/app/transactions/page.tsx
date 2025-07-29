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
import { Textarea } from '@/components/ui/textarea';
import { Plus, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Filter, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Account, Category, Payee } from '@/types/database';
import { toast } from 'sonner';

interface TransactionWithDetails {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  notes?: string;
  date: string;
  account_id: string;
  account_name: string;
  currency: string;
  category_id?: string;
  category_name?: string;
  category_color?: string;
  payee_id?: string;
  payee_name?: string;
  to_account_id?: string;
  to_account_name?: string;
  created_at: string;
  updated_at: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);
  const [formData, setFormData] = useState({
    account_id: '',
    category_id: '',
    payee_id: '',
    amount: '',
    type: 'withdrawal' as 'deposit' | 'withdrawal' | 'transfer',
    description: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    to_account_id: '', // For transfers
  });

  useEffect(() => {
    fetchTransactions();
    fetchDropdownData();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      } else {
        toast.error('Failed to fetch transactions');
      }
    } catch (error) {
      toast.error('Error fetching transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [accountsRes, categoriesRes, payeesRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories'),
        fetch('/api/payees')
      ]);

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData.accounts);
      }
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories);
      }
      if (payeesRes.ok) {
        const payeesData = await payeesRes.json();
        setPayees(payeesData.payees);
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account_id) {
      toast.error('Please select an account');
      return;
    }

    if (formData.type === 'transfer' && !formData.to_account_id) {
      toast.error('Please select a destination account for transfer');
      return;
    }

    if (formData.type === 'transfer' && formData.account_id === formData.to_account_id) {
      toast.error('Source and destination accounts must be different');
      return;
    }

    try {
      const requestData = {
        ...formData,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id || undefined,
        payee_id: formData.payee_id || undefined,
        to_account_id: formData.type === 'transfer' ? formData.to_account_id : undefined,
      };

      const url = editingTransaction ? `/api/transactions/${editingTransaction.id}` : '/api/transactions';
      const method = editingTransaction ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(editingTransaction ? 'Transaction updated successfully!' : 'Transaction created successfully!');
        setDialogOpen(false);
        resetForm();
        fetchTransactions();
      } else {
        toast.error(data.error || (editingTransaction ? 'Failed to update transaction' : 'Failed to create transaction'));
      }
    } catch (error) {
      toast.error(editingTransaction ? 'Failed to update transaction' : 'Failed to create transaction');
    }
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setFormData({
      account_id: '',
      category_id: '',
      payee_id: '',
      amount: '',
      type: 'withdrawal',
      description: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
      to_account_id: '',
    });
  };

  const formatCurrency = (amount: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(Math.abs(amount));
  };

  const getTransactionIcon = (type: string, hasTransfer: boolean) => {
    if (hasTransfer) {
      return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
    }
    return type === 'income' 
      ? <ArrowUpCircle className="w-4 h-4 text-green-600" />
      : <ArrowDownCircle className="w-4 h-4 text-red-600" />;
  };

  const getTransactionTypeLabel = (type: string, hasTransfer: boolean) => {
    if (hasTransfer) return 'Transfer';
    return type === 'income' ? 'Deposit' : 'Withdrawal';
  };

  const handleEdit = (transaction: TransactionWithDetails) => {
    if (transaction.to_account_name) {
      toast.error('Transfer transactions cannot be edited. Please delete and create a new one.');
      return;
    }

    setEditingTransaction(transaction);
    setFormData({
      account_id: transaction.account_id,
      category_id: transaction.category_id || '',
      payee_id: transaction.payee_id || '',
      amount: Math.abs(transaction.amount).toString(),
      type: transaction.type === 'income' ? 'deposit' : 'withdrawal',
      description: transaction.description || '',
      notes: transaction.notes || '',
      date: transaction.date.split('T')[0],
      to_account_id: '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (transaction: TransactionWithDetails) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Transaction deleted successfully!');
        fetchTransactions();
      } else {
        toast.error(data.error || 'Failed to delete transaction');
      }
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              Track your deposits, withdrawals, and transfers
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Create New Transaction'}</DialogTitle>
                  <DialogDescription>
                    {editingTransaction 
                      ? 'Update the transaction details below.' 
                      : 'Add a deposit, withdrawal, or transfer to your accounts.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Transaction Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: 'deposit' | 'withdrawal' | 'transfer') => 
                          setFormData({ ...formData, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">
                            <div className="flex items-center">
                              <ArrowUpCircle className="w-4 h-4 mr-2 text-green-600" />
                              Deposit (Money In)
                            </div>
                          </SelectItem>
                          <SelectItem value="withdrawal">
                            <div className="flex items-center">
                              <ArrowDownCircle className="w-4 h-4 mr-2 text-red-600" />
                              Withdrawal (Money Out)
                            </div>
                          </SelectItem>
                          <SelectItem value="transfer">
                            <div className="flex items-center">
                              <ArrowRightLeft className="w-4 h-4 mr-2 text-blue-600" />
                              Transfer (Between Accounts)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="account_id">
                          {formData.type === 'transfer' ? 'From Account' : 'Account'}
                        </Label>
                        <Select
                          value={formData.account_id}
                          onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.currency} {formatCurrency(account.balance, account.currency)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.type === 'transfer' && (
                        <div className="grid gap-2">
                          <Label htmlFor="to_account_id">To Account</Label>
                          <Select
                            value={formData.to_account_id}
                            onValueChange={(value) => setFormData({ ...formData, to_account_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select destination" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts
                                .filter(account => account.id !== formData.account_id)
                                .map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name} ({account.currency} {formatCurrency(account.balance, account.currency)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {formData.type !== 'transfer' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="category_id">Category (Optional)</Label>
                          <Select
                            value={formData.category_id || 'none'}
                            onValueChange={(value) => setFormData({ ...formData, category_id: value === 'none' ? '' : value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No category</SelectItem>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center">
                                    <div 
                                      className="w-3 h-3 rounded-full mr-2"
                                      style={{ backgroundColor: category.color }}
                                    />
                                    {category.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="payee_id">Payee (Optional)</Label>
                          <Select
                            value={formData.payee_id || 'none'}
                            onValueChange={(value) => setFormData({ ...formData, payee_id: value === 'none' ? '' : value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select payee" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No payee</SelectItem>
                              {payees.map((payee) => (
                                <SelectItem key={payee.id} value={payee.id}>
                                  {payee.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        placeholder="e.g., Grocery shopping, Salary payment"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Additional notes..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingTransaction ? 'Update Transaction' : 'Create Transaction'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              A list of all your financial transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found. Create your first transaction to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTransactionIcon(transaction.type, !!transaction.to_account_name)}
                          <span className="text-sm">
                            {getTransactionTypeLabel(transaction.type, !!transaction.to_account_name)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {transaction.description || 'No description'}
                          </div>
                          {transaction.to_account_name && (
                            <div className="text-xs text-muted-foreground">
                              → {transaction.to_account_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.account_name}</TableCell>
                      <TableCell>
                        {transaction.category_name ? (
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: transaction.category_color }}
                            />
                            <span>{transaction.category_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.payee_name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(transaction)}
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