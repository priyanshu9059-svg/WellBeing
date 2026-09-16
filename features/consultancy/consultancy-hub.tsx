'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarClock, Check, ChevronRight, Clock3, Cross, LocateFixed, MapPin, Navigation, Phone, Search, Shield, Star, Stethoscope, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isApiEnabled } from '@/lib/api';
import { getServices, type AppointmentDto, type CarePlaceDto } from '@/services';

type ServiceType = 'Therapy' | 'Psychiatry' | 'Counselling' | 'Police';
type Place = {
  id: string;
  name: string;
  type: ServiceType;
  area: string;
  distance: string;
  distanceKm: number;
  rating: string;
  reviews: number;
  phone: string;
  hours: string;
  next: string;
  x: number;
  y: number;
  specialties: string[];
};
type Appointment = {
  id: string;
  place: string;
  clinician: string;
  date: string;
  time: string;
  mode: string;
  status: AppointmentDto['status'];
};
type SortKey = 'distance' | 'rating' | 'soonest';

const APPOINTMENTS_KEY = 'wellbeing-support:appointments';

const demoPlaces: Place[] = [
  { id: '1', name: 'Serenity Mind Clinic', type: 'Therapy', area: 'Indiranagar', distance: '1.2 km', distanceKm: 1.2, rating: '4.8', reviews: 126, phone: '+91 80 4567 2100', hours: 'Open · until 8:00 PM', next: 'Today, 5:30 PM', x: 31, y: 37, specialties: ['Anxiety', 'Trauma', 'Young adults'] },
  { id: '2', name: 'Nurture Psychology Centre', type: 'Counselling', area: 'Domlur', distance: '2.1 km', distanceKm: 2.1, rating: '4.7', reviews: 89, phone: '+91 80 4123 8800', hours: 'Open · until 7:30 PM', next: 'Tomorrow, 11:00 AM', x: 57, y: 58, specialties: ['Relationships', 'Stress', 'Grief'] },
  { id: '3', name: 'Mindful Psychiatry & Wellness', type: 'Psychiatry', area: 'HAL 2nd Stage', distance: '2.8 km', distanceKm: 2.8, rating: '4.6', reviews: 74, phone: '+91 80 4098 1122', hours: 'Open · until 6:00 PM', next: 'Wed, 3:00 PM', x: 69, y: 28, specialties: ['Psychiatry', 'Sleep', 'Mood'] },
  { id: '4', name: 'Indiranagar Police Station', type: 'Police', area: 'Indiranagar', distance: '1.7 km', distanceKm: 1.7, rating: '—', reviews: 0, phone: '112', hours: 'Open 24 hours', next: 'Walk-in support', x: 42, y: 73, specialties: ['Emergency help', 'Safety support'] },
];

const initialAppointments: Appointment[] = [
  { id: '1', place: 'Nurture Psychology Centre', clinician: 'Dr. Aanya Mehta', date: '18 Sep 2026', time: '11:00 AM', mode: 'Video consultation', status: 'Confirmed' },
  { id: '2', place: 'Serenity Mind Clinic', clinician: 'Rohan Iyer, Counsellor', date: '02 Sep 2026', time: '4:30 PM', mode: 'In person', status: 'Completed' },
];

function asServiceType(type: string): ServiceType {
  if (type === 'Therapy' || type === 'Psychiatry' || type === 'Counselling' || type === 'Police') return type;
  return 'Therapy';
}

function mapPlace(p: CarePlaceDto): Place {
  return {
    id: p.id,
    name: p.name,
    type: asServiceType(p.type),
    area: p.area,
    distance: p.distance,
    distanceKm: p.distanceKm,
    rating: p.rating,
    reviews: p.reviews,
    phone: p.phone,
    hours: p.hours,
    next: p.next,
    x: p.x,
    y: p.y,
    specialties: p.specialties,
  };
}

function mapAppointment(a: AppointmentDto): Appointment {
  return {
    id: a.id,
    place: a.place,
    clinician: a.clinician,
    date: a.date,
    time: a.time,
    mode: a.mode,
    status: a.status,
  };
}

function loadCachedAppointments(): Appointment[] {
  try {
    const saved = localStorage.getItem(APPOINTMENTS_KEY);
    if (!saved) return initialAppointments;
    const parsed = JSON.parse(saved) as Appointment[];
    return parsed.map((a) => ({ ...a, id: String(a.id) }));
  } catch {
    return initialAppointments;
  }
}

