import { useEffect, useRef, useState } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import { useTutorialStore, TutorialStep, VARIETY_SUGGESTIONS, SKU_SUGGESTIONS } from '@/stores/tutorial-store';
import { TutorialCelebration } from './TutorialCelebration';

// Minimum time between auto-completing steps (ms) - prevents rapid cascading completions
const STEP_COMPLETION_THROTTLE_MS = 500;
import {
  useFarm,
  useProducts,
  useSkus,
  useCustomers,
  useEmployees,
  useOrders,
  useTasks,
  useSupplies,
  useAllSupplyPurchases,
} from '@/lib/api-client';
import { TutorialChecklist } from './TutorialChecklist';
import { TutorialGuidedTour, TourStep } from './TutorialGuidedTour';

// Tour definitions for each section
const TOUR_CONFIGS: Record<TutorialStep, TourStep[]> = {
  farmSetup: [], // No tour - handled by farm creation
  farmSettings: [
    {
      title: 'Configure Your Farm',
      description:
        'Let\'s set up your farm details. This information is used for scheduling, pricing, and appears on invoices.',
      position: 'center',
    },
    {
      title: 'Farm Name',
      description:
        'Give your farm a name. This will appear on invoices and documents sent to customers.',
      targetSelector: '[data-tutorial="farm-name"]',
      position: 'right',
    },
    {
      title: 'Business Address',
      description:
        'Enter your address. Start typing and select from the dropdown to auto-fill city, state, and postal code.',
      targetSelector: '[data-tutorial="farm-location"]',
      position: 'right',
    },
    {
      title: 'Contact Information',
      description:
        'Add your email, phone, and website. This information will appear on invoices and documents.',
      targetSelector: '[data-tutorial="contact-info"]',
      position: 'right',
    },
    {
      title: 'Timezone & Currency',
      description:
        'Set your timezone for scheduling and your preferred currency for pricing.',
      targetSelector: '[data-tutorial="timezone-currency"]',
      position: 'right',
    },
    {
      title: 'Team Members',
      description:
        'Invite team members to help manage your farm. Each person gets their own login and role-based permissions.',
      targetSelector: '[data-tutorial="team-members"]',
      position: 'right',
    },
    {
      title: 'Payment Settings',
      description:
        'Connect Stripe to accept credit card payments from customers. Additional payment options coming soon.',
      targetSelector: '[data-tutorial="payment-settings"]',
      position: 'right',
    },
    {
      title: 'Save Your Changes',
      description:
        'Click "Save Changes" at the bottom when you\'re done. Your farm is now configured!',
      position: 'center',
    },
  ],
  // SUPPLIES
  suppliesAdded: [
    {
      title: 'Supplies & Inventory',
      description:
        'Before creating products, let\'s add your supplies. You\'ll need seeds and growing media.',
      position: 'center',
    },
    {
      title: 'Add Supply Items',
      description:
        'Click to add supply items. Add at least one seed type (e.g., Broccoli Seeds) and one media type (e.g., Coco Coir).',
      targetSelector: '[data-tutorial="add-supply"]',
      position: 'bottom',
    },
    {
      title: 'Supply Categories',
      description:
        'Organize supplies by category: Seeds, Media, Packaging, etc. This helps track inventory and costs.',
      position: 'center',
    },
  ],
  suppliesReceived: [
    {
      title: 'Receive Supplies',
      description:
        'When supplies arrive, log them in the system. This tracks your inventory levels.',
      position: 'center',
    },
    {
      title: 'Log Receipt',
      description:
        'Click to receive supplies. Enter quantity, cost, and supplier details.',
      targetSelector: '[data-tutorial="receive-supply"]',
      position: 'bottom',
    },
  ],
  // PRODUCTS
  firstVarietyCreated: [
    {
      title: 'Create Your First Variety',
      description:
        `Let's create your first microgreen variety. You'll set growth parameters like seed density, germination time, and expected yield.`,
      position: 'center',
    },
    {
      title: 'Add New Variety',
      description:
        'Click to create a new variety.',
      targetSelector: '[data-tutorial="add-product"]',
      position: 'bottom',
    },
    {
      title: 'Example Values',
      description:
        `Here's an example using Broccoli: Seed: ${VARIETY_SUGGESTIONS.broccoli.seedDensity}g/tray, Germination: ${VARIETY_SUGGESTIONS.broccoli.germinationDays} days, Light: ${VARIETY_SUGGESTIONS.broccoli.daysUnderLight} days, Yield: ${VARIETY_SUGGESTIONS.broccoli.averageYield}oz. Use your own variety's parameters.`,
      position: 'center',
    },
  ],
  secondVarietyCreated: [
    {
      title: 'Create a Second Variety',
      description:
        `You'll need at least 2 varieties to create a mix later. Add another variety now.`,
      position: 'center',
    },
    {
      title: 'Add Another Variety',
      description:
        'Click to add your second variety.',
      targetSelector: '[data-tutorial="add-product"]',
      position: 'bottom',
    },
    {
      title: 'Example Values',
      description:
        `Here's an example using Arugula: Seed: ${VARIETY_SUGGESTIONS.arugula.seedDensity}g/tray, Germination: ${VARIETY_SUGGESTIONS.arugula.germinationDays} days, Light: ${VARIETY_SUGGESTIONS.arugula.daysUnderLight} days, Yield: ${VARIETY_SUGGESTIONS.arugula.averageYield}oz. Use your own variety's parameters.`,
      position: 'center',
    },
  ],
  firstSkuCreated: [
    {
      title: 'Add Your First SKU',
      description:
        'SKUs are the sellable products with specific sizes and prices. Add a SKU for your first variety.',
      position: 'center',
    },
    {
      title: 'Create SKU',
      description:
        'Click to add a SKU for your variety.',
      targetSelector: '[data-tutorial="add-sku"]',
      position: 'bottom',
    },
    {
      title: 'Example Pricing',
      description:
        `Common retail example: ${SKU_SUGGESTIONS.variety.size}${SKU_SUGGESTIONS.variety.unit} at $${SKU_SUGGESTIONS.variety.price}. Set your own size and price.`,
      position: 'center',
    },
  ],
  secondSkuCreated: [
    {
      title: 'Add SKU for Second Variety',
      description:
        'Now add a SKU for your second variety.',
      position: 'center',
    },
    {
      title: 'Create SKU',
      description:
        'Click to add a SKU for your second variety.',
      targetSelector: '[data-tutorial="add-sku"]',
      position: 'bottom',
    },
    {
      title: 'Consistent Pricing',
      description:
        `Consistent sizing (e.g., ${SKU_SUGGESTIONS.variety.size}${SKU_SUGGESTIONS.variety.unit}) across varieties simplifies your product line.`,
      position: 'center',
    },
  ],
  mixCreated: [
    {
      title: 'Create a Mix',
      description:
        'Mixes combine multiple varieties into one product. Create a mix using your varieties!',
      position: 'center',
    },
    {
      title: 'Add Mix',
      description:
        'Click to create a new mix product.',
      targetSelector: '[data-tutorial="add-blend"]',
      position: 'bottom',
    },
    {
      title: 'Mix Components',
      description:
        'Select your varieties and set the percentage for each (e.g., 50/50). The system calculates seed quantities automatically.',
      position: 'center',
    },
  ],
  mixSkuCreated: [
    {
      title: 'Add SKU for Mix',
      description:
        'Add a SKU for your mix so customers can order it. Click the button to create one.',
      targetSelector: '[data-tutorial="add-sku"]',
      position: 'bottom',
    },
    {
      title: 'Premium Pricing',
      description:
        `Mixes often command a premium: ${SKU_SUGGESTIONS.mix.size}${SKU_SUGGESTIONS.mix.unit} at $${SKU_SUGGESTIONS.mix.price}. The extra value comes from convenience and variety.`,
      position: 'center',
    },
  ],
  // BUSINESS
  customerAdded: [
    {
      title: 'Customer Management',
      description:
        'Keep track of all your customers here. Add contact info, delivery preferences, and more.',
      position: 'center',
    },
    {
      title: 'Add Customer',
      description:
        'Click to add a new customer. Enter their name, contact info, and delivery details.',
      targetSelector: '[data-tutorial="add-customer"]',
      position: 'bottom',
    },
    {
      title: 'Customer Type',
      description:
        'Set whether this is a retail, wholesale, restaurant, or other type of customer. This can affect pricing.',
      position: 'center',
    },
  ],
  storeConfigured: [
    {
      title: 'Store Configuration',
      description:
        'Make your products available for sale. Toggle visibility and set availability per SKU.',
      position: 'center',
    },
    {
      title: 'Product Availability',
      description:
        'Enable SKUs to make them available in your store. Disabled SKUs won\'t appear on order forms.',
      targetSelector: '[data-tutorial="sku-toggle"]',
      position: 'right',
    },
  ],
  teamMemberAdded: [
    {
      title: 'Team Management',
      description:
        'Invite team members to help manage your farm. Each person gets their own login. (This step is optional)',
      position: 'center',
    },
    {
      title: 'Add Team Member',
      description:
        'Click to add a new employee. Enter their info and assign a role.',
      targetSelector: '[data-tutorial="add-employee"]',
      position: 'bottom',
    },
    {
      title: 'Send Invite',
      description:
        'After creating an employee, send them an invite email. They\'ll set their own password.',
      position: 'center',
    },
  ],
  // PRODUCTION
  orderCreated: [
    {
      title: 'Order Management',
      description:
        'Create and manage production orders here. Orders automatically generate tasks.',
      position: 'center',
    },
    {
      title: 'Create Order',
      description:
        'Click to create a new order. Select a customer, add line items, and set delivery date.',
      targetSelector: '[data-tutorial="create-order"]',
      position: 'bottom',
    },
    {
      title: 'Order Items',
      description:
        'Add products to the order. The system calculates how many trays you need based on SKU sizes.',
      position: 'center',
    },
    {
      title: 'Confirm Order',
      description:
        'Save the order to generate production tasks. Tasks are scheduled based on variety growth times.',
      position: 'center',
    },
  ],
  seedingLogged: [
    {
      title: 'Operations - Seeding',
      description:
        'Track your daily production tasks here. Start with seeding when you plant new trays.',
      position: 'center',
    },
    {
      title: 'Complete Task',
      description:
        'Click on a seeding task to mark it complete. You can log the actual trays seeded.',
      targetSelector: '[data-tutorial="task-card"]',
      position: 'right',
    },
  ],
  transplantLogged: [
    {
      title: 'Operations - Transplant',
      description:
        'After germination, move trays to light. Track this as a transplant task.',
      position: 'center',
    },
    {
      title: 'Log Transplant',
      description:
        'Mark transplant tasks complete when you move trays from blackout to light.',
      targetSelector: '[data-tutorial="task-card"]',
      position: 'right',
    },
  ],
  harvestLogged: [
    {
      title: 'Operations - Harvest',
      description:
        'The final step! Log your harvest to track actual yields.',
      position: 'center',
    },
    {
      title: 'Complete Harvest',
      description:
        'Mark harvest tasks complete and enter the actual yield. This helps track your accuracy over time.',
      targetSelector: '[data-tutorial="task-card"]',
      position: 'right',
    },
    {
      title: 'Track Yield',
      description:
        'Compare actual vs expected yield to improve your estimates and identify issues.',
      position: 'center',
    },
  ],
};

