create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key default uuid_generate_v4(),
  role text not null check (role in ('rider', 'driver', 'admin', 'support')),
  name text not null,
  phone text not null unique,
  email text,
  profile_photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  make text not null,
  model text not null,
  plate_number text not null unique,
  color text not null,
  year int not null,
  created_at timestamptz not null default now()
);

create table drivers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  license_number text not null unique,
  vehicle_id uuid references vehicles(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  membership_status text not null default 'expired' check (membership_status in ('active', 'expired', 'past_due')),
  membership_expiration timestamptz,
  rating numeric(3,2) not null default 5.00,
  acceptance_rate numeric(5,2) not null default 100.00,
  is_online boolean not null default false,
  last_lat numeric(10,7),
  last_lng numeric(10,7),
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table rides (
  id uuid primary key default uuid_generate_v4(),
  rider_id uuid not null references users(id),
  driver_id uuid references drivers(id),
  pickup_lat numeric(10,7) not null,
  pickup_lng numeric(10,7) not null,
  dropoff_lat numeric(10,7) not null,
  dropoff_lng numeric(10,7) not null,
  fare numeric(10,2) not null,
  currency text not null default 'MXN',
  status text not null check (status in ('requested', 'driver_assigned', 'driver_arriving', 'in_progress', 'completed', 'cancelled')),
  payment_method text not null check (payment_method in ('cash', 'card')),
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  ride_id uuid references rides(id),
  amount numeric(10,2) not null,
  currency text not null default 'MXN',
  payment_type text not null check (payment_type in ('ride', 'membership', 'payout', 'refund')),
  status text not null check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  provider text not null default 'stripe',
  provider_reference text,
  created_at timestamptz not null default now()
);

create table support_tickets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  ride_id uuid references rides(id),
  channel text not null default 'whatsapp',
  status text not null default 'open',
  priority text not null default 'normal',
  summary text not null,
  created_at timestamptz not null default now()
);

create table fraud_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  ride_id uuid references rides(id),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  signal text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table admin_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_user_id uuid not null references users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index drivers_online_idx on drivers(is_online, membership_status, status);
create index rides_status_idx on rides(status, created_at desc);
create index payments_user_idx on payments(user_id, created_at desc);

