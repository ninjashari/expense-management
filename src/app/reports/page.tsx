'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Download } from 'lucide-react';
import { Account, Category, Payee } from '@/types/database';
import { toast } from 'sonner';

interface ReportFilters {
  startDate: string;
  endDate: string;
  accountId: string;
  categoryId: string;
  payeeId: string;
  transactionType: string;
}

interface TransactionSummary {
  total_income: number;
  total_expenses: number;
  net_amount: number;
  transaction_count: number;
}

interface CategoryReport {
  category_id: string;
  category_name: string;
  category_color: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

interface AccountReport {
  account_id: string;
  account_name: string;
  total_income: number;
  total_expenses: number;
  net_amount: number;
  transaction_count: number;
}

interface MonthlyReport {
  month: string;
  year: number;
  total_income: number;
  total_expenses: number;
  net_amount: number;
  transaction_count: number;
}

export default function ReportsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    accountId: '',
    categoryId: '',
    payeeId: '',
    transactionType: '',
  });

  const [summary, setSummary] = useState<TransactionSummary>({
    total_income: 0,
    total_expenses: 0,
    net_amount: 0,
    transaction_count: 0,
  });

  const [categoryReports, setCategoryReports] = useState<CategoryReport[]>([]);
  const [accountReports, setAccountReports] = useState<AccountReport[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    generateReports();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const generateReports = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const [summaryRes, categoryRes, accountRes, monthlyRes] = await Promise.all([
        fetch(`/api/reports/summary?${queryParams}`),
        fetch(`/api/reports/categories?${queryParams}`),
        fetch(`/api/reports/accounts?${queryParams}`),
        fetch(`/api/reports/monthly?${queryParams}`)
      ]);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      if (categoryRes.ok) {
        const categoryData = await categoryRes.json();
        setCategoryReports(categoryData.categories);
      }

      if (accountRes.ok) {
        const accountData = await accountRes.json();
        setAccountReports(accountData.accounts);
      }

      if (monthlyRes.ok) {
        const monthlyData = await monthlyRes.json();
        setMonthlyReports(monthlyData.months);
      }

    } catch (error) {
      toast.error('Error generating reports');
      console.error('Error generating reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(Math.abs(amount));
  };

  const exportToCSV = (data: unknown[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0] as Record<string, unknown>);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${(row as Record<string, unknown>)[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
              Analyze your financial data with detailed reports and insights
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
            <CardDescription>
              Customize your report by selecting date range and other filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountId">Account</Label>
                <Select
                  value={filters.accountId}
                  onValueChange={(value) => setFilters({ ...filters, accountId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={filters.categoryId}
                  onValueChange={(value) => setFilters({ ...filters, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
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
              <div className="space-y-2">
                <Label htmlFor="payeeId">Payee</Label>
                <Select
                  value={filters.payeeId}
                  onValueChange={(value) => setFilters({ ...filters, payeeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Payees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Payees</SelectItem>
                    {payees.map((payee) => (
                      <SelectItem key={payee.id} value={payee.id}>
                        {payee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionType">Type</Label>
                <Select
                  value={filters.transactionType}
                  onValueChange={(value) => setFilters({ ...filters, transactionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.total_income)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.total_expenses)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Net Amount</p>
                  <p className={`text-2xl font-bold ${
                    summary.net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {summary.net_amount >= 0 ? '+' : '-'}{formatCurrency(summary.net_amount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-4 h-4 text-purple-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Transactions</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.transaction_count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="categories" className="space-y-4">
          <TabsList>
            <TabsTrigger value="categories">
              <PieChart className="w-4 h-4 mr-2" />
              By Category
            </TabsTrigger>
            <TabsTrigger value="accounts">
              <BarChart3 className="w-4 h-4 mr-2" />
              By Account
            </TabsTrigger>
            <TabsTrigger value="monthly">
              <TrendingUp className="w-4 h-4 mr-2" />
              Monthly Trend
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Category Report</CardTitle>
                  <CardDescription>
                    Breakdown of transactions by category
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => exportToCSV(categoryReports, 'category_report')}
                  disabled={categoryReports.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading report...</div>
                ) : categoryReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available for the selected filters
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Transactions</TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryReports.map((category) => (
                        <TableRow key={category.category_id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.category_color }}
                              />
                              <span>{category.category_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(category.total_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {category.transaction_count}
                          </TableCell>
                          <TableCell className="text-right">
                            {category.percentage.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Account Report</CardTitle>
                  <CardDescription>
                    Financial activity by account
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => exportToCSV(accountReports, 'account_report')}
                  disabled={accountReports.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading report...</div>
                ) : accountReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available for the selected filters
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead className="text-right">Transactions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountReports.map((account) => (
                        <TableRow key={account.account_id}>
                          <TableCell className="font-medium">
                            {account.account_name}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(account.total_income)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(account.total_expenses)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            account.net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {account.net_amount >= 0 ? '+' : '-'}{formatCurrency(account.net_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {account.transaction_count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Monthly Trend</CardTitle>
                  <CardDescription>
                    Income and expenses by month
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => exportToCSV(monthlyReports, 'monthly_report')}
                  disabled={monthlyReports.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading report...</div>
                ) : monthlyReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available for the selected filters
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead className="text-right">Transactions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyReports.map((month) => (
                        <TableRow key={`${month.year}-${month.month}`}>
                          <TableCell className="font-medium">
                            {month.month} {month.year}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(month.total_income)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(month.total_expenses)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            month.net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {month.net_amount >= 0 ? '+' : '-'}{formatCurrency(month.net_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {month.transaction_count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}