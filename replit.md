# Meal Planner Application

## Overview

This is a full-stack meal planning application built with React, Express, and PostgreSQL. The application helps users generate weekly meal plans based on their activity level and dietary preferences, with a focus on vegetarian, gluten-free, and lactose-free options. It includes integration with Notion for syncing meal plans.

## User Preferences

Preferred communication style: Simple, everyday language.
Breakfast scheduling preference: Easy, quick breakfasts during weekdays (≤10 min prep), elaborate breakfasts like pancakes on weekends (≥15 min prep).

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
- **Smart Breakfast Scheduling Fixed** (July 13, 2025):
  - Fixed weekday vs weekend breakfast allocation in meal prep mode
  - Weekdays (Mon-Fri) now correctly receive quick breakfasts (≤10 min prep): chia pudding, overnight oats, smoothie bowls, kefir bowls
  - Weekends (Sat-Sun) receive elaborate breakfasts (≥15 min prep): pancakes, quinoa bowls, scrambled eggs
  - Enhanced meal prep function with proper breakfast categorization logic
  - Added detailed ingredient measurements with volumes, weights, and specific amounts to all recipes
- **Dutch Language Support & Ingredient Management** (July 14, 2025):
  - Added comprehensive Dutch language support with full translation system
  - Language selector moved to navigation menu (both desktop and mobile)
  - Clarified leftover terminology: Distinguished between "meal prep leftovers" (reheating pre-cooked meals) and "ingredient leftovers" (leftover ingredients to incorporate into fresh recipes)
  - Updated UI terminology from "leftovers" to "ingredients to use up" for clarity
  - Enhanced visual indicators: 🔄 for meal prep (reheating) vs ♻️ for ingredient incorporation
  - Fixed server routes to accept both PUT and PATCH requests for profile updates
- **Enhanced Leftover Ingredient Recipe Integration** (July 14, 2025):
  - Complete leftover ingredient incorporation into recipe instructions
  - Recipe-specific cooking guidance: pasta dishes, quinoa/roasted vegetables, curries, salads, etc.
  - Intelligent timing instructions (e.g., "add during last 3-4 minutes" for pasta sauce)
  - Clear preparation guidance (dicing, timing, expected texture/flavor results)
  - Cooking instructions now include dedicated "LEFTOVER INGREDIENT:" steps
  - System makes smart culinary choices about when and how to incorporate ingredients
- **Alcohol-Free Recipe Database** (July 14, 2025):
  - Removed all alcoholic ingredients from meal database (wine, beer, spirits)
  - Replaced wine with vegetable broth in all recipes and cooking instructions
  - Updated shopping list generation to handle alcohol-free substitutions
  - All recipes now suitable for alcohol-free dietary preferences
- **30-Minute Weekday Cooking Time Limit** (July 14, 2025):
  - Added automatic 30-minute cooking time filter for weekday meals (Monday-Friday)
  - Both regular meal planning and meal prep modes now respect weekday time constraints
  - Weekend meals (Saturday-Sunday) have no time restrictions for more elaborate cooking
  - System filters available meals to only show quick options during busy weekdays
  - Maintains meal variety while accommodating working schedule constraints
- **Expanded Quick Dinner Recipe Database for Complex Dietary Restrictions** (July 14, 2025):
  - Added 5 new quick dinner recipes (≤30 minutes) meeting vegetarian + gluten-free + lactose-free requirements
  - Recipes include: Asian-style vegetable fried rice with tofu, Speedy chickpea curry with coconut milk and quinoa, Quick black bean and sweet potato hash, Quick veggie stir-fry with rice noodles and tahini sauce, Mediterranean quinoa bowl with roasted vegetables
  - Resolved meal variety issue where only 1 dinner option was available for complex dietary combinations
  - System now provides 5+ different dinner options for weekdays with complete nutrition profiles
  - All recipes include detailed cooking instructions and nutritional information
- **Enhanced Ayurvedic Recipe Database for Sufficient Meal Variety** (July 14, 2025):
  - Added 5 new ayurvedic recipes to resolve insufficient variety for ayurvedic dietary preferences
  - Added authentic Ayurvedic recipes: Spiced lentil dal with cumin and turmeric, Quick kitchari with mung beans and basmati rice, Warm spiced quinoa bowl with roasted root vegetables, Quick mung bean and vegetable curry, Warming ginger-turmeric vegetable stir-fry
  - Resolved critical shortage where only 0 ayurvedic dinner options were available for weekdays
  - System now provides 3 ayurvedic dinner options (≤30min) and 3 lunch options for complete meal planning
  - All recipes follow traditional Ayurvedic principles with warming spices, proper food combinations, and dosha-balancing properties
