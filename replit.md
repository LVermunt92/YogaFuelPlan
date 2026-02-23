# Overview
This full-stack meal planning application generates personalized weekly meal plans based on user activity levels and dietary preferences. Its purpose is to provide a comprehensive, adaptable solution for healthy meal planning, enhancing healthy eating habits globally and addressing the market potential for personalized nutrition solutions by optimizing user experience and nutritional value. The project aims to be a complete personalized healthy lifestyle planner.

# User Preferences
Preferred communication style: Simple, everyday language.
**SENTENCE CASE TITLES PREFERENCE**: User strongly prefers sentence case for titles throughout the application interface (first letter capitalized, rest lowercase). Navigation items, section headings, button labels, and form titles should use sentence case (e.g., "Meal planner" not "Meal Planner", "Generate meal plan" not "Generate Meal Plan"). This applies to both English and Dutch translations.
**CRITICAL DEVELOPMENT RULE**: Never remove existing functionality, features, or logic without explicit user permission. Always ask twice before removing anything. Only make additive changes unless specifically requested to remove features. Preserve all working functionality by default.
**ASK BEFORE ADDING UI/FEATURES**: Before adding new buttons, UI elements, or features that weren't explicitly requested, ask for confirmation first. When the user asks for something (like updating data), just do it directly rather than creating admin tools or buttons unless specifically asked. Clarify the approach before implementing to avoid misunderstandings.
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
  - **Aubergine/Eggplant**: ALWAYS specify in pieces rounded to 0.5 (e.g., "1 aubergine", "0.5 eggplant") - NEVER use grams. Standard weight: 1 medium aubergine ≈ 300g, 1 small ≈ 150g. Auto-correction is applied on recipe save.
  - **Mushrooms (regular)**: ALWAYS specify in grams (e.g., "150g mushrooms, sliced", "100g button mushrooms") - NEVER use pieces
  - **Portobello mushrooms**: ALWAYS specify in pieces (e.g., "2 large portobello mushrooms", "1 portobello mushroom cap") - these are specialty items that stay separate on shopping lists
  - **Cauliflower**: Use cauliflower rice (e.g., "300g cauliflower rice") or florets in grams (e.g., "250g cauliflower florets") - NEVER use "1 head" as it's imprecise for portion control
  - **Lemon/Lime**: ALWAYS specify in pieces only (e.g., "1 lemon", "1/2 lemon", "1/4 lime", "2 limes") - NEVER use ml or "juice of". Just show the amount of fruit. Auto-conversion: 30ml = 1 whole fruit
  - **Avocado**: ALWAYS specify in pieces (e.g., "1 avocado", "1/2 avocado", "1/4 avocado") - NEVER use grams. Auto-conversion: 150g = 1 avocado, 75g = 1/2, 40g = 1/4
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

**FULL NUTRITION KPIs FOR ALL NEW RECIPES** (CRITICAL):
  - Every new recipe MUST include estimates for ALL tracked KPIs in the nutrition object:
    - **Required**: calories, protein, carbohydrates, fats, fiber, sugar, sodium, vitaminK, iron, calcium, potassium, vitaminC, prepTime, costEuros, proteinPerEuro
    - **When applicable**: cocoaFlavanols (only for recipes containing cacao/cocoa/chocolate)
  - Never add a recipe with only basic macros - always include the full micronutrient set

**RECIPE TAG POLICY** (CRITICAL - only functional tags allowed):
  - Tags are ONLY for dietary filtering and system logic, NOT for describing recipes
  - **Allowed dietary tags**: Vegetarian, Vegan, Gluten-Free, Lactose-Free, Dairy-Free, Nut-Free, Soy-Free, Pescatarian, Non-Vegetarian, Low-Carb, Keto
  - **Allowed health tags**: Anti-Aging, Longevity, High-Protein, Protein-Rich, High-Fiber, Slow-Carb, Fermented
  - **Allowed cycle tags**: Menstrual, Menstruation, Follicular, Ovulation, Luteal (+ Phase variants), cycleBased
  - **Allowed seasonal tags**: January through December (month names only)
  - **Allowed system tags**: Ayurvedic, Weekend-Prep, custom, Viral, Social-Media
  - **NEVER add** descriptive tags like: cuisine types (Italian, Thai, Asian), cooking methods (One-Pan, Grilled, Roasted), ingredient names (Mushroom, Quinoa, Chocolate), texture/style (Creamy, Hearty, Spicy), or marketing terms (Superfood, Power-Bowl, Instagram-Inspired)
  - AI-generated recipes have automatic tag sanitization that strips non-functional tags

