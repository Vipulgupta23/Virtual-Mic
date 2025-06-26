# Virtual Mic - Seminar Q&A System

## Overview

This is a web-based Virtual Mic system designed for smartphone audio question submission in seminars and conferences. The application allows hosts to create sessions and participants to submit audio questions via QR code access. The system provides real-time question management with audio playback capabilities.

## System Architecture

The application follows a full-stack architecture with a clear separation between client and server components:

- **Frontend**: React-based SPA with TypeScript using Vite as the build tool
- **Backend**: Express.js REST API server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for data persistence
- **File Storage**: Local filesystem for audio file uploads
- **Development Environment**: Configured for Replit with hot reloading

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Audio Handling**: Custom audio recording and playback components

### Backend Architecture
- **Server**: Express.js with TypeScript
- **API Design**: RESTful endpoints for sessions and questions
- **File Upload**: Multer middleware for audio file handling
- **Storage**: In-memory storage with interface for easy database integration
- **CORS**: Configured for cross-origin requests

### Database Schema
- **Sessions**: Store session metadata (id, host name, active status, participant count)
- **Questions**: Store question details (audio filename, participant name, duration, status, order)
- **Users**: Basic user management with username/password

## Data Flow

1. **Session Creation**: Host creates a session which generates a unique ID and QR code
2. **Participant Access**: Participants scan QR code to access the submission interface
3. **Audio Submission**: Participants record and submit audio questions via multipart form upload
4. **Question Management**: Host can view, play, reorder, and delete questions in real-time
5. **Audio Playback**: Server serves audio files with robust error handling and format support

## External Dependencies

### Core Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **ORM**: Drizzle ORM with PostgreSQL adapter
- **UI Library**: Radix UI primitives with Shadcn/UI components
- **Query Management**: TanStack Query for API state management
- **File Upload**: Multer for multipart form handling
- **QR Code Generation**: QRCode library for participant access

### Development Tools
- **Build Tool**: Vite with React plugin
- **TypeScript**: Full type safety across client and server
- **ESBuild**: Server-side bundling for production
- **PostCSS**: CSS processing with Tailwind

## Deployment Strategy

The application is configured for Replit's autoscale deployment:

- **Development**: `npm run dev` starts both client and server with hot reloading
- **Build Process**: Vite builds client assets, ESBuild bundles server code
- **Production**: `npm run start` serves the production build
- **Port Configuration**: Server runs on port 5000, exposed externally on port 80
- **Asset Serving**: Static files served from dist/public directory

The deployment uses parallel workflow execution and includes proper environment variable management for database connections.

## Changelog

```
Changelog:
- June 26, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```