# Overview
This full-stack meal planning application generates personalized weekly meal plans based on user activity levels and dietary preferences. Its purpose is to provide a comprehensive, adaptable solution for healthy meal planning, enhancing healthy eating habits globally and addressing the market potential for personalized nutrition solutions by optimizing user experience and nutritional value. The project aims to be a complete personalized healthy lifestyle planner.

# User Preferences
Preferred communication style: Simple, everyday language.
**CRITICAL DEVELOPMENT RULE**: Never remove existing functionality, features, or logic without explicit user permission. Always ask twice before removing anything. Only make additive changes unless specifically requested to remove features. Preserve all working functionality by default.

## Recent Fixes (August 21, 2025)
- **Date Restriction Implementation**: Added validation to limit meal plan generation to current week and next week only, preventing future meal plans
- **Custom Recipe Prioritization**: Fixed property mapping issue where `useOnlyMyRecipes` wasn't reading the correct database field `use_only_my_recipes`
- **Vegetarian Dietary Filtering**: Enhanced dietary filtering to properly exclude non-vegetarian meals for vegetarian users in both curated and custom recipe systems
- **User Recipe Dietary Logic**: Made user recipe filtering more permissive - assumes user's recipes match their dietary needs unless explicitly conflicting
- **Shopping List Error Resolution**: Fixed `originalInput` undefined error in shopping list generation that was causing failures
- **Meal Plan Date Validation**: System now restricts meal plan creation to current week (starts last Sunday) and next week (starts this Sunday) only
- **Smart Lactose-Free Filtering**: Enhanced dietary filtering to be less restrictive for lactose-free requirement - now includes meals without dairy ingredients even if not explicitly tagged
- **Comprehensive Metric Unit Conversion**: Converted all recipe measurements from imperial (cups, tablespoons, teaspoons) to metric units (grams, milliliters) throughout the database and AI recipe generation system
- **Smart Vegetarian Filtering**: Implemented intelligent vegetarian filtering that includes naturally vegetarian recipes (like pancakes) even if not explicitly tagged, while excluding any recipes containing meat/fish ingredients
- **Automatic Ingredient Substitution**: Smart substitution system that automatically replaces lactose-containing ingredients with dairy-free alternatives and gluten ingredients with gluten-free options based on user dietary restrictions

# System Architecture
- **UI/UX Decisions**: Utilizes `shadcn/ui` built on `Radix UI` primitives with `Tailwind CSS` and CSS variables for theming, focusing on a streamlined interface. Color schemes are standardized across the application (emerald, yellow, green, blue, orange for KPIs; gray for general UI; green/blue/orange for meal cards). Mobile layouts are optimized for responsiveness.
- **Technical Implementations**:
    - **Frontend**: React 18, TypeScript, Wouter for routing, TanStack React Query for server state.
    - **Backend**: Express.js with TypeScript, RESTful API.
    - **Database**: PostgreSQL with Drizzle ORM.
    - **Session Management**: Express sessions with PostgreSQL store.
    - **Build Tools**: Vite for frontend, esbuild for backend.
- **Feature Specifications**:
    - **Authentication & Multi-User Support**: Secure login/registration, password reset, isolated user data, and route protection.
    - **Meal Generation**: Calculates protein targets, selects meals from a nutrition database, generates 7-day plans with variety, and creates shopping lists. Includes smart AI recipe generation and comprehensive ingredient specification, with recipes being alcohol-free.
    - **Universal Meal Prep Engine**: Adapts to user cooking schedules, supporting batch cooking, proper meal distribution, and intelligent dietary fallbacks.
    - **Time Constraints**: Weekday meals (Mon-Fri) are limited to ≤45 minutes prep time; weekends have no time restrictions.
    - **Ayurvedic Integration**: Supports Ayurvedic dietary tags and seasonal adaptation.
    - **Meal Plan Persistence**: Meal plans persist across browser sessions with automatic loading and cleanup (max 3 plans).
    - **Meal Plan Management**: Users can delete individual saved meal plans with confirmation dialog and automatic selection handling.
    - **Sunday-Based Weekly Planning**: All meal plans automatically normalize to Sunday as the week start date for consistent weekly boundaries and scheduling alignment.
    - **Automated Recipe Updates**: System automatically adds new trending recipes.
    - **Dutch Recipe Translation System**: Comprehensive translation service for recipe names, ingredients, and cooking instructions from English to Dutch, including AI-enhanced translation.
    - **Consolidated Shopping List Workflow**: Single-flow shopping list generation with supermarket-ordered categories, detailed dry goods separation, and comprehensive lemon standardization.
    - **Macronutrient Distribution Tracking**: Added real-time tracking of macronutrient distribution (fats, vegetables, fruits/starches) in meal plans.
    - **Advanced Protein Range Calculator**: Evidence-based protein calculation with gender-specific age thresholds and activity level considerations.
    - **Admin Panel**: Full-featured admin interface for managing nutrition calculation parameters, monitoring system statistics, and configuring meal planning logic, including editable lookup tables and audit trails.
    - **User Recipe Management**: Complete custom recipe system allowing users to create, store, and manage personal recipes separate from the curated database, including CRUD operations, nutrition tracking, meal type categorization, and soft-delete.
    - **AI-Powered Nutrition Analysis**: Automated generation of comprehensive nutritional values (protein, calories, carbohydrates, fats, fiber, sugar, sodium) directly from recipe ingredients using OpenAI GPT-4o model.
    - **High-Protein Meal Database**: Enhanced meal database with naturally high-protein options (28-45g protein) covering breakfast (including dairy), vegetarian, and meat-based meals for better protein target achievement without relying on tags.
- **System Design Choices**:
    - **Data Flow**: User input drives meal generation, stored in PostgreSQL, displayed via React Query.
    - **Database Schema**: Comprehensive user profiles, weekly meal plans, individual meals, meal history, favorite meals, and user-created custom recipes.
    - **Unified Recipe Database**: Consolidated all recipe databases into a single unified system.

# External Dependencies
- `@neondatabase/serverless` (PostgreSQL client)
- `drizzle-orm` (ORM for PostgreSQL)
- `@tanstack/react-query` (Frontend data fetching)
- `@radix-ui` (UI primitives)
- `tailwindcss` (CSS framework)
- `OpenAI GPT-4o` (for AI-powered nutrition analysis)