'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CalendarClock, Check, ChevronRight, Clock3, Cross, ExternalLink, HandHeart, LocateFixed, MapPin, Navigation, Phone, Search, Shield, Star, Stethoscope, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ensureSession, isApiEnabled } from '@/lib/api';
import { getServices, type AppointmentDto } from '@/services';

type ServiceType = 'Mental health clinics' | 'Hospitals' | 'Police stations' | 'Trauma support & NGOs';
type Filter = 'All' | ServiceType;
type Place = { id:string; name:string; type:ServiceType; area:string; distance:string; distanceKm:number; rating:string; reviews:number; phone:string; hours:string; next:string; specialties:string[]; mapsUrl:string; website?:string };
type Appointment = { id:string; place:string; clinician:string; date:string; time:string; mode:string; status:AppointmentDto['status'] };
type GooglePlaceResult = { place_id?:string; name?:string; formatted_address?:string; vicinity?:string; rating?:number; user_ratings_total?:number; formatted_phone_number?:string; international_phone_number?:string; opening_hours?:{ open_now?:boolean } };
type OsmElement = { id:number; type:'node'|'way'|'relation'; lat?:number; lon?:number; center?:{lat:number;lon:number}; tags?:Record<string,string> };
type NominatimPlace = { place_id:number; lat:string; lon:string; name?:string; display_name:string; extratags?:Record<string,string> };

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
  'Mental health clinics': 'psychiatrist psychologist psychology clinic mental health clinic',
  Hospitals: 'mental health hospital psychiatry hospital trauma hospital',
  'Police stations': 'police station',
  'Trauma support & NGOs': 'trauma support NGO crisis counselling nonprofit',
};

const overpassEndpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
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
  if (text.includes('police')) return 'Police stations';
  if (text.includes('ngo') || text.includes('foundation') || text.includes('trust') || text.includes('support')) return 'Trauma support & NGOs';
  if (text.includes('hospital') || text.includes('medical')) return 'Hospitals';
  return 'Mental health clinics';
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

function distanceBetween(lat1:number,lon1:number,lat2:number,lon2:number){
  const radians=(degrees:number)=>degrees*Math.PI/180;
  const dLat=radians(lat2-lat1);const dLon=radians(lon2-lon1);
  const value=Math.sin(dLat/2)**2+Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(dLon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(value),Math.sqrt(1-value));
}

function osmType(tags:Record<string,string>):ServiceType{
  if(tags.amenity==='police')return 'Police stations';
  if(tags.amenity==='hospital'||tags.healthcare==='hospital')return 'Hospitals';
  if(tags.office==='ngo'||tags.amenity==='social_facility')return 'Trauma support & NGOs';
  return 'Mental health clinics';
}

function osmAddress(tags:Record<string,string>){
  const street=[tags['addr:housenumber'],tags['addr:street']].filter(Boolean).join(' ');
  return [street,tags['addr:suburb'],tags['addr:city']].filter(Boolean).join(', ')||tags['addr:full']||tags.description||'Address available on the map';
}

