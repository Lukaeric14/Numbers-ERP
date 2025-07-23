# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev`: Start development server with Turbopack (localhost:3000)
- `npm run build`: Build production version
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## Architecture Overview

This is a Next.js 15 tutoring/ERP application with role-based access control built with:

### Tech Stack
- **Framework**: Next.js 15 with App Router and Turbopack
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Authentication**: Supabase Auth with role-based permissions
- **UI**: Tailwind CSS v4, Radix UI primitives, shadcn/ui components
- **Charts**: Recharts for data visualization
- **State**: React Context for auth and content management

### Key Architecture Patterns

**Role-Based Navigation**: The application uses a context-driven sidebar system where navigation items are filtered based on user roles (admin, tutor, student). Navigation configuration is centralized in `app-sidebar.tsx` with role-specific menu items.

**Authentication Flow**: 
- Supabase handles authentication with custom user metadata
- AuthContext manages user state and role fetching from `app_users` table
- ProtectedRoute component wraps pages requiring authentication
- User roles are fetched from database and cached in context

**Content Management**: ContentContext provides dynamic content rendering based on selected navigation items, allowing the same dashboard layout to show different content areas.

**Database Schema**: Uses Supabase with an `app_users` table that extends the auth.users table with role information and additional user data.

### File Structure Notes

- `src/contexts/`: Authentication and content management contexts
- `src/components/content/`: Role-specific page content components  
- `src/components/ui/`: Reusable shadcn/ui components
- `src/lib/supabase.ts`: Supabase client configuration
- Database schema and functions are in `supabase-functions.sql`

### Important Environment Variables

The application requires Supabase environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Fallback values are hardcoded in `supabase.ts` for development.