**SIMPLIFIED INGREDIENT LIST PREFERENCE** (User's preferred style):
  - **Keep it simple**: Use format `[amount] [item]` without excessive detail
  - **Remove parenthetical explanations**: ❌ "35g chickpeas (canned, drained and rinsed)" → ✅ "35g chickpeas"
  - **Remove preparation methods from ingredients**: ❌ "100g mushrooms, finely sliced" → ✅ "100g mushrooms" (preparation goes in instructions)
  - **Simplify item names**: ❌ "old-fashioned rolled oats" → ✅ "oats", ❌ "baby pak choi" → ✅ "pak choi"
  - **Use pieces for practical items**: ✅ "1/4 ripe banana", "1 clove garlic", "1/4 onion", "4 spring onions", "1/2 red chilli", "1/2 lime"
  - **Use grams/ml for measurable items**: ✅ "35g chickpeas", "75g mushrooms", "50g edamame beans", "138g noodles"
  - **Avoid overly specific conversions**: ❌ "2g garlic (about 1/2 large clove)" → ✅ "1 clove garlic"
  - **Keep lime/lemon simple**: ❌ "juice and zest of 1/2 lime" → ✅ "1/2 lime"
  - **Accept calculated decimal amounts**: Amounts like 0.8ml, 4.6g, 3.75ml are fine - they round when meal plans calculate servings anyway
  - **Examples of good formatting**:
    - ✅ "1/4 ripe banana" (piece)
    - ✅ "35g chickpeas" (weight, no details)
    - ✅ "15ml peanut butter" (volume)
    - ✅ "24g oats" (simplified name)
    - ✅ "1 clove garlic" (piece, not weight)
    - ✅ "75g mushrooms" (weight, no prep method)
    - ✅ "4 spring onions" (pieces)
    - ✅ "1/2 lime" (piece, not "juice and zest")

# System Architecture
- **UI/UX Decisions**: Utilizes `shadcn/ui` built on `Radix UI` primitives with `Tailwind CSS` for theming. Focuses on a streamlined interface with standardized color schemes and optimized mobile responsiveness.
- **Technical Implementations**:
    - **Frontend**: React 18, TypeScript, Wouter for routing, TanStack React Query for server state.
    - **Backend**: Express.js with TypeScript, RESTful API.
    - **Database**: PostgreSQL with Drizzle ORM.
    - **Authentication**: JWT token-based authentication with access and refresh tokens, stored in localStorage, with automatic token refresh.
- **Feature Specifications**:
    - **User Management**: Secure authentication, persistent mobile login, password reset, isolated user data, route protection, and interactive onboarding tutorial.
    - **Meal Planning**: Calculates protein targets, generates 7-day plans with variety, creates shopping lists, and includes smart AI recipe generation. Incorporates 1 anti-aging meal per day. Plans normalize to Sunday start and are limited to current/next week.
    - **Meal Prep Engine**: Adapts to user cooking schedules, supporting batch cooking, meal distribution, and dietary fallbacks. Weekday meals are limited to ≤45 minutes prep time, with 2-day batch cooking for breakfasts.
    - **Dietary Support**: Supports Ayurvedic dietary tags, seasonal adaptation, and menstrual cycle phase tracking with recipe prioritization and weekly highlights.
    - **Recipe Management**: Automated updates, Dutch translation, metric unit conversion, intelligent ingredient-based matching, automatic substitution, smart vegetarian filtering, enhanced high-protein database, and user-created custom recipes.
    - **Shopping List Generation**: Consolidated shopping lists with supermarket-ordered categories, dry goods separation, and ingredient normalization, driven by an admin-controlled ingredient mapping system.
    - **Nutritional Analysis**: Macronutrient distribution tracking, advanced protein range calculator, and AI-powered generation of comprehensive nutritional values.
    - **Longevity Optimization**: Prioritizes longevity-focused recipes for all users, including resistant starch logic and an anti-aging tag system, with comprehensive Vitamin K content calculation and tracking.
    - **Weight Management**: Sustainable weight loss tracking with a 15% calorie reduction cap and automatic maintenance weeks. Personalizes meal portions based on individual metabolic needs using the Mifflin-St Jeor BMR formula.
    - **Admin Panel**: Full-featured interface for managing nutrition parameters, system statistics, meal planning logic, and tag management.
    - **Automatic Recipe Sync**: Exports recipes to `server/recipe-seeds.json` and auto-imports on startup to manage database separation.
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