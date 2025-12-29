// Re-export all types from schemas
export type {
  Farm,
  CreateFarm,
  UpdateFarm,
  Company,
  CreateCompany,
} from '../schemas/farm';

export type {
  FarmRole,
  User,
  FarmUser,
  InviteUser,
  UpdateFarmUserRole,
} from '../schemas/user';

export type {
  ZoneType,
  Zone,
  CreateZone,
  UpdateZone,
  FarmLayout,
  UpdateFarmLayout,
  Machine,
  CreateMachine,
  UpdateMachine,
  ZoneOutput,
  CreateZoneOutput,
} from '../schemas/zone';

export type {
  InventoryTxType,
  Product,
  CreateProduct,
  UpdateProduct,
  ProductCategory,
  CreateProductCategory,
  InventoryItem,
  CreateInventoryItem,
  UpdateInventoryItem,
  InventoryTransaction,
  CreateInventoryTransaction,
} from '../schemas/inventory';

export type {
  EmployeeStatus,
  Employee,
  CreateEmployee,
  UpdateEmployee,
  Shift,
  CreateShift,
  UpdateShift,
  TimeEntry,
  ClockIn,
  ClockOut,
  UpdateTimeEntry,
} from '../schemas/employee';

export type {
  AccountType,
  TransactionType,
  BudgetStatus,
  FinancialAccount,
  CreateFinancialAccount,
  UpdateFinancialAccount,
  FinancialTransaction,
  CreateFinancialTransaction,
  UpdateFinancialTransaction,
  Budget,
  CreateBudget,
  UpdateBudget,
  BudgetItem,
  CreateBudgetItem,
  UpdateBudgetItem,
} from '../schemas/financial';

export type {
  WikiSpace,
  CreateWikiSpace,
  UpdateWikiSpace,
  WikiPage,
  CreateWikiPage,
  UpdateWikiPage,
  WikiRevision,
  WikiTag,
  CreateWikiTag,
} from '../schemas/wiki';

export type {
  SeasonStatus,
  TaskStatus,
  TaskPriority,
  TaskType,
  Season,
  CreateSeason,
  UpdateSeason,
  CropPlan,
  CreateCropPlan,
  UpdateCropPlan,
  Task,
  CreateTask,
  UpdateTask,
  TaskAssignment,
  CreateTaskAssignment,
} from '../schemas/planning';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
