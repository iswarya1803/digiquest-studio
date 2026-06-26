# DigiQuest Delivery Tracker

A premium web portal for **DigiQuest Studio** to manage media delivery checklists, client approvals, digital sign-offs, and real-time revisions. Built using React, Node.js (Express), and Socket.IO.

## Features

- **Double-pass Client Sign-off**: Secure workflows with canvas-drawn digital signatures.
- **Visual Delivery Checklist**: Live progression tracker covering Color Grading, Audio Mix, Subtitles, Format Conversion, and Quality Control.
- **Premium Analytics**: Interactive status distribution and completion charts.
- **Exporting Options**: Generate instant PDF and Excel audit reports.
- **Password-protected Downloads**: File download options secured by client PINs.
- **Real-time Notifications**: Real-time push updates for checklist steps and comments powered by Socket.IO.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### Installation

1. Install root workspace dependencies:
   ```bash
   npm install
   ```

2. Install backend dependencies:
   ```bash
   cd server
   npm install
   cd ..
   ```

### Running the App

Start both the Vite development frontend server and Node backend server concurrently:
```bash
npm run dev
```
- **Frontend URL:** http://localhost:5173
- **Backend API:** https://digiquest-studio.onrender.com

---

## Running Test Suites

### Unit and Integration Tests (Jest & Supertest)
```bash
npm test
```

### End-to-End Tests (Cypress)
To launch the interactive Cypress test runner:
```bash
npx cypress open
```
To run tests headlessly in the command line:
```bash
npx cypress run
```