function soonestRank(next: string) {
  const lower = next.toLowerCase();
  if (lower.includes('today')) return 0;
  if (lower.includes('tomorrow')) return 1;
  if (lower.includes('walk')) return 2;
  return 10 + next.length;
}

export function ConsultancyHub() {
  const services = getServices();
  const [view, setView] = useState<'discover' | 'appointments'>('discover');
  const [filter, setFilter] = useState<'All' | ServiceType>('All');
  const [places, setPlaces] = useState<Place[]>(demoPlaces);
  const [selected, setSelected] = useState<Place>(demoPlaces[0]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('distance');
  const [location, setLocation] = useState('Indiranagar, Bengaluru');
  const [locationMessage, setLocationMessage] = useState('');
  const [booking, setBooking] = useState<Place | null>(null);
  const [booked, setBooked] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    typeof window === 'undefined' ? initialAppointments : loadCachedAppointments(),
  );
  const [date, setDate] = useState('2026-09-18');
  const [time, setTime] = useState('11:00 AM');
  const [mode, setMode] = useState('In person');

  const saveAppointments = (next: Appointment[]) => {
    setAppointments(next);
    try {
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isApiEnabled()) return;
      try {
        const remotePlaces = await services.care.listPlaces();
        if (!cancelled && remotePlaces.length) {
          const mapped = remotePlaces.map(mapPlace);
          setPlaces(mapped);
          setSelected(mapped[0]);
        }
      } catch {
        /* keep demo places */
      }
      try {
        const remoteAppts = await services.care.listAppointments();
        if (!cancelled && remoteAppts.length) {
          saveAppointments(remoteAppts.map(mapAppointment));
        }
      } catch {
        /* keep localStorage / demo appointments */
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const filtered = places.filter(
      (p) =>
        (filter === 'All' || p.type === filter) &&
        `${p.name} ${p.area} ${p.specialties.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
    );
    return [...filtered].sort((a, b) => {
      if (sort === 'rating') {
        const ar = parseFloat(a.rating) || 0;
        const br = parseFloat(b.rating) || 0;
        return br - ar;
      }
      if (sort === 'soonest') return soonestRank(a.next) - soonestRank(b.next);
      return a.distanceKm - b.distanceKm;
    });
  }, [places, filter, query, sort]);

  const useLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Location is not available in this browser.');
      return;
    }
    setLocationMessage('Finding your area…');
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocation('Current location');
        setLocationMessage('Map centred near your current location.');
      },
      () => setLocationMessage('Location was not shared. You can search an area instead.'),
    );
  };

  const confirmBooking = async () => {
    if (!booking) return;
    setBookingError(null);
    const formatted = new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const clinician = booking.type === 'Psychiatry' ? 'Dr. Kavya Rao' : 'Available care professional';
    const local: Appointment = {
      id: String(Date.now()),
      place: booking.name,
      clinician,
      date: formatted,
      time,
      mode,
      status: 'Confirmed',
    };

    if (isApiEnabled()) {
      try {
        const created = await services.care.bookAppointment({
          placeId: booking.id,
          placeName: booking.name,
          clinician,
          date: formatted,
          time,
          mode,
        });
        saveAppointments([mapAppointment(created), ...appointments]);
        setBooked(true);
        return;
      } catch (e) {
        setBookingError(e instanceof Error ? e.message : 'Booking failed.');
        saveAppointments([local, ...appointments]);
        setBooked(true);
        return;
      }
    }

    saveAppointments([local, ...appointments]);
    setBooked(true);
  };

  return (
    <div className="consultancy-hub">
      <Card className="care-notice">
        <span className="soft-icon"><MapPin /></span>
        <div>
          <b>Nearby care, with you in control</b>
          <p>
            {isApiEnabled()
              ? 'Listings and bookings sync when the support API is available. Confirm fees, credentials, and accessibility with the provider.'
              : 'Prototype listings help you explore options. Confirm availability, fees, credentials, and accessibility directly with the provider before booking.'}
          </p>
        </div>
      </Card>
      <div className="section-tabs" role="tablist" aria-label="Consultancy sections">
        <button className={view === 'discover' ? 'active' : ''} onClick={() => setView('discover')}>
          <Search />Find nearby care
        </button>
        <button className={view === 'appointments' ? 'active' : ''} onClick={() => setView('appointments')}>
          <CalendarClock />Appointments <span>{appointments.filter((a) => a.status === 'Confirmed' || a.status === 'Requested').length}</span>
        </button>
      </div>
      {view === 'discover' ? (
        <>
          <div className="care-search">
            <div className="location-field">
              <MapPin />
              <label>
                <span>Your area</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
              <Button variant="secondary" onClick={useLocation}><LocateFixed />Use my location</Button>
            </div>
            {locationMessage && <p className="location-message">{locationMessage}</p>}
            <div className="care-filter-row">
              <div className="search care-query">
                <Search />
                <input placeholder="Search clinic, service, or specialty" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="service-filters">
                {(['All', 'Therapy', 'Psychiatry', 'Counselling', 'Police'] as const).map((item) => (
                  <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
                    {item === 'Police' ? <Shield /> : item === 'All' ? <Building2 /> : <Stethoscope />}
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="care-explorer">
            <section className="care-map" aria-label="Prototype map of nearby services">
              <div className="map-roads"><i /><i /><i /><b /><b /></div>
              <div className="map-area area-one">Indiranagar</div>
              <div className="map-area area-two">Domlur</div>
              {visible.map((p, i) => (
                <button
                  key={p.id}
                  aria-label={`${p.name}, ${p.distance}`}
                  className={`map-pin pin-${p.type.toLowerCase()} ${selected.id === p.id ? 'selected' : ''}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  onClick={() => setSelected(p)}
                >
                  <span>{p.type === 'Police' ? <Shield /> : i + 1}</span>
                </button>
              ))}
              <div className="map-key">
                <span><i className="clinic-dot" />Care</span>
                <span><i className="police-dot" />Police</span>
                <small>Illustrative map · not live navigation</small>
              </div>
            </section>
            <section className="place-list" aria-label="Nearby services">
              <div className="list-head">
                <div>
                  <p className="kicker">Near {location}</p>
                  <h2>{visible.length} places nearby</h2>
                </div>
                <select
                  aria-label="Sort services"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="distance">Nearest first</option>
                  <option value="rating">Top rated</option>
                  <option value="soonest">Soonest available</option>
                </select>
              </div>
              {visible.length ? (
                visible.map((p) => (
                  <article
                    key={p.id}
                    className={`place-card ${selected.id === p.id ? 'selected' : ''}`}
                    onClick={() => setSelected(p)}
                  >
                    <div className={`place-symbol ${p.type === 'Police' ? 'police' : ''}`}>
                      {p.type === 'Police' ? <Shield /> : <Cross />}
                    </div>
                    <div className="place-info">
                      <span className="place-type">{p.type} · {p.distance}</span>
                      <h3>{p.name}</h3>
                      <p><MapPin /> {p.area} · {p.hours}</p>
                      {p.type !== 'Police' && (
                        <p className="rating"><Star /> {p.rating} <span>({p.reviews} Google reviews)</span></p>
                      )}
                      <div className="specialty-row">{p.specialties.map((s) => <span key={s}>{s}</span>)}</div>
                      <div className="place-actions">
                        <a className="btn btn-secondary" href={`tel:${p.phone.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()}>
                          <Phone />Call
                        </a>
                        <a
                          className="btn btn-secondary"
                          target="_blank"
                          rel="noreferrer"
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.area + ' Bengaluru')}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Navigation />Google Maps
                        </a>
                        {p.type !== 'Police' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBooking(p);
                              setBooked(false);
                              setBookingError(null);
                            }}
                          >
                            Book appointment
                          </Button>
                        )}
                      </div>
                    </div>
                    <ChevronRight />
                  </article>
                ))
              ) : (
                <Card className="empty-care">
                  <Search />
                  <h3>No matching services</h3>
                  <p>Try a broader service type or search term.</p>
                </Card>
              )}
            </section>
          </div>
        </>
      ) : (
        <AppointmentCenter appointments={appointments} setAppointments={saveAppointments} />
      )}
      {booking && (
        <div className="mini-modal booking-modal">
          <div>
            {booked ? (
              <div className="booking-success">
                <span><Check /></span>
                <p className="kicker">Request added</p>
                <h3>Your appointment is scheduled.</h3>
                <p>
                  {isApiEnabled()
                    ? 'You can track updates in the Appointments tab. The clinic may still need to confirm the slot.'
                    : 'You can track updates in the Appointments tab. This prototype does not send the request to the clinic.'}
                </p>
                {bookingError && <p className="error-text">{bookingError} Saved locally as a fallback.</p>}
                <Button
                  onClick={() => {
                    setBooking(null);
                    setBooked(false);
                    setView('appointments');
                  }}
                >
                  View appointments
                </Button>
              </div>
            ) : (
              <>
                <button className="icon-button booking-close" onClick={() => setBooking(null)} aria-label="Close"><X /></button>
                <p className="kicker">Schedule consultation</p>
                <h3>{booking.name}</h3>
                <p className="fine-print">Choose a preferred slot. In production, the clinic must confirm it.</p>
                <div className="booking-grid">
                  <label className="field">
                    <span>Date</span>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Time</span>
                    <select value={time} onChange={(e) => setTime(e.target.value)}>
                      <option>11:00 AM</option>
                      <option>3:00 PM</option>
                      <option>5:30 PM</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Consultation mode</span>
                  <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option>In person</option>
                    <option>Video consultation</option>
                    <option>Phone call</option>
                  </select>
                </label>
                <label className="check">
                  <input type="checkbox" required />
                  <span>
                    <b>I understand this is a prototype request</b>
                    <small>
                      {isApiEnabled()
                        ? 'Your request is sent to the support API when connected.'
                        : 'No clinic receives information from this frontend demo.'}
                    </small>
                  </span>
                </label>
                {bookingError && <p className="error-text">{bookingError}</p>}
                <Button onClick={confirmBooking}><CalendarClock />Request appointment</Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentCenter({
  appointments,
  setAppointments,
}: {
  appointments: Appointment[];
  setAppointments: (items: Appointment[]) => void;
}) {
  const services = getServices();
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const isUpcoming = (s: Appointment['status']) => s === 'Confirmed' || s === 'Requested';
  const items = appointments.filter((a) => (tab === 'upcoming' ? isUpcoming(a.status) : !isUpcoming(a.status)));

  const cancel = async (id: string) => {
    const next = appointments.map((a) => (a.id === id ? { ...a, status: 'Cancelled' as const } : a));
    if (isApiEnabled()) {
      try {
        await services.care.updateAppointment(id, 'Cancelled');
      } catch {
        /* still update local cache */
      }
    }
    setAppointments(next);
  };

  return (
    <div className="appointment-center">
      <Card className="appointment-summary">
        <div>
          <p className="kicker">Your next appointment</p>
          <h2>{appointments.find((a) => a.status === 'Confirmed' || a.status === 'Requested')?.date || 'Nothing scheduled'}</h2>
          <p>{appointments.find((a) => a.status === 'Confirmed' || a.status === 'Requested')?.place || 'Explore nearby care when you are ready.'}</p>
        </div>
        <span className="appointment-calendar"><CalendarClock /></span>
      </Card>
      <div className="sub-tabs">
        <button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>Upcoming</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>History</button>
      </div>
      <div className="appointment-list">
        {items.length ? (
          items.map((a) => (
            <Card key={a.id} className="appointment-card">
              <div className="date-tile">
                <b>{a.date.split(' ')[0]}</b>
                <span>{a.date.split(' ')[1]}</span>
              </div>
              <div>
                <span className={`status status-${a.status.toLowerCase()}`}>{a.status}</span>
                <h3>{a.place}</h3>
                <p>{a.clinician}</p>
                <div className="appointment-meta">
                  <span><Clock3 />{a.time}</span>
                  <span>{a.mode === 'Video consultation' ? <Video /> : <MapPin />}{a.mode}</span>
                </div>
              </div>
              <div className="appointment-actions">
                {(a.status === 'Confirmed' || a.status === 'Requested') && (
                  <>
                    <Button variant="secondary">View details</Button>
                    <Button variant="ghost" onClick={() => cancel(a.id)}>Cancel</Button>
                  </>
                )}
              </div>
            </Card>
          ))
        ) : (
          <Card className="empty-care">
            <CalendarClock />
            <h3>No {tab} appointments</h3>
            <p>Your appointment updates will appear here.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
