import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatPrice } from '@farm/shared';

interface SkuItem {
  id: string;
  skuCode: string;
  name: string;
  weightOz: number;
  price: number;
  isAvailable: boolean;
  displayOrder: number;
  imageUrl: string | null;
}

interface Product {
  id: string;
  name: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  skus: SkuItem[];
}

interface Farm {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  logoUrl: string | null;
}

interface CartItem {
  skuId: string;
  skuName: string;
  productName: string;
  quantity: number;
  price: number;
  weightOz: number;
}

interface OrderFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryDate: string;
  deliveryMethod: 'PICKUP' | 'DELIVERY';
  deliveryAddress: string;
  notes: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function StorefrontPage() {
  const { farmSlug } = useParams<{ farmSlug: string }>();

  const [farm, setFarm] = useState<Farm | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderId: string;
    orderNumber: string;
    totalCents: number;
  } | null>(null);

  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryDate: '',
    deliveryMethod: 'PICKUP',
    deliveryAddress: '',
    notes: '',
  });

  // Calculate min delivery date (2 days from now)
  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!farmSlug) return;

    const fetchStorefront = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/v1/storefront/${farmSlug}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to load storefront');
        }

        setFarm(result.data.farm);
        setProducts(result.data.products);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load storefront');
      } finally {
        setLoading(false);
      }
    };

    fetchStorefront();
  }, [farmSlug]);

  const addToCart = (product: Product, sku: SkuItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.skuId === sku.id);
      if (existing) {
        return prev.map((item) =>
          item.skuId === sku.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          skuId: sku.id,
          skuName: sku.name,
          productName: product.name,
          quantity: 1,
          price: sku.price,
          weightOz: sku.weightOz,
        },
      ];
    });
  };

  const updateCartQuantity = (skuId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.skuId !== skuId));
    } else {
      setCart((prev) =>
        prev.map((item) => (item.skuId === skuId ? { ...item, quantity } : item))
      );
    }
  };

  const removeFromCart = (skuId: string) => {
    setCart((prev) => prev.filter((item) => item.skuId !== skuId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalOz = cart.reduce((sum, item) => sum + item.weightOz * item.quantity, 0);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/v1/storefront/${farmSlug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: cart.map((item) => ({
            skuId: item.skuId,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to submit order');
      }

      setOrderSuccess(result.data);
      setCart([]);
      setShowCheckout(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  // Group products by category
  const productsByCategory = products.reduce(
    (acc, product) => {
      const categoryName = product.category?.name || 'Other';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    },
    {} as Record<string, Product[]>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !farm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Farm Not Found</h1>
          <p className="text-gray-500">{error || 'This storefront does not exist.'}</p>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Submitted!</h1>
            <p className="text-gray-600 mb-4">
              Thank you for your order. We'll be in touch soon to confirm.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500">Order Number</p>
              <p className="text-xl font-bold text-gray-900">{orderSuccess.orderNumber}</p>
              <p className="text-lg font-semibold text-green-600 mt-2">
                Total: {formatPrice(orderSuccess.totalCents)}
              </p>
            </div>
            <button
              onClick={() => {
                setOrderSuccess(null);
                setFormData({
                  customerName: '',
                  customerEmail: '',
                  customerPhone: '',
                  deliveryDate: '',
                  deliveryMethod: 'PICKUP',
                  deliveryAddress: '',
                  notes: '',
                });
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Place Another Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {farm.logoUrl && (
              <img
                src={`${API_BASE}${farm.logoUrl}`}
                alt={`${farm.name} logo`}
                className="h-14 w-auto max-w-[160px] object-contain"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{farm.name}</h1>
              <p className="text-sm text-gray-500">Order fresh microgreens</p>
            </div>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Cart</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Products Available</h2>
            <p className="text-gray-500">Check back soon for fresh microgreens!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => (
              <div key={categoryName}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{categoryName}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryProducts.map((product) => (
                    <div key={product.id} className="bg-white rounded-lg shadow p-4">
                      <h3 className="font-medium text-gray-900 mb-3">{product.name}</h3>
                      <div className="space-y-2">
                        {product.skus.map((sku) => (
                          <div
                            key={sku.id}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                          >
                            {sku.imageUrl && (
                              <img
                                src={`${API_BASE}${sku.imageUrl}`}
                                alt={sku.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-900">{sku.name}</span>
                              <span className="text-sm text-gray-500 ml-2">({sku.weightOz}oz)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-green-600">
                                {formatPrice(sku.price)}
                              </span>
                              <button
                                onClick={() => addToCart(product, sku)}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Your Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Your cart is empty</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.skuId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.skuName}</p>
                        <p className="text-sm text-gray-500">{formatPrice(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartQuantity(item.skuId, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center border rounded hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.skuId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center border rounded hover:bg-gray-100"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.skuId)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t p-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Weight</span>
                  <span className="font-medium">{cartTotalOz.toFixed(1)} oz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-900 font-medium">Total</span>
                  <span className="text-xl font-bold text-green-600">{formatPrice(cartTotal)}</span>
                </div>
                <button
                  onClick={() => {
                    setShowCart(false);
                    setShowCheckout(true);
                  }}
                  className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCheckout(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">Checkout</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="p-4 space-y-4">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Order Summary</h3>
                <div className="space-y-1 text-sm">
                  {cart.map((item) => (
                    <div key={item.skuId} className="flex justify-between">
                      <span>
                        {item.skuName} x {item.quantity}
                      </span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 font-medium flex justify-between">
                    <span>Total</span>
                    <span className="text-green-600">{formatPrice(cartTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Contact Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>

              {/* Delivery Info */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Delivery Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date *</label>
                  <input
                    type="date"
                    required
                    min={getMinDate()}
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Orders require at least 2 days notice</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="PICKUP"
                        checked={formData.deliveryMethod === 'PICKUP'}
                        onChange={(e) =>
                          setFormData({ ...formData, deliveryMethod: e.target.value as 'PICKUP' | 'DELIVERY' })
                        }
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm">Pickup</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="DELIVERY"
                        checked={formData.deliveryMethod === 'DELIVERY'}
                        onChange={(e) =>
                          setFormData({ ...formData, deliveryMethod: e.target.value as 'PICKUP' | 'DELIVERY' })
                        }
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm">Delivery</span>
                    </label>
                  </div>
                </div>
                {formData.deliveryMethod === 'DELIVERY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Address *
                    </label>
                    <textarea
                      required
                      value={formData.deliveryAddress}
                      onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows={2}
                      placeholder="Street address, city, zip"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={2}
                    placeholder="Any special requests or instructions"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : `Submit Order - ${formatPrice(cartTotal)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-sm text-gray-500">
            {farm.logoUrl && (
              <img
                src={`${API_BASE}${farm.logoUrl}`}
                alt={`${farm.name} logo`}
                className="h-20 w-auto max-w-[200px] object-contain mx-auto mb-4"
              />
            )}
            <p className="font-medium text-gray-900 mb-2">{farm.name}</p>
            <p className="mb-6">Fresh microgreens, grown with care</p>
            <div className="border-t pt-4 text-xs text-gray-400">
              Powered by{' '}
              <a
                href="https://rootedrobotics.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline font-medium"
              >
                Rooted Robotics
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
