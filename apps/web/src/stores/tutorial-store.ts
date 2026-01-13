import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TutorialStep =
  // Setup
  | 'farmSetup'
  | 'farmSettings'
  // Supplies
  | 'suppliesAdded'
  | 'suppliesReceived'
  // Products
  | 'firstVarietyCreated'
  | 'secondVarietyCreated'
  | 'firstSkuCreated'
  | 'secondSkuCreated'
  | 'mixCreated'
  | 'mixSkuCreated'
  // Business
  | 'customerAdded'
  | 'storeConfigured'
  | 'teamMemberAdded'
  // Production
  | 'orderCreated'
  | 'seedingLogged'
  | 'transplantLogged'
  | 'harvestLogged';

export type StepCategory = 'setup' | 'varieties' | 'supplies' | 'pricing' | 'business' | 'production';

export interface TutorialStepInfo {
  id: TutorialStep;
  title: string;
  description: string;
  category: StepCategory;
  route: string;
  hasTour: boolean;
  optional?: boolean;
  suggestion?: VarietySuggestion | SkuSuggestion;
}

// Suggested values for varieties
export interface VarietySuggestion {
  type: 'variety';
  name: string;
  seedDensity: number;
  seedDensityUnit: string;
  germinationDays: number;
  daysUnderLight: number;
  averageYield: number;
  yieldUnit: string;
}

// Suggested values for SKUs
export interface SkuSuggestion {
  type: 'sku';
  size: number;
  unit: string;
  price: number;
}

// Pre-defined suggestions
export const VARIETY_SUGGESTIONS = {
  broccoli: {
    type: 'variety' as const,
    name: 'Broccoli',
    seedDensity: 8,
    seedDensityUnit: 'g',
    germinationDays: 3,
    daysUnderLight: 10,
    averageYield: 9,
    yieldUnit: 'oz',
  },
  arugula: {
    type: 'variety' as const,
    name: 'Arugula',
    seedDensity: 10,
    seedDensityUnit: 'g',
    germinationDays: 3,
    daysUnderLight: 10,
    averageYield: 11,
    yieldUnit: 'oz',
  },
};

export const SKU_SUGGESTIONS = {
  variety: {
    type: 'sku' as const,
    size: 4,
    unit: 'oz',
    price: 12,
  },
  mix: {
    type: 'sku' as const,
    size: 4,
    unit: 'oz',
    price: 14,
  },
};