- **Seasonal Ayurvedic Meal Adaptation System** (July 14, 2025):
  - Implemented traditional 6-season Ayurvedic calendar (Ritu) for authentic seasonal eating
  - System automatically detects current season: Shishira (Winter), Vasanta (Spring), Grishma (Summer), Varsha (Late Summer), Sharad (Autumn), Hemanta (Early Winter)
  - Ayurvedic recipes now include seasonal adaptations with dosha-balancing guidance for current time of year
  - Each recipe receives seasonal cooking tips and notes appropriate for the dominant dosha and qualities of the season
  - **Geographic Adaptation for Netherlands**: System now correctly identifies July as "grishma season" (summer) instead of monsoon season, providing appropriate light, fresh meal guidance for Dutch summer climate
  - European seasonal calendar: Winter (Dec-Feb), Spring (Mar-May), Summer (Jun-Aug), Autumn (Sep-Nov) aligns with local climate patterns
  - Summer season emphasizes fresh vegetables, lighter cooking methods, and cooling preparations suitable for Netherlands summer weather
- **Authentic Summer Filtering for Ayurvedic Recipes** (July 14, 2025):
  - Implemented complete exclusion of warming recipes during grishma (summer) season following authentic Ayurvedic principles
  - System now removes recipes with warming tags or heating spices (ginger, cumin seeds, garam masala, mustard seeds) rather than just warnings
  - Added comprehensive debugging system to identify why specific recipes are excluded during summer
  - Enhanced recipe database with cooling summer ayurvedic recipes: cucumber mint quinoa salad, coconut herb steamed vegetables, cooling mung bean curry
  - Summer filtering works across all meal generation modes (regular and meal prep) ensuring consistency
  - System respects traditional Ayurvedic practice of avoiding heating foods during pitta-aggravating seasons
  - Maintains meal plan variety by providing sufficient cooling/neutral ayurvedic alternatives for complete weekly planning
  - Recipe names preserved during filtering to ensure proper recipe lookup and availability
  - All meal names maintain proper capitalization for consistent user experience
  - Fixed comprehensive heating spice detection (ginger, turmeric, cumin, cinnamon, cardamom, cloves, garam masala, mustard seeds)
  - Summer filtering now works completely across both regular and meal prep generation modes
  - Zero warming recipes appear in summer meal plans, ensuring authentic Ayurvedic practice
- **Complete Resolution of Summer Filtering Architecture** (July 14, 2025):
  - RESOLVED: Universal summer filtering now correctly applies to ALL ayurvedic recipes regardless of user's dietary preference selection
  - Critical fix: Modified filtering logic to check meal.tags.includes('ayurvedic') instead of dietaryTags.includes('ayurvedic')
  - Verification confirmed: Only cooling ayurvedic recipes appear in summer ("Cooling cucumber and mint quinoa salad", "Fresh coconut and herb steamed vegetables", "Cooling mung bean curry")
  - Complete exclusion: All warming recipes with heating spices properly filtered out during grishma season
  - System now provides authentic Ayurvedic seasonal adaptation universally across all user profiles and meal generation modes
- **Expanded Cooling Ayurvedic Recipe Database for Complete Weekly Variety** (July 14, 2025):
  - RESOLVED: Added 5 new cooling ayurvedic recipes to ensure sufficient variety for complete weekly meal plans during summer
  - Enhanced lunch options: "Fresh summer vegetable and coconut milk soup", "Cooling cucumber and mint raita with quinoa", "Cooling barley water and vegetable soup"
  - Enhanced dinner options: "Fresh summer fruit and coconut quinoa bowl", "Cooling coconut and herb rice noodle soup"
  - Summer availability increased from 1→4 lunch options and 2→4 dinner options for cooling ayurvedic recipes
  - All new recipes follow authentic Ayurvedic principles with cooling ingredients (cucumber, coconut milk, fennel, fresh herbs)
  - System now provides complete weekly meal plans for ayurvedic dietary preferences during grishma season
  - Verified successful meal plan generation with proper variety and authentic seasonal adaptation

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