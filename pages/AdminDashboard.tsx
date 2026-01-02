import React, { useState, useEffect, useRef } from 'react';
import { User, Trip, Customer, TripStatus, UserRole } from '../types';
import { getTrips, getCustomers, getUsers, saveTrip, saveCustomer, deleteCustomer } from '../services/storageService';
import { Plus, Check, X, Search, Loader2, Sparkles, Building, Phone, Calendar, MapPin, Trash2, Edit2, UserPlus, Save } from 'lucide-react';
import { generateTripReport } from '../services/geminiService';
import { LocationPicker } from '../components/LocationPicker';

interface AdminDashboardProps {
  user: User;
  onNotify: (msg: string, type: 'info' | 'success' | 'error') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onNotify }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'customers' | 'reports'>('overview');
  
  const prevTripsRef = useRef<Trip[]>([]);
  const isMounted = useRef(true);

  // Create Trip State
  const [newTrip, setNewTrip] = useState({
    customerId: '',
    driverId: '',
    pickup: '',
    pickupLat: 0,
    pickupLng: 0,
    drop: '',
    dropLat: 0,
    dropLng: 0,
    time: '',
    isNewCustomer: false,
    newCustomerName: '',
    newCustomerAddress: '',
    newCustomerPhone: '',
  });

  const [tripDistance, setTripDistance] = useState<string>('');
  const [calculatingDist, setCalculatingDist] = useState(false);

  // Customer Management State
  const [isEditingCust, setIsEditingCust] = useState(false);
  const [editingCustId, setEditingCustId] = useState<string | null>(null);
  const [custForm, setCustForm] = useState({ name: '', address: '', phone: '' });

  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    loadData();
    const interval = setInterval(() => {
      if (isMounted.current) loadData(true);
    }, 5000);
    return () => {
        isMounted.current = false;
        clearInterval(interval);
    };
  }, []);

  // Calculate distance when both points are available
  useEffect(() => {
    const calcDistance = async () => {
        if (newTrip.pickupLat && newTrip.pickupLng && newTrip.dropLat && newTrip.dropLng) {
            setCalculatingDist(true);
            try {
                // Using OSRM Public API (Project OSRM) for driving distance
                const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${newTrip.pickupLng},${newTrip.pickupLat};${newTrip.dropLng},${newTrip.dropLat}?overview=false`);
                const data = await res.json();
                if (isMounted.current) {
                    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                        const meters = data.routes[0].distance;
                        const km = (meters / 1000).toFixed(1);
                        setTripDistance(`${km} km`);
                    } else {
                        setTripDistance('Calc failed');
                    }
                }
            } catch (e) {
                console.error(e);
                if (isMounted.current) setTripDistance('');
            } finally {
                if (isMounted.current) setCalculatingDist(false);
            }
        } else {
            if (isMounted.current) setTripDistance('');
        }
    };
    
    // Debounce distance calculation
    const timer = setTimeout(calcDistance, 1000);
    return () => clearTimeout(timer);
  }, [newTrip.pickupLat, newTrip.pickupLng, newTrip.dropLat, newTrip.dropLng]);

  const loadData = (isPolling = false) => {
    const allTrips = getTrips();
    const sortedTrips = allTrips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (isPolling) {
      const pendingCount = sortedTrips.filter(t => t.status === TripStatus.PENDING_APPROVAL).length;
      const prevPendingCount = prevTripsRef.current.filter(t => t.status === TripStatus.PENDING_APPROVAL).length;
      
      if (pendingCount > prevPendingCount) {
        onNotify('New Trip Request Pending Approval!', 'info');
      }
    }

    setTrips(sortedTrips);
    prevTripsRef.current = sortedTrips;
    setCustomers(getCustomers());
    setDrivers(getUsers().filter(u => u.role === UserRole.DRIVER));
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name || !custForm.address) return onNotify('Name and Address are required', 'error');

    const customer: Customer = {
      id: editingCustId || `c_${Date.now()}`,
      name: custForm.name,
      address: custForm.address,
      phone: custForm.phone || undefined
    };
    
    saveCustomer(customer);
    setCustForm({ name: '', address: '', phone: '' });
    setIsEditingCust(false);
    setEditingCustId(null);
    onNotify(editingCustId ? 'Customer updated' : 'Customer profile created', 'success');
    loadData();
  };

  const handleEditCustomer = (cust: Customer) => {
    setCustForm({ name: cust.name, address: cust.address, phone: cust.phone || '' });
    setEditingCustId(cust.id);
    setIsEditingCust(true);
  };

  const handleDeleteCustomer = (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
        deleteCustomer(id);
        onNotify("Customer deleted", 'info');
        loadData();
    }
  }

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    
    let custId = newTrip.customerId;
    let custName = customers.find(c => c.id === custId)?.name || "Unknown";

    if (newTrip.isNewCustomer) {
      if (!newTrip.newCustomerName) return onNotify('Customer Name required', 'error');
      const newCust: Customer = {
        id: `c_${Date.now()}`,
        name: newTrip.newCustomerName,
        address: newTrip.newCustomerAddress,
        phone: newTrip.newCustomerPhone || undefined
      };
      saveCustomer(newCust);
      custId = newCust.id;
      custName = newCust.name;
    }

    if (!newTrip.driverId) return onNotify('Please select a driver', 'error');

    const trip: Trip = {
      id: `t_${Date.now()}`,
      customerId: custId,
      customerName: custName,
      driverId: newTrip.driverId,
      
      pickupLocation: newTrip.pickup,
      pickupLat: newTrip.pickupLat,
      pickupLng: newTrip.pickupLng,

      dropLocation: newTrip.drop,
      dropLat: newTrip.dropLat,
      dropLng: newTrip.dropLng,

      estimatedDistance: tripDistance,
      
      scheduledTime: newTrip.time || new Date().toISOString(),
      status: TripStatus.SCHEDULED,
      isDriverRequested: false,
      createdAt: new Date().toISOString(),
      timeline: [{ status: TripStatus.SCHEDULED, timestamp: new Date().toISOString() }]
    };

    saveTrip(trip);
    onNotify('Trip published successfully!', 'success');
    setNewTrip({ 
        customerId: '', driverId: '', 
        pickup: '', pickupLat: 0, pickupLng: 0,
        drop: '', dropLat: 0, dropLng: 0,
        time: '', isNewCustomer: false, 
        newCustomerName: '', newCustomerAddress: '', newCustomerPhone: '' 
    });
    setTripDistance('');
    setActiveTab('overview');
    loadData();
  };

  const approveTrip = (trip: Trip) => {
    const updated: Trip = {
      ...trip,
      status: TripStatus.SCHEDULED,
      timeline: [...trip.timeline, { status: TripStatus.SCHEDULED, timestamp: new Date().toISOString() }]
    };
    saveTrip(updated);
    onNotify('Trip approved and scheduled', 'success');
    loadData();
  };

  const handleAiReport = async () => {
    if (!process.env.API_KEY) {
      onNotify("API Key missing.", "error");
      return;
    }
    if (!aiQuery.trim()) return;

    setIsAiLoading(true);
    setAiResult('');
    try {
      const result = await generateTripReport(trips, aiQuery);
      if (isMounted.current) setAiResult(result);
    } catch (e) {
      if (isMounted.current) onNotify("Failed to generate report", 'error');
    } finally {
      if (isMounted.current) setIsAiLoading(false);
    }
  };

  const pendingTrips = trips.filter(t => t.status === TripStatus.PENDING_APPROVAL);
  const activeTrips = trips.filter(t => [TripStatus.SCHEDULED, TripStatus.STARTED, TripStatus.PICKUP_COMPLETED, TripStatus.IN_TRANSIT].includes(t.status));

  return (
    <div className="space-y-6">
      {/* Scrollable Tabs */}
      <div className="sticky top-[3.7rem] z-40 bg-surface/90 backdrop-blur pb-2 pt-1 -mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex space-x-2 w-max">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'create', label: 'New Trip' },
            { id: 'customers', label: 'Customers' },
            { id: 'reports', label: 'AI Insights' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all shadow-sm ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-green-200 ring-2 ring-white' 
                  : 'bg-white text-gray-500 hover:bg-green-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Pending Approvals */}
          {pendingTrips.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                <span className="w-2 h-2 rounded-full bg-orange-500 mr-2"></span>
                Needs Approval
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {pendingTrips.map(trip => (
                  <div key={trip.id} className="bg-white p-5 rounded-2xl shadow-soft border-l-4 border-orange-400 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-orange-50 text-orange-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide">Driver Request</span>
                      <span className="text-xs text-gray-400">{new Date(trip.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-lg text-gray-800">{trip.customerName}</h4>
                    <div className="space-y-1 mt-2 mb-4">
                       <p className="text-sm text-gray-600 flex items-center"><MapPin className="w-3 h-3 mr-1 text-gray-400"/> {trip.pickupLocation}</p>
                       <p className="text-sm text-gray-600 flex items-center"><MapPin className="w-3 h-3 mr-1 text-gray-400"/> {trip.dropLocation}</p>
                       {trip.estimatedDistance && <p className="text-xs text-gray-500 mt-1 font-semibold">Est. Distance: {trip.estimatedDistance}</p>}
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => approveTrip(trip)}
                        className="flex-1 bg-primary text-white py-3 rounded-xl text-sm font-bold hover:bg-primaryDark flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </button>
                      <button className="flex-1 bg-red-50 text-red-500 py-3 rounded-xl text-sm font-bold hover:bg-red-100 flex items-center justify-center active:scale-95 transition-transform">
                        <X className="w-4 h-4 mr-1" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active Trips */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-primary mr-2"></span>
              Live Operations
            </h3>
            {activeTrips.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border-dashed border-2 border-green-100 text-center text-gray-400">
                 <p>All clear. No active trips.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeTrips.map(trip => (
                  <div key={trip.id} className="bg-white rounded-2xl shadow-soft border border-green-50 overflow-hidden group hover:border-green-200 transition-colors">
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide ${
                          trip.status === TripStatus.IN_TRANSIT ? 'bg-purple-100 text-purple-700' : 
                          trip.status === TripStatus.PICKUP_COMPLETED ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {trip.status.replace('_', ' ')}
                        </span>
                        <div className="flex items-center text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                           <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                           {drivers.find(d => d.id === trip.driverId)?.name || trip.driverId}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-4">
                         <div className="flex flex-col items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                            <div className="w-0.5 h-6 bg-gray-200"></div>
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                         </div>
                         <div className="flex-1 space-y-3">
                           <div>
                              <p className="text-xs text-gray-400 uppercase font-bold">From</p>
                              <p className="text-sm font-semibold text-gray-800 line-clamp-1">{trip.pickupLocation}</p>
                           </div>
                           <div>
                              <p className="text-xs text-gray-400 uppercase font-bold">To</p>
                              <p className="text-sm font-semibold text-gray-800 line-clamp-1">{trip.dropLocation}</p>
                           </div>
                         </div>
                      </div>

                      {/* Embedded Map Check */}
                      <div className="h-32 w-full bg-gray-100 rounded-xl overflow-hidden relative border border-gray-100">
                         {/* Display simplified map preview based on status */}
                         <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0, filter: 'grayscale(20%)' }}
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(trip.status === TripStatus.IN_TRANSIT ? trip.dropLocation : trip.pickupLocation)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                            title="Location Preview"
                          ></iframe>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-green-50 animate-fade-in">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-primary" />
            Schedule Delivery
          </h2>
          <form onSubmit={handleCreateTrip} className="space-y-5">
            
            {/* Customer Selection */}
            <div className="bg-surface p-4 rounded-xl border border-green-100">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customer Details</label>
              <div className="flex gap-2 mb-3">
                 <button 
                  type="button" 
                  onClick={() => setNewTrip({...newTrip, isNewCustomer: false})}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${!newTrip.isNewCustomer ? 'bg-white text-primary shadow-sm ring-1 ring-green-200' : 'text-gray-400 hover:bg-white/50'}`}
                >Existing</button>
                 <button 
                  type="button"
                  onClick={() => setNewTrip({...newTrip, isNewCustomer: true})}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${newTrip.isNewCustomer ? 'bg-white text-primary shadow-sm ring-1 ring-green-200' : 'text-gray-400 hover:bg-white/50'}`}
                >New Profile</button>
              </div>

              {!newTrip.isNewCustomer ? (
                <select 
                  className="w-full p-3.5 border border-green-200 rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                  value={newTrip.customerId}
                  onChange={e => setNewTrip({...newTrip, customerId: e.target.value})}
                  required={!newTrip.isNewCustomer}
                >
                  <option value="">Select Customer from list...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <input 
                    type="text" 
                    placeholder="Customer Name (Required)"
                    className="w-full p-3.5 border border-green-200 rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                    value={newTrip.newCustomerName}
                    onChange={e => setNewTrip({...newTrip, newCustomerName: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Address (Required)"
                    className="w-full p-3.5 border border-green-200 rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                    value={newTrip.newCustomerAddress}
                    onChange={e => setNewTrip({...newTrip, newCustomerAddress: e.target.value})}
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone Number (Optional)"
                    className="w-full p-3.5 border border-green-200 rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                    value={newTrip.newCustomerPhone}
                    onChange={e => setNewTrip({...newTrip, newCustomerPhone: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LocationPicker 
                label="Pickup Location"
                value={newTrip.pickup}
                onChange={(val) => setNewTrip(prev => ({...prev, pickup: val.address, pickupLat: val.lat, pickupLng: val.lng}))}
                required
                placeholder="Search pickup point..."
              />
              <LocationPicker 
                label="Drop Location"
                value={newTrip.drop}
                onChange={(val) => setNewTrip(prev => ({...prev, drop: val.address, dropLat: val.lat, dropLng: val.lng}))}
                required
                placeholder="Search delivery point..."
              />
            </div>

            {/* Distance Preview */}
            {(tripDistance || calculatingDist) && (
                <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-center text-sm font-bold flex items-center justify-center border border-blue-100">
                    {calculatingDist ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <MapPin className="w-4 h-4 mr-2"/>}
                    {calculatingDist ? "Calculating Route..." : `Est. Distance: ${tripDistance}`}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Scheduled Time</label>
                    <input 
                        type="datetime-local" 
                        className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary outline-none"
                        value={newTrip.time}
                        onChange={e => setNewTrip({...newTrip, time: e.target.value})}
                        required
                        />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Driver</label>
                    <select 
                        className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary outline-none"
                        value={newTrip.driverId}
                        onChange={e => setNewTrip({...newTrip, driverId: e.target.value})}
                        required
                    >
                        <option value="">Select Driver</option>
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
            </div>

            <button type="submit" className="w-full py-4 bg-primary text-white font-bold text-lg rounded-xl shadow-lg shadow-green-200 hover:bg-primaryDark transition-all flex justify-center items-center active:scale-[0.98]">
              <Plus className="w-6 h-6 mr-2" /> Publish Trip
            </button>
          </form>
        </div>
      )}

      {activeTab === 'customers' && (
         <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Customer Directory</h3>
                <button 
                  onClick={() => {
                      setCustForm({ name: '', address: '', phone: '' });
                      setEditingCustId(null);
                      setIsEditingCust(true);
                  }}
                  className="bg-secondary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-gray-700 transition"
                >
                    <UserPlus className="w-4 h-4 mr-2"/> New Customer
                </button>
            </div>

            {/* Customer List */}
             {customers.length === 0 ? (
               <div className="bg-white p-10 rounded-2xl text-center text-gray-400 border border-dashed border-gray-200">
                   <Building className="w-12 h-12 mx-auto mb-2 opacity-30"/>
                   <p>No customers found.</p>
               </div>
             ) : (
               <div className="grid gap-3 md:grid-cols-2">
                 {customers.map(c => (
                   <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start space-x-3 group hover:border-green-200 transition-colors">
                     <div className="bg-green-100 p-2.5 rounded-full flex-shrink-0">
                       <Building className="w-5 h-5 text-primary" />
                     </div>
                     <div className="min-w-0 flex-1">
                       <h4 className="font-bold text-gray-900 truncate">{c.name}</h4>
                       <p className="text-sm text-gray-500 line-clamp-2">{c.address}</p>
                       {c.phone && (
                         <p className="text-xs text-gray-400 flex items-center mt-1">
                           <Phone className="w-3 h-3 mr-1" /> {c.phone}
                         </p>
                       )}
                     </div>
                     <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleEditCustomer(c)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit">
                             <Edit2 className="w-4 h-4"/>
                         </button>
                         <button onClick={() => handleDeleteCustomer(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                             <Trash2 className="w-4 h-4"/>
                         </button>
                     </div>
                   </div>
                 ))}
               </div>
             )}

            {/* Edit/Create Modal Overlay */}
            {isEditingCust && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{editingCustId ? 'Edit Customer' : 'Add New Customer'}</h3>
                            <button onClick={() => setIsEditingCust(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
                        </div>
                        <form onSubmit={handleSaveCustomer} className="space-y-4">
                            <input 
                                className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Company Name"
                                value={custForm.name}
                                onChange={e => setCustForm({...custForm, name: e.target.value})}
                                required
                            />
                            <input 
                                className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Full Address"
                                value={custForm.address}
                                onChange={e => setCustForm({...custForm, address: e.target.value})}
                                required
                            />
                             <input 
                                className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Phone (Optional)"
                                value={custForm.phone}
                                onChange={e => setCustForm({...custForm, phone: e.target.value})}
                            />
                            <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:bg-primaryDark transition flex items-center justify-center">
                                <Save className="w-5 h-5 mr-2"/> Save Profile
                            </button>
                        </form>
                    </div>
                </div>
            )}
         </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-br from-primary to-green-700 p-6 rounded-3xl text-white shadow-xl">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              Eco Intelligence
            </h2>
            <p className="text-green-100 text-sm mb-6 opacity-90">
              Analyze fleet efficiency, revenue, and trip summaries instantly.
            </p>
            <div className="relative">
              <input
                type="text"
                placeholder="Ask about trips, revenue..."
                className="w-full p-4 rounded-2xl text-gray-900 pr-14 shadow-inner outline-none placeholder:text-gray-400"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiReport()}
              />
              <button 
                onClick={handleAiReport}
                disabled={isAiLoading}
                className="absolute right-2 top-2 p-2 bg-secondary rounded-xl hover:bg-gray-800 transition disabled:opacity-50 text-white"
              >
                {isAiLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {aiResult && (
             <div className="bg-white p-6 rounded-2xl shadow-soft border border-green-50">
               <h3 className="text-xs font-extrabold text-primary uppercase tracking-widest mb-3">Analysis Result</h3>
               <div className="prose prose-sm prose-green max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
                 {aiResult}
               </div>
             </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div 
              className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-primary cursor-pointer transition shadow-sm text-center active:scale-95"
              onClick={() => { setAiQuery("How much revenue was generated from trips today?"); }}
            >
              <div className="text-2xl mb-2">💰</div>
              <div className="text-sm font-bold text-gray-700">Revenue</div>
            </div>
            <div 
              className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-primary cursor-pointer transition shadow-sm text-center active:scale-95"
              onClick={() => { setAiQuery("List all completed trips with payment details"); }}
            >
               <div className="text-2xl mb-2">✅</div>
               <div className="text-sm font-bold text-gray-700">Summary</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};