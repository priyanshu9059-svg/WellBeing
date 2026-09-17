'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CalendarClock, Check, ChevronRight, Clock3, Cross, LocateFixed, MapPin, Navigation, Phone, Search, Shield, Star, Stethoscope, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isApiEnabled } from '@/lib/api';
import { getServices, type AppointmentDto } from '@/services';

type ServiceType = 'Psychiatrist/Psychological clinics' | 'Hospitals' | 'Police station';
type Filter = 'All' | ServiceType;
type Place = { id:string; name:string; type:ServiceType; area:string; distance:string; distanceKm:number; rating:string; reviews:number; phone:string; hours:string; next:string; specialties:string[]; mapsUrl:string };
type Appointment = { id:string; place:string; clinician:string; date:string; time:string; mode:string; status:AppointmentDto['status'] };
type GooglePlaceResult = { place_id?:string; name?:string; formatted_address?:string; vicinity?:string; rating?:number; user_ratings_total?:number; formatted_phone_number?:string; international_phone_number?:string; opening_hours?:{ open_now?:boolean } };

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          PlacesService: new (node: HTMLDivElement) => {
            textSearch: (request: { query: string }, callback: (results: GooglePlaceResult[] | null, status: string) => void) => void;
          };
          PlacesServiceStatus: { OK: string };
        };
      };
    };
  }
}

const APPOINTMENTS_KEY = 'wellbeing-support:appointments';
const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
let mapsScriptPromise: Promise<void> | null = null;

const categoryQueries: Record<ServiceType, string> = {
  'Psychiatrist/Psychological clinics': 'psychiatrist psychologist psychology clinic mental health clinic',
  Hospitals: 'mental health hospital psychiatry hospital trauma hospital',
  'Police station': 'police station',
};

const demoPlaces: Place[] = [
  { id:'demo-1', name:'Serenity Mind Clinic', type:'Psychiatrist/Psychological clinics', area:'Indiranagar, Bengaluru', distance:'1.2 km', distanceKm:1.2, rating:'4.8', reviews:126, phone:'+91 80 4567 2100', hours:'Open today', next:'Today, 5:30 PM', specialties:['Psychology','Trauma','Young adults'], mapsUrl:'https://www.google.com/maps/search/?api=1&query=Serenity%20Mind%20Clinic%20Indiranagar' },
  { id:'demo-2', name:'Mindful Psychiatry & Wellness', type:'Psychiatrist/Psychological clinics', area:'HAL 2nd Stage, Bengaluru', distance:'2.8 km', distanceKm:2.8, rating:'4.6', reviews:74, phone:'+91 80 4098 1122', hours:'Open today', next:'Wed, 3:00 PM', specialties:['Psychiatry','Sleep','Mood'], mapsUrl:'https://www.google.com/maps/search/?api=1&query=Mindful%20Psychiatry%20Wellness%20Bengaluru' },
  { id:'demo-3', name:'City Wellness Hospital', type:'Hospitals', area:'Old Airport Road, Bengaluru', distance:'3.9 km', distanceKm:3.9, rating:'4.3', reviews:214, phone:'+91 80 4111 2200', hours:'Open 24 hours', next:'Emergency desk', specialties:['Emergency','Psychiatry','Trauma'], mapsUrl:'https://www.google.com/maps/search/?api=1&query=City%20Wellness%20Hospital%20Bengaluru' },
  { id:'demo-4', name:'Indiranagar Police Station', type:'Police station', area:'Indiranagar, Bengaluru', distance:'1.7 km', distanceKm:1.7, rating:'-', reviews:0, phone:'112', hours:'Open 24 hours', next:'Walk-in support', specialties:['Emergency help','Safety support'], mapsUrl:'https://www.google.com/maps/search/?api=1&query=Indiranagar%20Police%20Station' },
];

const initialAppointments: Appointment[] = [
  { id:'1', place:'Serenity Mind Clinic', clinician:'Rohan Iyer, Counsellor', date:'18 Sep 2026', time:'11:00 AM', mode:'Video consultation', status:'Confirmed' },
  { id:'2', place:'City Wellness Hospital', clinician:'Available care professional', date:'02 Sep 2026', time:'4:30 PM', mode:'In person', status:'Completed' },
];

