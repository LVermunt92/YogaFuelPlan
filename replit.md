# Overview
This full-stack meal planning application generates personalized weekly meal plans based on user activity levels and dietary preferences. Its purpose is to provide a comprehensive, adaptable solution for healthy meal planning, enhancing healthy eating habits globally and addressing the market potential for personalized nutrition solutions by optimizing user experience and nutritional value. The project aims to be a complete personalized healthy lifestyle planner.

# User Preferences
Preferred communication style: Simple, everyday language.
**SENTENCE CASE TITLES PREFERENCE**: User strongly prefers sentence case for titles throughout the application interface (first letter capitalized, rest lowercase). Navigation items, section headings, button labels, and form titles should use sentence case (e.g., "Meal planner" not "Meal Planner", "Generate meal plan" not "Generate Meal Plan"). This applies to both English and Dutch translations.
**CRITICAL DEVELOPMENT RULE**: Never remove existing functionality, features, or logic without explicit user permission. Always ask twice before removing anything. Only make additive changes unless specifically requested to remove features. Preserve all working functionality by default.
**NEW USER ONBOARDING**: New users are redirected to the profile page after registration to fill in their personal details (weight, height, age, activity level, etc.). All profile fields start empty (null) to ensure users enter their own values. After profile setup, users will see the welcome tutorial explaining how to use the meal planner.
**GLUTEN-FREE RECIPE ADAPTATIONS**: When creating gluten-free versions of wheat-based recipes, carefully consider appropriate flour substitutions and binding agents that maintain the right density, texture, and taste of the original recipe. Use combinations like almond flour + tapioca starch, rice flour + xanthan gum, or other proven gluten-free flour blends rather than simple 1:1 substitutions.
**METRIC MEASUREMENTS PREFERENCE**: All recipe ingredients must use metric measurements (grams for solids, milliliters for liquids) instead of volume measurements (cups, tablespoons). Examples: quinoa "170g" not "1 cup", broccoli "140g" not "2 cups", sweet potato "200g" not "1 medium". This ensures precision in shopping lists and meal planning.
**MENSTRUAL CYCLE TAGGING GUIDELINES**: All new recipes must be evaluated for menstrual cycle phase support and tagged accordingly:
  - **Menstrual Phase**: Recipes high in iron (lentils, beans, spinach, quinoa, pumpkin seeds, hemp hearts) and magnesium (nuts, seeds, whole grains, leafy greens)
  - **Follicular Phase**: Recipes with lighter proteins, fresh vegetables, sprouted grains, probiotic foods
  - **Ovulation Phase**: Recipes rich in antioxidants (berries, leafy greens), fiber, and anti-inflammatory ingredients
  - **Luteal Phase**: Recipes with B vitamins (legumes, whole grains), complex carbs, calcium, and magnesium
  - Apply multiple phase tags when recipes contain ingredients supporting multiple phases
  - Vegetarian/gluten-free/lactose-free recipes should ALWAYS be evaluated for menstrual tags to ensure adequate meal options for strict dietary filters

