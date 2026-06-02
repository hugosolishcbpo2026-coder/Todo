"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminAnalytics, AdminLiveOps, Ride, TodoApiError } from "@todo/shared";
import { Banknote, Car, LogOut, RadioTower, RefreshCw, Users, Wallet } from "lucide-react";
import { api, bootstrapAuth, clearToken, saveToken } from "./lib/api";
import { connectAdminSocket } from "./lib/socket";

// Socket pushes drive updates; this is only a slow safety-net refresh.
const REFRESH_MS = 30000;
const peso = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

interface Dashboard {
  live: AdminLiveOps;
  analytics: AdminAnalytics;
  rides: Ride[];
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthed(bootstrapAuth());
    setReady(true);
  }, []);

  if (!ready) return null;
  return authed ? (
    <Operations onLogout={() => setAuthed(false)} />
  ) : (
    <Login onSuccess={() => setAuthed(true)} />
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [phone, setPhone] = useState("+5216240000000");
  const [code, setCode] = useState("000000");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { accessToken } = await api.verifyOtp({ phone, code, role: "admin", name: "Operator" });
      saveToken(accessToken);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="loginShell">
      <form className="loginCard" onSubmit={submit}>
        <div className="brand">
          <span className="brandMark">T</span>
          <div>
            <strong>Todo</strong>
            <small>Operations console</small>
          </div>
        </div>
        <h1>Sign in</h1>
        <p className="muted">Admin access · OTP login (dev code 000000)</p>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+52…" />
        </label>
        <label>
          OTP code
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" />
        </label>
        {error && <p className="formError">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function Operations({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const logout = useCallback(() => {
    clearToken();
    onLogout();
  }, [onLogout]);

  const refresh = useCallback(async () => {
    try {
      const [live, analytics, rides] = await Promise.all([
        api.adminLive(),
        api.adminAnalytics(),
        api.adminRides(),
      ]);
      setData({ live, analytics, rides });
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      if (err instanceof TodoApiError && (err.status === 401 || err.status === 403)) {
        logout();
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [logout]);

  useEffect(() => {
    void refresh();
    const socket = connectAdminSocket(() => void refresh());
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, [refresh]);

  const metrics = data && [
    { label: "Online drivers", value: String(data.live.onlineDrivers), detail: `${data.live.totalDrivers} onboarded`, icon: Car },
    { label: "Active rides", value: String(data.live.activeRides), detail: "in progress now", icon: RadioTower },
    { label: "Driver earnings today", value: peso(data.analytics.driverEarningsToday), detail: "0% commission", icon: Wallet },
    { label: "Membership revenue", value: peso(data.analytics.membershipRevenueToday), detail: "MXN today", icon: Banknote },
  ];

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandMark">T</span>
          <div>
            <strong>Todo</strong>
            <small>Operations CRM</small>
          </div>
        </div>
        <nav>
          <a className="active"><RadioTower size={18} /> Live operations</a>
          <a><Users size={18} /> Riders &amp; drivers</a>
          <a><Banknote size={18} /> Memberships</a>
        </nav>
        <button className="logout" onClick={logout}>
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Driver-first · Live</p>
            <h1>Live Operations</h1>
          </div>
          <div className="status">
            <RefreshCw size={14} />
            <span>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Connecting…"}</span>
          </div>
        </header>

        {error && <div className="banner error">API error: {error}</div>}

        <section className="metricGrid">
          {(metrics ?? Array.from({ length: 4 })).map((metric, i) => (
            <article className="metric" key={metric ? metric.label : i}>
              {metric ? (
                <>
                  <metric.icon size={22} />
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.detail}</small>
                </>
              ) : (
                <span className="skeleton" />
              )}
            </article>
          ))}
        </section>

        <section className="tablePanel">
          <div className="sectionTitle">
            <h2>Recent rides</h2>
            <span className="muted">
              {data ? `${data.rides.length} total · ${data.live.expiringMemberships} memberships expiring` : ""}
            </span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Ride</th>
                <th>Status</th>
                <th>Fare (MXN)</th>
                <th>Driver</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {data && data.rides.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No rides yet — request one from the rider app to see it here live.
                  </td>
                </tr>
              )}
              {data?.rides.map((ride) => (
                <tr key={ride.id}>
                  <td className="mono">{ride.id.slice(0, 12)}…</td>
                  <td>
                    <span className={`pill ${ride.status}`}>{ride.status.replace(/_/g, " ")}</span>
                  </td>
                  <td>{peso(ride.fare)}</td>
                  <td className="mono">{ride.driverId ? `${ride.driverId.slice(0, 10)}…` : "—"}</td>
                  <td className="muted">{new Date(ride.updatedAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
