export interface Customer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  birthday: string; // YYYY-MM-DD
  anniversary?: string; // YYYY-MM-DD
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number; // percentage
  gst: number; // percentage
}

export enum PaymentStatus {
  Paid = 'Paid',
  Pending = 'Pending',
  Overdue = 'Overdue',
}

export enum OrderType {
  Online = 'Online',
  InStore = 'In-Store',
  Takeaway = 'Takeaway',
  Delivery = 'Delivery',
}

export interface Invoice {
  id?: string;
  customerId: string;
  customerName: string;
  date: string; // YYYY-MM-DD
  items: InvoiceItem[];
  subtotal: number;
  discount: number; // overall effective discount percentage
  gst: number; // overall effective gst percentage
  total: number;
  paymentStatus: PaymentStatus;
  orderType: OrderType;
  notes?: string;
  amountPaid: number;
}

export enum StockCategory {
  Ingredient = 'Ingredient',
  FinishedProduct = 'Finished Product',
  Packaging = 'Packaging',
}

export enum StockStatus {
    InStock = 'In Stock',
    LowStock = 'Low Stock',
    OutOfStock = 'Out of Stock',
}

export interface StockItem {
  id?: string;
  name: string;
  category: StockCategory;
  quantity: number;
  unit: string; // e.g., kg, pcs, l
  costPerUnit: number;
  lowStockThreshold: number;
  sellingPrice?: number;
}

export interface RecipeIngredient {
  stockItemId: string;
  quantity: number;
}

export interface Recipe {
  id?: string;
  name: string;
  ingredients: RecipeIngredient[];
  sellingPrice: number;
}