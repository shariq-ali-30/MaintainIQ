import "../css/issues.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, LoadingScreen, Navbar, StatsCard } from "../components/Shared";
import { useToast } from "../context/ToastContext";
import { subscribeIssues } from "../lib/data";
import { formatDate, statusClass } from "../lib/format";

export default function Issues() {
  const [issues, setIssues] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [priority, setPriority] = useState("All Priorities");
  const showToast = useToast();
  const navigate = useNavigate();

  useEffect(() => subscribeIssues(setIssues, (error) => {
    showToast("error", error.message || "Unable to load issues.");
    setIssues([]);
  }), [showToast]);

  const issueList = issues || [];
  const visibleIssues = useMemo(() => issueList.filter((issue) => {
    const text = search.toLowerCase();
    const matchesSearch = issue.title.toLowerCase().includes(text) || issue.assetName.toLowerCase().includes(text) || String(issue.id).includes(search.trim());
    const matchesStatus = status === "All Statuses" || issue.status.toLowerCase() === status.toLowerCase();
    const matchesPriority = priority === "All Priorities" || issue.priority.toLowerCase() === priority.toLowerCase();
    return matchesSearch && matchesStatus && matchesPriority;
  }), [issueList, search, status, priority]);

  if (issues === null) return <LoadingScreen />;

  return (
    <div className="issues-page">
      <Navbar />
      <div className="container">
        <section className="title-section"><div className="dashboard-title"><h2>Issues Management</h2><p>Track and manage reported maintenance issues.</p></div></section>
        <section className="stats-cards-section">
          <StatsCard icon="ph ph-cube" title="Total Issues" value={issues.length} type="total-issues-icon-box" />
          <StatsCard icon="ph ph-warning" title="Open Issues" value={issues.filter((item) => item.status === "Issue Reported").length} type="open-issues-icon-box" />
          <StatsCard icon="ph ph-wrench" title="Under Maintenance" value={issues.filter((item) => item.status === "Under Maintenance").length} type="under-maintenance-icon-box" />
          <StatsCard icon="ph ph-check-circle" title="Resolved Issues" value={issues.filter((item) => item.status === "Resolved").length} type="resolved-issues-icon-box" />
        </section>
        <section className="search-and-filter-section">
          <div className="input-box"><i className="ph ph-magnifying-glass" /><input type="text" placeholder="Search issues by issue number, asset name, or title..." id="search-input" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div className="filters">
            <div className="select-box">
              <select className="status-filter" id="status-dropdown" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option>All Statuses</option><option value="Issue Reported">Issue Reported</option><option value="Under Maintenance">Under Maintenance</option><option value="Resolved">Resolved</option>
              </select><i className="ph ph-caret-down" />
            </div>
            <div className="select-box">
              <select className="priority-filter" id="priority-dropdown" value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option>All Priorities</option><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
              </select><i className="ph ph-caret-down" />
            </div>
          </div>
        </section>
        {visibleIssues.length > 0 ? (
          <section className="issue-table-section">
            <table className="issue-table">
              <thead><tr><th>Issue #</th><th>Asset</th><th>Issue Title</th><th>Priority</th><th>Status</th><th>Reported Date</th><th>Action</th></tr></thead>
              <tbody className="issues-data-container">
                {visibleIssues.map((issue) => (
                  <tr key={issue.docId}>
                    <td className="issue-code">ISS-{issue.id}</td><td className="asset-name">{issue.assetName}</td><td className="issue-title">{issue.title}</td>
                    <td className={"priority " + issue.priority.toLowerCase()}><p><span className="dot" /> {issue.priority}</p></td>
                    <td className={"status " + statusClass(issue.status)}><p><span className="dot" /> {issue.status}</p></td>
                    <td className="reported-date">{formatDate(issue.date || issue.createdAt)}</td>
                    <td className="action"><button onClick={() => navigate("/issues/" + encodeURIComponent(issue.id))}><i className="ph ph-eye" /> View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <EmptyState
            icon="ph ph-warning-circle"
            title={issueList.length === 0 ? "No issues reported" : "No matching issues found"}
            description={issueList.length === 0
              ? "Reported maintenance issues will appear here when someone submits a report."
              : "Try adjusting your search or filters to find the issue you're looking for."}
          />
        )}
      </div>
    </div>
  );
}