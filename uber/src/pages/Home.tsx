import { useEffect, useState, type ReactNode } from 'react';
import { IonButton, IonContent, IonHeader, IonInput, IonItem, IonPage, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar } from '@ionic/react';
import { api, type User } from '../services/api';
import './Home.css';

const TOKEN_KEY = 'uber_access_token';
const USER_KEY = 'uber_user';
type Payload = Record<string, unknown>;

const Home: React.FC = () => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as User | null; } catch { return null; }
  });
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [fields, setFields] = useState<Record<string, string>>({ login: '', password: '', name: '', email: '', phone: '', role: 'client' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<unknown>(null);

  useEffect(() => {
    if (!token) return;
    api.auth.me(token).then(({ user: currentUser }) => {
      setUser(currentUser);
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    }).catch(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken('');
      setUser(null);
    });
  }, []);

  const setField = (key: string, value: string | number | null | undefined) => setFields(previous => ({ ...previous, [key]: String(value ?? '') }));
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setNotice('');
    try { const response = await action(); setResult(response); return response; }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Ocurrió un error inesperado.'); return null; }
    finally { setBusy(false); }
  };
  const authenticated = (action: (accessToken: string) => Promise<unknown>) => () => run(() => action(token));

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await run(() => {
      if (mode === 'forgot') return api.auth.forgotPassword(fields.email, fields.new_password);
      if (mode === 'register') {
        const body: Payload = { name: fields.name, email: fields.email, phone: fields.phone, password: fields.password, role: fields.role };
        if (fields.role === 'driver') Object.assign(body, {
          license_number: fields.license_number, plate: fields.plate, brand: fields.brand, model: fields.model,
          year: Number(fields.year), capacity: Number(fields.capacity), color: fields.color,
        });
        return api.auth.register(body);
      }
      return api.auth.login(fields.login, fields.password);
    });
    if (response && typeof response === 'object' && 'access_token' in response && 'user' in response) {
      const auth = response as { access_token: string; user: User };
      setToken(auth.access_token); setUser(auth.user);
      localStorage.setItem(TOKEN_KEY, auth.access_token); localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
      setFields(previous => ({ ...previous, password: '' }));
    }
  };

  const signOut = async () => {
    await run(() => api.auth.logout(token));
    localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY);
    setToken(''); setUser(null); setResult(null);
  };

  const fareFields = () => <>
    <Field label="Origen" name="origin_name" value={fields.origin_name ?? 'Mi ubicación'} onChange={setField} />
    <Field label="Latitud de origen" name="origin_latitude" value={fields.origin_latitude ?? '4.6766'} onChange={setField} type="number" />
    <Field label="Longitud de origen" name="origin_longitude" value={fields.origin_longitude ?? '-74.0483'} onChange={setField} type="number" />
    <Field label="Destino" name="destination_name" value={fields.destination_name ?? 'Destino'} onChange={setField} />
    <Field label="Latitud de destino" name="destination_latitude" value={fields.destination_latitude ?? '4.6664'} onChange={setField} type="number" />
    <Field label="Longitud de destino" name="destination_longitude" value={fields.destination_longitude ?? '-74.0536'} onChange={setField} type="number" />
  </>;
  const coordinates = () => ({ origin_latitude: Number(fields.origin_latitude ?? 4.6766), origin_longitude: Number(fields.origin_longitude ?? -74.0483), destination_latitude: Number(fields.destination_latitude ?? 4.6664), destination_longitude: Number(fields.destination_longitude ?? -74.0536) });

  if (user) return <IonPage>
    <IonHeader><IonToolbar><IonTitle>Uber · {user.role}</IonTitle></IonToolbar></IonHeader>
    <IonContent fullscreen>
      <main className="app-shell">
        <section className="welcome"><div><span className="eyebrow">PLATAFORMA DE MOVILIDAD</span><h1>Hola, {user.name}</h1><p>Sesión como {user.role} · {user.email}</p></div><IonButton fill="outline" onClick={signOut}>Cerrar sesión</IonButton></section>
        {user.role === 'client' && <ClientPanel token={token} fields={fields} setField={setField} fareFields={fareFields} coordinates={coordinates} run={run} />}
        {user.role === 'driver' && <DriverPanel token={token} run={run} fields={fields} setField={setField} />}
        {user.role === 'admin' && <AdminPanel token={token} run={run} fields={fields} setField={setField} />}
        <Result notice={notice} result={result} busy={busy} />
      </main>
    </IonContent>
  </IonPage>;

  return <IonPage>
    <IonHeader><IonToolbar><IonTitle>Uber · Acceso</IonTitle></IonToolbar></IonHeader>
    <IonContent fullscreen><main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">PLATAFORMA DE MOVILIDAD</span><h1>{mode === 'login' ? 'Inicia sesión' : mode === 'register' ? 'Crea tu cuenta' : 'Restablece tu contraseña'}</h1>
        <p>Conéctate con la API para solicitar viajes y administrar tu cuenta.</p>
        <form onSubmit={submitAuth}>
          {mode === 'login' && <><Field label="Correo o teléfono" name="login" value={fields.login} onChange={setField} required /><Field label="Contraseña" name="password" value={fields.password} onChange={setField} type="password" required /></>}
          {mode === 'register' && <>
            <Field label="Nombre completo" name="name" value={fields.name} onChange={setField} required />
            <Field label="Correo electrónico" name="email" value={fields.email} onChange={setField} type="email" required />
            <Field label="Teléfono" name="phone" value={fields.phone} onChange={setField} required />
            <IonItem><IonSelect label="Tipo de cuenta" value={fields.role} onIonChange={event => setField('role', event.detail.value as string)}><IonSelectOption value="client">Cliente</IonSelectOption><IonSelectOption value="driver">Conductor</IonSelectOption></IonSelect></IonItem>
            <Field label="Contraseña" name="password" value={fields.password} onChange={setField} type="password" required />
            {fields.role === 'driver' && <><Field label="Número de licencia" name="license_number" value={fields.license_number} onChange={setField} required /><Field label="Placa" name="plate" value={fields.plate} onChange={setField} required /><Field label="Marca" name="brand" value={fields.brand} onChange={setField} required /><Field label="Modelo" name="model" value={fields.model} onChange={setField} required /><Field label="Año" name="year" value={fields.year} onChange={setField} type="number" required /><Field label="Capacidad" name="capacity" value={fields.capacity} onChange={setField} type="number" required /><Field label="Color" name="color" value={fields.color} onChange={setField} required /></>}
          </>}
          {mode === 'forgot' && <><Field label="Correo electrónico" name="email" value={fields.email} onChange={setField} type="email" required /><Field label="Nueva contraseña" name="new_password" value={fields.new_password} onChange={setField} type="password" required /></>}
          <IonButton expand="block" type="submit" disabled={busy}>{busy ? <IonSpinner name="crescent" /> : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Registrarme' : 'Cambiar contraseña'}</IonButton>
        </form>
        <div className="auth-links">
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setNotice(''); setResult(null); }}>{mode === 'register' ? 'Ya tengo una cuenta' : 'Crear una cuenta'}</button>
          <button onClick={() => { setMode(mode === 'forgot' ? 'login' : 'forgot'); setNotice(''); setResult(null); }}>{mode === 'forgot' ? 'Volver al inicio de sesión' : 'Olvidé mi contraseña'}</button>
        </div>
        <Result notice={notice} result={result} busy={busy} />
      </section>
    </main></IonContent>
  </IonPage>;
};