// Human-readable step titles for celebration display
const STEP_TITLES: Record<TutorialStep, string> = {
  farmSetup: 'Farm Created',
  farmSettings: 'Farm Settings Configured',
  suppliesAdded: 'Supplies Added',
  suppliesReceived: 'Supplies Received',
  firstVarietyCreated: 'First Variety Created',
  secondVarietyCreated: 'Second Variety Created',
  firstSkuCreated: 'First SKU Created',
  secondSkuCreated: 'Second SKU Created',
  mixCreated: 'Mix Created',
  mixSkuCreated: 'Mix SKU Created',
  customerAdded: 'Customer Added',
  storeConfigured: 'Store Configured',
  teamMemberAdded: 'Team Member Added',
  orderCreated: 'Order Created',
  seedingLogged: 'Seeding Logged',
  transplantLogged: 'Transplant Logged',
  harvestLogged: 'Harvest Logged',
};

interface TutorialProviderProps {
  children: React.ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const { currentFarmId } = useFarmStore();
  const {
    isActive,
    activeTour,
    completedSteps,
    markStepComplete,
    setCreatedEntity,
    createdEntities,
    endTour,
    setFarmId,
  } = useTutorialStore();

  // State for celebration animation
  const [celebrationStep, setCelebrationStep] = useState<TutorialStep | null>(null);