function loadGoogleMaps() {
  if (!googleMapsKey) return Promise.reject(new Error('Google Maps browser key is not configured.'));
  if (window.google?.maps?.places) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;
  mapsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once:true });
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load.')), { once:true });
      return;
    }
    const script = document.createElement('script');
    script.dataset.googleMaps = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsKey)}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps failed to load.'));
    document.head.appendChild(script);
  });
  return mapsScriptPromise;
}

function classifyPlace(place: GooglePlaceResult, filter: Filter): ServiceType {
  if (filter !== 'All') return filter;
  const text = `${place.name ?? ''} ${place.formatted_address ?? ''} ${place.vicinity ?? ''}`.toLowerCase();
  if (text.includes('police')) return 'Police station';
  if (text.includes('hospital') || text.includes('medical')) return 'Hospitals';
  return 'Psychiatrist/Psychological clinics';
}

function googlePlaceToPlace(place: GooglePlaceResult, filter: Filter): Place {
  const area = place.formatted_address ?? place.vicinity ?? 'Nearby';
  const name = place.name ?? 'Nearby care option';
  const phone = place.international_phone_number ?? place.formatted_phone_number ?? '';
  return {
    id: place.place_id ?? `${name}-${area}`,
    name,
    type: classifyPlace(place, filter),
    area,
    distance: 'Nearby',
    distanceKm: Number.MAX_SAFE_INTEGER,
    rating: place.rating ? place.rating.toFixed(1) : '-',
    reviews: place.user_ratings_total ?? 0,
    phone,
    hours: place.opening_hours?.open_now === true ? 'Open now' : place.opening_hours?.open_now === false ? 'Closed now' : 'Check hours',
    next: 'Contact provider',
    specialties: [classifyPlace(place, filter), 'Google result'],
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${area}`)}`,
  };
}

function mapAppointment(a: AppointmentDto): Appointment {
  return { id: a.id, place: a.place, clinician: a.clinician, date: a.date, time: a.time, mode: a.mode, status: a.status };
}

function loadCachedAppointments(): Appointment[] {
  try {
    const saved = localStorage.getItem(APPOINTMENTS_KEY);
    if (!saved) return initialAppointments;
    return (JSON.parse(saved) as Appointment[]).map((a) => ({ ...a, id: String(a.id) }));
  } catch {
    return initialAppointments;
  }
}

