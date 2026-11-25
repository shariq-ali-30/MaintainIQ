import "../css/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AsyncButtonContent, EmptyState, LoadingScreen, Navbar, StatsCard } from "../components/Shared";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createAsset, subscribeAssets } from "../lib/data";
import { statusClass } from "../lib/format";

export default function Dashboard() {
  const [assets, setAssets] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [location, setLocation] = useState("All Locations");
  const [modalOpen, setModalOpen] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [assetLocation, setAssetLocation] = useState("");
  const [nameError, setNameError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameInput = useRef(null);
  const locationInput = useRef(null);
  const nameErrorTimer = useRef(null);
  const locationErrorTimer = useRef(null);
  const { profile } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeAssets(setAssets, (error) => {
      showToast("error", error.message || "Unable to load assets.");
      setAssets([]);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(nameErrorTimer.current);
      window.clearTimeout(locationErrorTimer.current);
    };
  }, [showToast]);

  const assetList = assets || [];
  const locations = useMemo(() => [...new Set(assetList.map((asset) => asset.location))].sort(), [assetList]);
  const visibleAssets = useMemo(() => assetList.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase()) || String(asset.code).includes(search.trim());
    const matchesStatus = status === "All Statuses" || asset.status.toLowerCase() === status.toLowerCase();
    const matchesLocation = location === "All Locations" || asset.location === location;
    return matchesSearch && matchesStatus && matchesLocation;
  }), [assetList, search, status, location]);

  const clearNameError = () => {
    window.clearTimeout(nameErrorTimer.current);
    setNameError(false);
  };
  const clearLocationError = () => {
    window.clearTimeout(locationErrorTimer.current);
    setLocationError(false);
  };
  const markNameError = () => {
    window.clearTimeout(nameErrorTimer.current);
    setNameError(true);
    nameInput.current?.focus();
    nameErrorTimer.current = window.setTimeout(() => setNameError(false), 3000);
  };
  const markLocationError = () => {
    window.clearTimeout(locationErrorTimer.current);
    setLocationError(true);
    locationInput.current?.focus();
    locationErrorTimer.current = window.setTimeout(() => setLocationError(false), 3000);
  };

  const closeModal = () => {
    setModalOpen(false);
    setAssetName("");
    setAssetLocation("");
    clearNameError();
    clearLocationError();
  };

  const addAsset = (event) => {
    event.preventDefault();
    clearNameError();
    clearLocationError();

    if (!assetName.trim()) {
      markNameError();
      showToast("error", "Please enter an asset name.");
      return;
    }
    if (!assetLocation.trim()) {
      markLocationError();
      showToast("error", "Please enter an asset location.");
      return;
    }

    setSaving(true);
    createAsset({ name: assetName, location: assetLocation })
      .then(() => {
        closeModal();
        showToast("success", "Asset added successfully.");
      })
      .catch((error) => showToast("error", error.message || "Unable to add the asset."))
      .finally(() => setSaving(false));
  };

  if (assets === null) return <LoadingScreen />;

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="container">
        <section className="title-section">
          <div className="dashboard-title">
            <h2>Admin Dashboard</h2>
            <p>Welcome back, {profile?.displayName || profile?.name || "Admin User"}!</p>
          </div>
          <button className="add-new-asset-btn" onClick={() => setModalOpen(true)}>
            <i className="fa-solid fa-plus" /> Add New Asset
          </button>

          <div className={"modal-overlay" + (modalOpen ? " active" : "")}
            onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) closeModal(); }}>
            <form className="add-new-asset-modal" onSubmit={addAsset} autoComplete="off">
              <div className="modal-header">
                <div className="icon-circle"><i className="fa-solid fa-plus" /></div>
                <div className="modal-title"><h2>Add New Asset</h2><p>Fill in the details below to add a new asset.</p></div>
              </div>
              <div className="hr" />
              <div className="input-fields">
                <label htmlFor="new-asset-name">Asset Name <span>*</span></label>
                <input ref={nameInput} id="new-asset-name" name="new-asset-name" type="text" placeholder="e.g., Lab Monitor 1"
                  autoComplete="off" autoCorrect="off" spellCheck={false}
                  className={nameError ? "name-input error" : "name-input"} value={assetName}
                  disabled={saving} onChange={(event) => { setAssetName(event.target.value); clearNameError(); }} />
                <label htmlFor="new-asset-location">Location <span>*</span></label>
                <input ref={locationInput} id="new-asset-location" name="new-asset-location" type="text"
                  placeholder="e.g., Building A, Room 101" list="location-list" autoComplete="off" autoCorrect="off"
                  className={locationError ? "location-input error" : "location-input"} value={assetLocation}
                  disabled={saving} onChange={(event) => { setAssetLocation(event.target.value); clearLocationError(); }} />
                <datalist id="location-list">{locations.map((item) => <option value={item} key={item} />)}</datalist>
              </div>
              <div className="modal-btns">
                <button type="button" className="cancel-btn" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="add-asset-btn async-action-button" disabled={saving}>
                  <AsyncButtonContent loading={saving}><i className="fa-solid fa-plus" /> Add Asset</AsyncButtonContent>
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="stats-cards-section">
          <StatsCard icon="ph ph-cube" title="Total Assets" value={assets.length} type="total-assets-icon-box" />
          <StatsCard icon="ph ph-warning" title="Active Issues" value={assets.filter((asset) => asset.status === "Issue Reported").length} type="active-issues-icon-box" />
          <StatsCard icon="ph ph-wrench" title="Under Maintenance" value={assets.filter((asset) => asset.status === "Under Maintenance").length} type="under-maintenance-icon-box" />
        </section>

        <section className="search-and-filter-section">
          <div className="input-box"><i className="ph ph-magnifying-glass" /><input type="text" placeholder="Search by name or code..." id="search-input" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div className="filters">
            <div className="select-box">
              <select className="status-filter" id="status-dropdown" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option>All Statuses</option><option value="Operational">Operational</option><option value="Issue Reported">Issue Reported</option><option value="Under Maintenance">Under Maintenance</option>
              </select><i className="ph ph-caret-down" />
            </div>
            <div className="select-box">
              <select className="location-filter" id="location-dropdown" value={location} onChange={(event) => setLocation(event.target.value)}>
                <option>All Locations</option>{locations.map((item) => <option value={item} key={item}>{item}</option>)}
              </select><i className="ph ph-caret-down" />
            </div>
          </div>
        </section>

        {visibleAssets.length > 0 ? (
          <section className="asset-table-section">
            <table className="asset-table">
              <thead><tr><th>Asset Code</th><th>Asset Name</th><th>Location</th><th>Status</th><th>Action</th></tr></thead>
              <tbody className="assets-data-container">
                {visibleAssets.map((asset) => (
                  <tr key={asset.docId}>
                    <td className="asset-code">AST-{asset.code}</td><td className="asset-name">{asset.name}</td><td className="location">{asset.location}</td>
                    <td className={"status " + statusClass(asset.status)}><p><span className="dot" /> {asset.status}</p></td>
                    <td className="action"><button onClick={() => navigate("/assets/" + encodeURIComponent(asset.code))}><i className="ph ph-eye" /> View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <EmptyState
            icon="ph ph-cube"
            title={assetList.length === 0 ? "No assets yet" : "No matching assets found"}
            description={assetList.length === 0
              ? "Assets you add will appear here. Select “Add New Asset” to get started."
              : "Try adjusting your search or filters to find the asset you're looking for."}
          />
        )}
      </div>
    </div>
  );
}