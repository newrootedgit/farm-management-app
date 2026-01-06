import { useState, useMemo } from 'react';
import { useFarm } from '../lib/api-client';
import {
  useDeliveryRoutes,
  useDeliveryRoute,
  useStartRoute,
  useCompleteRoute,
  useMarkOrderDelivered,
  useCaptureSignature,
} from '../lib/api-client';
import { SignatureModal } from '../components/delivery/SignatureModal';
import {
  TruckIcon,
  MapPinIcon,
  PhoneIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  StopIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import type { FulfillmentStatus } from '@farm/shared';

const FULFILLMENT_STATUS_STYLES: Record<FulfillmentStatus, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
  READY_FOR_PICKUP: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ready' },
  OUT_FOR_DELIVERY: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In Transit' },
  DELIVERED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Delivered' },
  PICKED_UP: { bg: 'bg-green-100', text: 'text-green-700', label: 'Picked Up' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
};

export default function DriverPage() {
  const { data: farm } = useFarm(localStorage.getItem('selectedFarmId') || undefined);
  const farmId = farm?.id;

  const today = new Date().toISOString().split('T')[0];
  const { data: routes, isLoading: routesLoading } = useDeliveryRoutes(farmId, { date: today });

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [signatureOrderId, setSignatureOrderId] = useState<string | null>(null);
  const [signatureOrderNumber, setSignatureOrderNumber] = useState<string>('');
  const [signatureCustomerName, setSignatureCustomerName] = useState<string | undefined>();

  const { data: selectedRoute, isLoading: routeLoading } = useDeliveryRoute(
    farmId,
    selectedRouteId || undefined
  );

  const startRoute = useStartRoute(farmId || '');
  const completeRoute = useCompleteRoute(farmId || '');
  const markDelivered = useMarkOrderDelivered(farmId || '');
  const captureSignature = useCaptureSignature(farmId || '');

  // Calculate route progress
  const routeProgress = useMemo(() => {
    if (!selectedRoute?.orders) return { delivered: 0, total: 0, percentage: 0 };
    const total = selectedRoute.orders.length;
    const delivered = selectedRoute.orders.filter(
      (o) => o.fulfillmentStatus === 'DELIVERED' || o.fulfillmentStatus === 'PICKED_UP'
    ).length;
    return {
      delivered,
      total,
      percentage: total > 0 ? Math.round((delivered / total) * 100) : 0,
    };
  }, [selectedRoute]);

  const handleStartRoute = async (routeId: string) => {
    try {
      await startRoute.mutateAsync(routeId);
    } catch (error) {
      console.error('Failed to start route:', error);
    }
  };

  const handleCompleteRoute = async (routeId: string) => {
    try {
      await completeRoute.mutateAsync({ routeId });
    } catch (error) {
      console.error('Failed to complete route:', error);
    }
  };

  const handleOpenSignature = (order: {
    id: string;
    orderNumber: string;
    customerName: string | null;
  }) => {
    setSignatureOrderId(order.id);
    setSignatureOrderNumber(order.orderNumber);
    setSignatureCustomerName(order.customerName || undefined);
  };

  const handleSignatureSubmit = async (data: { signatureData: string; signedBy: string }) => {
    if (!signatureOrderId) return;

    try {
      // Capture signature
      await captureSignature.mutateAsync({
        orderId: signatureOrderId,
        data: {
          signatureData: data.signatureData,
          signedBy: data.signedBy,
        },
      });

      // Mark as delivered
      await markDelivered.mutateAsync(signatureOrderId);

      setSignatureOrderId(null);
    } catch (error) {
      console.error('Failed to capture signature:', error);
    }
  };

  const openInMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    // Use Google Maps on iOS/Android, or web fallback
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      window.open(`maps://maps.apple.com/?daddr=${encodedAddress}`, '_blank');
    } else if (isAndroid) {
      window.open(`google.navigation:q=${encodedAddress}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
    }
  };

  if (!farmId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">Please select a farm first</p>
      </div>
    );
  }

  // Route list view
  if (!selectedRouteId) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-green-600 text-white px-4 py-6 safe-area-top">
          <h1 className="text-xl font-bold">My Routes</h1>
          <p className="text-green-100 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Routes List */}
        <div className="p-4">
          {routesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : routes && routes.length > 0 ? (
            <div className="space-y-3">
              {routes.map((route) => {
                const deliveredCount = route.orders.filter(
                  (o) => o.fulfillmentStatus === 'DELIVERED' || o.fulfillmentStatus === 'PICKED_UP'
                ).length;
                const totalCount = route.orders.length;

                return (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-left hover:border-green-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <TruckIcon className="h-5 w-5 text-green-600" />
                          <h3 className="font-semibold text-gray-900">{route.name}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {totalCount} stop{totalCount !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Progress */}
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {deliveredCount}/{totalCount}
                          </span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            route.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-700'
                              : route.status === 'IN_PROGRESS'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {route.status === 'COMPLETED'
                            ? 'Done'
                            : route.status === 'IN_PROGRESS'
                            ? 'Active'
                            : 'Planned'}
                        </span>

                        <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No routes assigned for today</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Route detail view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white px-4 py-4 safe-area-top">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedRouteId(null)}
            className="p-2 -ml-2 hover:bg-green-500 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 rotate-180" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{selectedRoute?.name || 'Loading...'}</h1>
            <p className="text-green-100 text-sm">
              {routeProgress.delivered} of {routeProgress.total} delivered
            </p>
          </div>

          {/* Route actions */}
          {selectedRoute && (
            <>
              {selectedRoute.status === 'PLANNED' && (
                <button
                  onClick={() => handleStartRoute(selectedRoute.id)}
                  disabled={startRoute.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-700 rounded-lg font-medium text-sm"
                >
                  <PlayIcon className="h-4 w-4" />
                  Start
                </button>
              )}
              {selectedRoute.status === 'IN_PROGRESS' &&
                routeProgress.delivered === routeProgress.total && (
                  <button
                    onClick={() => handleCompleteRoute(selectedRoute.id)}
                    disabled={completeRoute.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-700 rounded-lg font-medium text-sm"
                  >
                    <StopIcon className="h-4 w-4" />
                    Complete
                  </button>
                )}
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-1.5 bg-green-400/30 rounded-full">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${routeProgress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stops List */}
      <div className="p-4">
        {routeLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : selectedRoute?.orders && selectedRoute.orders.length > 0 ? (
          <div className="space-y-3">
            {selectedRoute.orders
              .sort((a, b) => (a.deliveryStopOrder || 0) - (b.deliveryStopOrder || 0))
              .map((order, index) => {
                const isDelivered =
                  order.fulfillmentStatus === 'DELIVERED' ||
                  order.fulfillmentStatus === 'PICKED_UP';
                const statusStyle = FULFILLMENT_STATUS_STYLES[order.fulfillmentStatus];

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-xl shadow-sm border ${
                      isDelivered ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                    } overflow-hidden`}
                  >
                    {/* Stop header */}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Stop number */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isDelivered
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isDelivered ? (
                            <CheckCircleSolidIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            index + 1
                          )}
                        </div>

                        {/* Order info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {order.customerName || 'Unknown Customer'}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                            >
                              {statusStyle.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            Order #{order.orderNumber}
                          </p>
                        </div>
                      </div>

                      {/* Address */}
                      {order.deliveryAddress && (
                        <div className="mt-3 flex items-start gap-2">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                        </div>
                      )}

                      {/* Phone */}
                      {order.customer?.phone && (
                        <div className="mt-2 flex items-center gap-2">
                          <PhoneIcon className="h-4 w-4 text-gray-400" />
                          <a
                            href={`tel:${order.customer.phone}`}
                            className="text-sm text-green-600 font-medium"
                          >
                            {order.customer.phone}
                          </a>
                        </div>
                      )}

                      {/* Delivery notes */}
                      {order.deliveryNotes && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                          <div className="flex items-start gap-2">
                            <ExclamationCircleIcon className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-yellow-800">{order.deliveryNotes}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {!isDelivered && (
                      <div className="border-t border-gray-100 p-3 flex gap-2">
                        {order.deliveryAddress && (
                          <button
                            onClick={() => openInMaps(order.deliveryAddress!)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium text-sm hover:bg-gray-50"
                          >
                            <MapPinIcon className="h-4 w-4" />
                            Navigate
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenSignature(order)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Deliver
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-12">
            <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No stops in this route</p>
          </div>
        )}
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={!!signatureOrderId}
        onClose={() => setSignatureOrderId(null)}
        onSubmit={handleSignatureSubmit}
        orderNumber={signatureOrderNumber}
        customerName={signatureCustomerName}
        isLoading={captureSignature.isPending || markDelivered.isPending}
      />
    </div>
  );
}
