import "../css/public.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AsyncButtonContent, LoadingScreen, NotFound, Timeline } from "../components/Shared";
import { useToast } from "../context/ToastContext";
import { reportPublicIssue, subscribeAssetByCode } from "../lib/data";
import { safeErrorMessage, statusClass } from "../lib/format";

export default function PublicAsset() {
  const { code } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reporterName, setReporterName] = useState("");
  const [priority, setPriority] = useState("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToast();

  useEffect(() => subscribeAssetByCode(code, (result) => {
    setAsset(result);
    setLoading(false);
  }, (error) => {
    showToast("error", safeErrorMessage(error));
    setLoading(false);
  }, true), [code, showToast]);

  const submitReport = (event) => {
    event.preventDefault();
    if (!reporterName.trim() || !title.trim() || !description.trim()) {
      showToast("error", "Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    reportPublicIssue(asset, { reporterName, priority, title, description })
      .then(() => {
        setReporterName("");
        setPriority("medium");
        setTitle("");
        setDescription("");
        showToast("success", "Issue reported successfully.");
      })
      .catch((error) => showToast("error", safeErrorMessage(error)))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <LoadingScreen />;
  if (!asset) return (
    <div className="public-asset-page">
      <nav className="navbar"><div className="container"><div className="logo"><i className="fa-solid fa-screwdriver-wrench" /><h2>Maintain<span>IQ</span></h2></div></div></nav>
      <NotFound title="Asset not found" description={<>The asset you're looking for doesn't exist<br />or may have been removed.</>} />
    </div>
  );

  return (
    <div className="public-asset-page">
      <nav className="navbar"><div className="container"><div className="logo"><i className="fa-solid fa-screwdriver-wrench" /><h2>Maintain<span>IQ</span></h2></div></div></nav>
      <div className="container">
        <section className="title-section">
          <div><h1 className="asset-name">{asset.name}</h1><p className={"asset-status " + statusClass(asset.status)}><span className="dot" /> {asset.status}</p></div>
        </section>
        <section className="asset-details-and-timeline">
          <section className="asset-details-section">
            <div className="technical-details-card">
              <div className="section-header"><i className="ph-bold ph-file-text" /><p>technical details</p></div>
              <div className="detail"><p className="key">Asset Code</p><p className="value asset-code">AST-{asset.code}</p></div>
              <div className="detail"><p className="key">Location</p><p className="value asset-location">{asset.location}</p></div>
              <div className="detail"><p className="key">Current condition</p><p className="value"><span className={"condition " + String(asset.condition).toLowerCase()}><span className="dot" /> {asset.condition}</span></p></div>
            </div>
            <div className="report-issue-card">
              <div className="section-header report-header"><i className="ph-bold ph-warning-circle" /><p>Report an Issue</p></div>
              <form className="report-issue-form" id="issueForm" onSubmit={submitReport} autoComplete="off">
                <div className="form-row">
                  <div className="input-group"><label>Reporter Name <span>*</span></label><input type="text" placeholder="Enter your name" className="reporter-name-input" autoComplete="off" autoCorrect="off" value={reporterName} onChange={(event) => setReporterName(event.target.value)} disabled={submitting} /></div>
                  <div className="input-group"><label>Priority</label><div className="select-wrapper">
                    <select className="priority-input" value={priority} onChange={(event) => setPriority(event.target.value)} disabled={submitting}><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
                    <i className="ph ph-caret-down" />
                  </div></div>
                </div>
                <div className="input-group"><label>Issue Title <span>*</span></label><input type="text" placeholder="e.g., Screen is flickering" className="issue-title-input" autoComplete="off" autoCorrect="off" value={title} onChange={(event) => setTitle(event.target.value)} disabled={submitting} /></div>
                <div className="input-group"><label>Description <span>*</span></label><textarea rows="4" placeholder="Describe the problem in detail..." className="issue-description-input" autoComplete="off" autoCorrect="off" value={description} onChange={(event) => setDescription(event.target.value)} disabled={submitting} /></div>
                <button className="submit-btn async-action-button" type="submit" disabled={submitting}>
                  <AsyncButtonContent loading={submitting}>Submit Report <i className="ph-bold ph-paper-plane-right" /></AsyncButtonContent>
                </button>
              </form>
            </div>
          </section>
          <section className="asset-timeline-section"><div className="section-header"><i className="ph-bold ph-clock-counter-clockwise" /><p>Maintenance History</p></div><Timeline items={asset.history || []} /></section>
        </section>
      </div>
    </div>
  );
}