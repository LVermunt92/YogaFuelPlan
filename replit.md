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
    - **Meal Generation**: Calculates protein targets, selects meals from a nutrition database, generates 7-day plans with variety, and creates shopping lists. Includes smart AI recipe generation and comprehensive ingredient specification, with recipes being alcohol-free. Features a comprehensive automatic protein source validation system, AI recipe generator protein requirements, and custom recipe protein auto-enhancement.
    - **Universal Meal Prep Engine**: Adapts to user cooking schedules, supporting batch cooking, proper meal distribution, and intelligent dietary fallbacks. Weekday meals (Mon-Fri) are limited to ≤45 minutes prep time; weekends have no time restrictions.
    - **Ayurvedic Integration**: Supports Ayurvedic dietary tags and seasonal adaptation.
    - **Menstrual Cycle Support**: Complete cycle phase tracking with dropdown selection (menstrual, follicular, ovulation, luteal phases) that automatically prioritizes phase-appropriate recipes during meal generation.
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

# Recent Changes (October 1, 2025)
- **Pre-Translated Recipe Database System**: Complete architectural shift from on-demand translation to database-stored translations for performance and cost optimization
  - Created `recipe_translations` table with indexed lookups by recipe ID and language
  - Implemented batch translation worker with throttling (2s between API calls) and retry logic (max 3 retries)
  - Added admin backfill endpoints (`/api/admin/translations/backfill` and `/api/admin/translations/status`) for bulk recipe translation
  - Modified recipe fetch endpoint to check database first, falling back to on-demand translation only when needed
  - Supports intelligent leftover ingredient incorporation even with pre-translated recipes
  - Database stores: name, ingredients, instructions, tips, and notes in target language
  - System designed to eliminate redundant OpenAI API calls and improve response times
