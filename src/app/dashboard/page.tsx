'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, LucideIcon } from 'lucide-react';

interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  accountsCount: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    date: string;
    account_name: string;
    category_name?: string;
    payee_name?: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    accountsCount: 0,
    recentTransactions: [],
  });
  const [accounts, setAccounts] = useState<Array<{name: string; type: string; balance: number}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, accountsResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/accounts')
      ]);
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
      
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setAccounts(accountsData.accounts);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend 
  }: { 
    title: string; 
    value: string; 
    description: string; 
    icon: LucideIcon; 
    trend?: 'up' | 'down';
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {trend === 'up' && <TrendingUp className="inline w-3 h-3 mr-1 text-green-500" />}
          {trend === 'down' && <TrendingDown className="inline w-3 h-3 mr-1 text-red-500" />}
          {description}
        </p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your financial status
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Balance"
            value={`$${stats.totalBalance.toLocaleString()}`}
            description="Across all accounts"
            icon={DollarSign}
          />
          <StatCard
            title="Monthly Income"
            value={`$${stats.monthlyIncome.toLocaleString()}`}
            description="This month"
            icon={TrendingUp}
            trend="up"
          />
          <StatCard
            title="Monthly Expenses"
            value={`$${stats.monthlyExpenses.toLocaleString()}`}
            description="This month"
            icon={TrendingDown}
            trend="down"
          />
          <StatCard
            title="Active Accounts"
            value={stats.accountsCount.toString()}
            description="Bank & credit accounts"
            icon={CreditCard}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet. Start by adding some transactions to see them here.
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === 'income' 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                        }`}>
                          {transaction.type === 'income' ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {transaction.description || transaction.payee_name || 'Transaction'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.category_name || transaction.account_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.type === 'income' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Account Balances</CardTitle>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No accounts yet. Create your first account to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map((account, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                        </p>
                      </div>
                      <p className={`text-sm font-medium ${
                        account.balance < 0 ? 'text-red-600' : ''
                      }`}>
                        {account.balance < 0 ? '-' : ''}${Math.abs(account.balance).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}