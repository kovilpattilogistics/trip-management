export enum UserRole {
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
}

export enum TripStatus {
  SCHEDULED = 'SCHEDULED',
  STARTED = 'STARTED',
  PICKUP_COMPLETED = 'PICKUP_COMPLETED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  PENDING_APPROVAL = 'PENDING_APPROVAL', // For driver requested trips
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  password?: string; // In a real app, never store plain text
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone?: string;
}

export interface TripTimelineEvent {
  status: TripStatus;
  timestamp: string;
  location?: string;
}

export interface Trip {
  id: string;
  customerId?: string; // Optional if ad-hoc
  customerName: string; // Denormalized for display or ad-hoc
  driverId: string;
  
  pickupLocation: string;
  pickupLat?: number;
  pickupLng?: number;

  dropLocation: string;
  dropLat?: number;
  dropLng?: number;
  
  estimatedDistance?: string; // e.g. "15.4 km"

  scheduledTime: string;
  status: TripStatus;
  notes?: string;
  timeline: TripTimelineEvent[];
  
  // Payment Details
  paymentMethod?: 'UPI' | 'CASH';
  paymentAmount?: number;
  paymentProofUrl?: string; // Data URL for image
  
  // Meta
  isDriverRequested: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: number;
}