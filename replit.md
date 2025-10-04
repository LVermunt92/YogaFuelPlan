# Overview
This full-stack meal planning application generates personalized weekly meal plans based on user activity levels and dietary preferences. Its purpose is to provide a comprehensive, adaptable solution for healthy meal planning, enhancing healthy eating habits globally and addressing the market potential for personalized nutrition solutions by optimizing user experience and nutritional value. The project aims to be a complete personalized healthy lifestyle planner.

# User Preferences
Preferred communication style: Simple, everyday language.
**SENTENCE CASE TITLES PREFERENCE**: User strongly prefers sentence case for titles throughout the application interface (first letter capitalized, rest lowercase). Navigation items, section headings, button labels, and form titles should use sentence case (e.g., "Meal planner" not "Meal Planner", "Generate meal plan" not "Generate Meal Plan"). This applies to both English and Dutch translations.
**CRITICAL DEVELOPMENT RULE**: Never remove existing functionality, features, or logic without explicit user permission. Always ask twice before removing anything. Only make additive changes unless specifically requested to remove features. Preserve all working functionality by default.
**GLUTEN-FREE RECIPE ADAPTATIONS**: When creating gluten-free versions of wheat-based recipes, carefully consider appropriate flour substitutions and binding agents that maintain the right density, texture, and taste of the original recipe. Use combinations like almond flour + tapioca starch, rice flour + xanthan gum, or other proven gluten-free flour blends rather than simple 1:1 substitutions.
**METRIC MEASUREMENTS PREFERENCE**: All recipe ingredients must use metric measurements (grams for solids, milliliters for liquids) instead of volume measurements (cups, tablespoons). Examples: quinoa "170g" not "1 cup", broccoli "140g" not "2 cups", sweet potato "200g" not "1 medium". This ensures precision in shopping lists and meal planning. Standard conversions: 1 cup dry quinoa = 170g, 1 cup cooked quinoa = 185g, 1 cup broccoli = 70g, 1 cup spinach = 30g, 1 medium sweet potato = 200g.

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

# Recent Changes (October 4, 2025)
- **User Activity Tracking**: Added last login timestamp tracking system
  - Added `lastLoginAt` field to user schema for monitoring user activity
  - Login endpoint now automatically updates last login timestamp on successful authentication
  - Admin panel displays last login date and time in both mobile and desktop views
  - Shows "Never" for users who haven't logged in since feature implementation
- **Admin Panel Layout Enhancement**: Made admin panel full-width on larger screens
  - Removed max-width constraint (`max-w-6xl`) to utilize full screen width on desktop/laptop
  - Responsive padding: `px-2` (mobile), `px-4` (tablet), `px-8` (desktop)
  - Better utilization of screen real estate for admin data tables and forms
- **Recipe Tag Cleanup**: Removed 101 non-functional descriptive tags from recipe filtering system
  - Removed tags like "Comfort-Food", "Crispy", "Creamy", "Savory", "Filling", "Refreshing" that don't help with dietary/nutritional filtering
  - Kept only functional tags: dietary restrictions (Gluten-Free, Lactose-Free, Vegetarian), nutritional properties (High-Protein, High-Fiber), and meal-specific attributes
  - Improves filtering performance and user experience by focusing on actionable criteria
- **Recipe Ingredient Standardization**: Converted all recipe ingredients to metric measurements (grams/ml)
  - Replaced all cup measurements with precise gram/ml equivalents across entire recipe database
  - Sweet potatoes: "1 medium" → "200g", "1 large" → "300g"
  - Quinoa: "1 cup dry" → "170g", "1 cup cooked" → "185g"
  - Broccoli, spinach, nuts: All converted to gram measurements
  - Auto-translation system updated to maintain metric standards for new recipes
- **Lactose-Free Tag Standardization**: Standardized all lactose-free recipes to use only "Lactose-Free" tag (removed redundant "Dairy-Free" tag)
- **Auto-Translation System**: Admin recipe updates now automatically generate Dutch translations and save to database
  - PUT /api/recipes/:id automatically translates to Dutch on update
  - POST /api/recipes automatically translates to Dutch on creation
  - Ensures consistency between English admin edits and Dutch user experience

# Recent Changes (October 3, 2025)
- **Seasonal Vegetable Section Production Fix**: Fixed seasonal vegetable section not appearing in published environment
  - Root cause: Dynamic imports (`await import()`) in seasonal endpoints don't bundle correctly with esbuild in production
  - Solution: Changed all seasonal endpoints to use static imports at the top of routes.ts
  - Fixed endpoints: `/api/seasonal`, `/api/seasonal/current-months`, `/api/seasonal/ingredients-for-month`
  - Now properly displays peak Dutch seasonal vegetables from Voedingscentrum.nl data in production
- **High-Protein Pistachio Cheesecake Recipes**: Added two individual serving breakfast recipes with Dutch translations (IDs 424-425)
  - "High-protein pistachio cheesecake" (18g protein) - Regular version with cottage cheese and Greek yogurt
  - "Lactose-free high-protein pistachio cheesecake" (17g protein) - Lactose-free version for sensitive digestion
  - Features: 15-20 min bake time at 163°C, make-ahead meal prep friendly, creamy dessert-like texture, individual portions
  - Both versions include natural pistachio flavor and healthy fats from pistachios

# External Dependencies
- `@neondatabase/serverless` (PostgreSQL client)
- `drizzle-orm` (ORM for PostgreSQL)
- `@tanstack/react-query` (Frontend data fetching)
- `@radix-ui` (UI primitives)
- `tailwindcss` (CSS framework)
- `OpenAI GPT-4o` (for AI-powered nutrition analysis)