export const TUTORIAL_STEPS: TutorialStepInfo[] = [
  // SETUP
  {
    id: 'farmSetup',
    title: 'Create your farm',
    description: 'Set up your first farm to get started',
    category: 'setup',
    route: '/',
    hasTour: false,
  },
  {
    id: 'farmSettings',
    title: 'Configure farm settings',
    description: 'Set timezone, currency, and address',
    category: 'setup',
    route: '/settings',
    hasTour: true,
  },
  // VARIETIES - Create varieties first so seeds can be linked
  {
    id: 'firstVarietyCreated',
    title: 'Create your first variety',
    description: 'Add a microgreen variety with growth parameters (e.g., Broccoli)',
    category: 'varieties',
    route: '/inventory',
    hasTour: true,
    suggestion: VARIETY_SUGGESTIONS.broccoli,
  },
  {
    id: 'secondVarietyCreated',
    title: 'Create a second variety',
    description: 'Add another variety so you can create a mix later (e.g., Arugula)',
    category: 'varieties',
    route: '/inventory',
    hasTour: true,
    suggestion: VARIETY_SUGGESTIONS.arugula,
  },
  // SUPPLIES - Now we can link seeds to varieties
  {
    id: 'suppliesAdded',
    title: 'Add supplies to inventory',
    description: 'Add seeds (linked to varieties) and growing media',
    category: 'supplies',
    route: '/supplies?tab=inventory',
    hasTour: true,
  },
  {
    id: 'suppliesReceived',
    title: 'Receive supplies',
    description: 'Log receipt of supplies into the system',
    category: 'supplies',
    route: '/supplies?tab=purchases',
    hasTour: true,
  },
  // PRICING - Add SKUs and create mixes
  {
    id: 'firstSkuCreated',
    title: 'Add SKU for Broccoli',
    description: 'Create a 4oz SKU with $12 pricing',
    category: 'pricing',
    route: '/inventory',
    hasTour: true,
    suggestion: SKU_SUGGESTIONS.variety,
  },
  {
    id: 'secondSkuCreated',
    title: 'Add SKU for Arugula',
    description: 'Create a 4oz SKU with $12 pricing',
    category: 'pricing',
    route: '/inventory',
    hasTour: true,
    suggestion: SKU_SUGGESTIONS.variety,
  },
  {
    id: 'mixCreated',
    title: 'Create a mix',
    description: 'Combine Broccoli & Arugula into a mix',
    category: 'pricing',
    route: '/inventory?tab=mixes',
    hasTour: true,
  },
  {
    id: 'mixSkuCreated',
    title: 'Add SKU for mix',
    description: 'Create a 4oz SKU with $14 pricing',
    category: 'pricing',
    route: '/inventory?tab=mixes',
    hasTour: true,
    suggestion: SKU_SUGGESTIONS.mix,
  },
  // BUSINESS
  {
    id: 'customerAdded',
    title: 'Add a customer',
    description: 'Create your first customer',
    category: 'business',
    route: '/customers',
    hasTour: true,
  },
  {
    id: 'storeConfigured',
    title: 'Configure your store',
    description: 'Make products available for sale',
    category: 'business',
    route: '/store',
    hasTour: true,
  },
  {
    id: 'teamMemberAdded',
    title: 'Add team members',
    description: 'Invite an employee to your farm',
    category: 'business',
    route: '/team',
    hasTour: true,
    optional: true,
  },
  // PRODUCTION
  {
    id: 'orderCreated',
    title: 'Create your first order',
    description: 'Place a production order',
    category: 'production',
    route: '/planning',
    hasTour: true,
  },
  {
    id: 'seedingLogged',
    title: 'Log seeding task',
    description: 'Complete your first seeding task',
    category: 'production',
    route: '/operations?tab=seeding',
    hasTour: true,
  },
  {
    id: 'transplantLogged',
    title: 'Log transplant task',
    description: 'Move trays to light',
    category: 'production',
    route: '/operations?tab=transplant',
    hasTour: true,
  },
  {
    id: 'harvestLogged',
    title: 'Log harvest task',
    description: 'Complete harvest and log yield',
    category: 'production',
    route: '/operations?tab=harvest',
    hasTour: true,
  },
];

// Category display names
export const CATEGORY_LABELS: Record<StepCategory, string> = {
  setup: 'SETUP',
  varieties: 'VARIETIES',
  supplies: 'SUPPLIES',
  pricing: 'PRICING & MIXES',
  business: 'BUSINESS',
  production: 'PRODUCTION',
};

interface CompletedSteps {
  farmSetup: boolean;
  farmSettings: boolean;
  suppliesAdded: boolean;
  suppliesReceived: boolean;
  firstVarietyCreated: boolean;
  secondVarietyCreated: boolean;
  firstSkuCreated: boolean;
  secondSkuCreated: boolean;
  mixCreated: boolean;
  mixSkuCreated: boolean;
  customerAdded: boolean;
  storeConfigured: boolean;
  teamMemberAdded: boolean;
  orderCreated: boolean;
  seedingLogged: boolean;
  transplantLogged: boolean;
  harvestLogged: boolean;
}

interface CreatedEntities {
  firstVarietyId?: string;
  secondVarietyId?: string;
  firstSkuId?: string;
  secondSkuId?: string;
  mixId?: string;
  mixSkuId?: string;
  customerId?: string;
  orderId?: string;
}

export type StepVisibility = 'completed' | 'current' | 'next' | 'locked';

interface TutorialState {
  // Overall state
  isActive: boolean;
  isMinimized: boolean;
  showChecklist: boolean;
  activeTour: TutorialStep | null;
  currentFarmId: string | null;

  // Step completion tracking
  completedSteps: CompletedSteps;

  // IDs of created entities for tracking
  createdEntities: CreatedEntities;

  // Actions
  startTutorial: () => void;
  setFarmId: (farmId: string | null) => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  markStepComplete: (step: TutorialStep) => void;
  setCreatedEntity: (key: keyof CreatedEntities, id: string) => void;
  toggleMinimize: () => void;
  toggleChecklist: () => void;
  startTour: (step: TutorialStep) => void;
  endTour: () => void;
  resetTutorial: () => void;
  skipStep: (step: TutorialStep) => void;

  // Computed helpers
  getProgress: () => { completed: number; total: number; percentage: number };
  getCurrentStepIndex: () => number;
  getCurrentStep: () => TutorialStepInfo | null;
  getStepVisibility: (stepIndex: number) => StepVisibility;
  isStepUnlocked: (step: TutorialStep) => boolean;
  isAllComplete: () => boolean;
}

