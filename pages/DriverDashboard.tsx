import React, { useState, useEffect, useRef } from 'react';
import { User, Trip, TripStatus } from '../types';
import { getTrips, saveTrip } from '../services/storageService';
import { MapPin, Navigation, DollarSign, Upload, CheckCircle, Clock, PlusCircle, Locate, ChevronRight, Truck } from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';

interface DriverDashboardProps {
  user: User;
  onNotify: (msg: string, type: 'info' | 'success' | 'error') => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ user, onNotify }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [view, setView] = useState<'list' | 'detail' | 'request'>('list');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const prevTripsRef = useRef<Trip[]>([]);
  
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH'>('CASH');
  const [amount, setAmount] = useState('');
  const [proof, setProof] = useState<string | null>(null);
  
  // Request trip form state
  const [reqTrip, setReqTrip] = useState({ 
    cust: '', 
    from: '', fromLat: 0, fromLng: 0,
    to: '', toLat: 0, toLng: 0
  });

  useEffect(() => {
    loadTrips();
    const interval = setInterval(() => {
        loadTrips(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  const loadTrips = (isPolling = false) => {
    const all = getTrips();
    const myTrips = all.filter(t => t.driverId === user.id && t.status !== TripStatus.COMPLETED && t.status !== TripStatus.CANCELLED);
    
    if (isPolling) {
        const newTripIds = myTrips.map(t => t.id);
        const prevTripIds = prevTripsRef.current.map(t => t.id);
        const addedTrips = myTrips.filter(t => !prevTripIds.includes(t.id));
        
        if (addedTrips.length > 0) {
            onNotify(`You have ${addedTrips.length} new trip(s)!`, 'info');
             if (Notification.permission === 'granted') {
                new Notification('EcoExpress Driver', { body: 'New trip assigned to you.' });
            }
        }

        myTrips.forEach(t => {
            const prev = prevTripsRef.current.find(p => p.id === t.id);
            if (prev && prev.status === TripStatus.PENDING_APPROVAL && t.status === TripStatus.SCHEDULED) {
                 onNotify(`Trip for ${t.customerName} Approved!`, 'success');
            }
        });
    }

    setTrips(myTrips.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()));
    prevTripsRef.current = myTrips;
  };

  const handleStatusUpdate = (status: TripStatus) => {
    if (!selectedTrip) return;
    
    const updated: Trip = {
      ...selectedTrip,
      status: status,
      timeline: [...selectedTrip.timeline, { status, timestamp: new Date().toISOString() }]
    };
    
    saveTrip(updated);
    setSelectedTrip(updated);
    onNotify(`Status updated to ${status.replace('_', ' ')}`, 'success');
  };

  const handleCompleteTrip = () => {
    if (!selectedTrip) return;
    if (!amount) return onNotify('Please enter amount received', 'error');

    const updated: Trip = {
      ...selectedTrip,
      status: TripStatus.COMPLETED,
      paymentMethod,
      paymentAmount: parseFloat(amount),
      paymentProofUrl: proof || undefined,
      timeline: [...selectedTrip.timeline, { status: TripStatus.COMPLETED, timestamp: new Date().toISOString() }]
    };

    saveTrip(updated);
    onNotify('Trip Completed! Payment Recorded.', 'success');
    setSelectedTrip(null);
    setView('list');
    loadTrips();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTrip.cust || !reqTrip.from || !reqTrip.to) return;

    const trip: Trip = {
      id: `t_req_${Date.now()}`,
      customerName: reqTrip.cust,
      driverId: user.id,
      pickupLocation: reqTrip.from,
      pickupLat: reqTrip.fromLat,
      pickupLng: reqTrip.fromLng,
      dropLocation: reqTrip.to,
      dropLat: reqTrip.toLat,
      dropLng: reqTrip.toLng,
      scheduledTime: new Date().toISOString(),
      status: TripStatus.PENDING_APPROVAL,
      isDriverRequested: true,
      createdAt: new Date().toISOString(),
      timeline: []
    };
    saveTrip(trip);
    onNotify('Request submitted for approval.', 'info');
    setReqTrip({ cust: '', from: '', fromLat: 0, fromLng: 0, to: '', toLat: 0, toLng: 0 });
    setView('list');
    loadTrips();
  };

  // Improved navigation using Coordinates if available
  const startNavigation = (lat?: number, lng?: number, address?: string) => {
    if (lat && lng) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else if (address) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  if (view === 'request') {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-soft mt-2 animate-fade-in border border-green-50">
        <h2 className="text-xl font-bold mb-6 text-gray-800">Request Ad-hoc Trip</h2>
        <form onSubmit={submitRequest} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Customer Name</label>
            <input 
                className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. Walk-in Client"
                value={reqTrip.cust}
                onChange={e => setReqTrip({...reqTrip, cust: e.target.value})}
                required
            />
          </div>
          
          <LocationPicker 
            label="Pickup Location"
            value={reqTrip.from}
            onChange={(val) => setReqTrip(prev => ({...prev, from: val.address, fromLat: val.lat, fromLng: val.lng}))}
            required
            placeholder="Pickup address..."
          />

          <LocationPicker 
            label="Drop Location"
            value={reqTrip.to}
            onChange={(val) => setReqTrip(prev => ({...prev, to: val.address, toLat: val.lat, toLng: val.lng}))}
            required
            placeholder="Drop address..."
          />

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={() => setView('list')} className="flex-1 py-4 text-gray-600 font-bold bg-gray-100 rounded-xl">Cancel</button>
            <button type="submit" className="flex-1 py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-green-200">Submit Request</button>
          </div>
        </form>
      </div>
    );
  }

  if (selectedTrip) {
    // Detail View
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setView('list')} className="flex items-center text-sm font-bold text-gray-500 mb-2 p-2 -ml-2">
            <div className="bg-white rounded-full p-1 mr-2 shadow-sm"><ChevronRight className="rotate-180 w-4 h-4"/></div>
            Back to Trips
        </button>
        
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden border border-green-50">
          <div className="bg-secondary p-6 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Truck className="w-24 h-24"/></div>
            <h2 className="text-2xl font-bold">{selectedTrip.customerName}</h2>
            <p className="text-gray-300 text-sm mt-1 opacity-80">ID: {selectedTrip.id.substring(0,8)}</p>
            {selectedTrip.estimatedDistance && <p className="mt-2 inline-block bg-white/20 px-2 py-1 rounded-lg text-xs font-bold">{selectedTrip.estimatedDistance} trip</p>}
          </div>
          
          <div className="p-6 space-y-8">
            {/* Timeline Visual */}
            <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <span>Pickup</span>
                    <span>Transit</span>
                    <span>Drop</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                    <div 
                        className="bg-primary h-3 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(22,163,74,0.5)]" 
                        style={{ width: 
                        selectedTrip.status === TripStatus.SCHEDULED ? '5%' :
                        selectedTrip.status === TripStatus.STARTED ? '25%' :
                        selectedTrip.status === TripStatus.PICKUP_COMPLETED ? '50%' :
                        selectedTrip.status === TripStatus.IN_TRANSIT ? '75%' : '100%' 
                        }}
                    ></div>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 bg-green-100 p-2 rounded-full">
                    <MapPin className="text-primary w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Pickup From</p>
                  <p className="font-bold text-gray-800 text-lg leading-tight mb-2">{selectedTrip.pickupLocation}</p>
                  <button 
                    onClick={() => startNavigation(selectedTrip.pickupLat, selectedTrip.pickupLng, selectedTrip.pickupLocation)}
                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center w-max active:bg-blue-100"
                  >
                    <Navigation className="w-4 h-4 mr-2" /> Navigate to Pickup
                  </button>
                </div>
              </div>

              <div className="relative pl-7">
                  <div className="absolute left-[27px] -top-8 bottom-4 w-0.5 bg-dashed border-l-2 border-gray-200"></div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 bg-red-50 p-2 rounded-full z-10">
                    <MapPin className="text-red-500 w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Deliver To</p>
                  <p className="font-bold text-gray-800 text-lg leading-tight mb-2">{selectedTrip.dropLocation}</p>
                   <button 
                    onClick={() => startNavigation(selectedTrip.dropLat, selectedTrip.dropLng, selectedTrip.dropLocation)}
                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center w-max active:bg-blue-100"
                   >
                    <Navigation className="w-4 h-4 mr-2" /> Navigate to Drop
                  </button>
                </div>
              </div>
            </div>

            {/* Status Controls */}
            <div className="pt-6 border-t border-gray-100">
              {selectedTrip.status === TripStatus.SCHEDULED && (
                <button onClick={() => handleStatusUpdate(TripStatus.STARTED)} className="w-full py-5 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-green-200 text-xl active:scale-95 transition-transform">
                  START TRIP
                </button>
              )}
              {selectedTrip.status === TripStatus.STARTED && (
                <button onClick={() => handleStatusUpdate(TripStatus.PICKUP_COMPLETED)} className="w-full py-5 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 text-xl active:scale-95 transition-transform">
                  CONFIRM PICKUP
                </button>
              )}
              {selectedTrip.status === TripStatus.PICKUP_COMPLETED && (
                <button onClick={() => handleStatusUpdate(TripStatus.IN_TRANSIT)} className="w-full py-5 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 text-xl active:scale-95 transition-transform">
                  START DELIVERY
                </button>
              )}
              {selectedTrip.status === TripStatus.IN_TRANSIT && (
                <div className="space-y-5 bg-surface p-5 rounded-2xl border border-green-200">
                  <h3 className="font-bold text-gray-800 text-center">Collect Payment</h3>
                  
                  <div className="flex gap-2 p-1 bg-white rounded-xl border border-gray-200">
                    <button 
                      onClick={() => setPaymentMethod('CASH')}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${paymentMethod === 'CASH' ? 'bg-secondary text-white shadow-md' : 'text-gray-500'}`}
                    >Cash</button>
                     <button 
                      onClick={() => setPaymentMethod('UPI')}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${paymentMethod === 'UPI' ? 'bg-secondary text-white shadow-md' : 'text-gray-500'}`}
                    >UPI</button>
                  </div>

                  <div className="relative">
                    <DollarSign className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                    <input 
                      type="number" 
                      placeholder="Amount Received" 
                      className="w-full pl-12 p-4 rounded-xl border border-gray-200 text-lg font-bold outline-none focus:ring-2 focus:ring-primary"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                  </div>

                  {paymentMethod === 'UPI' && (
                    <div>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-green-300 bg-white rounded-xl cursor-pointer hover:bg-green-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 text-primary mb-2" />
                            <p className="text-sm text-gray-500 font-medium">{proof ? 'Screenshot Attached' : 'Upload Screenshot'}</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                      </label>
                    </div>
                  )}

                  <button onClick={handleCompleteTrip} className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-green-200 text-lg flex justify-center items-center active:scale-95 transition-transform">
                    <CheckCircle className="mr-2 w-6 h-6" /> MARK DELIVERED
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-6 sticky top-20 z-30 bg-surface/95 backdrop-blur py-2">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 leading-none">My Queue</h2>
            <p className="text-xs text-gray-400 font-medium mt-1">Today's Schedule</p>
        </div>
        <button 
          onClick={() => setView('request')}
          className="bg-secondary text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center shadow-lg active:scale-95 transition-transform"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Request Trip
        </button>
      </div>

      <div className="space-y-4 pb-12">
        {trips.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-gray-300">
             <Clock className="w-16 h-16 mb-4 opacity-50" />
             <p className="font-medium">No trips assigned.</p>
             <p className="text-xs">Enjoy your break!</p>
           </div>
        ) : (
          trips.map(trip => (
            <div 
              key={trip.id} 
              onClick={() => { setSelectedTrip(trip); setView('detail'); }}
              className={`bg-white p-5 rounded-2xl shadow-soft border-l-[6px] active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group ${
                  trip.status === TripStatus.PENDING_APPROVAL ? 'border-orange-400' : 'border-primary'
              }`}
            >
              <div className="absolute right-0 top-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="text-gray-300"/>
              </div>
              <div className="flex justify-between items-start mb-3">
                 <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{trip.customerName}</h3>
                 <span className={`text-[10px] px-2 py-1 rounded-md font-extrabold uppercase tracking-wide ${
                   trip.status === TripStatus.SCHEDULED ? 'bg-blue-50 text-blue-600' : 
                   trip.status === TripStatus.PENDING_APPROVAL ? 'bg-orange-50 text-orange-600' :
                   'bg-yellow-50 text-yellow-600'
                 }`}>
                   {trip.status.replace('_', ' ')}
                 </span>
              </div>
              
              <div className="space-y-2 mb-3">
                 <div className="flex items-center text-gray-600">
                    <div className="w-6 flex justify-center mr-2"><div className="w-2 h-2 rounded-full bg-primary ring-2 ring-green-100"></div></div>
                    <p className="text-sm font-medium line-clamp-1">{trip.pickupLocation}</p>
                 </div>
                 <div className="flex items-center text-gray-600">
                     <div className="w-6 flex justify-center mr-2"><div className="w-2 h-2 rounded-full bg-red-400 ring-2 ring-red-100"></div></div>
                    <p className="text-sm font-medium line-clamp-1">{trip.dropLocation}</p>
                 </div>
              </div>

              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                <div className="flex items-center text-xs text-gray-400 font-bold bg-gray-50 w-max px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(trip.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                {trip.estimatedDistance && <span className="text-[10px] text-gray-400 font-semibold">{trip.estimatedDistance}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};