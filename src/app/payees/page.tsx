'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { Payee } from '@/types/database';
import { toast } from 'sonner';

export default function PayeesPage() {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayee, setEditingPayee] = useState<Payee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchPayees();
  }, []);

  const fetchPayees = async () => {
    try {
      const response = await fetch('/api/payees');
      if (response.ok) {
        const data = await response.json();
        setPayees(data.payees);
      } else {
        toast.error('Failed to fetch payees');
      }
    } catch (error) {
      toast.error('Error fetching payees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingPayee ? `/api/payees/${editingPayee.id}` : '/api/payees';
      const method = editingPayee ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(editingPayee ? 'Payee updated successfully!' : 'Payee created successfully!');
        setDialogOpen(false);
        resetForm();
        fetchPayees();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleEdit = (payee: Payee) => {
    setEditingPayee(payee);
    setFormData({
      name: payee.name,
      email: payee.email || '',
      phone: payee.phone || '',
      address: payee.address || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (payee: Payee) => {
    if (!confirm('Are you sure you want to delete this payee?')) return;

    try {
      const response = await fetch(`/api/payees/${payee.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Payee deleted successfully!');
        fetchPayees();
      } else {
        toast.error(data.error || 'Failed to delete payee');
      }
    } catch (error) {
      toast.error('Failed to delete payee');
    }
  };

  const resetForm = () => {
    setEditingPayee(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payees</h1>
            <p className="text-muted-foreground">
              Manage people and businesses you pay or receive money from
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Payee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingPayee ? 'Edit Payee' : 'Create New Payee'}
                </DialogTitle>
                <DialogDescription>
                  {editingPayee 
                    ? 'Update the payee information below.' 
                    : 'Add a new payee to track payments and receipts.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., John Doe or ABC Company"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address (Optional)</Label>
                    <Input
                      id="address"
                      placeholder="123 Main St, City, State"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingPayee ? 'Update Payee' : 'Create Payee'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Payees</CardTitle>
            <CardDescription>
              A list of all your payees and their contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading payees...</div>
            ) : payees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payees found. Create your first payee to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Information</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payees.map((payee) => (
                    <TableRow key={payee.id}>
                      <TableCell className="font-medium">{payee.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {payee.email && (
                            <div className="flex items-center space-x-2">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span>{payee.email}</span>
                            </div>
                          )}
                          {payee.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span>{payee.phone}</span>
                            </div>
                          )}
                          {payee.address && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span>{payee.address}</span>
                            </div>
                          )}
                          {!payee.email && !payee.phone && !payee.address && (
                            <span className="text-muted-foreground">No contact info</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(payee.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(payee)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(payee)}
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
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}