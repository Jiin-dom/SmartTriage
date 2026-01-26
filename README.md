# SmartTriage

A web-based AI-assisted ticket classification and priority management system designed to help support teams handle customer issues more efficiently.

## Overview

SmartTriage is a modern full-stack ticketing system built with React, TypeScript, and Tailwind CSS. The application provides:

- **AI-Assisted Ticket Management**: Automatic categorization and priority scoring
- **Role-Based Access**: Support for Administrators and Support Agents
- **Real-time Analytics**: Dashboard with insights and metrics
- **User Management**: Comprehensive team member administration
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Icons**: Material Symbols

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/      # Shared React components (Layout, Sidebar, Header)
├── pages/          # Page components (Login, Dashboard, etc.)
├── App.tsx         # Main application component with routing
├── main.tsx        # Application entry point
└── index.css       # Global styles and Tailwind directives
```

## Features

### Pages

- **Login** (`/login`) - User authentication
- **Dashboard** (`/dashboard`) - Ticket list view with filtering and search
- **Create Ticket** (`/tickets/create`) - Create new support tickets
- **Ticket Details** (`/tickets/:id`) - View ticket details with AI analysis
- **Profile & Settings** (`/profile`) - User profile and preferences
- **Analytics** (`/analytics`) - Admin analytics dashboard
- **User Management** (`/users`) - Team member administration

## License

© 2024 SmartTriage Inc. All rights reserved.
