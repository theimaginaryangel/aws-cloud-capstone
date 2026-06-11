# CloudTeam Check-in App

> End-to-End Cloud Solution Design & Deployment | AWS Capstone Project  
> Azubi Africa Cloud and AI Intensive Programme — June 2025

## 📌 Project Overview

A real‑time team check‑in dashboard where every team member can share their daily mood, status, and current task. All check‑ins, reactions, and comments are **shared across all users** because data is stored on the server (not in the browser). The app is deployed on AWS using a secure, scalable architecture:

**CloudFront → ALB → EC2 (Nginx + Node.js)**

---

## 🎯 Capstone Objectives

- Design, architect, and deploy a secure, scalable web application on AWS.
- Use CloudFront as a global CDN with HTTPS (ACM certificate).
- Route traffic via an Application Load Balancer (ALB) to an EC2 instance.
- Host static assets and backend logic on the same EC2 instance (Nginx + Node.js).
- Automate deployments with GitHub Actions (CI/CD).
- Manage the project with Git (feature branches, PRs) and Trello.

---

## 🏗️ Architecture
┌─────────────┐
│ Browser │
└──────┬──────┘
│ HTTPS
▼
┌─────────────┐
│ CloudFront │ (CDN + SSL termination)
└──────┬──────┘
│ HTTP
▼
┌─────────────┐
│ ALB │ (load balancer, health checks)
└──────┬──────┘
│ HTTP
▼
┌─────────────┐
│ EC2 (Nginx) │ → serves static files (HTML/CSS/JS)
└──────┬──────┘
│ /api/ proxy
▼
┌─────────────┐
│ Node.js │ → Express API, shared data.json
└─────────────┘

text

- **CloudFront** – global CDN, HTTPS, ACM certificate.
- **ALB** – distributes traffic, health checks.
- **EC2 (t2.micro)** – runs Nginx + Node.js. Serves frontend and backend.
- **Nginx** – serves static files, reverse proxy `/api/*` to Node.js on port 3000.
- **Node.js + Express** – API endpoints, stores all check‑ins in `data.json`.
- **PM2** – keeps the Node.js process alive and restarts on crash/reboot.
- **GitHub Actions** – automatic deployment on push to `main` (installs Node, npm, PM2, starts server).

---

## 🧰 Technology Stack

| Layer          | Technology                         |
|----------------|------------------------------------|
| Frontend       | HTML5, CSS3, Vanilla JS            |
| Backend        | Node.js + Express                  |
| Data Storage   | `data.json` (file‑based, on EC2)   |
| Process Mgr    | PM2                                |
| Reverse Proxy  | Nginx                              |
| CDN / HTTPS    | CloudFront + ACM                   |
| Load Balancer  | Application Load Balancer (ALB)    |
| Compute        | Amazon EC2 (t2.micro)              |
| Version Control| GitHub (develop/main branches)     |
| CI/CD          | GitHub Actions                     |
| Project Mgt    | Trello                             |

---

## 📂 Repository Structure
team-checkin/
├── index.html
├── css/
│ └── style.css
├── js/
│ └── main.js (sync version with fetch)
├── server.js (Node.js backend)
├── package.json
├── package-lock.json
├── .github/workflows/
│ └── deploy.yml
└── README.md

text

---

## 🚀 Local Development (for contributors)

### Prerequisites
- Node.js v18+ installed locally.

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/theimaginaryangel/aws-cloud-capstone.git
   cd aws-cloud-capstone
Install dependencies:

bash
npm install
Start the server:

bash
node server.js
Open http://localhost:3000 in your browser.

The backend serves the frontend and API at the same origin – no CORS issues.

🧪 Testing the App
Fill in the form → card appears on the board.

Open a second browser/incognito window → the same check‑in appears (sync works).

Add reactions and comments → they appear for all users.

Click Reset today's check‑ins → clears the board for everyone.

Toggle dark/light mode – preference is saved in localStorage (client‑side).

Team size limit: MAX_TEAM = 12 (configurable in server.js and js/main.js).

🌍 Deployment to AWS
The app is automatically deployed to EC2 via GitHub Actions whenever changes are pushed to the main branch.

Manual deployment (initial setup by cloud lead)
Launch an EC2 instance (Amazon Linux 2 / 2023).

Install Nginx, Git, Node.js, PM2 (or let GitHub Actions handle it).

Clone the repository into /var/www/html.

Configure Nginx reverse proxy (see below).

Run npm install, then pm2 start server.js --name team-checkin.

Configure CloudFront distribution with ALB as origin, HTTPS redirect.

Nginx configuration ( /etc/nginx/conf.d/team.conf )
nginx
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
CloudFront behaviours
Default (*) behaviour must point to the ALB origin, not the S3 bucket.

All requests (CSS, JS, API) must go to EC2 to ensure the sync version is served.


📸 Screenshots (required for capstone)
See the Developer Documentation for the complete set (SS-01 to SS-11).
Minimum required screenshots:

Local app running (localhost:3000)

Full board with 12 check‑ins

GitHub Actions successful run

Live site on CloudFront URL with padlock

DevTools network tab showing x-cache: Hit from cloudfront

👥 Team & Responsibilities
Person	Role
Person A	Cloud lead – AWS infrastructure (EC2, ALB, CloudFront, ACM)
Benny(developer)	Dev + GitHub – builds app, manages repo, CI/CD, PR reviews
Person C	Project manager – Trello, coordination
Person D	Documentation – architecture diagram, setup guide
Person E	Presentation – slides, demo script
📋 Capstone Phases & Status
Phase	Description	Status
1	Project setup: AWS, GitHub, Trello, EC2, S3	✅ Completed
2	Web app development, ALB, static assets on EC2	✅ Completed
3	Security hardening: CloudFront + HTTPS	✅ Completed
4	CI/CD pipeline (GitHub Actions), monitoring	✅ Completed
5	Presentation & live demo	🟡 Ready
🧠 Lessons Learned
Sync with backend – moving from localStorage to a shared Node.js backend required careful coordination between frontend and Nginx proxy.

Nginx reverse proxy – forgetting the /api/ location block broke all API calls.

CloudFront caching – after switching origins, invalidate /* to flush old 404s.

PM2 – essential for keeping Node.js alive after EC2 reboots.

S3 vs EC2 – for a dynamic app with a backend, serving everything from EC2 is simpler and avoids version mismatches.

📄 License
Educational use only – Azubi Africa Cloud & AI Intensive Programme.

🔗 Resources
GitHub Actions Documentation

Node.js + Express

PM2 Process Manager

AWS CloudFront

AWS ALB

Live demo URL (provided by Justin):
www.cloud12.xyz