interface PanelProps { token: string; run: (action: () => Promise<unknown>) => Promise<unknown> }
function ClientPanel({ token, fields, setField, fareFields, coordinates, run }: PanelProps & { fields: Record<string, string>; setField: (name: string, value: string | number | null | undefined) => void; fareFields: () => ReactNode; coordinates: () => Record<string, number> }) {
  const [rideId, setRideId] = useState('');
  const [tripId, setTripId] = useState('');
  return <>
    <section className="panel"><h2>Solicitar un viaje</h2><p>Calcula una tarifa estimada y confirma el viaje.</p>{fareFields()}
      <div className="button-row"><IonButton onClick={() => run(() => api.fares.active())}>Ver tarifa activa</IonButton><IonButton fill="outline" onClick={() => run(() => api.client.estimateFare(token, coordinates()))}>Estimar tarifa</IonButton><IonButton onClick={() => run(() => api.client.createRideRequest(token, { ...coordinates(), origin_name: fields.origin_name ?? 'Mi ubicación', destination_name: fields.destination_name ?? 'Destino' }))}>Solicitar viaje</IonButton></div>
    </section>
    <section className="panel"><h2>Tu actividad</h2><div className="button-row"><IonButton fill="outline" onClick={() => run(() => api.client.active(token))}>Viaje activo</IonButton><IonButton fill="outline" onClick={() => run(() => api.client.trips(token))}>Historial</IonButton></div>
      <div className="inline-fields"><Field label="ID solicitud activa" name="ride_id" value={rideId} onChange={(_, value) => setRideId(value)} type="number" /><IonButton color="medium" onClick={() => run(() => api.client.cancel(token, Number(rideId), 'Cancelado por el cliente'))}>Cancelar viaje</IonButton></div>
      <div className="inline-fields"><Field label="ID viaje para calificar" name="trip_id" value={tripId} onChange={(_, value) => setTripId(value)} type="number" /><Field label="Puntuación 1 a 5" name="score" value={fields.score ?? '5'} onChange={setField} type="number" /><Field label="Comentario" name="comment" value={fields.comment ?? ''} onChange={setField} /><IonButton color="medium" onClick={() => run(() => api.client.rateTrip(token, Number(tripId), { score: Number(fields.score ?? 5), comment: fields.comment, has_incident: false }))}>Enviar calificación</IonButton></div>
    </section>
  </>;
}