  // Track farm changes and reset tutorial progress when farm switches
  useEffect(() => {
    if (currentFarmId) {
      setFarmId(currentFarmId);
    }
  }, [currentFarmId, setFarmId]);

  // Fetch data for step detection
  const { data: farm } = useFarm(currentFarmId ?? undefined);
  const { data: supplies } = useSupplies(currentFarmId ?? null);
  const { data: purchases } = useAllSupplyPurchases(currentFarmId ?? null);
  const { data: products } = useProducts(currentFarmId ?? undefined);
  const { data: skus } = useSkus(currentFarmId ?? undefined);
  const { data: customers } = useCustomers(currentFarmId ?? undefined);
  const { data: employees } = useEmployees(currentFarmId ?? undefined);
  const { data: orders } = useOrders(currentFarmId ?? undefined);
  const { data: tasks } = useTasks(currentFarmId ?? undefined);

  // Ref to track last step completion time - prevents rapid cascading completions
  const lastStepCompletionTime = useRef<number>(0);

  // Auto-detect step completion
  useEffect(() => {
    if (!isActive || !currentFarmId) return;

    // Throttle: Skip if we completed a step too recently
    const now = Date.now();
    if (now - lastStepCompletionTime.current < STEP_COMPLETION_THROTTLE_MS) {
      return;
    }

    // Step order for enforcing sequential completion
    const stepOrder: (keyof typeof completedSteps)[] = [
      'farmSetup', 'farmSettings', 'firstVarietyCreated', 'secondVarietyCreated',
      'suppliesAdded', 'suppliesReceived', 'firstSkuCreated', 'secondSkuCreated',
      'mixCreated', 'mixSkuCreated', 'customerAdded', 'storeConfigured',
      'teamMemberAdded', 'orderCreated', 'seedingLogged', 'transplantLogged', 'harvestLogged'
    ];

    // Track if we've already completed a step this render - only complete one at a time
    // This ensures users see each step before it auto-advances
    let stepCompletedThisRender = false;

    // Helper: Check if all steps before this one are complete
    const canAutoComplete = (step: keyof typeof completedSteps): boolean => {
      if (stepCompletedThisRender) return false; // Only one step per render
      const stepIndex = stepOrder.indexOf(step);
      for (let i = 0; i < stepIndex; i++) {
        if (!completedSteps[stepOrder[i]]) {
          return false;
        }
      }
      return true;
    };

    // Helper: Mark step complete, set flag, update throttle timestamp, and trigger celebration
    const completeStep = (step: keyof typeof completedSteps) => {
      markStepComplete(step);
      stepCompletedThisRender = true;
      lastStepCompletionTime.current = Date.now();
      // Trigger celebration animation
      setCelebrationStep(step);
    };

    // Farm setup - complete if farm exists
    if (currentFarmId && !completedSteps.farmSetup && canAutoComplete('farmSetup')) {
      completeStep('farmSetup');
    }

    // Farm settings - complete if timezone/currency/address set
    if (farm && !completedSteps.farmSettings && canAutoComplete('farmSettings')) {
      const hasTimezone = !!farm.timezone;
      const hasCurrency = !!farm.currency;
      const hasAddress = !!farm.addressLine1;
      if (hasTimezone && hasCurrency && hasAddress) {
        completeStep('farmSettings');
      }
    }

    // Supplies added - at least 2 supplies exist (ideally 1 seed + 1 media)
    if (supplies && supplies.length >= 2 && !completedSteps.suppliesAdded && canAutoComplete('suppliesAdded')) {
      completeStep('suppliesAdded');
    }

    // Supplies received - at least 1 purchase exists
    if (purchases && purchases.length >= 1 && !completedSteps.suppliesReceived && canAutoComplete('suppliesReceived')) {
      completeStep('suppliesReceived');
    }

    // First variety created - at least one non-mix product exists
    if (products && products.length > 0 && !completedSteps.firstVarietyCreated && canAutoComplete('firstVarietyCreated')) {
      const varieties = products
        .filter((p: { isBlend?: boolean }) => !p.isBlend)
        .sort((a: { createdAt: Date | string }, b: { createdAt: Date | string }) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      if (varieties.length >= 1) {
        completeStep('firstVarietyCreated');
        // Track the first variety ID (oldest by creation date)
        if (!createdEntities.firstVarietyId) {
          setCreatedEntity('firstVarietyId', varieties[0].id);
        }
      }
    }

    // Second variety created - at least two non-mix products exist
    if (products && !completedSteps.secondVarietyCreated && canAutoComplete('secondVarietyCreated')) {
      const varieties = products
        .filter((p: { isBlend?: boolean }) => !p.isBlend)
        .sort((a: { createdAt: Date | string }, b: { createdAt: Date | string }) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      if (varieties.length >= 2) {
        completeStep('secondVarietyCreated');
        // Track the second variety ID (second oldest by creation date)
        if (!createdEntities.secondVarietyId) {
          setCreatedEntity('secondVarietyId', varieties[1].id);
        }
      }
    }

    // First SKU created - first variety has at least one SKU with price
    if (skus && createdEntities.firstVarietyId && !completedSteps.firstSkuCreated && canAutoComplete('firstSkuCreated')) {
      const firstVarietySkus = skus.filter(
        (s: { productId?: string; price?: number }) =>
          s.productId === createdEntities.firstVarietyId && (s.price ?? 0) > 0
      );
      if (firstVarietySkus.length >= 1) {
        completeStep('firstSkuCreated');
        if (!createdEntities.firstSkuId) {
          setCreatedEntity('firstSkuId', firstVarietySkus[0].id);
        }
      }
    }

    // Second SKU created - second variety has at least one SKU with price
    if (skus && createdEntities.secondVarietyId && !completedSteps.secondSkuCreated && canAutoComplete('secondSkuCreated')) {
      const secondVarietySkus = skus.filter(
        (s: { productId?: string; price?: number }) =>
          s.productId === createdEntities.secondVarietyId && (s.price ?? 0) > 0
      );
      if (secondVarietySkus.length >= 1) {
        completeStep('secondSkuCreated');
        if (!createdEntities.secondSkuId) {
          setCreatedEntity('secondSkuId', secondVarietySkus[0].id);
        }
      }
    }

    // Mix created - at least one mix product exists
    if (products && !completedSteps.mixCreated && canAutoComplete('mixCreated')) {
      const mixes = products
        .filter((p: { isBlend?: boolean }) => p.isBlend)
        .sort((a: { createdAt: Date | string }, b: { createdAt: Date | string }) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      if (mixes.length >= 1) {
        completeStep('mixCreated');
        if (!createdEntities.mixId) {
          setCreatedEntity('mixId', mixes[0].id);
        }
      }
    }

    // Mix SKU created - mix has at least one SKU with price
    if (skus && createdEntities.mixId && !completedSteps.mixSkuCreated && canAutoComplete('mixSkuCreated')) {
      const mixSkus = skus.filter(
        (s: { productId?: string; price?: number }) =>
          s.productId === createdEntities.mixId && (s.price ?? 0) > 0
      );
      if (mixSkus.length >= 1) {
        completeStep('mixSkuCreated');
        if (!createdEntities.mixSkuId) {
          setCreatedEntity('mixSkuId', mixSkus[0].id);
        }
      }
    }

    // Customer added - at least one customer exists
    if (customers && customers.length > 0 && !completedSteps.customerAdded && canAutoComplete('customerAdded')) {
      completeStep('customerAdded');
      if (!createdEntities.customerId) {
        setCreatedEntity('customerId', customers[0].id);
      }
    }

    // Store configured - at least one SKU is available
    if (skus && !completedSteps.storeConfigured && canAutoComplete('storeConfigured')) {
      const hasAvailableSku = skus.some((s: { isAvailable?: boolean }) => s.isAvailable);
      if (hasAvailableSku) {
        completeStep('storeConfigured');
      }
    }

    // Team member added - at least one non-owner employee exists
    if (employees && !completedSteps.teamMemberAdded && canAutoComplete('teamMemberAdded')) {
      const hasNonOwnerEmployee = employees.some(
        (e: { position?: string | null }) => e.position && e.position !== 'OWNER'
      );
      if (hasNonOwnerEmployee) {
        completeStep('teamMemberAdded');
      }
    }

    // Order created - at least one order exists
    if (orders && orders.length > 0 && !completedSteps.orderCreated && canAutoComplete('orderCreated')) {
      completeStep('orderCreated');
      if (!createdEntities.orderId) {
        setCreatedEntity('orderId', orders[0].id);
      }
    }

    // Seeding logged - at least one SEED task completed
    if (tasks && !completedSteps.seedingLogged && canAutoComplete('seedingLogged')) {
      const hasCompletedSeeding = tasks.some(
        (t: { type?: string; status?: string }) => t.type === 'SEED' && t.status === 'COMPLETED'
      );
      if (hasCompletedSeeding) {
        completeStep('seedingLogged');
      }
    }

    // Transplant logged - at least one MOVE_TO_LIGHT task completed
    if (tasks && !completedSteps.transplantLogged && canAutoComplete('transplantLogged')) {
      const hasCompletedTransplant = tasks.some(
        (t: { type?: string; status?: string }) =>
          t.type === 'MOVE_TO_LIGHT' && t.status === 'COMPLETED'
      );
      if (hasCompletedTransplant) {
        completeStep('transplantLogged');
      }
    }

    // Harvest logged - at least one HARVESTING task completed
    if (tasks && !completedSteps.harvestLogged && canAutoComplete('harvestLogged')) {
      const hasCompletedHarvest = tasks.some(
        (t: { type?: string; status?: string }) => t.type === 'HARVESTING' && t.status === 'COMPLETED'
      );
      if (hasCompletedHarvest) {
        completeStep('harvestLogged');
      }
    }
  }, [
    isActive,
    currentFarmId,
    farm,
    supplies,
    purchases,
    products,
    skus,
    customers,
    employees,
    orders,
    tasks,
    completedSteps,
    createdEntities,
    markStepComplete,
    setCreatedEntity,
  ]);

  // Get tour steps for active tour
  const tourSteps = activeTour ? TOUR_CONFIGS[activeTour] : [];

  return (
    <>
      {children}
      <TutorialChecklist />
      {activeTour && tourSteps.length > 0 && (
        <TutorialGuidedTour
          steps={tourSteps}
          onComplete={() => {
            endTour();
          }}
          onSkip={() => {
            endTour();
          }}
        />
      )}
      {celebrationStep && (
        <TutorialCelebration
          stepTitle={STEP_TITLES[celebrationStep]}
          onComplete={() => setCelebrationStep(null)}
        />
      )}
    </>
  );
}
