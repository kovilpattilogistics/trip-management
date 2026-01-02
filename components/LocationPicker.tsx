import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Check, Locate, Loader2, AlertCircle } from 'lucide-react';

// Leaflet is loaded globally via CDN in index.html
declare const L: any;

interface LocationData {
    address: string;
    lat: number;
    lng: number;
}

interface LocationPickerProps {
  label: string;
  value: string;
  onChange: (value: LocationData) => void;
  required?: boolean;
  placeholder?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ label, value, onChange, required, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // Use a ref for the map instance to avoid re-renders and closure issues
  const mapInstanceRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    // If the modal is open, container exists, and map isn't already initialized
    if (isOpen && mapContainerRef.current && !mapInstanceRef.current) {
      // Default to New York
      const defaultLat = 40.7128;
      const defaultLng = -74.0060;
      
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false // Cleaner for mobile
      }).setView([defaultLat, defaultLng], 13);
      
      // Use CartoDB Voyager tiles for faster loading and cleaner look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      // Listener for map movement (pan/zoom)
      map.on('moveend', () => {
        const center = map.getCenter();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        
        setIsLoading(true);
        debounceRef.current = setTimeout(() => {
          handleGeocode(center.lat, center.lng);
        }, 500); // Reduced debounce for snappier feedback
      });

      mapInstanceRef.current = map;

      // Critical fix: invalidateSize ensures map renders correctly after modal animation
      setTimeout(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            if (!value) {
                mapInstanceRef.current.locate({ setView: true, maxZoom: 16 });
            }
        }
      }, 100);
    }
    
    // Cleanup function: runs when isOpen changes to false or component unmounts
    return () => {
      if (!isOpen && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isOpen]); // Depend only on isOpen

  const handleGeocode = async (lat: number, lng: number) => {
    setTempCoords({ lat, lng });
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      if (data && data.display_name) {
        setTempAddress(data.display_name);
      } else {
        setTempAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (error) {
      console.error("Geocoding failed", error);
      setTempAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e?: React.SyntheticEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    
    setIsLoading(true);
    setSearchError('');

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`);
      
      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        mapInstanceRef.current.setView([newLat, newLng], 16); 
      } else {
        setSearchError("Location not found.");
        setIsLoading(false); 
      }
    } catch (error) {
      console.error("Search failed", error);
      setSearchError("Search failed.");
      setIsLoading(false);
    }
  };

  const handleCurrentLocation = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (mapInstanceRef.current) {
      setIsLoading(true);
      mapInstanceRef.current.locate({ setView: true, maxZoom: 16 });
    }
  };

  const confirmSelection = () => {
    if (tempCoords) {
        onChange({
            address: tempAddress,
            lat: tempCoords.lat,
            lng: tempCoords.lng
        });
        setIsOpen(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div 
        onClick={() => setIsOpen(true)}
        className="relative cursor-pointer group"
      >
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
        </div>
        <input 
          type="text" 
          readOnly
          value={value}
          required={required}
          className="w-full pl-10 p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary outline-none cursor-pointer hover:bg-white transition-colors text-ellipsis"
          placeholder={placeholder || "Tap to select on map"}
        />
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in">
          {/* Header */}
          <div className="flex flex-col p-4 border-b shadow-sm bg-white z-10 gap-2">
            <div className="flex items-center">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)} 
                  className="p-2 mr-2 rounded-full hover:bg-gray-100"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
                <div className="flex-1 relative">
                  <input 
                      type="search" 
                      placeholder="Search city, street..." 
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none text-base"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSearch(e);
                        }
                      }}
                  />
                  <button 
                    type="button"
                    onClick={handleSearch}
                    className="absolute left-3 top-3.5 text-gray-400 hover:text-primary transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
            </div>
            {searchError && (
                <div className="flex items-center text-red-500 text-sm px-2 animate-pulse">
                    <AlertCircle className="w-4 h-4 mr-1"/> {searchError}
                </div>
            )}
          </div>

          {/* Map Area */}
          <div className="flex-1 relative bg-gray-100">
            <div ref={mapContainerRef} className="absolute inset-0 z-0" />
            
            {/* Center Pin Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 pb-8">
              <MapPin className="w-10 h-10 text-primary drop-shadow-xl -mb-10 animate-bounce" style={{ animationDuration: '0.5s', animationIterationCount: 1 }} />
              <div className="w-2 h-2 bg-black/50 rounded-full absolute mt-1 blur-sm"></div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-2">
               <button 
                type="button"
                onClick={handleCurrentLocation}
                className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-50 text-gray-700 active:scale-90 transition-transform"
                title="Use Current Location"
              >
                <Locate className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Bottom Sheet */}
          <div className="p-5 border-t bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20 pb-8">
            <div className="mb-4">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">Selected Location</p>
              <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                 <div className="mt-1 flex-shrink-0">
                   {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <MapPin className="w-5 h-5 text-primary" />}
                 </div>
                 <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-relaxed">
                   {isLoading ? "Fetching address..." : (tempAddress || "Move map to select location")}
                 </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={confirmSelection}
              disabled={!tempAddress || isLoading}
              className="w-full py-4 bg-primary text-white font-bold text-lg rounded-xl shadow-lg shadow-green-100 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center active:scale-98 transition-transform"
            >
              <Check className="w-6 h-6 mr-2" /> Confirm Location
            </button>
          </div>
        </div>
      )}
    </div>
  );
};