function DriverPanel({ token, run, fields, setField }: PanelProps & { fields: Record<string, string>; setField: (name: string, value: string | number | null | undefined) => void }) {
  const [tripId, setTripId] = useState('');
  return <>
    <section className="panel"><h2>Conductor</h2><p>Tu cuenta debe estar aprobada para conectarte y aceptar servicios.</p><div className="button-row"><IonButton onClick={() => run(() => api.driver.availability(token, 'available'))}>Conectarme</IonButton><IonButton fill="outline" onClick={() => run(() => api.driver.availability(token, 'unavailable'))}>Desconectarme</IonButton><IonButton fill="outline" onClick={() => run(() => api.driver.rideRequests(token))}>Ver solicitudes</IonButton></div>
      <div className="inline-fields"><Field label="ID de solicitud para aceptar" name="request_id" value={fields.request_id ?? ''} onChange={setField} type="number"/><IonButton onClick={() => run(() => api.driver.accept(token, Number(fields.request_id)))}>Aceptar solicitud</IonButton></div>
    </section>
    <section className="panel"><h2>Gestionar viaje</h2><div className="inline-fields"><Field label="ID del viaje" name="driver_trip_id" value={tripId} onChange={(_, value) => setTripId(value)} type="number" /><IonButton onClick={() => run(() => api.driver.arrive(token, Number(tripId)))}>Llegué</IonButton><IonButton onClick={() => run(() => api.driver.start(token, Number(tripId)))}>Iniciar</IonButton></div>
      <div className="inline-fields"><Field label="Distancia real (km)" name="actual_distance_km" value={fields.actual_distance_km ?? ''} onChange={setField} type="number"/><Field label="Duración real (min)" name="actual_duration_min" value={fields.actual_duration_min ?? ''} onChange={setField} type="number"/><IonButton onClick={() => run(() => api.driver.complete(token, Number(tripId), { actual_distance_km: Number(fields.actual_distance_km), actual_duration_min: Number(fields.actual_duration_min) }))}>Finalizar viaje</IonButton></div>
      <IonButton fill="outline" onClick={() => navigator.geolocation?.getCurrentPosition(position => run(() => api.driver.location(token, { latitude: position.coords.latitude, longitude: position.coords.longitude, heading: position.coords.heading ?? undefined, speed: position.coords.speed ?? undefined, trip_id: tripId ? Number(tripId) : undefined })), error => setField('geo_error', error.message))}>Enviar ubicación GPS</IonButton>
    </section>
  </>;
}

