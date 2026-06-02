import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Car,
  Headphones,
  MapPin,
  RadioTower,
  Shield,
  Users
} from "lucide-react";

const metrics = [
  { label: "Online drivers", value: "73", detail: "64 eligible", icon: Car },
  { label: "Active rides", value: "18", detail: "4 need attention", icon: RadioTower },
  { label: "Membership revenue", value: "$7,300", detail: "MXN today", icon: Banknote },
  { label: "Support queue", value: "6", detail: "WhatsApp-first", icon: Headphones }
];

const drivers = [
  { name: "Luis Moreno", plate: "BCS-4219", status: "Active", rating: "4.92", membership: "Paid today" },
  { name: "Ana Ruiz", plate: "BCS-8831", status: "On ride", rating: "4.96", membership: "Monthly" },
  { name: "Diego Ibarra", plate: "BCS-1107", status: "Review", rating: "New", membership: "Pending" }
];

const alerts = [
  { title: "GPS jump detected", detail: "Ride ride_1042 moved 2.8 km in 18 seconds.", severity: "High" },
  { title: "Membership expiring", detail: "9 drivers expire in the next 2 hours.", severity: "Medium" },
  { title: "Emergency contact tapped", detail: "Rider Sofia G. requested operator review.", severity: "Critical" }
];

export default function AdminDashboard() {
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
          <a className="active"><MapPin size={18} /> Live map</a>
          <a><Users size={18} /> Riders</a>
          <a><BadgeCheck size={18} /> Driver approvals</a>
          <a><Shield size={18} /> Fraud center</a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Controlled launch · Los Cabos</p>
            <h1>Live Operations</h1>
          </div>
          <div className="modeToggle">
            <button className="selected">Light</button>
            <button>Dark</button>
          </div>
        </header>

        <section className="metricGrid">
          {metrics.map((metric) => (
            <article className="metric" key={metric.label}>
              <metric.icon size={22} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </section>

        <section className="mainGrid">
          <div className="mapPanel">
            <div className="mapHeader">
              <div>
                <h2>Dispatch Map</h2>
                <p>Driver availability, ride status, and operator overrides.</p>
              </div>
              <button>Override dispatch</button>
            </div>
            <div className="mapSurface">
              <span className="pin rider">Rider</span>
              <span className="pin driver one">D1</span>
              <span className="pin driver two">D2</span>
              <span className="pin alert">SOS</span>
            </div>
          </div>

          <div className="alertPanel">
            <h2>Risk & Support</h2>
            {alerts.map((alert) => (
              <article className="alert" key={alert.title}>
                <AlertTriangle size={18} />
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                </div>
                <span>{alert.severity}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="tablePanel">
          <div className="sectionTitle">
            <h2>Driver Monitoring</h2>
            <button>Review queue</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Plate</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Membership</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.plate}>
                  <td>{driver.name}</td>
                  <td>{driver.plate}</td>
                  <td>{driver.status}</td>
                  <td>{driver.rating}</td>
                  <td>{driver.membership}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}

