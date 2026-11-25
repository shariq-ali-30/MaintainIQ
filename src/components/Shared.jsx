import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatDate, formatLongDateTime } from "../lib/format";

export function Spinner({ small = false }) {
  return <span className={"button-spinner" + (small ? " button-spinner-small" : "")} aria-hidden="true" />;
}

export function AsyncButtonContent({ loading = false, children, small = true }) {
  return (
    <>
      <span className="async-button-label" style={{ opacity: loading ? 0 : 1, visibility: loading ? "hidden" : "visible" }}>
        {children}
      </span>
      {loading && <span className="async-button-indicator"><Spinner small={small} /></span>}
    </>
  );
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { logout } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    logout()
      .then(() => navigate("/login", { replace: true }))
      .catch((error) => {
        showToast("error", error.message || "Unable to log out. Please try again.");
        setLoggingOut(false);
      });
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="logo">
          <i className="fa-solid fa-screwdriver-wrench" />
          <h2>Maintain<span>IQ</span></h2>
        </div>
        <button className="menu-toggle-btn" id="menu-toggle-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
          <i className="ph-bold ph-list" />
        </button>
        <div className={"nav-btns" + (menuOpen ? " active" : "")} id="nav-btns">
          <button className="logout-btn async-action-button" onClick={handleLogout} disabled={loggingOut}>
            <AsyncButtonContent loading={loggingOut}><i className="ph-bold ph-sign-out" /> Logout</AsyncButtonContent>
          </button>
        </div>
      </div>
    </nav>
  );
}

export function StatsCard({ icon, title, value, type }) {
  return (
    <div className="stats-card">
      <div className={"icon-box " + type}><i className={icon} /></div>
      <div className="stats-card-details">
        <p className="title">{title}</p>
        <h2 className="number">{value}</h2>
      </div>
      <div className={"icon-circle " + type}><i className="ph ph-trend-up" /></div>
    </div>
  );
}

export function Timeline({ items = [] }) {
  return (
    <div className="timeline">
      {items.map((item, index) => (
        <div className="timeline-item" key={item.id || index}>
          <div className="dot"><span /></div>
          <div className="content">
            <p className="title">{item.activity}</p>
            <span className="time">{item.time ? formatLongDateTime(item.time) : formatDate(item.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = "ph ph-folder-open", title, description }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon"><i className={icon} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function NotFound({ title, description, backHref }) {
  return (
    <div className="not-found-container" style={{ display: "flex" }}>
      <div className="icon-circle"><i className="fa-solid fa-file-circle-xmark" /></div>
      <h2 className="not-found-title">{title}</h2>
      <p className="not-found-desc">{description}</p>
      {backHref ? <Link to={backHref}><i className="ph-bold ph-arrow-left" />Back To Dashboard</Link> : null}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="app-loading" role="status" aria-label="Loading">
      <Spinner />
    </div>
  );
}