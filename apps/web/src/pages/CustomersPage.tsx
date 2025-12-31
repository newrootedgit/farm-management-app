import { useState } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useCustomerTags,
  useCreateCustomerTag,
  useDeleteCustomerTag,
} from '@/lib/api-client';
import { formatPaymentTerms, formatCustomerType } from '@farm/shared';
import type { Customer, CustomerTag, CreateCustomer } from '@farm/shared';

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  paymentTerms: string;
  creditLimit: string;
  customerType: string;
  notes: string;
  tagIds: string[];
}

const emptyForm: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  companyName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  paymentTerms: 'DUE_ON_RECEIPT',
  creditLimit: '',
  customerType: 'RETAIL',
  notes: '',
  tagIds: [],
};

const CUSTOMER_TYPES = [
  { value: 'RETAIL', label: 'Retail' },
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'FARMERS_MARKET', label: "Farmer's Market" },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'OTHER', label: 'Other' },
];

const PAYMENT_TERMS = [
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
  { value: 'NET_7', label: 'Net 7' },
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_60', label: 'Net 60' },
];

export default function CustomersPage() {
  const { currentFarmId } = useFarmStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);

  const { data: customers, isLoading } = useCustomers(currentFarmId ?? undefined, {
    search: searchQuery || undefined,
    customerType: filterType || undefined,
    isActive: showInactive ? undefined : true,
  });
  const { data: tags } = useCustomerTags(currentFarmId ?? undefined);
  const createCustomer = useCreateCustomer(currentFarmId ?? '');
  const updateCustomer = useUpdateCustomer(currentFarmId ?? '');
  const deleteCustomer = useDeleteCustomer(currentFarmId ?? '');
  const createTag = useCreateCustomerTag(currentFarmId ?? '');
  const deleteTag = useDeleteCustomerTag(currentFarmId ?? '');

  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<(Customer & { tags: CustomerTag[] }) | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const [showTagForm, setShowTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm to manage customers.</p>
        </div>
      </div>
    );
  }

  const handleOpenForm = (customer?: Customer & { tags: CustomerTag[] }) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        companyName: customer.companyName ?? '',
        addressLine1: customer.addressLine1 ?? '',
        addressLine2: customer.addressLine2 ?? '',
        city: customer.city ?? '',
        state: customer.state ?? '',
        postalCode: customer.postalCode ?? '',
        country: customer.country,
        paymentTerms: customer.paymentTerms,
        creditLimit: customer.creditLimit?.toString() ?? '',
        customerType: customer.customerType,
        notes: customer.notes ?? '',
        tagIds: customer.tags.map(t => t.id),
      });
    } else {
      setEditingCustomer(null);
      setFormData(emptyForm);
    }
    setFormError(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
    setFormData(emptyForm);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Customer name is required');
      return;
    }

    const customerData: CreateCustomer = {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      companyName: formData.companyName.trim() || undefined,
      addressLine1: formData.addressLine1.trim() || undefined,
      addressLine2: formData.addressLine2.trim() || undefined,
      city: formData.city.trim() || undefined,
      state: formData.state.trim() || undefined,
      postalCode: formData.postalCode.trim() || undefined,
      country: formData.country,
      paymentTerms: formData.paymentTerms as any,
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
      customerType: formData.customerType as any,
      notes: formData.notes.trim() || undefined,
      tagIds: formData.tagIds.length > 0 ? formData.tagIds : undefined,
    };

    try {
      if (editingCustomer) {
        await updateCustomer.mutateAsync({
          customerId: editingCustomer.id,
          data: customerData,
        });
      } else {
        await createCustomer.mutateAsync(customerData);
      }
      handleCloseForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save customer');
    }
  };

  const handleDelete = async (customerId: string) => {
    if (confirm('Are you sure you want to deactivate this customer?')) {
      try {
        await deleteCustomer.mutateAsync(customerId);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete customer');
      }
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      await createTag.mutateAsync({
        name: newTagName.trim(),
        color: newTagColor,
      });
      setNewTagName('');
      setShowTagForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create tag');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (confirm('Are you sure you want to delete this tag?')) {
      try {
        await deleteTag.mutateAsync(tagId);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete tag');
      }
    }
  };

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer relationships</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTagForm(true)}
            className="px-4 py-2 border rounded-md hover:bg-accent"
          >
            Manage Tags
          </button>
          <button
            onClick={() => handleOpenForm()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add Customer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="">All Types</option>
          {CUSTOMER_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading customers...</div>
      ) : !customers || customers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <p className="text-muted-foreground mb-4">No customers found</p>
          <button
            onClick={() => handleOpenForm()}
            className="text-primary hover:underline"
          >
            Add your first customer
          </button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Terms</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Orders</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Balance</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((customer) => (
                <tr key={customer.id} className={`hover:bg-muted/30 ${!customer.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      {customer.companyName && (
                        <div className="text-sm text-muted-foreground">{customer.companyName}</div>
                      )}
                      {customer.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {customer.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 text-xs rounded-full"
                              style={{ backgroundColor: tag.color + '20', color: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatCustomerType(customer.customerType)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {customer.email && <div>{customer.email}</div>}
                    {customer.phone && <div className="text-muted-foreground">{customer.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatPaymentTerms(customer.paymentTerms)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {customer._count?.orders ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    ${customer.accountBalance.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenForm(customer)}
                      className="text-sm text-primary hover:underline mr-3"
                    >
                      Edit
                    </button>
                    {customer.isActive && (
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="text-sm text-destructive hover:underline"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-destructive/10 border border-destructive/50 text-destructive rounded-md text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Address Line 1</label>
                  <input
                    type="text"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Customer Type</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    {CUSTOMER_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    {PAYMENT_TERMS.map(term => (
                      <option key={term.value} value={term.value}>{term.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Credit Limit ($)</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    min="0"
                    step="0.01"
                  />
                </div>

                {tags && tags.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            formData.tagIds.includes(tag.id)
                              ? 'border-transparent'
                              : 'border-border hover:border-primary'
                          }`}
                          style={{
                            backgroundColor: formData.tagIds.includes(tag.id) ? tag.color + '30' : 'transparent',
                            color: formData.tagIds.includes(tag.id) ? tag.color : undefined,
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 border rounded-md hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCustomer.isPending || updateCustomer.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {createCustomer.isPending || updateCustomer.isPending
                    ? 'Saving...'
                    : editingCustomer
                    ? 'Update Customer'
                    : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Management Modal */}
      {showTagForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Manage Customer Tags</h2>

            {/* Existing Tags */}
            {tags && tags.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Existing Tags</label>
                <div className="space-y-2">
                  {tags.map(tag => (
                    <div key={tag.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({tag._count?.customers ?? 0} customers)
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-sm text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Tag Form */}
            <form onSubmit={handleCreateTag} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">New Tag Name</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="e.g., VIP, Wholesale"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-16 h-10 border rounded-md cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTagForm(false)}
                  className="px-4 py-2 border rounded-md hover:bg-accent"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!newTagName.trim() || createTag.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {createTag.isPending ? 'Creating...' : 'Create Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
