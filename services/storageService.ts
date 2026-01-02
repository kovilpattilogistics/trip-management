import { User, UserRole, Trip, Customer, TripStatus } from "../types";

const KEYS = {
  USERS: 'fleet_users',
  TRIPS: 'fleet_trips',
  CUSTOMERS: 'fleet_customers',
  SESSION: 'fleet_session'
};

// Specific Credentials provided
const REAL_USERS: User[] = [
  { 
    id: 'admin_01', 
    name: 'Admin User', 
    email: 'sirangvjomon@gmail.com', 
    phone: '9998887777', 
    role: UserRole.ADMIN, 
    password: 'Zolo@city$b301' 
  },
  { 
    id: 'driver_01', 
    name: 'Arun Driver', 
    email: 'arun@fleet.com', 
    phone: '9876543210', 
    role: UserRole.DRIVER, 
    password: 'arun@123' 
  },
];

// Initialize Storage - Force reset users to the requested credentials
export const initStorage = () => {
  // Always overwrite users to ensure the requested credentials work
  localStorage.setItem(KEYS.USERS, JSON.stringify(REAL_USERS));

  // Initialize others only if missing
  if (!localStorage.getItem(KEYS.CUSTOMERS)) {
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify([])); // Empty customers
  }
  if (!localStorage.getItem(KEYS.TRIPS)) {
    localStorage.setItem(KEYS.TRIPS, JSON.stringify([])); // Empty trips
  }
};

// --- DATA ACCESS ---

export const getUsers = (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
export const getCustomers = (): Customer[] => JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
export const getTrips = (): Trip[] => JSON.parse(localStorage.getItem(KEYS.TRIPS) || '[]');

export const saveTrip = (trip: Trip) => {
  const trips = getTrips();
  const existingIndex = trips.findIndex(t => t.id === trip.id);
  if (existingIndex >= 0) {
    trips[existingIndex] = trip;
  } else {
    trips.push(trip);
  }
  localStorage.setItem(KEYS.TRIPS, JSON.stringify(trips));
};

export const saveCustomer = (customer: Customer) => {
  const customers = getCustomers();
  const index = customers.findIndex(c => c.id === customer.id);
  if (index >= 0) {
    customers[index] = customer;
  } else {
    customers.push(customer);
  }
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
};

export const deleteCustomer = (customerId: string) => {
  const customers = getCustomers();
  const filtered = customers.filter(c => c.id !== customerId);
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(filtered));
};

export const loginUser = (identifier: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find(u => (u.email === identifier || u.phone === identifier) && u.password === password);
  if (user) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    return user;
  }
  return null;
};

export const getSession = (): User | null => {
  const s = localStorage.getItem(KEYS.SESSION);
  return s ? JSON.parse(s) : null;
};

export const logoutUser = () => {
  localStorage.removeItem(KEYS.SESSION);
};