const initialCompletedSteps: CompletedSteps = {
  farmSetup: false,
  farmSettings: false,
  suppliesAdded: false,
  suppliesReceived: false,
  firstVarietyCreated: false,
  secondVarietyCreated: false,
  firstSkuCreated: false,
  secondSkuCreated: false,
  mixCreated: false,
  mixSkuCreated: false,
  customerAdded: false,
  storeConfigured: false,
  teamMemberAdded: false,
  orderCreated: false,
  seedingLogged: false,
  transplantLogged: false,
  harvestLogged: false,
};

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      isActive: false,
      isMinimized: false,
      showChecklist: false,
      activeTour: null,
      currentFarmId: null,
      completedSteps: { ...initialCompletedSteps },
      createdEntities: {},

      startTutorial: () =>
        set({
          isActive: true,
          isMinimized: false,
          showChecklist: true,
        }),

      setFarmId: (farmId) => {
        const { currentFarmId } = get();
        // If farm changed, reset progress and start tutorial
        if (farmId && farmId !== currentFarmId) {
          set({
            currentFarmId: farmId,
            completedSteps: { ...initialCompletedSteps },
            createdEntities: {},
            activeTour: null,
            isActive: true,
            showChecklist: true,
          });
        } else if (!farmId) {
          set({
            currentFarmId: null,
          });
        }
      },

      completeTutorial: () =>
        set({
          isActive: false,
          showChecklist: false,
        }),

      skipTutorial: () =>
        set({
          isActive: false,
          isMinimized: false,
          showChecklist: false,
        }),

      markStepComplete: (step) =>
        set((state) => ({
          completedSteps: {
            ...state.completedSteps,
            [step]: true,
          },
        })),

      setCreatedEntity: (key, id) =>
        set((state) => ({
          createdEntities: {
            ...state.createdEntities,
            [key]: id,
          },
        })),

      toggleMinimize: () =>
        set((state) => ({
          isMinimized: !state.isMinimized,
        })),

      toggleChecklist: () =>
        set((state) => ({
          showChecklist: !state.showChecklist,
          isMinimized: false,
        })),

      startTour: (step) =>
        set({
          activeTour: step,
          isMinimized: true,
        }),

      endTour: () =>
        set({
          activeTour: null,
          isMinimized: false,
        }),

      resetTutorial: () =>
        set({
          isActive: true,
          isMinimized: false,
          showChecklist: true,
          activeTour: null,
          completedSteps: { ...initialCompletedSteps },
          createdEntities: {},
        }),

      skipStep: (step) =>
        set((state) => ({
          completedSteps: {
            ...state.completedSteps,
            [step]: true,
          },
        })),

      getProgress: () => {
        const { completedSteps } = get();
        const completed = Object.values(completedSteps).filter(Boolean).length;
        const total = TUTORIAL_STEPS.length;
        return {
          completed,
          total,
          percentage: Math.round((completed / total) * 100),
        };
      },

      getCurrentStepIndex: () => {
        const { completedSteps } = get();
        for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
          if (!completedSteps[TUTORIAL_STEPS[i].id]) {
            return i;
          }
        }
        return TUTORIAL_STEPS.length; // All complete
      },

      getCurrentStep: () => {
        const { completedSteps } = get();
        for (const step of TUTORIAL_STEPS) {
          if (!completedSteps[step.id]) {
            return step;
          }
        }
        return null;
      },

      getStepVisibility: (stepIndex: number): StepVisibility => {
        const currentIndex = get().getCurrentStepIndex();
        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'current';
        if (stepIndex === currentIndex + 1) return 'next';
        return 'locked';
      },

      isStepUnlocked: (step) => {
        const { completedSteps } = get();
        const stepIndex = TUTORIAL_STEPS.findIndex((s) => s.id === step);
        if (stepIndex === 0) return true;

        // All previous steps must be complete
        for (let i = 0; i < stepIndex; i++) {
          if (!completedSteps[TUTORIAL_STEPS[i].id]) {
            return false;
          }
        }
        return true;
      },

      isAllComplete: () => {
        const { completedSteps } = get();
        return Object.values(completedSteps).every(Boolean);
      },
    }),
    {
      name: 'tutorial-storage',
      version: 3, // Bump version for reordered steps (varieties before supplies)
    }
  )
);
