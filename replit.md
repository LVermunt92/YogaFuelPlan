# Overview
This full-stack meal planning application generates personalized weekly meal plans based on user activity levels and dietary preferences. Its purpose is to provide a comprehensive, adaptable solution for healthy meal planning, enhancing healthy eating habits globally and addressing the market potential for personalized nutrition solutions by optimizing user experience and nutritional value. The project aims to be a complete personalized healthy lifestyle planner.

# User Preferences
Preferred communication style: Simple, everyday language.
**SENTENCE CASE TITLES PREFERENCE**: User strongly prefers sentence case for titles throughout the application interface (first letter capitalized, rest lowercase). Navigation items, section headings, button labels, and form titles should use sentence case (e.g., "Meal planner" not "Meal Planner", "Generate meal plan" not "Generate Meal Plan"). This applies to both English and Dutch translations.
**CRITICAL DEVELOPMENT RULE**: Never remove existing functionality, features, or logic without explicit user permission. Always ask twice before removing anything. Only make additive changes unless specifically requested to remove features. Preserve all working functionality by default.
**GLUTEN-FREE RECIPE ADAPTATIONS**: When creating gluten-free versions of wheat-based recipes, carefully consider appropriate flour substitutions and binding agents that maintain the right density, texture, and taste of the original recipe. Use combinations like almond flour + tapioca starch, rice flour + xanthan gum, or other proven gluten-free flour blends rather than simple 1:1 substitutions.

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
    - **Universal Meal Prep Engine**: Adapts to user cooking schedules, supporting batch cooking, proper meal distribution, and intelligent dietary fallbacks. Weekday meals (Mon-Fri) are limited to ≤45 minutes prep time; weekends have no time restrictions.
    - **Ayurvedic Integration**: Supports Ayurvedic dietary tags and seasonal adaptation.
    - **Menstrual Cycle Support**: Complete cycle phase tracking with dropdown selection that automatically prioritizes phase-appropriate recipes during meal generation.
    - **Meal Plan Management**: Meal plans persist across browser sessions with automatic loading and cleanup (max 3 plans). Users can delete individual saved meal plans. All meal plans automatically normalize to Sunday as the week start date. Meal plan generation is limited to the current and next week only.
    - **Recipe Management**: Automated recipe updates for trending recipes, Dutch translation system for recipes, and comprehensive metric unit conversion. Includes intelligent ingredient-based recipe matching, automatic ingredient substitution, smart vegetarian filtering, and an enhanced high-protein meal database.
    - **Shopping List Features**: Consolidated shopping list generation with supermarket-ordered categories, detailed dry goods separation, and comprehensive ingredient normalization and categorization (e.g., smart milk specification, onion categorization, nut preparation normalization).
    - **Nutritional Tracking**: Macronutrient distribution tracking and an advanced protein range calculator with gender-specific age thresholds and activity level considerations.
    - **Admin Panel**: Full-featured admin interface for managing nutrition calculation parameters, monitoring system statistics, and configuring meal planning logic.
    - **User Recipe Management**: Complete custom recipe system allowing users to create, store, and manage personal recipes separate from the curated database.
    - **AI-Powered Nutrition Analysis**: Automated generation of comprehensive nutritional values directly from recipe ingredients.
    - **Longevity Optimization**: Longevity-focused recipes are automatically prioritized for all users.
    - **Resistant Starch Logic**: Prioritizes meals with resistant starch for users with weight loss goals or BMI >25.
- **System Design Choices**:
    - **Data Flow**: User input drives meal generation, stored in PostgreSQL, displayed via React Query.
    - **Database Schema**: Comprehensive user profiles, weekly meal plans, individual meals, meal history, favorite meals, and user-created custom recipes.
    - **Unified Recipe Database**: Consolidated all recipe databases into a single unified system, with pre-translated recipes stored for performance.

# External Dependencies
- `@neondatabase/serverless` (PostgreSQL client)
- `drizzle-orm` (ORM for PostgreSQL)
- `@tanstack/react-query` (Frontend data fetching)
- `@radix-ui` (UI primitives)
- `tailwindcss` (CSS framework)
- `OpenAI GPT-4o` (for AI-powered nutrition analysis)