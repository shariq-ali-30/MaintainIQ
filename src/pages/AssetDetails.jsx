import "../css/details.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCodeStyling from "qr-code-styling";
import { AsyncButtonContent, LoadingScreen, NotFound, Timeline } from "../components/Shared";
import { useToast } from "../context/ToastContext";
import { retireAsset, subscribeAssetByCode, updateAsset } from "../lib/data";
import { statusClass, safeErrorMessage } from "../lib/format";

export default function AssetDetails() {
  const { code } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);
  const [form, setForm] = useState({ name: "", status: "operational", location: "", condition: "excellent" });
  const [nameError, setNameError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [working, setWorking] = useState("");
  const nameInput = useRef(null);
  const locationInput = useRef(null);
  const nameErrorTimer = useRef(null);
  const locationErrorTimer = useRef(null);
  const qrContainer = useRef(null);
  const qrInstance = useRef(null);
  const [qrLogoLoaded, setQrLogoLoaded] = useState(false);
  const showToast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeAssetByCode(code, (result) => {
      setAsset(result);
      setLoading(false);
    }, (error) => {
      showToast("error", safeErrorMessage(error));
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.clearTimeout(nameErrorTimer.current);
      window.clearTimeout(locationErrorTimer.current);
    };
  }, [code, showToast]);

  useEffect(() => {
    const logo = new Image();
    logo.onload = () => setQrLogoLoaded(true);
    logo.onerror = () => setQrLogoLoaded(false);
    logo.src = "/images/icon.png";

    return () => {
      logo.onload = null;
      logo.onerror = null;
    };
  }, []);

  useEffect(() => {
    if (!asset || !qrContainer.current) return;

    qrContainer.current.replaceChildren();

    const qrOptions = {
      data: window.location.origin + "/public/" + asset.code,
      margin: 10
    };

    // Include the center logo only after it has loaded successfully.
    // The QR code itself still renders when the logo is unavailable.
    if (qrLogoLoaded) {
      qrOptions.image = "/images/icon.png";
      qrOptions.imageOptions = { imageSize: 0.5, margin: 8 };
    }

    qrInstance.current = new QRCodeStyling(qrOptions);
    qrInstance.current.append(qrContainer.current);

    return () => {
      qrContainer.current?.replaceChildren();
      qrInstance.current = null;
    };
  }, [asset, qrLogoLoaded]);

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

  const openEdit = () => {
    setForm({
      name: asset.name,
      status: String(asset.status).toLowerCase(),
      location: asset.location,
      condition: String(asset.condition).toLowerCase()
    });
    clearNameError();
    clearLocationError();
    setEditOpen(true);
  };

  const saveChanges = (event) => {
    event.preventDefault();
    clearNameError();
    clearLocationError();

    if (!form.name.trim()) {
      markNameError();
      showToast("error", "Please enter an asset name.");
      return;
    }
    if (!form.location.trim()) {
      markLocationError();
      showToast("error", "Please enter an asset location.");
      return;
    }

    setWorking("save");
    const updated = {
      name: form.name.trim(),
      status: form.status.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
      location: form.location.trim(),
      condition: form.condition.charAt(0).toUpperCase() + form.condition.slice(1)
    };
    updateAsset(asset, updated)
      .then(() => {
        setEditOpen(false);
        showToast("success", "Asset updated successfully.");
      })
      .catch((error) => showToast("error", safeErrorMessage(error)))
      .finally(() => setWorking(""));
  };

  const confirmRetire = () => {
    if (!asset || working) return;
    setWorking("retire");
    retireAsset(asset)
      .then(() => {
        showToast("success", "Asset retired successfully.");
        navigate("/", { replace: true });
      })
      .catch((error) => {
        showToast("error", safeErrorMessage(error));
        setWorking("");
      });
  };

  if (loading) return <LoadingScreen />;
  if (!asset) return <div className="asset-details-page"><NotFound title="Asset not found" description={<>The asset you're looking for doesn't exist<br />or may have been removed.</>} backHref="/" /></div>;

  return (
    <div className="asset-details-page">
      <div className="container">
      <div className={"modal-overlay" + (editOpen ? " active" : "")}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && working !== "save") setEditOpen(false);
        }}>
        <form className="edit-asset-modal" onSubmit={saveChanges} autoComplete="off">
          <div className="modal-header">
            <div className="icon-circle"><i className="ph-bold ph-pencil-simple" /></div>
            <div className="modal-title"><h2>Edit Asset</h2><p>Update the asset details below.</p></div>
          </div>
          <div className="hr" />
          <div className="input-fields">
            <label htmlFor="edit-asset-name">Asset Name</label>
            <input ref={nameInput} id="edit-asset-name" name="edit-asset-name" type="text" placeholder="e.g., Lab Monitor 1"
              autoComplete="off" autoCorrect="off" spellCheck={false}
              className={nameError ? "name-input error" : "name-input"} value={form.name}
              disabled={working === "save"}
              onChange={(event) => { setForm({ ...form, name: event.target.value }); clearNameError(); }} />
            <label>Status</label>
            <div><select className="status-input" value={form.status} disabled={working === "save"} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="operational">Operational</option><option value="issue reported">Issue Reported</option><option value="under maintenance">Under Maintenance</option>
            </select><i className="ph ph-caret-down" /></div>
            <label htmlFor="edit-asset-location">Location</label>
            <input ref={locationInput} id="edit-asset-location" name="edit-asset-location" type="text" placeholder="e.g., Building A, Room 101"
              autoComplete="off" autoCorrect="off" spellCheck={false}
              className={locationError ? "location-input error" : "location-input"} value={form.location}
              disabled={working === "save"}
              onChange={(event) => { setForm({ ...form, location: event.target.value }); clearLocationError(); }} />
            <label>Condition</label>
            <div><select className="condition-input" value={form.condition} disabled={working === "save"} onChange={(event) => setForm({ ...form, condition: event.target.value })}>
              <option value="excellent">Excellent</option><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option>
            </select><i className="ph ph-caret-down" /></div>
          </div>
          <div className="modal-btns">
            <button type="button" className="cancel-btn" onClick={() => setEditOpen(false)} disabled={working === "save"}>Cancel</button>
            <button type="submit" className="save-changes-btn async-action-button" disabled={working === "save"}>
              <AsyncButtonContent loading={working === "save"}>Save Changes</AsyncButtonContent>
            </button>
          </div>
        </form>
      </div>

      <div className={"modal-overlay retire-modal-overlay" + (retireOpen ? " active" : "")}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && working !== "retire") setRetireOpen(false);
        }}>
        <div className="retire-asset-modal">
          <div className="modal-header">
            <div className="icon-circle retire-icon-circle"><i className="ph-bold ph-warning-circle" /></div>
            <div className="modal-title"><h2>Retire Asset</h2><p>Are you sure you want to retire this asset?</p></div>
          </div>
          <div className="hr" />
          <div className="retire-asset-content"><p>This action will permanently delete the asset and all associated issues. Once retired, it cannot be restored.</p></div>
          <div className="modal-btns">
            <button className="cancel-btn retire-cancel-btn" onClick={() => setRetireOpen(false)} disabled={working === "retire"}>Cancel</button>
            <button className="retire-confirm-btn async-action-button" onClick={confirmRetire} disabled={Boolean(working)}>
              <AsyncButtonContent loading={working === "retire"}>Retire Asset</AsyncButtonContent>
            </button>
          </div>
        </div>
      </div>

      <button className="back-btn" onClick={() => navigate("/")}><i className="ph ph-arrow-left" /> Back To Dashboard</button>
      <section className="title-section">
        <div><h1 className="asset-name">{asset.name}</h1><p className={"asset-status " + statusClass(asset.status)}><span className="dot" /> {asset.status}</p></div>
        <div className="btns"><button className="edit-btn" onClick={openEdit}><i className="ph ph-pencil-simple" /> Edit</button><button className="retire-btn" onClick={() => setRetireOpen(true)}><i className="ph ph-trash" /> Retire Asset</button></div>
      </section>
      <section className="asset-details-and-timeline">
        <section className="asset-details-section">
          <div className="technical-details-card">
            <div className="section-header"><i className="ph-bold ph-file-text" /><p>technical details</p></div>
            <div className="detail"><p className="key">Asset Code</p><p className="value asset-code">AST-{asset.code}</p></div>
            <div className="detail"><p className="key">Location</p><p className="value asset-location">{asset.location}</p></div>
            <div className="detail"><p className="key">Current condition</p><p className="value"><span className={"condition " + String(asset.condition).toLowerCase()}><span className="dot" /> {asset.condition}</span></p></div>
          </div>
          <div className="qr-code-card">
            <div className="section-header"><i className="ph-bold ph-qr-code" /><p>QR Code</p></div>
            <div className="qr-code-container" ref={qrContainer} />
            <div className="btns">
              <button className="qr-code-download-btn" onClick={() => qrInstance.current?.download({ name: "AST-" + asset.code + "-QRcode", extension: "png" })}><i className="ph-bold ph-download-simple" /> Download QR Code</button>
              <button className="public-page-btn" onClick={() => window.open("/public/" + asset.code, "_blank", "noopener,noreferrer")}><i className="ph-bold ph-arrow-square-out" /> Open Public Page</button>
            </div>
          </div>
        </section>
        <section className="asset-timeline-section"><div className="section-header"><i className="ph-bold ph-clock-counter-clockwise" /><p>Maintenance History</p></div><Timeline items={asset.history || []} /></section>
      </section>
    </div>
    </div>
  );
}