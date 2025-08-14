# Meal Planner Application

## Overview
This full-stack meal planning application helps users generate personalized weekly meal plans based on activity levels and dietary preferences, including vegetarian, gluten-free, and lactose-free options. It integrates with Notion for meal plan synchronization. The project aims to provide a comprehensive and adaptable solution for healthy meal planning.

## User Preferences
Preferred communication style: Simple, everyday language.
Breakfast scheduling preference: Easy, quick breakfasts during weekdays (≤10 min prep), elaborate breakfasts like pancakes on weekends (≥15 min prep).

## System Architecture

### UI/UX Decisions
- **Design System**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack React Query for server state.
- **Backend**: Express.js with TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations, managed via Neon serverless.
- **Session Management**: Express sessions with PostgreSQL store.
- **Build Tools**: Vite for frontend, esbuild for backend.
- **Meal Generation**: Calculates protein targets based on user activity, selects meals from a pre-defined nutrition database, generates 7-day plans with variety, and creates shopping lists.
- **Universal Meal Prep Engine**: Adapts to user cooking schedules, supporting batch cooking, proper meal distribution, intelligent dietary fallbacks, and consistent behavior across profiles.
- **Recipe System**: All meals include detailed cooking instructions, tips, and nutritional information. Recipes are alcohol-free.
- **Smart Time Constraints**: Weekday meals (Mon-Fri) are limited to ≤30 minutes prep time; weekends have no time restrictions.
- **Ayurvedic Integration**: Supports Ayurvedic dietary tags, including seasonal adaptation based on a 6-season calendar (adapted for European seasons) that filters warming recipes in summer and provides cooling alternatives.
- **Meal Plan Persistence**: Meal plans persist across browser sessions with automatic loading of current week or latest plan. Enhanced login flow redirects users to homepage after authentication.
- **Automated Viral Recipe Updates**: System automatically adds new trending recipes every 2 weeks on Sundays at 3 AM to keep content fresh and current. Includes viral TikTok recipes, social media food trends, and popular dishes with "viral" and "social-media" dietary tags.
- **Enhanced Multi-Plan Weekend Grocery System**: Users can maintain both current week (for remaining cooking) and next week plans (for grocery shopping) simultaneously. Features separate sections for current week plan continuation and next week grocery planning with clear visual distinctions and alternating capabilities.
- **Albert Heijn Shopping List Integration**: Complete integration with Dutch supermarket Albert Heijn for shopping list generation, export in multiple formats (text, CSV, JSON), ingredient mapping to Dutch terms, store-optimized route planning, and deep linking to AH mobile app.
- **Complete Dutch Recipe Translation System**: Comprehensive translation service that converts recipe names, ingredients, and cooking instructions from English to Dutch when Dutch language is selected. Includes over 200 ingredient and cooking term translations, pattern-based recipe name conversion, and integration with all recipe endpoints including AI-generated content.
- **Consolidated Shopping List Workflow**: Single-flow shopping list generation with integrated export options (copy, CSV download, Albert Heijn app deep linking) within the shopping list interface, eliminating separate buttons for better UX.

### System Design Choices
- **Data Flow**: User input drives meal generation, which is stored in PostgreSQL, displayed via React Query, and can be synced to Notion.
- **Database Schema**: Includes comprehensive user profiles, weekly meal plans, individual meals with nutrition/recipe info, meal history, favorite meals, and Oura data for personalized planning.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connection.
- **@notionhq/client**: Notion API integration for meal plan synchronization.
- **drizzle-orm**: ORM for database interactions.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/***: Headless UI components.
- **tailwindcss**: Utility-first CSS framework.