export function ConsultancyHub(){
  const services = getServices();
  const [view,setView]=useState<'discover'|'appointments'>('discover');
  const [filter,setFilter]=useState<Filter>('All');
  const [selected,setSelected]=useState<Place>(demoPlaces[0]);
  const [query,setQuery]=useState('');
  const [location,setLocation]=useState('Indiranagar, Bengaluru');
  const [coords,setCoords]=useState('');
  const [locationMessage,setLocationMessage]=useState('');
  const [booking,setBooking]=useState<Place|null>(null);
  const [booked,setBooked]=useState(false);
  const [bookingError,setBookingError]=useState<string|null>(null);
  const [places,setPlaces]=useState<Place[]>(demoPlaces);
  const [loadingPlaces,setLoadingPlaces]=useState(false);
  const [placesMessage,setPlacesMessage]=useState(googleMapsKey ? 'Google Places results will appear here.' : 'Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show live Google results here.');
  const serviceNodeRef=useRef<HTMLDivElement|null>(null);
  const [appointments,setAppointments]=useState<Appointment[]>(()=>typeof window === 'undefined' ? initialAppointments : loadCachedAppointments());
  const [date,setDate]=useState('2026-09-18');
  const [time,setTime]=useState('11:00 AM');
  const [mode,setMode]=useState('In person');
  const saveAppointments=(next:Appointment[])=>{setAppointments(next);try{localStorage.setItem(APPOINTMENTS_KEY,JSON.stringify(next))}catch{}};
  const searchArea = coords || location;
  const categoryText = filter === 'All' ? 'psychiatrist psychologist clinic hospital police station' : categoryQueries[filter];
  const mapSearch = encodeURIComponent(`${query || categoryText} near ${searchArea}`);
  const mapUrl = `https://www.google.com/maps?q=${mapSearch}&output=embed`;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapSearch}`;
  const visible=useMemo(()=>places.filter(p=>(filter==='All'||p.type===filter)&&`${p.name} ${p.area} ${p.specialties.join(' ')}`.toLowerCase().includes(query.toLowerCase())),[filter,places,query]);

  useEffect(()=>{ if (visible[0]) setSelected(visible[0]); },[visible]);
  useEffect(()=>{ void refreshGooglePlaces(); },[filter, searchArea]);
  useEffect(()=>{ let cancelled=false; async function load(){ if(!isApiEnabled()) return; try{const remote=await services.care.listAppointments(); if(!cancelled&&remote.length) saveAppointments(remote.map(mapAppointment));}catch{} } void load(); return()=>{cancelled=true}; },[]);

  async function refreshGooglePlaces(nextLocation=location) {
    const area = coords || nextLocation;
    if (!googleMapsKey) {
      setPlaces(demoPlaces.filter(p=>filter==='All'||p.type===filter));
      return;
    }
    setLoadingPlaces(true);
    setPlacesMessage('Loading Google Places results...');
    try {
      await loadGoogleMaps();
      if (!serviceNodeRef.current || !window.google?.maps?.places) throw new Error('Google Places is unavailable.');
      const service = new window.google.maps.places.PlacesService(serviceNodeRef.current);
      const categories = filter === 'All' ? (Object.keys(categoryQueries) as ServiceType[]) : [filter];
      const batches = await Promise.all(categories.map(category => new Promise<Place[]>((resolve) => {
        service.textSearch({ query: `${categoryQueries[category]} near ${area}` }, (results, status) => {
          if (status !== window.google?.maps.places.PlacesServiceStatus.OK || !results) return resolve([]);
          resolve(results.slice(0, 8).map(place => googlePlaceToPlace(place, category)));
        });
      })));
      const next = batches.flat();
      setPlaces(next.length ? next : demoPlaces.filter(p=>filter==='All'||p.type===filter));
      setPlacesMessage(next.length ? 'Showing live Google Places results.' : 'No Google Places results found. Showing demo suggestions.');
    } catch {
      setPlaces(demoPlaces.filter(p=>filter==='All'||p.type===filter));
      setPlacesMessage('Could not load Google Places results. Showing demo suggestions.');
    } finally {
      setLoadingPlaces(false);
    }
  }

  function searchMap() {
    const next = location.trim() || 'India';
    setCoords('');
    setLocation(next);
    void refreshGooglePlaces(next);
  }

  const useLocation=()=>{if(!navigator.geolocation){setLocationMessage('Location is not available in this browser.');return}setLocationMessage('Finding your area...');navigator.geolocation.getCurrentPosition((position)=>{const next=`${position.coords.latitude.toFixed(5)},${position.coords.longitude.toFixed(5)}`;setCoords(next);setLocation('Current location');setLocationMessage('Map centred near your current location.');void refreshGooglePlaces(next)},()=>setLocationMessage('Location was not shared. You can search an area instead.'))};
  const confirmBooking=async()=>{if(!booking)return;setBookingError(null);const formatted=new Date(`${date}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});const clinician=booking.type==='Hospitals'?'Available hospital desk':'Available care professional';const local:Appointment={id:String(Date.now()),place:booking.name,clinician,date:formatted,time,mode,status:'Confirmed'};if(isApiEnabled()){try{const created=await services.care.bookAppointment({placeId:booking.id,placeName:booking.name,clinician,date:formatted,time,mode});saveAppointments([mapAppointment(created),...appointments]);setBooked(true);return}catch(e){setBookingError(e instanceof Error?e.message:'Booking failed.');}}saveAppointments([local,...appointments]);setBooked(true)};

  return <div className="consultancy-hub">
    <div ref={serviceNodeRef} hidden/>
    <Card className="care-notice"><span className="soft-icon"><MapPin/></span><div><b>Nearby care, with you in control</b><p>Search an area like Agra, use your browser location, and see matching Google Places results in the suggested list when Maps is configured.</p></div></Card>
    <div className="section-tabs" role="tablist" aria-label="Consultancy sections"><button className={view==='discover'?'active':''} onClick={()=>setView('discover')}><Search/>Find nearby care</button><button className={view==='appointments'?'active':''} onClick={()=>setView('appointments')}><CalendarClock/>Appointments <span>{appointments.filter(a=>a.status==='Confirmed'||a.status==='Requested').length}</span></button></div>
    {view==='discover'?<>
      <div className="care-search"><div className="location-field"><MapPin/><label><span>Map search area</span><input value={location} onChange={e=>{setLocation(e.target.value);setCoords('')}} onKeyDown={e=>{if(e.key==='Enter')searchMap()}} placeholder="Try Agra, Delhi, Mumbai..."/></label><Button variant="secondary" onClick={searchMap}><Search/>Search map</Button><Button variant="secondary" onClick={useLocation}><LocateFixed/>Use my location</Button></div>{locationMessage&&<p className="location-message">{locationMessage}</p>}<div className="care-filter-row"><div className="search care-query"><Search/><input placeholder="Search within suggested places" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="service-filters">{(['All','Psychiatrist/Psychological clinics','Hospitals','Police station'] as const).map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item==='Police station'?<Shield/>:item==='All'?<Building2/>:item==='Hospitals'?<Cross/>:<Stethoscope/>}{item}</button>)}</div></div></div>
      <div className="care-explorer">
        <section className="care-map google-care-map" aria-label="Google map search for nearby services"><iframe title="Google Maps nearby mental health search" src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><div className="map-search-overlay"><div className="search"><Search/><input value={location} onChange={e=>{setLocation(e.target.value);setCoords('')}} onKeyDown={e=>{if(e.key==='Enter')searchMap()}} placeholder="Search map area, e.g. Agra"/></div><button onClick={searchMap}>Search</button></div><div className="map-key google-map-key"><span><i className="clinic-dot"/>Google Maps search</span><small><a target="_blank" rel="noreferrer" href={mapsLink}>Open full map <Navigation size={14}/></a></small></div></section>
        <section className="place-list" aria-label="Nearby services"><div className="list-head"><div><p className="kicker">Near {location}</p><h2>{visible.length} suggested places nearby</h2><p className="fine-print">{loadingPlaces?'Refreshing results...':placesMessage}</p></div><select aria-label="Sort services" defaultValue="distance"><option value="distance">Nearest first</option><option value="rating">Top rated</option></select></div>{visible.length?visible.map(p=><article key={p.id} className={`place-card ${selected.id===p.id?'selected':''}`} onClick={()=>setSelected(p)}><div className={`place-symbol ${p.type==='Police station'?'police':''}`}>{p.type==='Police station'?<Shield/>:p.type==='Hospitals'?<Cross/>:<Stethoscope/>}</div><div className="place-info"><span className="place-type">{p.type} · {p.distance}</span><h3>{p.name}</h3><p><MapPin/> {p.area} · {p.hours}</p>{p.rating!=='-'&&<p className="rating"><Star/> {p.rating} <span>({p.reviews} Google reviews)</span></p>}<div className="specialty-row">{p.specialties.map(s=><span key={s}>{s}</span>)}</div><div className="place-actions">{p.phone?<a className="btn btn-secondary" href={`tel:${p.phone.replace(/\s/g,'')}`} onClick={e=>e.stopPropagation()}><Phone/>Call</a>:null}<a className="btn btn-secondary" target="_blank" rel="noreferrer" href={p.mapsUrl} onClick={e=>e.stopPropagation()}><Navigation/>Google Maps</a>{p.type!=='Police station'&&<Button onClick={e=>{e.stopPropagation();setBooking(p);setBooked(false);setBookingError(null)}}>Book appointment</Button>}</div></div><ChevronRight/></article>):<Card className="empty-care"><Search/><h3>No matching services</h3><p>Try another area, category, or search term.</p></Card>}</section>
      </div>
    </>:<AppointmentCenter appointments={appointments} setAppointments={saveAppointments}/>} 
    {booking&&<div className="mini-modal booking-modal"><div>{booked?<div className="booking-success"><span><Check/></span><p className="kicker">Request added</p><h3>Your appointment is scheduled.</h3><p>You can track updates in the Appointments tab. {isApiEnabled()?'The provider may still need to confirm the slot.':'This prototype does not send the request to the provider.'}</p>{bookingError&&<p className="error-text">{bookingError} Saved locally as a fallback.</p>}<Button onClick={()=>{setBooking(null);setBooked(false);setView('appointments')}}>View appointments</Button></div>:<><button className="icon-button booking-close" onClick={()=>setBooking(null)} aria-label="Close"><X/></button><p className="kicker">Schedule consultation</p><h3>{booking.name}</h3><p className="fine-print">Choose a preferred slot. In production, the provider must confirm it.</p><div className="booking-grid"><label className="field"><span>Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="field"><span>Time</span><select value={time} onChange={e=>setTime(e.target.value)}><option>11:00 AM</option><option>3:00 PM</option><option>5:30 PM</option></select></label></div><label className="field"><span>Consultation mode</span><select value={mode} onChange={e=>setMode(e.target.value)}><option>In person</option><option>Video consultation</option><option>Phone call</option></select></label><label className="check"><input type="checkbox" required/><span><b>I understand this is a prototype request</b><small>{isApiEnabled()?'Your request is sent to the support API when connected.':'No provider receives information from this frontend demo.'}</small></span></label>{bookingError&&<p className="error-text">{bookingError}</p>}<Button onClick={confirmBooking}><CalendarClock/>Request appointment</Button></>}</div></div>}
  </div>
}