function AdminPanel({ token, run, fields, setField }: PanelProps & { fields: Record<string, string>; setField: (name: string, value: string | number | null | undefined) => void }) {
  const [driverId, setDriverId] = useState('');
  return <>
    <section className="panel"><h2>Panel de administración</h2><div className="button-row"><IonButton onClick={() => run(() => api.admin.dashboard(token))}>Indicadores</IonButton><IonButton fill="outline" onClick={() => run(() => api.admin.drivers(token, fields.approval_filter))}>Conductores</IonButton><IonButton fill="outline" onClick={() => run(() => api.admin.trips(token, {}))}>Viajes</IonButton><IonButton fill="outline" onClick={() => run(() => api.admin.reports(token))}>Reportes</IonButton><IonButton fill="outline" onClick={() => run(() => api.admin.auditLogs(token))}>Auditoría</IonButton><IonButton fill="outline" onClick={() => run(() => api.admin.fares(token))}>Tarifas</IonButton></div>
      <div className="inline-fields"><Field label="Filtro de aprobación" name="approval_filter" value={fields.approval_filter ?? 'pending'} onChange={setField}/><Field label="ID conductor" name="admin_driver_id" value={driverId} onChange={(_, value) => setDriverId(value)} type="number"/><IonButton onClick={() => run(() => api.admin.approveDriver(token, Number(driverId), { approval_status: fields.new_approval_status ?? 'approved', admin_notes: fields.admin_notes ?? '' }))}>Actualizar conductor</IonButton></div>
      <div className="inline-fields"><Field label="Estado nuevo" name="new_approval_status" value={fields.new_approval_status ?? 'approved'} onChange={setField}/><Field label="Notas" name="admin_notes" value={fields.admin_notes ?? ''} onChange={setField}/></div>
    </section>
    <section className="panel"><h2>Crear tarifa</h2><div className="inline-fields">{[['name','Nombre'],['base_fare','Tarifa base'],['price_per_km','Precio por km'],['price_per_minute','Precio por minuto'],['minimum_fare','Tarifa mínima'],['surge_multiplier','Multiplicador']].map(([name,label]) => <Field key={name} label={label} name={`fare_${name}`} value={fields[`fare_${name}`] ?? (name === 'name' ? '' : '1')} onChange={setField} type={name === 'name' ? 'text' : 'number'}/>)}</div><IonButton onClick={() => run(() => api.admin.createFare(token, { name: fields.fare_name, base_fare: Number(fields.fare_base_fare), price_per_km: Number(fields.fare_price_per_km), price_per_minute: Number(fields.fare_price_per_minute), minimum_fare: Number(fields.fare_minimum_fare), surge_multiplier: Number(fields.fare_surge_multiplier), active: true }))}>Guardar tarifa</IonButton></section>
  </>;
}

function Field({ label, name, value, onChange, type = 'text', required = false }: { label: string; name: string; value: string | undefined; onChange: (name: string, value: string) => void; type?: 'text' | 'password' | 'email' | 'number'; required?: boolean }) {
  return <IonItem><IonInput label={label} labelPlacement="stacked" name={name} type={type} value={value} required={required} onIonInput={event => onChange(name, event.detail.value ?? '')} /></IonItem>;
}

function Result({ notice, result, busy }: { notice: string; result: unknown; busy: boolean }) {
  if (!notice && result == null && !busy) return null;
  return <section className={`result ${notice ? 'error' : ''}`} aria-live="polite">{busy && <IonSpinner name="crescent" />}{notice && <p>{notice}</p>}{result != null && <pre>{JSON.stringify(result, null, 2)}</pre>}</section>;
}

export default Home;
