# Meal Planner Application

## Overview

This is a full-stack meal planning application built with React, Express, and PostgreSQL. The application helps users generate weekly meal plans based on their activity level and dietary preferences, with a focus on vegetarian, gluten-free, and lactose-free options. It includes integration with Notion for syncing meal plans.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and building

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints under `/api` prefix
- **External Integration**: Notion API for meal plan synchronization

### Database Schema
- **Users**: Comprehensive user profiles with weight, activity level, dietary preferences, and cooking preferences
- **Meal Plans**: Weekly meal plans with metadata, sync status, and regeneration capability
- **Meals**: Individual meals linked to meal plans with complete nutritional and recipe information
- **Meal History**: Tracks user's meal consumption and preferences over time
- **Meal Favorites**: User-curated favorite meals with custom ratings and notes
- **Oura Data**: Health and activity metrics from Oura Ring for personalized planning

## Key Components

### Meal Generation System
- **Nutrition Database**: Pre-defined meal options with protein content, prep times, and ingredient lists
- **Activity-Based Targeting**: Calculates protein targets based on user activity level (high/low)
- **Meal Selection Algorithm**: Distributes protein across breakfast, lunch, and dinner with variety rotation
- **Weekly Planning**: Generates 7-day meal plans with built-in meal variety
- **Shopping List Generator**: Creates categorized ingredient lists from meal plans
- **Universal Meal Prep Engine**: Adapts to any user's cooking schedule:
  - Batch cooking mode when cooking days < eating days
  - Proper meal distribution and labeling system
  - Intelligent fallback options for dietary restrictions
  - Consistent behavior across all user profiles

### Data Storage Solutions
- **Primary Storage**: PostgreSQL database via Neon serverless (migrated from in-memory)
- **ORM**: Drizzle for type-safe database operations
- **Database Layer**: DatabaseStorage class implementing IStorage interface
- **Migration System**: Drizzle Kit for database schema migrations

### External Integrations
- **Notion Integration**: Syncs meal plans to Notion databases
- **Database Management**: Automatically creates Notion databases if they don't exist
- **Page Extraction**: Parses Notion page URLs to extract page IDs
- **Oura Ring Integration**: Syncs health and activity data for intelligent meal planning

### Recipe System
- **Complete Recipe Database**: All meals now include detailed cooking instructions
- **Recipe Modal**: Users can view step-by-step cooking instructions for any meal
- **Cooking Tips**: Each recipe includes helpful tips and preparation notes
- **Nutritional Information**: Comprehensive nutrition data with cost analysis

## Data Flow

1. **User Input**: User selects activity level and week start date
2. **Meal Generation**: Server calculates protein targets and selects appropriate meals
3. **Storage**: Generated meal plans and meals are saved to PostgreSQL
4. **Client Display**: React Query fetches and displays meal plans with real-time updates
5. **Shopping List**: Users can generate categorized shopping lists from meal plans
6. **Notion Sync**: Optional synchronization to user's Notion workspace

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **@notionhq/client**: Notion API integration
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **tailwindcss**: Utility-first CSS framework

### Recent Updates (July 2025)
- **Added "ayurvedic" dietary tag**: Expanded dietary options to include Ayurvedic principles
- **Meal Plan Regeneration**: Users can now regenerate meal plans with updated preferences
- **Complete Recipe Database**: All meals now include detailed cooking instructions and tips
- **Enhanced User Preferences**: Support for cooking days, eating days, and household size
- **Universal Meal Prep Logic**: Intelligent meal planning that works consistently for all users:
  - Detects cooking vs eating day ratios automatically
  - Generates batch cooking plans with proper labeling (e.g., "2x portions - batch cook")
  - Adjusts prep times for leftovers (5 minutes for reheating)
  - Fallback meal options ensure users always get complete meal plans
  - Works across all dietary restrictions and user preferences
- **Enhanced Breakfast Variety for Complex Dietary Restrictions** (July 13, 2025):
  - Resolved breakfast variety issue for users with multiple dietary tags
  - Added 4 new breakfast recipes meeting vegetarian + gluten-free + lactose-free requirements
  - Added fermented kefir breakfast option (naturally lactose-free through 24+ hour fermentation)
  - Updated chia pudding recipe to be lactose-free with plant-based milk
  - Now provides 7 different breakfast options for complex dietary combinations

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **drizzle-kit**: Database schema management

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React application to `dist/public`
- **Backend**: esbuild bundles Express server to `dist/index.js`
- **Database**: Drizzle migrations applied via `db:push` command

### Environment Variables
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NOTION_INTEGRATION_SECRET**: Notion API authentication token
- **NOTION_PAGE_URL**: Target Notion page for meal plan synchronization

### Production Configuration
- **Server**: Express serves static files in production mode
- **Database**: Uses PostgreSQL dialect with connection pooling
- **Error Handling**: Comprehensive error middleware with proper status codes

The application is designed to be easily deployable on platforms like Replit, with automatic detection of development vs. production environments and appropriate configuration for each.