function AppointmentCenter({appointments,setAppointments}:{appointments:Appointment[];setAppointments:(items:Appointment[])=>void}) {
  const services=getServices();
  const [tab,setTab]=useState<'upcoming'|'history'>('upcoming');
  const isUpcoming=(s:Appointment['status'])=>s==='Confirmed'||s==='Requested';
  const items=appointments.filter(a=>tab==='upcoming'?isUpcoming(a.status):!isUpcoming(a.status));
  const cancel=async(id:string)=>{const next=appointments.map(a=>a.id===id?{...a,status:'Cancelled' as const}:a);if(isApiEnabled()){try{await services.care.updateAppointment(id,'Cancelled')}catch{}}setAppointments(next)};
  return <div className="appointment-center"><Card className="appointment-summary"><div><p className="kicker">Your next appointment</p><h2>{appointments.find(a=>isUpcoming(a.status))?.date||'Nothing scheduled'}</h2><p>{appointments.find(a=>isUpcoming(a.status))?.place||'Explore nearby care when you are ready.'}</p></div><span className="appointment-calendar"><CalendarClock/></span></Card><div className="sub-tabs"><button className={tab==='upcoming'?'active':''} onClick={()=>setTab('upcoming')}>Upcoming</button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>History</button></div><div className="appointment-list">{items.length?items.map(a=><Card key={a.id} className="appointment-card"><div className="date-tile"><b>{a.date.split(' ')[0]}</b><span>{a.date.split(' ')[1]}</span></div><div><span className={`status status-${a.status.toLowerCase()}`}>{a.status}</span><h3>{a.place}</h3><p>{a.clinician}</p><div className="appointment-meta"><span><Clock3/>{a.time}</span><span>{a.mode==='Video consultation'?<Video/>:<MapPin/>}{a.mode}</span></div></div><div className="appointment-actions">{isUpcoming(a.status)&&<><Button variant="secondary">View details</Button><Button variant="ghost" onClick={()=>cancel(a.id)}>Cancel</Button></>}</div></Card>):<Card className="empty-care"><CalendarClock/><h3>No {tab} appointments</h3><p>Your appointment updates will appear here.</p></Card>}</div></div>
}
