import {
  collection, doc, getDoc, getDocs, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, updateDoc, where, writeBatch
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "./firebase";
import { formatLongDateTime } from "./format";

const assetsRef = collection(db, "assets");
const issuesRef = collection(db, "issues");
const countersRef = doc(db, "meta", "counters");

function assetDocument(code) {
  return doc(db, "assets", "asset-" + String(code));
}

function issueDocument(id) {
  return doc(db, "issues", "issue-" + String(id));
}

function fromSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({ ...item.data(), docId: item.id }));
}

export function subscribeAssets(onData, onError) {
  return onSnapshot(
    query(assetsRef, orderBy("code", "desc")),
    (snapshot) => onData(fromSnapshot(snapshot)),
    onError
  );
}

export function subscribeIssues(onData, onError) {
  return onSnapshot(
    query(issuesRef, orderBy("id", "desc")),
    (snapshot) => onData(fromSnapshot(snapshot)),
    onError
  );
}

export function subscribeAssetByCode(code, onData, onError, publicOnly = false) {
  if (!code) {
    onData(null);
    return () => {};
  }

  return onSnapshot(assetDocument(code), (snapshot) => {
    if (!snapshot.exists()) {
      onData(null);
      return;
    }
    const asset = { ...snapshot.data(), docId: snapshot.id };
    onData(publicOnly && asset.isPublic !== true ? null : asset);
  }, onError);
}

export function subscribeIssueByNumber(id, onData, onError) {
  if (!id) {
    onData(null);
    return () => {};
  }

  return onSnapshot(issueDocument(id), (snapshot) => {
    onData(snapshot.exists() ? { ...snapshot.data(), docId: snapshot.id } : null);
  }, onError);
}

export async function getAssetByCode(code, publicOnly = false) {
  const snapshot = await getDoc(assetDocument(code));
  if (!snapshot.exists()) return null;
  const asset = { ...snapshot.data(), docId: snapshot.id };
  if (publicOnly && asset.isPublic !== true) return null;
  return asset;
}

export async function getIssueByNumber(id) {
  const snapshot = await getDoc(issueDocument(id));
  return snapshot.exists() ? { ...snapshot.data(), docId: snapshot.id } : null;
}

function makeAsset(code, data) {
  return {
    ...data,
    code,
    isPublic: true,
    publicPageLink: window.location.origin + "/public/" + code,
    createdAt: serverTimestamp()
  };
}

function makeIssue(issue) {
  return { ...issue, assetCode: String(issue.assetCode), createdAt: serverTimestamp() };
}

export function createAsset({ name, location }) {
  return runTransaction(db, async (transaction) => {
    const counterSnapshot = await transaction.get(countersRef);
    const nextCode = (counterSnapshot.exists() ? counterSnapshot.data().assetCode || 1000 : 1000) + 1;

    transaction.set(assetDocument(nextCode), makeAsset(nextCode, {
      name: name.trim(),
      location: location.trim(),
      status: "Operational",
      condition: "Excellent",
      history: [{ activity: "Asset Created", time: formatLongDateTime() }]
    }));
    transaction.set(countersRef, { assetCode: nextCode }, { merge: true });
    return nextCode;
  });
}

export function updateAsset(asset, changes) {
  const changed = Object.keys(changes).filter((key) => String(asset[key]) !== String(changes[key]));
  if (!changed.length) return false;

  const labels = {
    name: "Name changed to ",
    status: "Status updated to ",
    location: "Location changed to ",
    condition: "Condition updated to "
  };
  const activity = changed.length > 1
    ? "Updated Asset Details"
    : (labels[changed[0]] || "Updated ") + changes[changed[0]];

  return updateDoc(doc(db, "assets", asset.docId), {
    ...changes,
    history: [{ activity, time: formatLongDateTime() }, ...(asset.history || [])],
    updatedAt: serverTimestamp()
  }).then(() => true);
}

