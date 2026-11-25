# MaintainIQ — React + Tailwind + Firebase

MaintainIQ is an asset and maintenance management app built with React, Vite, Tailwind CSS 4, Firebase Authentication, and Cloud Firestore.

## Stack

- React 19 + Vite
- React Router for clean client-side routes
- Tailwind CSS 4 (Vite plugin)
- Firebase Authentication (email/password for staff; anonymous sign-in for public issue reports)
- Cloud Firestore with realtime `onSnapshot` subscriptions
- QR Code Styling

## Features

- Admin dashboard for asset management and maintenance overview
- Create, search, filter, view, edit, and retire assets
- Asset details, status and condition, maintenance timeline, and QR download
- Public asset pages and public issue reporting
- Technician issue dashboard, filters, issue details, and status updates
- Role-aware navigation, authentication state tracking, and toast messages
- Realtime updates for asset lists, issue lists, detail pages, and staff profiles

The original page styles and icon asset are preserved under `public/CSS/` and `public/images/`. React pages reuse the existing class names and markup patterns. Tailwind utilities are enabled without applying a global preflight reset over the original styles.

## 1. Install

Use Node.js 20.19+ or 22.12+.

~~~bash
npm install
copy .env.example .env.local
npm run dev
~~~

On macOS or Linux, use `cp .env.example .env.local` instead of `copy`.

## 2. Configure Firebase

1. Create a Firebase project and register a Web app.
2. Enable Authentication → Email/Password.
3. Enable Authentication → Sign-in method → Anonymous for public issue reports.
4. Create a Cloud Firestore database.
5. Copy the Firebase Web app configuration into `.env.local` using the `VITE_FIREBASE_*` names from `.env.example`.
6. Install and connect the Firebase CLI, then publish the supplied rules:

~~~bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
~~~

The app does not include hard-coded demo credentials or automatically seed sample assets/issues. A new database starts with empty asset and issue collections. Create staff accounts in Firebase Authentication, then create a matching Firestore document at `users/{AUTH_UID}`.

Example admin profile:

~~~json
{
  "role": "admin",
  "displayName": "Admin User"
}
~~~

Example technician profile:

~~~json
{
  "role": "technician",
  "displayName": "Technician User"
}
~~~

The role value must be exactly `admin` or `technician`. The sign-in screen verifies the selected role against this Firestore profile.

## 3. Firestore collections

- `users/{uid}` — staff role and display name
- `assets/asset-{code}` — asset details, public visibility, and maintenance history
- `issues/issue-{number}` — issue details and status
- `meta/counters` — next asset and issue numbers

Assets and issues are read through Firestore realtime listeners, so updates appear in the interface automatically without a manual page reload.

## 4. Application routes

- `/` — Admin dashboard
- `/login` — Staff login
- `/issues` — Issue list
- `/assets/:code` — Asset details
- `/issues/:issueNumber` — Issue details
- `/public/:code` — Public asset page and issue reporting

Legacy `.html` routes remain as redirects for old links and previously generated QR codes.

## 5. Build and deploy

~~~bash
npm run build
npm run preview
~~~

For Firebase Hosting run `firebase deploy`. The `firebase.json` rewrite sends application routes to the React entry point. `vercel.json` provides the equivalent SPA rewrite for Vercel.

## Public issue reporting

The public asset page reads only assets marked `isPublic: true`. When a visitor submits an issue, the app signs in anonymously, creates the issue record, and updates that asset's status and history. Firestore rules restrict anonymous writes to this reporting flow; staff-only data remains behind the role-protected routes.

## Important setup note

Firebase configuration and staff user/profile creation are project-specific and must be completed in your Firebase project before the app can authenticate or read/write data. Do not commit `.env.local`.
