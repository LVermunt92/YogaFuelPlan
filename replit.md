# Overview
This full-stack meal planning application generates personalized weekly meal plans based on user activity levels and dietary preferences. Its purpose is to provide a comprehensive, adaptable solution for healthy meal planning, enhancing healthy eating habits globally and addressing the market potential for personalized nutrition solutions by optimizing user experience and nutritional value. The project aims to be a complete personalized healthy lifestyle planner.

# User Preferences
Preferred communication style: Simple, everyday language.
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
    - **Meal Generation**: Calculates protein targets, selects meals from a nutrition database, generates 7-day plans with variety, and creates shopping lists. Includes smart AI recipe generation and comprehensive ingredient specification, with recipes being alcohol-free. Features a comprehensive automatic protein source validation system, AI recipe generator protein requirements, and custom recipe protein auto-enhancement.
    - **Universal Meal Prep Engine**: Adapts to user cooking schedules, supporting batch cooking, proper meal distribution, and intelligent dietary fallbacks. Weekday meals (Mon-Fri) are limited to ≤45 minutes prep time; weekends have no time restrictions.
    - **Ayurvedic Integration**: Supports Ayurvedic dietary tags and seasonal adaptation.
    - **Meal Plan Management**: Meal plans persist across browser sessions with automatic loading and cleanup (max 3 plans). Users can delete individual saved meal plans with confirmation dialog and automatic selection handling. All meal plans automatically normalize to Sunday as the week start date. Meal plan generation is limited to the current and next week only.
    - **Recipe Management**: Automated recipe updates for trending recipes, Dutch translation system for recipes, and comprehensive metric unit conversion for all measurements. Includes intelligent ingredient-based recipe matching, automatic ingredient substitution based on dietary restrictions, smart vegetarian filtering, and an enhanced high-protein meal database.
    - **Shopping List Features**: Consolidated shopping list generation with supermarket-ordered categories, detailed dry goods separation, and comprehensive lemon standardization. Features comprehensive ingredient normalization, smart milk specification (oat milk), automatic cooking method removal, smart garlic quantity display, complete onion categorization, enhanced seed & nut categorization, enhanced nut preparation normalization, comprehensive pasta & rice categorization, and water ingredient filtering.
    - **Nutritional Tracking**: Macronutrient distribution tracking (fats, vegetables, fruits/starches) in meal plans and an advanced protein range calculator with gender-specific age thresholds and activity level considerations.
    - **Admin Panel**: Full-featured admin interface for managing nutrition calculation parameters, monitoring system statistics, and configuring meal planning logic, including editable lookup tables and audit trails.
    - **User Recipe Management**: Complete custom recipe system allowing users to create, store, and manage personal recipes separate from the curated database, including CRUD operations, nutrition tracking, meal type categorization, and soft-delete.
    - **AI-Powered Nutrition Analysis**: Automated generation of comprehensive nutritional values (protein, calories, carbohydrates, fats, fiber, sugar, sodium) directly from recipe ingredients.
- **System Design Choices**:
    - **Data Flow**: User input drives meal generation, stored in PostgreSQL, displayed via React Query.
    - **Database Schema**: Comprehensive user profiles, weekly meal plans, individual meals, meal history, favorite meals, and user-created custom recipes.
    - **Unified Recipe Database**: Consolidated all recipe databases into a single unified system.

# Recent Changes (August 30, 2025)
- **Sweet Potato Lentil Stew Addition**: Added "Warming Sweet Potato & Lentil Stew" with 20g protein from red lentils, featuring rose harissa, tahini, and warming Ayurvedic spices in a one-pan weeknight dinner similar to dhal
- **Creamy Black-Eyed Beans Addition**: Added "Creamy Black-Eyed Beans & Mushrooms" with 22g protein from black-eyed peas, featuring curry-style flavors with turmeric, coconut milk, and fresh herbs served over brown rice for a wholesome midweek dinner
- **Sweet Potato Traybake Addition**: Added "High Protein Sweet Potato Traybake with Tahini Mustard Dressing" with 24g protein from black beans and edamame, featuring colorful vegetables, warming spices, and creamy tahini dressing perfect for meal prep
- **Chickpea Potato Pancakes Addition**: Added "Chickpea & Potato Pancakes with Warm Veggie Salsa" in both regular and gluten-free versions with 26g and 24g protein respectively, inspired by socca French pancakes with one-pan cooking method and enhanced with chickpeas/lentils and hemp hearts
- **Oat Quinoa Apple Porridge Addition**: Added "Oat & Quinoa Porridge with Apple & Cinnamon" with 22g protein enhanced with protein powder and hemp seeds, perfect for winter breakfast meal prep with batch-cooked quinoa for weekly use
- **Chickpea Tofu Harissa Stew Addition**: Added "Chickpea, Tofu & Harissa Stew" with 28g protein combining chickpeas and firm tofu, featuring North African spices and harissa for a hearty, warming plant-based dinner option perfect for meal planning

# External Dependencies
- `@neondatabase/serverless` (PostgreSQL client)
- `drizzle-orm` (ORM for PostgreSQL)
- `@tanstack/react-query` (Frontend data fetching)
- `@radix-ui` (UI primitives)
- `tailwindcss` (CSS framework)
- `OpenAI GPT-4o` (for AI-powered nutrition analysis)