async function fetchNominatimNearby(area:string,coordinateSearch:string,filter:Filter):Promise<Place[]>{
  const categories:ServiceType[]=filter==='All'?['Hospitals','Mental health clinics','Police stations','Trauma support & NGOs']:[filter];
  const terms:Record<ServiceType,string>={Hospitals:'hospital','Mental health clinics':'mental health clinic psychologist psychiatrist','Police stations':'police station','Trauma support & NGOs':'trauma support NGO crisis counselling'};
  const coordinates=coordinateSearch?coordinateSearch.split(',').map(Number):null;
  const results:Place[]=[];
  for(let index=0;index<categories.length;index+=1){
    if(index>0)await new Promise(resolve=>setTimeout(resolve,1050));
    const category=categories[index];const url=new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q',coordinates?terms[category]:`${terms[category]} near ${area}`);
    url.searchParams.set('format','jsonv2');url.searchParams.set('limit','10');url.searchParams.set('addressdetails','1');url.searchParams.set('extratags','1');
    if(coordinates){
      const [lat,lon]=coordinates;url.searchParams.set('viewbox',`${lon-.08},${lat+.08},${lon+.08},${lat-.08}`);url.searchParams.set('bounded','1');
    }
    const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)continue;
    const places=await response.json() as NominatimPlace[];
    for(const place of places){
      const lat=Number(place.lat);const lon=Number(place.lon);const extras=place.extratags??{};
      const distanceKm=coordinates?distanceBetween(coordinates[0],coordinates[1],lat,lon):Number.MAX_SAFE_INTEGER;
      results.push({id:`nominatim-${place.place_id}`,name:place.name||place.display_name.split(',')[0],type:category,area:place.display_name,distance:coordinates?`${distanceKm.toFixed(1)} km`:'Nearby',distanceKm,rating:'-',reviews:0,phone:extras.phone||extras['contact:phone']||'',hours:extras.opening_hours||'Contact for hours',next:'Contact service',specialties:[category],website:extras.website||extras['contact:website']||'',mapsUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.display_name)}`});
    }
  }
  return Array.from(new Map(results.map(place=>[place.id,place])).values()).slice(0,40);
}

async function fetchDirectNearby(area:string,coordinateSearch:string):Promise<Place[]>{
  let latitude:number;let longitude:number;
  if(coordinateSearch){
    [latitude,longitude]=coordinateSearch.split(',').map(Number);
  }else{
    const geocodeUrl=new URL('https://nominatim.openstreetmap.org/search');
    geocodeUrl.searchParams.set('q',area);geocodeUrl.searchParams.set('format','jsonv2');geocodeUrl.searchParams.set('limit','1');
    const geocodeResponse=await fetch(geocodeUrl,{headers:{Accept:'application/json'}});
    if(!geocodeResponse.ok)throw new Error('Location search is temporarily unavailable.');
    const matches=await geocodeResponse.json() as Array<{lat:string;lon:string}>;
    if(!matches.length)throw new Error('We could not find that location. Try a city, area, or postcode.');
    latitude=Number(matches[0].lat);longitude=Number(matches[0].lon);
  }
  const around=`(around:5000,${latitude},${longitude})`;
  const overpassQuery=`[out:json][timeout:25];(
    nwr["amenity"="police"]${around};nwr["amenity"="hospital"]${around};nwr["healthcare"="hospital"]${around};
    nwr["amenity"="clinic"]${around};nwr["healthcare"~"psychiatrist|psychotherapist|psychologist|mental_health|clinic"]${around};
    nwr["office"="ngo"]["name"~"trauma|mental|crisis|support|violence|women|child|counsel|rehabilitation",i]${around};
    nwr["amenity"="social_facility"]["social_facility"~"counselling|outreach|shelter|ambulatory_care"]${around};
  );out center tags;`;
  let elements:OsmElement[]|null=null;
  for(const endpoint of overpassEndpoints){
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:overpassQuery})});
      if(!response.ok)continue;
      elements=((await response.json()) as {elements:OsmElement[]}).elements;break;
    }catch{}
  }
  if(!elements)throw new Error('Nearby services are temporarily unavailable. Please try again.');
  return elements.flatMap((element):Place[]=>{
    const lat=element.lat??element.center?.lat;const lon=element.lon??element.center?.lon;const tags=element.tags??{};
    if(lat===undefined||lon===undefined||!tags.name)return [];
    const type=osmType(tags);const distanceKm=distanceBetween(latitude,longitude,lat,lon);const address=osmAddress(tags);
    const details=(tags['healthcare:speciality']||tags.social_facility||'').split(';').filter(Boolean).map(value=>value.replaceAll('_',' '));
    return [{id:`osm-${element.type}-${element.id}`,name:tags.name,type,area:address,distance:`${distanceKm.toFixed(1)} km`,distanceKm,rating:'-',reviews:0,phone:tags.phone||tags['contact:phone']||'',hours:tags.opening_hours||'Contact for hours',next:'Contact service',specialties:[type==='Trauma support & NGOs'?'Trauma and community support':type,...details].slice(0,3),website:tags.website||tags['contact:website']||'',mapsUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tags.name} ${address}`)}`}];
  }).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,40);
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
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [location,setLocation]=useState('');
  const [activeLocation,setActiveLocation]=useState('');
  const [coords,setCoords]=useState('');
  const [locationMessage,setLocationMessage]=useState('');
  const [profileLocationReady,setProfileLocationReady]=useState(false);
  const [booking,setBooking]=useState<Place|null>(null);
  const [booked,setBooked]=useState(false);
  const [bookingError,setBookingError]=useState<string|null>(null);
  const [places,setPlaces]=useState<Place[]>([]);
  const [loadingPlaces,setLoadingPlaces]=useState(false);
  const [placesMessage,setPlacesMessage]=useState('Search an area to see nearby services here.');
  const [sort,setSort]=useState<'distance'|'rating'>('distance');
  const serviceNodeRef=useRef<HTMLDivElement|null>(null);
  const [appointments,setAppointments]=useState<Appointment[]>(()=>typeof window === 'undefined' ? initialAppointments : loadCachedAppointments());
  const [date,setDate]=useState('2026-09-18');
  const [time,setTime]=useState('11:00 AM');
  const [mode,setMode]=useState('In person');
  const saveAppointments=(next:Appointment[])=>{setAppointments(next);try{localStorage.setItem(APPOINTMENTS_KEY,JSON.stringify(next))}catch{}};
  const searchArea = coords || activeLocation;
  const categoryText = filter === 'All' ? 'mental health clinic hospital police station trauma support NGO' : categoryQueries[filter];
  const mapSearch = encodeURIComponent(`${query || categoryText} near ${searchArea}`);
  const mapUrl = `https://www.google.com/maps?q=${mapSearch}&output=embed`;
  const visible=useMemo(()=>places
    .filter(p=>(filter==='All'||p.type===filter)&&`${p.name} ${p.area} ${p.specialties.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b)=>sort==='rating' ? Number(b.rating==='-'?0:b.rating)-Number(a.rating==='-'?0:a.rating) : a.distanceKm-b.distanceKm),[filter,places,query,sort]);
  const selected = visible.find((place) => place.id === selectedId) ?? visible[0] ?? null;

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        if(isApiEnabled()) await ensureSession();
        const details=services.userProfile.getDetails?await services.userProfile.getDetails():null;
        const saved=details?.location?.trim()||'';
        if(cancelled) return;
        if(saved){
          setLocation(saved);
          setActiveLocation(saved);
          setLocationMessage(`Using your profile location: ${saved}`);
        }else{
          const fallback='Indiranagar, Bengaluru';
          setLocation(fallback);
          setActiveLocation(fallback);
        }
      }catch{
        if(!cancelled){
          const fallback='Indiranagar, Bengaluru';
          setLocation(fallback);
          setActiveLocation(fallback);
        }
      }finally{
        if(!cancelled) setProfileLocationReady(true);
      }
    })();
    return()=>{cancelled=true};
  },[]);
  useEffect(()=>{ if(!profileLocationReady||!searchArea) return; void refreshGooglePlaces(searchArea); },[filter, searchArea, profileLocationReady]);
  useEffect(()=>{ let cancelled=false; async function load(){ if(!isApiEnabled()) return; try{const remote=await services.care.listAppointments(); if(!cancelled&&remote.length) saveAppointments(remote.map(mapAppointment));}catch{} } void load(); return()=>{cancelled=true}; },[]);

  async function refreshGooglePlaces(nextLocation=location) {
    const area = coords || nextLocation;
    setLoadingPlaces(true);
    setPlacesMessage('Finding nearby support services...');
    try {
      let next: Place[] = [];
      if (googleMapsKey) {
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
        next = batches.flat();
      } else {
        const params = new URLSearchParams();
        const coordinateSearch=coords||(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(nextLocation)?nextLocation:'');
        if (coordinateSearch) {
          const [lat,lon]=coordinateSearch.split(',');
          params.set('lat',lat);params.set('lon',lon);params.set('area',location);
        } else {
          params.set('area',nextLocation);
        }
        if(window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1'){
          next=await fetchNominatimNearby(location,coordinateSearch,filter);
          if(!next.length)next=await fetchDirectNearby(location,coordinateSearch);
        }else{
          try{
            const response=await fetch(`/api/nearby?${params}`);
            const data=await response.json() as {places?:Array<Omit<Place,'distance'|'rating'|'reviews'|'next'|'mapsUrl'>>;error?:string};
            if(!response.ok)throw new Error(data.error||'Nearby search failed.');
            next=(data.places||[]).map(place=>({...place,distance:`${place.distanceKm.toFixed(1)} km`,rating:'-',reviews:0,next:'Contact service',mapsUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.area}`)}`}));
          }catch{
            next=await fetchNominatimNearby(location,coordinateSearch,filter);
            if(!next.length)next=await fetchDirectNearby(location,coordinateSearch);
          }
        }
      }
      setPlaces(next);
      setPlacesMessage(next.length ? 'Live nearby results are shown below. Select a category to narrow them down.' : 'No matching services were found within 5 km. Try a nearby city or a broader area.');
    } catch (error) {
      setPlaces([]);
      setPlacesMessage(error instanceof Error ? error.message : 'Could not load nearby services. Please try again.');
    } finally {
      setLoadingPlaces(false);
    }
  }

  function searchMap() {
    const next = location.trim() || 'India';
    setCoords('');
    setLocation(next);
    setActiveLocation(next);
    if(next===activeLocation&&!coords) void refreshGooglePlaces(next);
  }

  const useLocation=()=>{if(!navigator.geolocation){setLocationMessage('Location is not available in this browser.');return}setLocationMessage('Finding your area...');navigator.geolocation.getCurrentPosition((position)=>{const next=`${position.coords.latitude.toFixed(5)},${position.coords.longitude.toFixed(5)}`;setCoords(next);setActiveLocation('Current location');setLocation('Current location');setLocationMessage('Map centred near your current location.')},()=>setLocationMessage('Location was not shared. You can search an area instead.'))};
  const confirmBooking=async()=>{if(!booking)return;setBookingError(null);const formatted=new Date(`${date}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});const clinician=booking.type==='Hospitals'?'Available hospital desk':'Available care professional';const local:Appointment={id:String(Date.now()),place:booking.name,clinician,date:formatted,time,mode,status:'Confirmed'};if(isApiEnabled()){try{const created=await services.care.bookAppointment({placeId:booking.id,placeName:booking.name,clinician,date:formatted,time,mode});saveAppointments([mapAppointment(created),...appointments]);setBooked(true);return}catch(e){setBookingError(e instanceof Error?e.message:'Booking failed.');}}saveAppointments([local,...appointments]);setBooked(true)};

  return <div className="consultancy-hub">
    <div ref={serviceNodeRef} hidden/>
    <Card className="care-notice"><span className="soft-icon"><MapPin/></span><div><b>Nearby care, shown right here</b><p>Search a city, neighbourhood, or postcode to see nearby hospitals, police stations, mental-health clinics, and trauma-support organisations without leaving this page.</p></div></Card>
    <div className="section-tabs" role="tablist" aria-label="Consultancy sections"><button className={view==='discover'?'active':''} onClick={()=>setView('discover')}><Search/>Find nearby care</button><button className={view==='appointments'?'active':''} onClick={()=>setView('appointments')}><CalendarClock/>Appointments <span>{appointments.filter(a=>a.status==='Confirmed'||a.status==='Requested').length}</span></button></div>
    {view==='discover'?<>
      <div className="care-search"><div className="location-field"><MapPin/><label><span>Search area</span><input value={location} onChange={e=>{setLocation(e.target.value);setCoords('')}} onKeyDown={e=>{if(e.key==='Enter')searchMap()}} placeholder="Try Agra, Delhi, Mumbai..."/></label><Button variant="secondary" onClick={searchMap} disabled={loadingPlaces}><Search/>{loadingPlaces?'Searching...':'Find nearby'}</Button><Button variant="secondary" onClick={useLocation}><LocateFixed/>Use my location</Button></div>{locationMessage&&<p className="location-message">{locationMessage}</p>}<div className="care-filter-row"><div className="search care-query"><Search/><input placeholder="Filter these results" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="service-filters">{(['All','Mental health clinics','Hospitals','Police stations','Trauma support & NGOs'] as const).map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item==='Police stations'?<Shield/>:item==='Trauma support & NGOs'?<HandHeart/>:item==='All'?<Building2/>:item==='Hospitals'?<Cross/>:<Stethoscope/>}{item}</button>)}</div></div></div>
      <div className="care-explorer">
        <section className="care-map google-care-map" aria-label="Map of nearby services"><iframe title="Map of nearby mental health and safety services" src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><div className="map-search-overlay"><div className="search"><Search/><input value={location} onChange={e=>{setLocation(e.target.value);setCoords('')}} onKeyDown={e=>{if(e.key==='Enter')searchMap()}} placeholder="Search map area, e.g. Agra"/></div><button onClick={searchMap}>Search</button></div><div className="map-key google-map-key"><span><i className="clinic-dot"/>Map preview</span><small>Full results are shown beside the map</small></div></section>
        <section className="place-list" aria-label="Nearby services">
          <div className="list-head"><div><p className="kicker">Near {location}</p><h2>{loadingPlaces?'Finding nearby services':`${visible.length} places nearby`}</h2><p className="fine-print" role="status">{placesMessage}</p></div><select aria-label="Sort services" value={sort} onChange={e=>setSort(e.target.value as 'distance'|'rating')}><option value="distance">Nearest first</option>{googleMapsKey&&<option value="rating">Top rated</option>}</select></div>
          {visible.length?visible.map(p=><article key={p.id} className={`place-card ${selected?.id===p.id?'selected':''}`} onClick={()=>setSelectedId(p.id)}>
            <div className={`place-symbol ${p.type==='Police stations'?'police':p.type==='Trauma support & NGOs'?'ngo':''}`}>{p.type==='Police stations'?<Shield/>:p.type==='Trauma support & NGOs'?<HandHeart/>:p.type==='Hospitals'?<Cross/>:<Stethoscope/>}</div>
            <div className="place-info"><span className="place-type">{p.type} · {p.distance}</span><h3>{p.name}</h3><p><MapPin/> {p.area}</p><p><Clock3/> {p.hours}</p>{p.rating!=='-'&&<p className="rating"><Star/> {p.rating} <span>({p.reviews} Google reviews)</span></p>}<div className="specialty-row">{p.specialties.map(s=><span key={s}>{s}</span>)}</div><div className="place-actions">{p.phone?<a className="btn btn-secondary" href={`tel:${p.phone.replace(/\s/g,'')}`} onClick={e=>e.stopPropagation()}><Phone/>Call</a>:null}{p.website?<a className="btn btn-secondary" target="_blank" rel="noreferrer" href={p.website} onClick={e=>e.stopPropagation()}><ExternalLink/>Website</a>:null}<a className="btn btn-secondary" target="_blank" rel="noreferrer" href={p.mapsUrl} onClick={e=>e.stopPropagation()}><Navigation/>Directions</a>{p.type!=='Police stations'&&p.type!=='Trauma support & NGOs'&&<Button onClick={e=>{e.stopPropagation();setBooking(p);setBooked(false);setBookingError(null)}}>Book appointment</Button>}</div></div><ChevronRight/>
          </article>):<Card className="empty-care"><Search/><h3>{loadingPlaces?'Searching this area...':'No nearby results yet'}</h3><p>{placesMessage}</p></Card>}
          {!googleMapsKey&&<p className="place-attribution">Place data © OpenStreetMap contributors</p>}
        </section>
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
