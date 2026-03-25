# Overview
This full-stack meal planning application generates personalized weekly meal plans based on user activity levels and dietary preferences. It provides a comprehensive solution for healthy meal planning, aiming to enhance healthy eating habits globally, address the market potential for personalized nutrition solutions, and ultimately serve as a complete personalized healthy lifestyle planner.

# User Preferences
Preferred communication style: Simple, everyday language.
**SENTENCE CASE TITLES PREFERENCE**: User strongly prefers sentence case for titles throughout the application interface (first letter capitalized, rest lowercase). This applies to both English and Dutch translations.
**CRITICAL DEVELOPMENT RULE**: Never remove existing functionality, features, or logic without explicit user permission. Always ask twice before removing anything. Only make additive changes unless specifically requested to remove features. Preserve all working functionality by default.
**ASK BEFORE ADDING UI/FEATURES**: Before adding new buttons, UI elements, or features that weren't explicitly requested, ask for confirmation first. When the user asks for something (like updating data), just do it directly rather than creating admin tools or buttons unless specifically asked. Clarify the approach before implementing to avoid misunderstandings.
**NEW USER ONBOARDING**: New users are redirected to the profile page after registration to fill in their personal details. All profile fields start empty (null). After profile setup, users will see the welcome tutorial.
**GLUTEN-FREE RECIPE ADAPTATIONS**: When creating gluten-free versions of wheat-based recipes, carefully consider appropriate flour substitutions and binding agents that maintain the right density, texture, and taste. Use combinations like almond flour + tapioca starch, rice flour + xanthan gum, or other proven gluten-free flour blends rather than simple 1:1 substitutions.
**METRIC MEASUREMENTS PREFERENCE**: All recipe ingredients must use metric measurements (grams for solids, milliliters for liquids) instead of volume measurements (cups, tablespoons).
**MENSTRUAL CYCLE TAGGING GUIDELINES**: All new recipes must be evaluated for menstrual cycle phase support and tagged accordingly: Menstrual, Follicular, Ovulation, Luteal. Apply multiple phase tags when recipes contain ingredients supporting multiple phases. Vegetarian/gluten-free/lactose-free recipes should ALWAYS be evaluated for menstrual tags.
**RECIPE VARIANT PREVENTION RULES** (CRITICAL - prevents duplicate recipes):
  - NEVER create gluten-free variants if base recipe already contains "Gluten-Free" tag.
  - NEVER create lactose-free variants if base recipe already contains "Lactose-Free" tag.
  - NEVER create vegetarian variants if base recipe already contains "Vegetarian" tag.
  - Only create variants when substitution is ACTUALLY needed.
  - Chickpea flour (gram flour) is NATURALLY GLUTEN-FREE - never create separate gluten-free variants for chickpea flour recipes.
  - Check base recipe tags BEFORE creating any variant - if tag exists, variant is unnecessary.
  - Portion sizing: All recipes display ingredients for 2 servings (cooking batch), shopping lists calculate: ingredient amount × 2 servings × number of cooking sessions.
**REPLACEMENT INGREDIENT FILTERING** (CRITICAL - prevents inappropriate recipes):
  - Naturally free ingredients (quinoa, rice, oats, plant-based milk) can appear for ALL users.
  - Replacement ingredients (gluten-free pasta, lactose-free milk, dairy-free cheese) ONLY appear when user selects that dietary restriction.
  - Users WITHOUT gluten-free restriction should NEVER receive recipes with: gluten-free pasta, legume pasta, chickpea pasta, lentil pasta, gluten-free bread, gluten-free flour.
  - Users WITHOUT lactose-free restriction should NEVER receive recipes with: lactose-free milk, lactose-free cheese, lactose-free yogurt, dairy-free cheese, vegan cheese.
  - This ensures users with no dietary restrictions receive conventional ingredients, not specialty replacement products.
**INGREDIENT FORMAT STANDARDS** (CRITICAL - ensures consistent shopping lists):
  - **Bell peppers, Onions, Zucchini, Aubergine/Eggplant, Lemon/Lime, Avocado, Portobello mushrooms**: ALWAYS specify in pieces.
  - **Ginger, Mushrooms (regular)**: ALWAYS specify in grams.
  - **Cauliflower**: Use cauliflower rice or florets in grams.
  - **Plant-based milk**: ALWAYS use "plant-based milk" instead of specific types, except for coconut milk in curries.
  - **Pantry items and seasonings (Salt, Black pepper, Olive oil, Chili flakes)**: ALWAYS specify in grams/ml, NEVER "to taste" or vague descriptions.
  - **Fresh herbs**: ALWAYS specify in grams, NEVER "handful" or unspecified.
  - When AI generates new recipes, it MUST follow these ingredient format rules.
**FULL NUTRITION KPIs FOR ALL NEW RECIPES** (CRITICAL):
  - Every new recipe MUST include estimates for ALL tracked KPIs in the nutrition object: calories, protein, carbohydrates, fats, fiber, sugar, sodium, vitaminK, iron, calcium, potassium, vitaminC, prepTime, costEuros, proteinPerEuro.
  - cocoaFlavanols when applicable.
  - Never add a recipe with only basic macros - always include the full micronutrient set.