export function retireAsset(asset) {
  return getDocs(query(issuesRef, where("assetCode", "==", String(asset.code))))
    .then((linkedIssues) => {
      const batch = writeBatch(db);
      linkedIssues.docs.forEach((item) => batch.delete(item.ref));
      batch.delete(doc(db, "assets", asset.docId));
      return batch.commit();
    });
}

export async function startIssueMaintenance(issue, asset) {
  const issueRef = doc(db, "issues", issue.docId);
  const currentAssetRef = doc(db, "assets", asset.docId);

  return runTransaction(db, async (transaction) => {
    const issueSnapshot = await transaction.get(issueRef);
    const assetSnapshot = await transaction.get(currentAssetRef);
    if (!issueSnapshot.exists() || !assetSnapshot.exists()) {
      throw new Error("The issue or its asset no longer exists.");
    }

    const currentIssue = issueSnapshot.data();
    const currentAsset = assetSnapshot.data();
    if (currentIssue.status === "Under Maintenance") {
      throw new Error("This issue is already under maintenance.");
    }
    if (currentIssue.status === "Resolved") {
      throw new Error("This issue has already been resolved.");
    }

    transaction.update(issueRef, { status: "Under Maintenance", updatedAt: serverTimestamp() });
    transaction.update(currentAssetRef, {
      status: "Under Maintenance",
      history: [{ activity: "Maintenance Started - " + currentIssue.title, time: formatLongDateTime() }, ...(currentAsset.history || [])],
      updatedAt: serverTimestamp()
    });
  });
}

export async function resolveIssue(issue, asset) {
  const issueRef = doc(db, "issues", issue.docId);
  const currentAssetRef = doc(db, "assets", asset.docId);

  return runTransaction(db, async (transaction) => {
    const issueSnapshot = await transaction.get(issueRef);
    const assetSnapshot = await transaction.get(currentAssetRef);
    if (!issueSnapshot.exists() || !assetSnapshot.exists()) {
      throw new Error("The issue or its asset no longer exists.");
    }

    const currentIssue = issueSnapshot.data();
    const currentAsset = assetSnapshot.data();
    if (currentIssue.status === "Resolved") {
      throw new Error("This issue has already been resolved.");
    }

    transaction.update(issueRef, { status: "Resolved", updatedAt: serverTimestamp() });
    transaction.update(currentAssetRef, {
      status: "Operational",
      history: [{ activity: "Issue Resolved - " + currentIssue.title, time: formatLongDateTime() }, ...(currentAsset.history || [])],
      updatedAt: serverTimestamp()
    });
  });
}

export function reportPublicIssue(asset, form) {
  const signInPromise = auth.currentUser
    ? Promise.resolve()
    : signInAnonymously(auth);

  return signInPromise.then(() => runTransaction(db, async (transaction) => {
    const counterSnapshot = await transaction.get(countersRef);
    const assetRef = doc(db, "assets", asset.docId);
    const assetSnapshot = await transaction.get(assetRef);
    if (!assetSnapshot.exists()) throw new Error("This asset no longer exists.");

    const currentAsset = assetSnapshot.data();
    const nextId = (counterSnapshot.exists() ? counterSnapshot.data().issueCode || 1000 : 1000) + 1;
    const issueRef = issueDocument(nextId);
    const now = new Date();
    const normalizedPriority = form.priority.charAt(0).toUpperCase() + form.priority.slice(1).toLowerCase();

    transaction.set(issueRef, makeIssue({
      id: nextId,
      title: form.title.trim(),
      description: form.description.trim(),
      status: "Issue Reported",
      priority: normalizedPriority,
      reporterName: form.reporterName.trim(),
      date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      assetCode: String(currentAsset.code),
      assetName: currentAsset.name
    }));
    transaction.update(assetRef, {
      status: "Issue Reported",
      history: [{ activity: "Issue Reported - " + form.title.trim(), time: formatLongDateTime(now) }, ...(currentAsset.history || [])],
      updatedAt: serverTimestamp()
    });
    transaction.set(countersRef, { issueCode: nextId }, { merge: true });
    return nextId;
  }));
}