- **Terms and Conditions Page**: Complete legal compliance page with comprehensive GDPR/AVG Netherlands-specific content
  - 12-point privacy section covering data collection, usage, retention, and user rights
  - Explicit GDPR/AVG compliance with data subject rights (access, rectification, erasure, restriction, portability, objection)
  - Cross-border transfer mechanisms (Standard Contractual Clauses for OpenAI)
  - Data processor disclosure (OpenAI, Oura, Albert Heijn, Replit)
  - Complaints procedure via Autoriteit Persoonsgegevens (https://autoriteitpersoonsgegevens.nl/)
  - Governing law explicitly stated as Netherlands law
  - Medical disclaimer and AI disclosure sections
  - Fully localized in English and Dutch with sentence case titles
  - Accessible via footer link in both languages
- **Critical Security Fix**: Resolved password exposure vulnerability in profile API endpoints
  - Profile GET endpoint now explicitly excludes password/passwordHash fields from responses
  - Profile PATCH/PUT endpoints now exclude password from update responses
  - Verified working in production logs - no password data transmitted to frontend
- **Weekly Auto-Update System**: Implemented automatic version checking that refreshes published apps when new versions are deployed
  - Version endpoint returns server start timestamp for tracking
  - Frontend checks once per week for new versions using localStorage
  - Automatic page reload when new version detected (zero user intervention needed)
  - Cost-efficient: Only one API call per user per week

# Previous Changes (September 2, 2025)
- **Streamlined Profile Interface**: Removed redundant toggles and simplified profile to focus on essential settings
  - Removed "use only my recipes" toggle (exists on recipe page)
  - Removed "include menstrual cycle support" toggle (dropdown includes "off" option)
  - Removed longevity toggle (now automatic for all users)
- **Automatic Longevity Optimization**: Made longevity-focused recipes automatically prioritized for all users, as the goal is that all meal plans should be optimized for longevity by default
- **Simplified Menstrual Cycle Selection**: Always show cycle phase dropdown with 5 options including "Don't include cycle-specific optimization" - no separate toggle needed
- **Phase-Specific Recipe Prioritization**: Recipes now tagged with specific menstrual phases get automatically prioritized during meal generation when users select their current cycle phase
- **Streamlined Backend Logic**: Simplified cycle and longevity support to work automatically without requiring separate toggle checks

# Previous Changes (August 30, 2025)
- **Resistant Starch Weight Loss Logic**: Integrated intelligent resistant starch preference system that prioritizes meals containing beans, lentils, oats, brown rice, green bananas, and potatoes for users with weight loss goals or BMI >25, enhancing metabolic benefits and satiety
- **Chocolate Overnight Oats Addition**: Added "Chocolate Overnight Oats with Dark Chocolate Crumble" with 31g protein from cocoa protein powder, featuring layered construction with yogurt middle and crunchy rice cake chocolate topping for indulgent meal prep breakfast
- **Earl Grey Tea-Infused Quinoa Porridge Addition**: Added "Earl Grey Tea-Infused Quinoa Porridge with Caramelized Persimmon" with 22g protein, featuring tea-infused quinoa and oats with bergamot notes, topped with caramelized persimmon for elegant winter breakfast
- **Mediterranean Cauliflower Rice Bowls Addition**: Added four versions of Mediterranean cauliflower rice bowls - chicken (28g protein), Beyond Meat (25g protein), feta & chickpea (24g protein), and lactose-free feta (22g protein), all featuring keto-friendly cauliflower rice base with fresh Mediterranean vegetables and tahini dressing
- **Thai Green Curry Addition**: Added "Thai Green Curry with Super Crunchy Tofu" with 26g protein from cornstarch-coated crispy tofu, featuring authentic Thai green curry paste, coconut milk, and fresh vegetables served over jasmine rice
- **Lactose-Free Kapsalon Addition**: Added "Healthy Lactose-Free Kapsalon" with 21g protein from marinated tofu, hemp hearts, and nutritional yeast, featuring coconut yogurt sauce and sweet potato fries for a completely dairy-free Dutch comfort food option
- **Thai Red Lentil Chickpea Curry Addition**: Added "Thai Red Lentil & Chickpea Curry" with 24g protein from red lentils and chickpeas, featuring Thai red curry paste, coconut milk, and fresh vegetables in a batch-cooking friendly one-pan meal
- **Healthy Kapsalon Recipes Addition**: Added two versions of healthy Dutch kapsalon - "Healthy Vegetarian Kapsalon" with 22g protein from halloumi and hemp hearts, and "Healthy Chicken Kapsalon" with 28g protein from lean chicken breast, both featuring sweet potato fries and fresh salad toppings
- **Super-Charged Peanut Noodles Addition**: Added "Super-Charged Peanut Noodles" with 24g protein from cashews, sunflower seeds, and edamame, featuring Asian-fusion flavors in a DIY fakeaway dish that's faster than takeaway delivery
- **Sweet Potato Lentil Stew Addition**: Added "Warming Sweet Potato & Lentil Stew" with 20g protein from red lentils, featuring rose harissa, tahini, and warming Ayurvedic spices in a one-pan weeknight dinner similar to dhal
- **Creamy Black-Eyed Beans Addition**: Added "Creamy Black-Eyed Beans & Mushrooms" with 22g protein from black-eyed peas, featuring curry-style flavors with turmeric, coconut milk, and fresh herbs served over brown rice for a wholesome midweek dinner
- **Sweet Potato Traybake Addition**: Added "High Protein Sweet Potato Traybake with Tahini Mustard Dressing" with 24g protein from black beans and edamame, featuring colorful vegetables, warming spices, and creamy tahini dressing perfect for meal prep
- **Chickpea Potato Pancakes Addition**: Added "Chickpea & Potato Pancakes with Warm Veggie Salsa" in both regular and gluten-free versions with 26g and 24g protein respectively, inspired by socca French pancakes with one-pan cooking method and enhanced with chickpeas/lentils and hemp hearts
- **Chickpea Tofu Harissa Stew Addition**: Added "Chickpea, Tofu & Harissa Stew" with 28g protein combining chickpeas and firm tofu, featuring North African spices and harissa for a hearty, warming plant-based dinner option perfect for meal planning

# External Dependencies
- `@neondatabase/serverless` (PostgreSQL client)
- `drizzle-orm` (ORM for PostgreSQL)
- `@tanstack/react-query` (Frontend data fetching)
- `@radix-ui` (UI primitives)
- `tailwindcss` (CSS framework)
- `OpenAI GPT-4o` (for AI-powered nutrition analysis)