**RECIPE TAG POLICY** (CRITICAL - only functional tags allowed):
  - Tags are ONLY for dietary filtering and system logic, NOT for describing recipes.
  - **Allowed tags**: Dietary (e.g., Vegetarian, Gluten-Free), Health (e.g., Anti-Aging, High-Protein), Cycle (e.g., Menstrual, Follicular), Seasonal (month names), System (e.g., Ayurvedic, Weekend-Prep).
  - NEVER add descriptive tags like: cuisine types, cooking methods, ingredient names, texture/style, or marketing terms.
  - AI-generated recipes have automatic tag sanitization that strips non-functional tags.
**SIMPLIFIED INGREDIENT LIST PREFERENCE** (User's preferred style):
  - **Keep it simple**: Use format `[amount] [item]` without excessive detail.
  - Remove parenthetical explanations and preparation methods from ingredients.
  - Simplify item names (e.g., "oats" instead of "old-fashioned rolled oats").
  - Use pieces for practical items (e.g., "1 clove garlic").
  - Use grams/ml for measurable items (e.g., "35g chickpeas").
  - Avoid overly specific conversions.
  - Keep lime/lemon simple (e.g., "1/2 lime" instead of "juice and zest of 1/2 lime").
  - Accept calculated decimal amounts.

# System Architecture
- **UI/UX Decisions**: `shadcn/ui` based on `Radix UI` primitives with `Tailwind CSS` for theming, focusing on a streamlined interface, standardized color schemes, and mobile responsiveness.
- **Technical Implementations**:
    - **Frontend**: React 18, TypeScript, Wouter for routing, TanStack React Query.
    - **Backend**: Express.js with TypeScript, RESTful API.
    - **Database**: PostgreSQL with Drizzle ORM.
    - **Authentication**: JWT token-based with automatic refresh.
- **Feature Specifications**:
    - **User Management**: Secure authentication, persistent mobile login, password reset, isolated user data, route protection, interactive onboarding.
    - **Meal Planning**: Calculates protein targets, generates 7-day plans with variety and 1 anti-aging meal/day, creates shopping lists, includes smart AI recipe generation, supports batch cooking, meal distribution, and dietary fallbacks. Weekday meals ≤45 minutes prep time. Plans normalize to Sunday start and are limited to current/next week.
    - **Dietary Support**: Ayurvedic dietary tags, seasonal adaptation, menstrual cycle phase tracking with recipe prioritization.
    - **Recipe Management**: Automated updates, Dutch translation, metric unit conversion, intelligent ingredient-based matching, automatic substitution, smart vegetarian filtering, enhanced high-protein database, user-created custom recipes, and full nutritional KPI generation for all new recipes.
    - **Shopping List Generation**: Consolidated lists with supermarket-ordered categories, dry goods separation, ingredient normalization, and admin-controlled ingredient mapping.
    - **Longevity Optimization**: Prioritizes longevity-focused recipes, resistant starch logic, anti-aging tag system, comprehensive Vitamin K tracking.
    - **Weight Management**: Sustainable weight loss tracking (15% calorie reduction cap, automatic maintenance weeks), personalized meal portions via Mifflin-St Jeor BMR formula.
    - **Admin Panel**: Full-featured interface for managing nutrition parameters, system statistics, meal planning logic, and tag management.
    - **Automatic Recipe Sync**: Exports recipes to `server/recipe-seeds.json` and auto-imports on startup.
- **System Design Choices**:
    - **Data Flow**: User input drives meal generation, stored in PostgreSQL, displayed via React Query.
    - **Database Schema**: Comprehensive user profiles, weekly meal plans, individual meals, meal history, favorite meals, and user-created custom recipes.
    - **Performance Indexes**: `recipes` table has GIN index on `tags[]`, B-tree indexes on `category`, `active`, `name`, functional index on `nutrition->>'calories'`, and GIN trigram index on `name` for fuzzy matching. `pg_trgm` extension enabled.
    - **Precomputed Columns**: `recipes.contains_eggs` (boolean), `recipes.resistant_starch_score` (real, 0–42), `recipes.longevity_score` (smallint, 0–3) are populated at recipe write time and eliminate runtime regex/scanning during meal plan generation. `recipes.protein_g`, `recipes.carbs_g`, `recipes.fiber_g` are extracted from JSONB for indexed range queries — avoids JSONB cast on every calorie/carb/protein filter.
    - **Unified Recipe Database**: Consolidated all recipe databases into a single system with pre-translated recipes.

# External Dependencies
- `@neondatabase/serverless` (PostgreSQL client)
- `drizzle-orm` (ORM for PostgreSQL)
- `@tanstack/react-query` (Frontend data fetching)
- `@radix-ui` (UI primitives)
- `tailwindcss` (CSS framework)
- `OpenAI GPT-4o` (for AI-powered nutrition analysis)