import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Onboarding.css';
/* ─── Comprehensive world banks list ─────────────────────────── */
const WORLD_BANKS = [
  'Abbey National Bank','ABN AMRO Bank','Abu Dhabi Commercial Bank','Abu Dhabi Islamic Bank',
  'Access Bank','Agricultural Bank of China','Agricultural Development Bank of Pakistan',
  'Ahli Bank','Al Baraka Bank','Al Hilal Bank','Al Rajhi Bank','Alizz Islamic Bank',
  'Allahabad Bank','Allied Bank Limited','Alpha Bank','Altyn Bank','Ameriabank',
  'American Express Bank','ANZ Bank','Arab Bank','Arab Banking Corporation',
  'Arab National Bank','Ardshinbank','Arion Bank','Askari Bank',
  'Attijariwafa Bank','Audi Bank','Australia and New Zealand Banking Group','Axis Bank',
  'Banca Monte dei Paschi di Siena','Banco Bradesco','Banco de Chile','Banco do Brasil',
  'Banco Itau','Banco Santander','Bangkok Bank','Bank ABC','Bank Al Habib','Bank Alfalah',
  'Bank AlJazira','Bank Audi','Bank Dhofar','Bank Hapoalim','Bank Islam Malaysia',
  'Bank Islami Pakistan','Bank Julius Baer','Bank Leumi','Bank Mandiri','Bank Melli Iran',
  'Bank Muscat','Bank of Africa','Bank of America','Bank of Bahrain and Kuwait',
  'Bank of Baroda','Bank of Beijing','Bank of Ceylon','Bank of China','Bank of Communications',
  'Bank of East Asia','Bank of Georgia','Bank of India','Bank of Ireland','Bank of Japan',
  'Bank of Kigali','Bank of Korea','Bank of Maharashtra','Bank of Montreal','Bank of New Zealand',
  'Bank of Nova Scotia','Bank of Punjab','Bank of Queensland','Bank of Scotland','Bank of Sharjah',
  'Bank of Singapore','Bank of the Philippine Islands','Bank Rakyat Indonesia','Bank Saderat Iran',
  'Bank Sepah','Bank Simpanan Nasional','Bank Syariah Indonesia','Banque Misr','Barclays Bank',
  'BBVA','BDO Unibank','BNP Paribas','Boubyan Bank','Bradesco',
  'Canara Bank','Capital One Bank','Capitec Bank','Cathay Bank','Central Bank of India',
  'China CITIC Bank','China Construction Bank','China Development Bank','China Everbright Bank',
  'China Merchants Bank','China Minsheng Banking','CIMB Bank','Citibank','Citizens Bank',
  'City Union Bank','Commerzbank','Commonwealth Bank of Australia','Credit Agricole','Credit Suisse',
  'Danske Bank','DCB Bank','Desjardins Group','Deutsche Bank','Development Bank of Ethiopia',
  'Development Bank of the Philippines','Dhanlaxmi Bank','DnB Bank','Doha Bank',
  'Dubai Islamic Bank','DZ Bank','East West Bank','Ecobank','Emirates Islamic Bank',
  'Emirates NBD','Equitas Small Finance Bank','Eurobank','Export-Import Bank of China',
  'Export-Import Bank of India','Faisal Bank','Federal Bank','Fidelity Bank','Finca Bank',
  'First Abu Dhabi Bank','First Bank of Nigeria','First Citizens Bank','First Gulf Bank',
  'First National Bank','Firstrand Bank','Fubon Bank','Garanti BBVA','GCB Bank',
  'Goldman Sachs Bank','Grameen Bank','Guaranty Trust Bank','Gulf Bank',
  'Habib Bank Limited','Habib Metropolitan Bank','Hang Seng Bank','HDFC Bank','Heritage Bank',
  'Himalayan Bank','HSBC Bank','ICICI Bank','IDBI Bank','IDFC First Bank','IndusInd Bank',
  'Industrial and Commercial Bank of China','Industrial Bank of Korea','ING Bank',
  'Investec Bank','Islamic Development Bank','Janata Bank','Japan Post Bank','JPMorgan Chase',
  'JS Bank','KBC Bank','Kenya Commercial Bank','Kotak Mahindra Bank','Krungsri Bank',
  'Krung Thai Bank','Landsbankinn','Lao Development Bank','Lloyds Bank','Macquarie Bank',
  'Mashreq Bank','MCB Bank','Mercantile Bank','Metro Bank','Millennium Bank','Mizuho Bank',
  'Monzo Bank','Morgan Stanley Bank','Mufg Bank','National Australia Bank',
  'National Bank of Abu Dhabi','National Bank of Bangladesh','National Bank of Egypt',
  'National Bank of Ethiopia','National Bank of Greece','National Bank of India',
  'National Bank of Kenya','National Bank of Pakistan','National Commercial Bank',
  'Natwest Bank','Nedbank','Nepal Bank Limited','Noor Bank','Nordea Bank',
  'Oman Arab Bank','One97 Payments Bank','Orient Bank','Panin Bank',
  'Philippine National Bank','Post Bank Ethiopia','Postbank','Punjab National Bank',
  'Qatar Islamic Bank','Qatar National Bank','Rabobank','Raiffeisen Bank','Rakbank',
  'RBL Bank','Regions Bank','Reserve Bank of India','Revolut Bank','RHB Bank',
  'Royal Bank of Canada','Royal Bank of Scotland','Sacombank','Saraswat Bank',
  'Saudi British Bank','Saudi National Bank','Scotiabank','Security Bank',
  'Shanghai Pudong Development Bank','Sharjah Islamic Bank','Silicon Valley Bank',
  'South Indian Bank','Standard Bank','Standard Chartered Bank','State Bank of India',
  'State Bank of Pakistan','Stanbic Bank','Sterling Bank','Sumitomo Mitsui Banking',
  'Swiss National Bank','Tesco Bank','Thai Military Bank','The National Bank','TMB Bank',
  'Truist Bank','Trust Bank','UCO Bank','UBA Bank','Union Bank of India',
  'Union Bank of Nigeria','United Arab Bank','United Bank Limited','United Commercial Bank',
  'United Overseas Bank','Vakif Bank','VakifBank','VTB Bank','Wells Fargo Bank',
  'Westpac Banking','Woori Bank','Xapo Bank','Yes Bank','Yapi Kredi Bank',
  'Zenith Bank','Ziraat Bank',
].sort((a, b) => a.localeCompare(b));