**RECIPE VARIANT PREVENTION RULES** (CRITICAL - prevents duplicate recipes):
  - **NEVER create gluten-free variants** if base recipe already contains "Gluten-Free" tag (e.g., quinoa/rice/oat-based dishes are naturally gluten-free)
  - **NEVER create lactose-free variants** if base recipe already contains "Lactose-Free" tag (e.g., dishes with almond/coconut/oat milk are naturally lactose-free)
  - **NEVER create vegetarian variants** if base recipe already contains "Vegetarian" tag
  - **Only create variants when substitution is ACTUALLY needed** (e.g., wheat pasta → gluten-free pasta, cow's milk → plant milk, meat → plant protein)
  - **Chickpea flour (gram flour) is NATURALLY GLUTEN-FREE** - never create separate gluten-free variants for chickpea flour recipes
  - **Check base recipe tags BEFORE creating any variant** - if tag exists, variant is unnecessary
  - **Portion sizing**: All recipes display ingredients for 2 servings (cooking batch), shopping lists calculate: ingredient amount × 2 servings × number of cooking sessions

**REPLACEMENT INGREDIENT FILTERING** (CRITICAL - prevents inappropriate recipes):
  - **Naturally free ingredients** (quinoa, rice, oats, plant-based milk) can appear for ALL users
  - **Replacement ingredients** (gluten-free pasta, lactose-free milk, dairy-free cheese) ONLY appear when user selects that dietary restriction
  - Users WITHOUT gluten-free restriction should NEVER receive recipes with: gluten-free pasta, legume pasta, chickpea pasta, lentil pasta, gluten-free bread, gluten-free flour
  - Users WITHOUT lactose-free restriction should NEVER receive recipes with: lactose-free milk, lactose-free cheese, lactose-free yogurt, dairy-free cheese, vegan cheese
  - This ensures users with no dietary restrictions receive conventional ingredients, not specialty replacement products

**INGREDIENT FORMAT STANDARDS** (CRITICAL - ensures consistent shopping lists):
  - **Bell peppers**: ALWAYS specify in pieces (e.g., "1/2 bell pepper, diced", "1 red bell pepper, sliced") - NEVER use grams
  - **Onions**: ALWAYS specify in pieces (e.g., "1 onion, diced", "1/2 red onion, sliced", "2 green onions") - NEVER use grams
  - **Ginger**: ALWAYS specify in grams (e.g., "15g fresh ginger", "10g fresh ginger, minced") - NEVER use tsp, tbsp, ml, or pieces. Conversion: 1 tsp = 5g, 1 tbsp = 15g, 1ml = 1g, 5cm piece = 20g
  - **Zucchini**: ALWAYS specify in pieces (e.g., "1 zucchini, sliced", "1/2 zucchini") - NEVER use grams
  - **Mushrooms (regular)**: ALWAYS specify in grams (e.g., "150g mushrooms, sliced", "100g button mushrooms") - NEVER use pieces
  - **Portobello mushrooms**: ALWAYS specify in pieces (e.g., "2 large portobello mushrooms", "1 portobello mushroom cap") - these are specialty items that stay separate on shopping lists
  - **Cauliflower**: Use cauliflower rice (e.g., "300g cauliflower rice") or florets in grams (e.g., "250g cauliflower florets") - NEVER use "1 head" as it's imprecise for portion control
  - **Lemon**: ALWAYS specify in pieces (e.g., "juice of 1 lemon", "1 lemon, zested", "juice of 1/2 lemon") - NEVER use ml for lemon juice
  - **Plant-based milk**: ALWAYS use "plant-based milk" instead of specific types (almond, soy, oat milk) - this allows users to choose their preferred plant milk. Exception: coconut milk stays separate when used for flavor in curries
  - **Pantry items and seasonings** (CRITICAL - NEVER use "to taste" or vague descriptions):
    - **Salt**: "2g salt" or "3g sea salt" - NEVER "salt to taste" or "pinch of salt"
    - **Black pepper**: "1g black pepper" - NEVER "pepper to taste" or "pinch of pepper"
    - **Olive oil** (for drizzling/cooking): "10ml olive oil" or "15ml olive oil" - NEVER "olive oil for drizzling" or "extra olive oil"
    - **Chili flakes**: "0.5g chili flakes" or "1g red chili flakes" - NEVER "chili flakes to taste" or "pinch of chili flakes"
  - **Fresh herbs** (CRITICAL - ALWAYS specify in grams, NEVER "handful" or unspecified):
    - **Handful of herbs**: "20g fresh parsley" or "20g fresh cilantro" - NEVER "handful fresh parsley"
    - **Fresh herbs (garnish)**: "10g fresh mint" or "10g fresh basil" - NEVER "fresh mint" or "fresh basil"
    - **Examples**: "20g fresh parsley, chopped", "10g fresh cilantro", "15g fresh basil leaves", "10g fresh dill"
  - When AI generates new recipes, it MUST follow these ingredient format rules to ensure shopping list accuracy and consistency

# System Architecture
- **UI/UX Decisions**: Utilizes `shadcn/ui` built on `Radix UI` primitives with `Tailwind CSS` for theming. Focuses on a streamlined interface with standardized color schemes and optimized mobile responsiveness.
- **Technical Implementations**:
    - **Frontend**: React 18, TypeScript, Wouter for routing, TanStack React Query for server state.
    - **Backend**: Express.js with TypeScript, RESTful API.
    - **Database**: PostgreSQL with Drizzle ORM.
    - **Authentication**: JWT token-based authentication with access and refresh tokens, stored in localStorage, with automatic token refresh. Resilient to network errors - users stay logged in during temporary connectivity issues.
    - **Build Tools**: Vite for frontend, esbuild for backend.
- **Feature Specifications**:
    - **Authentication & Multi-User Support**: Secure login/registration, persistent mobile login, password reset, isolated user data, route protection, and interactive step-by-step onboarding tutorial for new users.
    - **Meal Generation**: Calculates protein targets, generates 7-day plans with variety, creates shopping lists, and includes smart AI recipe generation. Incorporates 1 anti-aging meal per day.
    - **Universal Meal Prep Engine**: Adapts to user cooking schedules, supporting batch cooking, meal distribution, and dietary fallbacks. Weekday meals are limited to ≤45 minutes prep time.
    - **Ayurvedic Integration**: Supports Ayurvedic dietary tags and seasonal adaptation.
    - **Menstrual Cycle Support**: Cycle phase tracking with dropdown selection prioritizes phase-appropriate recipes and provides weekly highlights.
    - **Meal Plan Management**: Meal plans persist across sessions, with automatic loading and cleanup (max 3 plans). Plans normalize to Sunday start and are limited to current/next week.
    - **Recipe Management**: Automated recipe updates, Dutch translation, metric unit conversion, intelligent ingredient-based matching, automatic ingredient substitution, smart vegetarian filtering, enhanced high-protein database, and user-created custom recipes.
    - **Shopping List Features**: Consolidated shopping list generation with supermarket-ordered categories, dry goods separation, and ingredient normalization.
    - **Ingredient Mapping System**: Admin-controlled mapping for shopping list optimization, defining standardized grocery names with categories and units. Supports bulk import/export and multiple ingredient lists.
    - **Nutritional Tracking**: Macronutrient distribution tracking and advanced protein range calculator.
    - **Admin Panel**: Full-featured interface for managing nutrition parameters, monitoring system statistics, configuring meal planning logic, and tag management. Displays user activity.
    - **AI-Powered Nutrition Analysis**: Automated generation of comprehensive nutritional values from recipe ingredients.
    - **Longevity Optimization**: Longevity-focused recipes are prioritized for all users, including those with resistant starch logic for weight loss.
    - **Anti-Aging Tag System**: Recipes tagged for healthy aging (e.g., avocado, sweet potatoes, blueberries, almonds).
    - **Vitamin K Tracking**: Comprehensive Vitamin K content calculation from recipe ingredients with KPI chart and admin tools for updates.
    - **Weight Loss Support**: Sustainable weight loss tracking with a 15% calorie reduction cap and automatic maintenance weeks to prevent metabolic adaptation.
    - **TDEE-Based Dynamic Portion Adjustment**: Personalizes meal portions based on individual metabolic needs (Mifflin-St Jeor BMR formula) with activity-specific multipliers, dynamically adjusting meal portions and macros to match target calories.
    - **Automatic Recipe Sync System**: Solves dev/production database separation by exporting recipes to `server/recipe-seeds.json` and auto-importing on startup for cold database boots, skipping existing recipes. Admin panel provides manual sync.
- **System Design Choices**:
    - **Data Flow**: User input drives meal generation, stored in PostgreSQL, displayed via React Query.
    - **Database Schema**: Comprehensive user profiles, weekly meal plans, individual meals, meal history, favorite meals, and user-created custom recipes.
    - **Unified Recipe Database**: Consolidated all recipe databases into a single system with pre-translated recipes.

# External Dependencies
- `@neondatabase/serverless` (PostgreSQL client)
- `drizzle-orm` (ORM for PostgreSQL)
- `@tanstack/react-query` (Frontend data fetching)
- `@radix-ui` (UI primitives)
- `tailwindcss` (CSS framework)
- `OpenAI GPT-4o` (for AI-powered nutrition analysis)