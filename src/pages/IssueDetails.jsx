import "../css/issue-details.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AsyncButtonContent, LoadingScreen, NotFound, Timeline } from "../components/Shared";
import { useToast } from "../context/ToastContext";
import { resolveIssue, startIssueMaintenance, subscribeAssetByCode, subscribeIssueByNumber } from "../lib/data";
import { safeErrorMessage, statusClass, formatDate } from "../lib/format";

export default function IssueDetails() {
  const { issueNumber } = useParams();
  const [issue, setIssue] = useState(null);
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const showToast = useToast();
  const navigate = useNavigate();

  useEffect(() => subscribeIssueByNumber(issueNumber, (nextIssue) => {
    setIssue(nextIssue);
    if (!nextIssue) {
      setAsset(null);
      setLoading(false);
    }
  }, (error) => {
    showToast("error", safeErrorMessage(error));
    setLoading(false);
  }), [issueNumber, showToast]);

  useEffect(() => {
    if (!issue?.assetCode) return undefined;

    return subscribeAssetByCode(issue.assetCode, (nextAsset) => {
      setAsset(nextAsset);
      setLoading(false);
    }, (error) => {
      showToast("error", safeErrorMessage(error));
      setLoading(false);
    });
  }, [issue?.assetCode, showToast]);

  const updateStatus = (action) => {
    if (!issue || !asset || working) return;
    setWorking(action);
    const update = action === "start"
      ? startIssueMaintenance(issue, asset)
      : resolveIssue(issue, asset);
    update
      .then(() => showToast("success", action === "start"
        ? "Maintenance started successfully."
        : "Issue resolved successfully."))
      // The issue and asset onSnapshot listeners update this screen automatically.
      .catch((error) => showToast("error", safeErrorMessage(error)))
      .finally(() => setWorking(""));
  };

  if (loading) return <LoadingScreen />;
  if (!issue || !asset) return <div className="issue-details-page"><NotFound title="Issue not found" description={<>The issue you're looking for doesn't exist<br />or may have been removed.</>} backHref="/issues" /></div>;

  return (
    <div className="issue-details-page">
      <div className="container">
      <button className="back-btn" onClick={() => navigate("/issues")}><i className="ph ph-arrow-left" /> Back To Issues</button>
      <section className="title-section">
        <div className="issue-header-content">
          <div className="issue-header-top"><h1 className="issue-id">#ISS-{issue.id}</h1><p className={"issue-status " + statusClass(issue.status)}><span className="dot" />{issue.status}</p></div>
          <p className="issue-title-text">{issue.title}</p>
        </div>
        <div className="btns">
          <button className="start-maintenance-btn async-action-button" onClick={() => updateStatus("start")} disabled={Boolean(working) || issue.status === "Under Maintenance" || issue.status === "Resolved"}>
            <AsyncButtonContent loading={working === "start"}><i className="ph ph-wrench" /> Start Maintenance</AsyncButtonContent>
          </button>
          <button className="resolve-btn async-action-button" onClick={() => updateStatus("resolve")} disabled={Boolean(working) || issue.status === "Resolved"}>
            <AsyncButtonContent loading={working === "resolve"}><i className="ph ph-check-circle" /> Resolve Issue</AsyncButtonContent>
          </button>
        </div>
      </section>
      <section className="issue-details-and-timeline">
        <section className="issue-details-section">
          <div className="issue-details-card">
            <div className="section-header"><i className="ph-bold ph-warning-circle" /><p>Issue Details</p></div>
            <div className="detail"><p className="key">Issue Number</p><p className="value issue-id-number">ISS-{issue.id}</p></div>
            <div className="detail"><p className="key">Reported By</p><p className="value reporter-name">{issue.reporterName}</p></div>
            <div className="detail"><p className="key">Priority</p><p className="value"><span className={"priority-badge " + String(issue.priority).toLowerCase()}><span className="dot" /> {issue.priority}</span></p></div>
            <div className="detail"><p className="key">Reported Date</p><p className="value reported-date">{formatDate(issue.date || issue.createdAt)}</p></div>
          </div>
          <div className="description-card"><div className="section-header"><i className="ph-bold ph-file-text" /><p>Reported Issue</p></div><div className="description-box"><p className="description-text">{issue.description}</p></div></div>
          <div className="affected-asset-card">
            <div className="section-header"><i className="ph-bold ph-cube" /><p>Affected Asset Details</p></div>
            <div className="detail"><p className="key">Asset Name</p><p className="value asset-name">{asset.name}</p></div>
            <div className="detail"><p className="key">Asset Code</p><p className="value asset-code">AST-{asset.code}</p></div>
            <div className="detail"><p className="key">Location</p><p className="value asset-location">{asset.location}</p></div>
            <div className="detail"><p className="key">Current Condition</p><p className="value asset-condition"><span className={"condition " + String(asset.condition).toLowerCase()}><span className="dot" /> {asset.condition}</span></p></div>
          </div>
        </section>
        <section className="issue-timeline-section"><div className="section-header"><i className="ph-bold ph-clock-counter-clockwise" /><p>Maintenance History</p></div><Timeline items={asset.history || []} /></section>
      </section>
    </div>
    </div>
  );
}