/* ─── GSTIN API ───────────────────────────────────────────────── */
const GST_API_URL = 'https://www.haatzaseller.com/_functions/checksellergst';

async function checkGSTINExists(gstin) {
  const url = `${GST_API_URL}?gstin=${encodeURIComponent(gstin)}`;
  const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  if (typeof data.exists === 'boolean')     return data.exists;
  if (typeof data.registered === 'boolean') return data.registered;
  if (typeof data.found === 'boolean')      return data.found;
  if (data.status === 'exists')             return true;
  if (data.status === 'not_found')          return false;
  return false;
}

/* ─── Pincode API (Nominatim — no expired SSL issues) ────────── */
async function fetchPincodeData(pincode) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=jsonv2&addressdetails=1&limit=1&accept-language=en`,
    {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'HaatzaSellerOnboarding/1.0 (contact@haatza.com)',
      },
    }
  );
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('Invalid pincode');
  const a = data[0].address || {};
  const city  = a.city || a.town || a.village || a.county || a.state_district || '';
  const state = a.state || '';
  if (!state) throw new Error('Invalid pincode');
  return { city, state, country: 'India' };
}

/* ─── Icons ──────────────────────────────────────────────────── */
const LocationIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2962ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="10" r="3"/>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const SpinnerIcon = ({ color = '#2962ff' }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2.5" strokeLinecap="round"
    style={{ animation: 'spinIcon 0.7s linear infinite', display: 'block' }}
  >
    <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke={color}/>
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

/* ─── Leaflet loader ──────────────────────────────────────────── */
let leafletLoadPromise = null;
function loadLeaflet() {
  if (leafletLoadPromise) return leafletLoadPromise;
  if (window.L) { leafletLoadPromise = Promise.resolve(window.L); return leafletLoadPromise; }
  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = () => { leafletLoadPromise = null; reject(new Error('Failed to load Leaflet.')); };
    document.head.appendChild(script);
  });
  return leafletLoadPromise;
}

/* ─── Reverse geocoding ───────────────────────────────────────── */
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'HaatzaSellerOnboarding/1.0 (contact@haatza.com)',
    },
  });
  if (!res.ok) throw new Error('Geocoding failed');
  return res.json();
}

function parseNominatimAddress(data) {
  const a = data.address || {};

  const houseNo = [
    a.house_number,
    a.building,
    a.amenity,
    a.shop,
    a.office,
    a.industrial,
    a.man_made,
  ].filter(Boolean).join(', ');

  const roadParts = [
    a.road || a.pedestrian || a.footway || a.path || a.street,
    a.neighbourhood || a.suburb || a.quarter || a.residential,
  ].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);
  const roadName = roadParts.join(', ');

  const pinCode        = a.postcode || '';
  const city           = a.city || a.town || a.village || a.county || a.state_district || '';
  const state          = a.state || '';
  const country        = a.country || '';
  const landmark       = a.leisure || a.tourism || a.historic || '';
  const displayAddress = data.display_name || '';

  return { houseNo, roadName, pinCode, city, state, country, landmark, displayAddress };
}

/* ─── Map tile layers ─────────────────────────────────────────── */
const TILE_LAYERS = {
  map: {
    label: 'Map', icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    label: 'Satellite', icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    subdomains: false,
  },
  terrain: {
    label: 'Terrain', icon: '🏔️',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
    maxZoom: 17,
  },
  hybrid: {
    label: 'Hybrid', icon: '🌐',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    maxZoom: 19,
    isOverlay: true,
    baseUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
};

/* ─── Map Modal ───────────────────────────────────────────────── */
function MapModal({ onClose, onSelectAddress }) {
  const mapDivRef       = useRef(null);
  const mapRef          = useRef(null);
  const baseLayerRef    = useRef(null);
  const overlayLayerRef = useRef(null);
  const timerRef        = useRef(null);
  const crosshairRef    = useRef(null);

  const [addressText, setAddressText] = useState('');
  const [parsedAddr,  setParsedAddr]  = useState(null);
  const [geocoding,   setGeocoding]   = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [mapError,    setMapError]    = useState('');
  const [locating,    setLocating]    = useState(false);
  const [activeLayer, setActiveLayer] = useState('map');
  const [dragging,    setDragging]    = useState(false);

  const DEFAULT_CENTER = [20.5937, 78.9629];

  const doReverseGeocode = useCallback(async (lat, lng) => {
    setGeocoding(true);
    try {
      const data   = await reverseGeocode(lat, lng);
      const parsed = parseNominatimAddress(data);
      setParsedAddr(parsed);
      setAddressText(parsed.displayAddress || 'Address found');
    } catch {
      setParsedAddr(null);
      setAddressText('Could not fetch address — try moving the map.');
    } finally {
      setGeocoding(false);
    }
  }, []);

  const onMoveStart = useCallback(() => {
    setDragging(true);
    setParsedAddr(null);
    setAddressText('');
  }, []);

  const onMoveEnd = useCallback(() => {
    setDragging(false);
    if (!mapRef.current) return;
    clearTimeout(timerRef.current);
    const c = mapRef.current.getCenter();
    doReverseGeocode(c.lat, c.lng);
  }, [doReverseGeocode]);

  const applyLayer = useCallback((layerKey) => {
    const map = mapRef.current;
    if (!map || !window.L) return;
    const L   = window.L;
    const cfg = TILE_LAYERS[layerKey];

    if (baseLayerRef.current)    { map.removeLayer(baseLayerRef.current);    baseLayerRef.current    = null; }
    if (overlayLayerRef.current) { map.removeLayer(overlayLayerRef.current); overlayLayerRef.current = null; }

    if (cfg.isOverlay) {
      baseLayerRef.current = L.tileLayer(cfg.baseUrl, {
        attribution: cfg.attribution, maxZoom: cfg.maxZoom,
      }).addTo(map);
      overlayLayerRef.current = L.tileLayer(cfg.url, {
        attribution: '', maxZoom: cfg.maxZoom, opacity: 0.85,
      }).addTo(map);
    } else {
      const options = { attribution: cfg.attribution, maxZoom: cfg.maxZoom };
      if (cfg.subdomains === false) options.subdomains = '';
      baseLayerRef.current = L.tileLayer(cfg.url, options).addTo(map);
    }
    setActiveLayer(layerKey);
  }, []);

  const goToCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        if (mapRef.current) {
          mapRef.current.flyTo([coords.latitude, coords.longitude], 17, { duration: 1.2 });
        }
      },
      () => setLocating(false),
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !mapDivRef.current || mapRef.current) return;

      const map = L.map(mapDivRef.current, {
        center: DEFAULT_CENTER, zoom: 5,
        zoomControl: false, attributionControl: true,
      });
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const cfg = TILE_LAYERS['map'];
      baseLayerRef.current = L.tileLayer(cfg.url, {
        attribution: cfg.attribution, maxZoom: cfg.maxZoom,
      }).addTo(map);

      map.on('movestart', onMoveStart);
      map.on('moveend',   onMoveEnd);
      mapRef.current = map;
      if (!cancelled) setLoading(false);

      if (navigator.geolocation) {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            if (cancelled) return;
            setLocating(false);
            map.flyTo([coords.latitude, coords.longitude], 17, { duration: 1.5 });
          },
          () => {
            if (cancelled) return;
            setLocating(false);
            doReverseGeocode(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
          },
          { timeout: 10000, maximumAge: 30000, enableHighAccuracy: true },
        );
      } else {
        doReverseGeocode(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
      }
    }).catch((err) => {
      if (!cancelled) { setLoading(false); setMapError(err.message); }
    });

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
      if (mapRef.current) {
        mapRef.current.off('movestart', onMoveStart);
        mapRef.current.off('moveend',   onMoveEnd);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-modal-header">
          <span>📍 Select Pickup Location</span>
          <button className="map-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="map-wrap">
          {loading && !mapError && <div className="map-loading">Loading map…</div>}
          {mapError && <div className="map-error">⚠️ {mapError}</div>}

          <div ref={mapDivRef} className="map-container" />

          {!loading && !mapError && (
            <div
              ref={crosshairRef}
              className={`map-crosshair${dragging ? ' map-crosshair--dragging' : ''}`}
              aria-hidden="true"
            >
              <svg
                width="40" height="52" viewBox="0 0 40 52"
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))', display: 'block' }}
              >
                <path
                  d="M20 1C10.06 1 2 9.06 2 19C2 32 20 51 20 51C20 51 38 32 38 19C38 9.06 29.94 1 20 1Z"
                  fill="#2962ff"
                />
                <circle cx="20" cy="19" r="8" fill="white" />
                <circle cx="20" cy="19" r="4" fill="#2962ff" />
              </svg>
            </div>
          )}

          {!loading && !mapError && (
            <div className="map-layer-switcher">
              {Object.entries(TILE_LAYERS).map(([key, cfg]) => (
                <button
                  key={key}
                  className={`map-layer-btn${activeLayer === key ? ' map-layer-btn--active' : ''}`}
                  onClick={() => applyLayer(key)}
                  title={cfg.label}
                >
                  <span className="map-layer-icon">{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && !mapError && (
            <button
              className={`map-locate-btn${locating ? ' map-locate-btn--spinning' : ''}`}
              onClick={goToCurrentLocation}
              disabled={locating}
              title="Use my current location"
            >
              {locating ? (
                <SpinnerIcon color="#2962ff" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2962ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                  <circle cx="12" cy="12" r="8" strokeOpacity="0.3"/>
                </svg>
              )}
            </button>
          )}
        </div>

        <div className="map-address-bar">
          <LocationIcon />
          <span className="map-address-text">
            {geocoding ? 'Finding address…' : (addressText || 'Move the map to select a location')}
          </span>
        </div>

        <button
          className="map-confirm-btn"
          onClick={() => { if (parsedAddr) { onSelectAddress(parsedAddr); onClose(); } }}
          disabled={!parsedAddr || geocoding}
        >
          {geocoding ? 'Finding address…' : 'Confirm Location'}
        </button>
      </div>
    </div>
  );
}

/* ─── FormField ───────────────────────────────────────────────── */
function FormField({ label, required, children, error }) {
  return (
    <div className="form-field">
      <label className="field-label">
        {label}{required && <span className="required-star">*</span>}
      </label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

/* ─── GSTIN Status Badge ──────────────────────────────────────── */
function GstinStatusBadge({ status }) {
  if (status === 'idle' || status === 'checking') return null;
  const configs = {
    verified: {
      bg: '#f0fdf4', border: '#86efac', color: '#16a34a',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20,6 9,17 4,12"/>
        </svg>
      ),
      text: 'GSTIN verified — not yet registered. You may proceed.',
    },
    exists: {
      bg: '#fff1f2', border: '#fca5a5', color: '#dc2626',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
      text: 'This GSTIN is already registered as a seller.',
    },
    error: {
      bg: '#fffbeb', border: '#fcd34d', color: '#b45309',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      text: 'Could not verify GSTIN right now. You may still proceed.',
    },
  };
  const cfg = configs[status];
  if (!cfg) return null;
  return (
    <div className="gstin-badge" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      {cfg.icon}<span>{cfg.text}</span>
    </div>
  );
}

/* ─── Stepper ─────────────────────────────────────────────────── */
const STEPS = ['Business Details', 'Pickup Address', 'Bank Details'];
function Stepper({ current }) {
  return (
    <div className="ob-stepper">
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'pending';
        return (
          <React.Fragment key={label}>
            <div className={`ob-step ${state}`}>
              <div className="ob-step-circle">
                {state === 'done' ? <CheckIcon /> : i + 1}
              </div>
              <span className="ob-step-label">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`ob-step-line${i < current ? ' filled' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Main Onboarding Page ────────────────────────────────────── */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step,          setStep]          = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError,   setSubmitError]   = useState('');

  const [form, setForm] = useState({
    gstin: '', noGstin: true, tradeName: '', panCard: '',
    houseNo: '', roadName: '', pinCode: '', city: '', state: '', country: '', landmark: '',
    bankName: '', accountHolderName: '', accountNumber: '', reAccountNumber: '', ifscCode: '',
  });
  const [errors, setErrors] = useState({});

  /* ── GSTIN ── */
  const [gstinStatus,    setGstinStatus]    = useState('idle');
  const gstinDebounceRef                    = useRef(null);

  /* ── Pincode ── */
  const [pincodeStatus, setPincodeStatus]   = useState('idle');
  const [pincodeMsg,    setPincodeMsg]      = useState('');
  const pincodeDebounceRef                  = useRef(null);

  /* ── Bank dropdown ── */
  const [bankSearch,   setBankSearch]       = useState('');
  const [showBankList, setShowBankList]     = useState(false);
  const [activeIndex,  setActiveIndex]      = useState(-1);
  const bankDropdownRef                     = useRef(null);
  const bankInputRef                        = useRef(null);

  /* ── Map / address ── */
  const [showMapModal, setShowMapModal]     = useState(false);
  const [showToast,    setShowToast]        = useState(false);
  const [autofilled,   setAutofilled]       = useState(false);

  /* ── Account visibility ── */
  const [showAccountNumber,   setShowAccountNumber]   = useState(false);
  const [showReAccountNumber, setShowReAccountNumber] = useState(false);

  const filteredBanks = bankSearch.trim() === ''
    ? WORLD_BANKS
    : WORLD_BANKS.filter((b) => b.toLowerCase().includes(bankSearch.toLowerCase().trim()));

  /* ── Bank dropdown outside-click ── */
  useEffect(() => {
    const handler = (e) => {
      if (
        bankDropdownRef.current && !bankDropdownRef.current.contains(e.target) &&
        bankInputRef.current    && !bankInputRef.current.contains(e.target)
      ) {
        setShowBankList(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── GSTIN debounce + API call ── */
  useEffect(() => {
    if (form.noGstin) { setGstinStatus('idle'); return; }
    const gstin      = form.gstin.trim().toUpperCase();
    const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstin || !GSTIN_REGEX.test(gstin)) {
      setGstinStatus('idle');
      clearTimeout(gstinDebounceRef.current);
      return;
    }
    setGstinStatus('checking');
    clearTimeout(gstinDebounceRef.current);
    gstinDebounceRef.current = setTimeout(async () => {
      try {
        const exists = await checkGSTINExists(gstin);
        setGstinStatus(exists ? 'exists' : 'verified');
        if (exists) {
          setErrors((prev) => ({ ...prev, gstin: 'This GSTIN is already registered as a seller.' }));
        } else {
          setErrors((prev) => {
            const next = { ...prev };
            if (next.gstin === 'This GSTIN is already registered as a seller.') delete next.gstin;
            return next;
          });
        }
      } catch {
        setGstinStatus('error');
      }
    }, 700);
    return () => clearTimeout(gstinDebounceRef.current);
  }, [form.gstin, form.noGstin]);

  /* ── Pincode API ── */
  useEffect(() => {
    const pin = form.pinCode.trim();
    if (pin.length !== 6 || !/^[1-9][0-9]{5}$/.test(pin)) {
      setPincodeStatus('idle');
      setPincodeMsg('');
      return;
    }
    setPincodeStatus('loading');
    setPincodeMsg('');
    clearTimeout(pincodeDebounceRef.current);
    pincodeDebounceRef.current = setTimeout(async () => {
      try {
        const result = await fetchPincodeData(pin);
        setPincodeStatus('success');
        setPincodeMsg(`${result.city}, ${result.state}`);
        setForm((prev) => ({ ...prev, city: result.city, state: result.state, country: result.country }));
        setErrors((prev) => {
          const next = { ...prev };
          ['city', 'state', 'country'].forEach((f) => delete next[f]);
          return next;
        });
      } catch {
        setPincodeStatus('error');
        setPincodeMsg('Invalid pincode — please check and re-enter.');
      }
    }, 500);
    return () => clearTimeout(pincodeDebounceRef.current);
  }, [form.pinCode]);

  /* ── Scroll active bank option into view ── */
  useEffect(() => {
    if (activeIndex >= 0 && bankDropdownRef.current) {
      const item = bankDropdownRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  /* ── Validators ── */
  const validateGSTIN = (g)   => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g);
  const validatePAN   = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
  const validateIFSC  = (c)   => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(c);
  const validatePIN   = (p)   => /^[1-9][0-9]{5}$/.test(p);
  const validateAccNo = (a)   => /^[0-9]{9,18}$/.test(a);

  /* ── Inline real-time validation ── */
  const getInlineError = (field, value, currentForm) => {
    const v = typeof value === 'string' ? value.trim() : value;
    switch (field) {
      case 'gstin':
        if (!v) return '';
        if (v.length < 15) return `GSTIN must be 15 characters (${v.length}/15)`;
        if (!validateGSTIN(v.toUpperCase())) return 'Invalid GSTIN — format: 22ABCDE1234F1Z5';
        return '';
      case 'panCard':
        if (!v) return '';
        if (v.length < 10) return `PAN must be 10 characters (${v.length}/10)`;
        if (!validatePAN(v.toUpperCase())) return 'Invalid PAN — format: ABCDE1234F';
        return '';
      case 'pinCode':
        if (!v) return '';
        if (v.length < 6) return `Pin Code must be 6 digits (${v.length}/6)`;
        if (!validatePIN(v)) return 'Invalid Pin Code — must start with a non-zero digit';
        return '';
      case 'ifscCode':
        if (!v) return '';
        if (v.length < 11) return `IFSC must be 11 characters (${v.length}/11)`;
        if (!validateIFSC(v.toUpperCase())) return 'Invalid IFSC — format: SBIN0001234';
        return '';
      case 'accountNumber':
        if (!v) return '';
        if (v.length < 9)  return `Account number too short — min 9 digits (${v.length} entered)`;
        if (v.length > 18) return 'Account number too long — max 18 digits';
        if (!validateAccNo(v)) return 'Account number must contain digits only';
        return '';
      case 'reAccountNumber':
        if (!v) return '';
        if (v !== (currentForm?.accountNumber ?? '')) return 'Account numbers do not match';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next      = { ...prev, [field]: value };
      const inlineErr = getInlineError(field, value, next);
      setErrors((e) => ({ ...e, [field]: inlineErr }));
      return next;
    });
  };

  /* ── Step validation ── */
  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!form.noGstin) {
        if (!form.gstin.trim())                          e.gstin = 'GSTIN is required';
        else if (!validateGSTIN(form.gstin.toUpperCase())) e.gstin = 'Invalid GSTIN — format: 22ABCDE1234F1Z5';
        else if (gstinStatus === 'exists')               e.gstin = 'This GSTIN is already registered as a seller.';
        else if (gstinStatus === 'checking')             e.gstin = 'Please wait — verifying GSTIN…';
      }
      if (!form.tradeName.trim()) e.tradeName = 'Trade Name is required';
      if (form.noGstin) {
        if (!form.panCard.trim())                          e.panCard = 'PAN Card is required';
        else if (!validatePAN(form.panCard.toUpperCase())) e.panCard = 'Invalid PAN — format: ABCDE1234F';
      }
    }
    if (s === 1) {
      if (!form.houseNo.trim())  e.houseNo  = 'House No. / Building Name is required';
      if (!form.roadName.trim()) e.roadName = 'Road Name / Area / Colony is required';
      if (!form.pinCode.trim())  e.pinCode  = 'Pin Code is required';
      else if (!validatePIN(form.pinCode)) e.pinCode = 'Invalid Pin Code (6 digits, non-zero start)';
      if (!form.city.trim())    e.city    = 'City is required';
      if (!form.state.trim())   e.state   = 'State is required';
      if (!form.country.trim()) e.country = 'Country is required';
    }
    if (s === 2) {
      if (!form.bankName)                    e.bankName           = 'Please select a valid bank from the list.';
      if (!form.accountHolderName.trim())    e.accountHolderName  = 'Account Holder Name is required';
      if (!form.accountNumber)               e.accountNumber      = 'Account Number is required';
      else if (!validateAccNo(form.accountNumber)) e.accountNumber = 'Account number must be 9–18 digits';
      if (!form.reAccountNumber)             e.reAccountNumber    = 'Please re-enter account number';
      else if (form.accountNumber !== form.reAccountNumber) e.reAccountNumber = 'Account numbers do not match';
      if (!form.ifscCode.trim())             e.ifscCode           = 'IFSC Code is required';
      else if (!validateIFSC(form.ifscCode.toUpperCase())) e.ifscCode = 'Invalid IFSC — format: SBIN0001234';
    }
    return e;
  };

  /* ── Continue / Submit ── */
  const handleContinue = async () => {
    const e = validateStep(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    if (step < 2) {
      setStep((s) => s + 1);
      setErrors({});
      return;
    }

/* ── Final step: call Seller Onboarding API ── */
setSubmitLoading(true);
setSubmitError('');
// ── Retrieve the logged-in user's email (adjust the key to match your auth storage)
const userEmail =
  location.state?.email ||
  sessionStorage.getItem('pendingEmail') ||
  localStorage.getItem('pendingEmail') ||
  '';

if (!userEmail) {
  setSubmitError('Session expired — your email could not be found. Please sign in again.');
  setSubmitLoading(false);
  return;
}const payload = {
  email: userEmail,
  updateFields: {
    gstin:            form.noGstin ? 'optional' : form.gstin.trim().toUpperCase(),
    panNumber:        form.noGstin ? form.panCard.trim().toUpperCase() : undefined,
    companyName:      form.tradeName.trim(),
    bankName:         form.bankName,
    accountHolder:    form.accountHolderName.trim(),
    accountNumber:    Number(form.accountNumber),
    ifscCode:         form.ifscCode.trim().toUpperCase(),
    storageType:      'Seller',
    address:          [form.houseNo.trim(), form.roadName.trim()].filter(Boolean).join(', '),
    city:             form.city.trim(),
    state:            form.state.trim(),
    country:          form.country.trim(),
    pincode:          form.pinCode.trim(),
    status:           'Active',
    onboardDateTime:  new Date().toISOString(),
    accountManager:   'Haatza Support Team',
  },
};

console.group("[Onboarding] Data being saved to DB");
console.log("Full payload:", JSON.stringify(payload, null, 2));
console.groupEnd();
try {
  const res = await fetch('https://www.haatzaseller.com/_functions/Selleronboarding', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  let data = {};
  try { data = await res.json(); } catch { /* non-JSON response */ }

console.group("[Onboarding] API response");
console.log("HTTP status:", res.status);
console.log("Full response:", JSON.stringify(data, null, 2));
console.groupEnd();
  if (!res.ok) {
    const serverMsg = data?.message || data?.error || `Server error ${res.status}`;
    setSubmitError(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));
    return;
  }

  const isSuccess =
    data?.status === 'success' ||
    data?.message?.message?.toLowerCase().includes('success');

  if (isSuccess) {
    // Extract sellerId from onboarding response
    const sellerId =
  data?.message?.sellerId    ||
  data?.message?.body?.sellerId ||
  data?.message?.SellerID    ||
  data?.message?.body?.SellerID ||
  data?.data?.sellerId       ||
  data?.data?.SellerID       ||
  data?.seller?.sellerId     ||
  data?.SellerID             ||
  data?.sellerId             ||
  "";

    console.log("[Onboarding] Full response:", data);
    console.log("[Onboarding] Resolved sellerId:", sellerId || "❌ NOT FOUND IN RESPONSE");

    if (sellerId) {
      localStorage.setItem("sellerId", String(sellerId));
      sessionStorage.setItem("sellerId", String(sellerId));
      localStorage.setItem("__haatza_sellerId", String(sellerId));
      sessionStorage.setItem("__haatza_sellerId", String(sellerId));
      console.log("[Onboarding] ✅ Stored sellerId:", sellerId);
    } else {
      console.warn("[Onboarding] ⚠️ sellerId not in response — check above log for correct path");
    }

    // ── Capture sellerPinCode from onboarding response ──────────────────
    const sellerPinCodeFromApi =
      data?.message?.sellerPinCode    ||
      data?.message?.body?.sellerPinCode ||
      data?.message?.pinCode          ||
      data?.message?.body?.pinCode    ||
      data?.sellerPinCode             ||
      data?.pinCode                   ||
      "";

    if (sellerPinCodeFromApi && /^\d{6}$/.test(String(sellerPinCodeFromApi).trim())) {
      const pin = String(sellerPinCodeFromApi).trim();
      sessionStorage.setItem("__haatza_sellerPinCode", pin);
      localStorage.setItem("__haatza_sellerPinCode", pin);
      sessionStorage.setItem("sellerPinCode", pin);
      localStorage.setItem("sellerPinCode", pin);
      console.log("[Onboarding] ✅ Stored sellerPinCode from API:", pin);
    } else {
      // Fallback: use the pinCode the seller entered in the form
      const formPin = form.pinCode.trim();
      if (formPin && /^\d{6}$/.test(formPin)) {
        sessionStorage.setItem("__haatza_sellerPinCode", formPin);
        localStorage.setItem("__haatza_sellerPinCode", formPin);
        sessionStorage.setItem("sellerPinCode", formPin);
        localStorage.setItem("sellerPinCode", formPin);
        console.log("[Onboarding] ✅ Stored sellerPinCode from form input:", formPin);
      }
    }

    // Store pinCode so settlement + listing payload can find it
    const pinCode = form.pinCode.trim();
    if (pinCode) {
      localStorage.setItem("sellerPinCode", pinCode);
      sessionStorage.setItem("sellerPinCode", pinCode);
      console.log("[Onboarding] ✅ Stored sellerPinCode:", pinCode);
    }
    const CANONICAL_PIN_KEY    = "__haatza_sellerPinCode";
const CANONICAL_SELLER_KEY = "__haatza_sellerId";

if (pinCode) {
  sessionStorage.setItem(CANONICAL_PIN_KEY, pinCode);
  localStorage.setItem(CANONICAL_PIN_KEY,   pinCode);
  // Also write to legacy keys so any fallback reads still work
  sessionStorage.setItem("sellerPinCode", pinCode);
  localStorage.setItem("sellerPinCode",   pinCode);
  console.log("[Onboarding] ✅ Wrote pinCode to canonical + legacy keys:", pinCode);
}

// If the onboarding response included a sellerId, write it to canonical key too
if (sellerId) {
  sessionStorage.setItem(CANONICAL_SELLER_KEY, String(sellerId));
  localStorage.setItem(CANONICAL_SELLER_KEY,   String(sellerId));
  console.log("[Onboarding] ✅ Wrote sellerId to canonical key:", sellerId);
}

// Re-fetch profile so canonical cache is authoritative for QC payload

    // ✅ ADD THIS: cache under the canonical key and re-fetch full profile

    // Store email under all keys the listing flow checks
    if (userEmail) {
      localStorage.setItem("userEmail", userEmail);
      sessionStorage.setItem("userEmail", userEmail);
    }

    navigate('/dashboard');
  } else {
    setSubmitError(data?.message || 'Submission failed. Please try again.');
  }
} catch (err) {
  console.error('Onboarding fetch error:', err);
  setSubmitError('Network error. Please check your connection and try again.');
} finally {
  setSubmitLoading(false);
}    
  };

  const handleBack = () => {
    if (step > 0) { setStep((s) => s - 1); setErrors({}); }
  };

  const handleLocationSelect = (parsed) => {
    setForm((prev) => ({
      ...prev,
      houseNo:  parsed.houseNo  || prev.houseNo,
      roadName: parsed.roadName || prev.roadName,
      pinCode:  parsed.pinCode  || prev.pinCode,
      city:     parsed.city     || prev.city,
      state:    parsed.state    || prev.state,
      country:  parsed.country  || prev.country,
      landmark: parsed.landmark || prev.landmark,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      ['houseNo', 'roadName', 'pinCode', 'city', 'state', 'country', 'landmark'].forEach((f) => delete next[f]);
      return next;
    });
    setAutofilled(true);
    setShowToast(true);
    setTimeout(() => setAutofilled(false), 1700);
    setTimeout(() => setShowToast(false),  2700);
  };

  const selectBank = (bankName) => {
    handleChange('bankName', bankName);
    setBankSearch('');
    setShowBankList(false);
    setActiveIndex(-1);
  };

  const handleBankKeyDown = (e) => {
    if (!showBankList) return;
    if      (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filteredBanks.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter')     { e.preventDefault(); if (activeIndex >= 0 && filteredBanks[activeIndex]) selectBank(filteredBanks[activeIndex]); }
    else if (e.key === 'Escape')    { setShowBankList(false); setActiveIndex(-1); }
  };

  /* ─── Brand bar ── */
  const BrandBar = () => (
    <div className="ob-brand">
      <div className="ob-brand-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
      </div>
      <h1>Complete your onboarding</h1>
      <p>Provide details to start listing products on Haatza</p>
    </div>
  );

  /* ─── Render ── */
  return (
    <>
      <div className="ob-shell">
        <div className="ob-card">
          <BrandBar />
          <Stepper current={step} />

          {/* ── Step 0: Business Details ── */}
          {step === 0 && (
            <div className="ob-body">
              <h2 className="ob-section-title">Business Details</h2>
              <p className="ob-section-sub">Provide your official business entity details (GSTIN or PAN).</p>

              <FormField label="Trade Name" required error={errors.tradeName}>
                <input
                  className={`form-input ${errors.tradeName ? 'input-error' : ''}`}
                  type="text" placeholder="Trade Name"
                  value={form.tradeName}
                  onChange={(e) => handleChange('tradeName', e.target.value)}
                />
              </FormField>

              <label className="checkbox-label">
                <input
                  type="checkbox" className="checkbox-input" checked={form.noGstin}
                  onChange={(e) => {
                    handleChange('noGstin', e.target.checked);
                    if (e.target.checked) { handleChange('gstin', ''); setGstinStatus('idle'); }
                  }}
                />
                <span className="checkbox-text">I do not have a GSTIN (No GST)</span>
              </label>

              {/* GSTIN field */}
              {!form.noGstin && (() => {
                const isValid = !errors.gstin && form.gstin.length === 15 && gstinStatus !== 'exists';
                return (
                  <FormField label="GSTIN" required error={errors.gstin}>
                    <div style={{ position: 'relative' }}>
                      <input
                        className={`form-input ${errors.gstin ? 'input-error' : isValid ? 'input-valid' : ''}`}
                        style={{ paddingRight: 40 }}
                        type="text" placeholder="e.g. 22ABCDE1234F1Z5" maxLength={15}
                        value={form.gstin}
                        onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                      />
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                        {gstinStatus === 'checking' ? (
                          <SpinnerIcon />
                        ) : isValid ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                        ) : null}
                      </span>
                    </div>
                    {!errors.gstin && (
                      <span className="field-hint">
                        Format: 2-digit state code + PAN + 1Z + check digit (15 chars) · {form.gstin.length}/15
                      </span>
                    )}
                    <GstinStatusBadge status={gstinStatus} />
                  </FormField>
                );
              })()}

              {/* PAN field */}
              {form.noGstin && (() => {
                const isValid = !errors.panCard && form.panCard.length === 10 && validatePAN(form.panCard);
                return (
                  <FormField label="PAN Card Number" required error={errors.panCard}>
                    <div style={{ position: 'relative' }}>
                      <input
                        className={`form-input ${errors.panCard ? 'input-error' : isValid ? 'input-valid' : ''}`}
                        style={{ paddingRight: 40 }}
                        type="text" placeholder="e.g. ABCDE1234F"
                        value={form.panCard} maxLength={10}
                        onChange={(e) => handleChange('panCard', e.target.value.toUpperCase())}
                      />
                      {isValid && (
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                        </span>
                      )}
                    </div>
                    {!errors.panCard && (
                      <span className="field-hint">
                        Format: 5 letters + 4 digits + 1 letter · {form.panCard.length}/10
                      </span>
                    )}
                  </FormField>
                );
              })()}
            </div>
          )}

          {/* ── Step 1: Pickup Address ── */}
          {step === 1 && (
            <div className="ob-body">
              <div className="address-row">
                <div>
                  <h2 className="ob-section-title">Pickup Address</h2>
                  <p className="ob-section-sub" style={{ marginBottom: 0 }}>Where will your products be picked up from?</p>
                </div>
                <button className="location-btn" onClick={() => setShowMapModal(true)}>
                  <LocationIcon /><span>Use My Location</span>
                </button>
              </div>

              <FormField label="House / Building" required error={errors.houseNo}>
                <input
                  className={`form-input ${errors.houseNo ? 'input-error' : ''} ${autofilled && form.houseNo ? 'autofilled' : ''}`}
                  type="text" placeholder="House no. / Building Name"
                  value={form.houseNo}
                  onChange={(e) => handleChange('houseNo', e.target.value)}
                />
              </FormField>

              <FormField label="Road / Area" required error={errors.roadName}>
                <input
                  className={`form-input ${errors.roadName ? 'input-error' : ''} ${autofilled && form.roadName ? 'autofilled' : ''}`}
                  type="text" placeholder="Road Name / Area / Colony"
                  value={form.roadName}
                  onChange={(e) => handleChange('roadName', e.target.value)}
                />
              </FormField>

              <div className="two-col">
                <FormField label="Pin Code" required error={errors.pinCode}>
                  <div style={{ position: 'relative' }}>
                    <input
                      className={`form-input ${errors.pinCode ? 'input-error' : pincodeStatus === 'success' ? 'input-valid' : ''} ${autofilled && form.pinCode ? 'autofilled' : ''}`}
                      style={{ paddingRight: pincodeStatus === 'loading' ? 40 : 14 }}
                      type="text" placeholder="6-digit Pin Code"
                      value={form.pinCode} maxLength={6}
                      onChange={(e) => {
                        setPincodeStatus('idle');
                        setPincodeMsg('');
                        handleChange('pinCode', e.target.value.replace(/\D/g, ''));
                      }}
                    />
                    {pincodeStatus === 'loading' && (
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                        <SpinnerIcon />
                      </span>
                    )}
                  </div>
                  {!errors.pinCode && pincodeStatus === 'loading' && (
                    <span className="pincode-status loading">
                      <SpinnerIcon color="#2962ff" /> Looking up pincode…
                    </span>
                  )}
                  {!errors.pinCode && pincodeStatus === 'success' && (
                    <span className="pincode-status success">✓ {pincodeMsg}</span>
                  )}
                  {!errors.pinCode && pincodeStatus === 'error' && (
                    <span className="pincode-status error">⚠ {pincodeMsg}</span>
                  )}
                </FormField>

                <FormField label="City" required error={errors.city}>
                  <input
                    className={`form-input ${errors.city ? 'input-error' : ''} ${autofilled && form.city ? 'autofilled' : ''}`}
                    type="text" placeholder="City"
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    disabled={pincodeStatus === 'loading'}
                  />
                </FormField>
              </div>

              <div className="two-col">
                <FormField label="State" required error={errors.state}>
                  <input
                    className={`form-input ${errors.state ? 'input-error' : ''} ${autofilled && form.state ? 'autofilled' : ''}`}
                    type="text" placeholder="State"
                    value={form.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    disabled={pincodeStatus === 'loading'}
                  />
                </FormField>
                <FormField label="Country" required error={errors.country}>
                  <input
                    className={`form-input ${errors.country ? 'input-error' : ''} ${autofilled && form.country ? 'autofilled' : ''}`}
                    type="text" placeholder="Country"
                    value={form.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Landmark (Optional)">
                <input
                  className={`form-input ${autofilled && form.landmark ? 'autofilled' : ''}`}
                  type="text" placeholder="Near…"
                  value={form.landmark}
                  onChange={(e) => handleChange('landmark', e.target.value)}
                />
              </FormField>
            </div>
          )}

          {/* ── Step 2: Bank Details ── */}
          {step === 2 && (
            <div className="ob-body">
              <h2 className="ob-section-title">Bank Details</h2>
              <p className="ob-section-sub">Where should we send your payouts? Account name must match your GSTIN or Trade name.</p>

              <FormField label="Bank Name" required error={errors.bankName}>
                <div className="bank-selector">
                  <div className="bank-input-wrap">
                    <svg className="bank-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      ref={bankInputRef}
                      className={`form-input bank-search-input ${errors.bankName ? 'input-error' : ''}`}
                      type="text" placeholder="Search bank name…" autoComplete="off"
                      value={form.bankName ? form.bankName : bankSearch}
                      onFocus={() => {
                        if (form.bankName) setBankSearch('');
                        handleChange('bankName', '');
                        setShowBankList(true);
                        setActiveIndex(-1);
                      }}
                      onChange={(e) => {
                        setBankSearch(e.target.value);
                        handleChange('bankName', '');
                        setShowBankList(true);
                        setActiveIndex(-1);
                      }}
                      onKeyDown={handleBankKeyDown}
                    />
                    {(bankSearch || form.bankName) && (
                      <button
                        className="bank-clear-btn"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setBankSearch('');
                          handleChange('bankName', '');
                          setShowBankList(true);
                          if (bankInputRef.current) bankInputRef.current.focus();
                        }}
                        title="Clear"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {showBankList && (
                    <div className="bank-dropdown-wrap">
                      <div className="bank-dropdown-header">
                        {bankSearch.trim() === '' ? (
                          <span>{WORLD_BANKS.length} banks available — type to search</span>
                        ) : (
                          <span>{filteredBanks.length} result{filteredBanks.length !== 1 ? 's' : ''} for "<strong>{bankSearch}</strong>"</span>
                        )}
                      </div>
                      <ul ref={bankDropdownRef} className="bank-dropdown">
                        {filteredBanks.length > 0 ? filteredBanks.map((b, idx) => {
                          const lowerB = b.toLowerCase();
                          const lowerQ = bankSearch.toLowerCase().trim();
                          const start  = lowerQ ? lowerB.indexOf(lowerQ) : -1;
                          return (
                            <li
                              key={b} data-index={idx}
                              className={`bank-option${activeIndex === idx ? ' bank-option-active' : ''}`}
                              onMouseDown={() => selectBank(b)}
                              onMouseEnter={() => setActiveIndex(idx)}
                            >
                              {start >= 0 && lowerQ ? (
                                <>
                                  {b.slice(0, start)}
                                  <mark className="bank-highlight">{b.slice(start, start + lowerQ.length)}</mark>
                                  {b.slice(start + lowerQ.length)}
                                </>
                              ) : b}
                            </li>
                          );
                        }) : (
                          <li className="bank-option bank-no-result">No banks found for "{bankSearch}"</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </FormField>

              <FormField label="Account Holder Name" required error={errors.accountHolderName}>
                <input
                  className={`form-input ${errors.accountHolderName ? 'input-error' : ''}`}
                  type="text" placeholder="Full name as per bank records"
                  value={form.accountHolderName}
                  onChange={(e) => handleChange('accountHolderName', e.target.value)}
                />
              </FormField>

              {/* Account Number */}
              {(() => {
                const isValid = !errors.accountNumber && form.accountNumber.length >= 9 && form.accountNumber.length <= 18;
                return (
                  <FormField label="Account Number" required error={errors.accountNumber}>
                    <div className="account-input-wrap">
                      <input
                        className={`form-input account-input ${errors.accountNumber ? 'input-error' : isValid ? 'input-valid' : ''}`}
                        type={showAccountNumber ? 'text' : 'password'}
                        placeholder="9–18 digit account number"
                        value={form.accountNumber} maxLength={18}
                        onChange={(e) => handleChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                      />
                      <button type="button" className="eye-toggle-btn" onClick={() => setShowAccountNumber((v) => !v)}>
                        {showAccountNumber ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                    {!errors.accountNumber && (
                      <span className="field-hint">Digits only, 9–18 characters · {form.accountNumber.length} entered</span>
                    )}
                  </FormField>
                );
              })()}

              {/* Re-enter Account Number */}
              {(() => {
                const match = form.reAccountNumber && form.reAccountNumber === form.accountNumber;
                return (
                  <FormField label="Re-enter Account Number" required error={errors.reAccountNumber}>
                    <div className="account-input-wrap">
                      <input
                        className={`form-input account-input ${errors.reAccountNumber ? 'input-error' : match ? 'input-valid' : ''}`}
                        type={showReAccountNumber ? 'text' : 'password'}
                        placeholder="Re-enter account number"
                        value={form.reAccountNumber} maxLength={18}
                        onChange={(e) => handleChange('reAccountNumber', e.target.value.replace(/\D/g, ''))}
                      />
                      <button type="button" className="eye-toggle-btn" onClick={() => setShowReAccountNumber((v) => !v)}>
                        {showReAccountNumber ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </FormField>
                );
              })()}

              {/* IFSC */}
              {(() => {
                const isValid = !errors.ifscCode && form.ifscCode.length === 11 && validateIFSC(form.ifscCode);
                return (
                  <FormField label="IFSC Code" required error={errors.ifscCode}>
                    <div style={{ position: 'relative' }}>
                      <input
                        className={`form-input ${errors.ifscCode ? 'input-error' : isValid ? 'input-valid' : ''}`}
                        style={{ paddingRight: 40 }}
                        type="text" placeholder="e.g. SBIN0001234"
                        value={form.ifscCode} maxLength={11}
                        onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())}
                      />
                      {isValid && (
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                        </span>
                      )}
                    </div>
                    {!errors.ifscCode && (
                      <span className="field-hint">Format: 4 letters + 0 + 6 alphanumeric · {form.ifscCode.length}/11</span>
                    )}
                  </FormField>
                );
              })()}
            </div>
          )}

          {/* Submit error banner — only shown on step 2 */}
          {submitError && step === 2 && (
            <p className="error-message" style={{ margin: '0 0 12px', textAlign: 'center' }}>
              {submitError}
            </p>
          )}

          {/* Nav buttons */}
          <div className="ob-nav">
            {step > 0 ? (
              <button className="btn-back" onClick={handleBack} disabled={submitLoading}>Back</button>
            ) : (
              <div className="btn-spacer" />
            )}
            <button className="btn-continue" onClick={handleContinue} disabled={submitLoading}>
              {step < 2 ? 'Continue' : submitLoading ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>

        </div>
      </div>

      {showMapModal && (
        <MapModal onClose={() => setShowMapModal(false)} onSelectAddress={handleLocationSelect} />
      )}

      {showToast && (
        <div className="location-toast"><span>✓</span> Address filled from map</div>
      )}
    </>
  );
}