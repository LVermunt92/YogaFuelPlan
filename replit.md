# Overview
This full-stack meal planning application generates personalized weekly meal plans based on user activity levels and dietary preferences. Its purpose is to provide a comprehensive, adaptable solution for healthy meal planning, enhancing healthy eating habits globally and addressing the market potential for personalized nutrition solutions by optimizing user experience and nutritional value. The project aims to be a complete personalized healthy lifestyle planner.

# User Preferences
Preferred communication style: Simple, everyday language.
**CRITICAL DEVELOPMENT RULE**: Never remove existing functionality, features, or logic without explicit user permission. Always ask twice before removing anything. Only make additive changes unless specifically requested to remove features. Preserve all working functionality by default.
Breakfast scheduling preference: Easy, quick breakfasts during weekdays (≤10 min prep), elaborate breakfasts like pancakes on weekends (≥15 min prep).
Translation continuity plan: Continue AI-enhanced Dutch translation process.
Enhanced unit conversion system: Comprehensive automated workflow that intelligently converts liquids (milk, oils) to milliliters and dry ingredients to grams.
Smart seasonal fruit specification: Automatically replaces vague "seasonal fruit" entries with specific Netherlands-appropriate fruits based on current season.
Smart protein prioritization system: Instead of limiting recipes to only those tagged "high-protein", system now works with ALL recipes and automatically enhances lower-protein meals with smart additions (hemp hearts, tahini, nutritional yeast, etc.).
Fixed protein average calculation: Corrected meal plan protein calculation to divide by actual days with meals instead of always dividing by 7 days.
Fixed protein target display issue: Interface now correctly shows "High Protein Target" with achievement percentage for high activity levels.
Fixed meal plan date auto-increment issue: Replaced automatic date calculation with user-controlled "This Week" vs "Next Week" selection.
Fixed profile update system: Users can now successfully update their dietary tags and generate meal plans with their new preferences.
Removed "high-protein" dietary tag: Eliminated "high-protein" from dietary tag options since protein targets are automatically handled based on activity level.
Fixed meal plan deletion: Users can now successfully delete meal plan versions.
Automatic meal plan cleanup system: Implemented comprehensive cleanup functionality that automatically maintains maximum 3 meal plans per user.
Fixed critical leftover logic bug: Leftover ingredient incorporation logic was too aggressive - now properly scoped to prevent unwanted ingredient forcing.
Fixed Sunday evening meal plan structure: System now correctly generates Sunday dinner as the first cooking moment, followed by complete Monday (Day 2) including breakfast and lunch from Sunday's leftovers.
Enhanced recipe indulgence: AI-generated recipes now include healthy but satisfying sauces or toppings made from whole foods (roasted pepper sauces with tomato paste and nuts, tahini dressings, herb oils, nut creams, vegetable salsas).
Smart AI recipe generation: Intelligent hybrid system that uses existing recipe database first for speed, only generates new AI recipes when insufficient variety exists for specific dietary combinations (less than 15 recipes).
Terminology standardization: Updated all references from "snap peas" to "sugar snaps" across recipes, ingredient lists, and Dutch translations.
Balanced Recipe Variety Management: Implemented comprehensive global similarity filtering across all meal selection workflows.
Improved Meal Plan Interface: Enhanced user experience by showing meal plan selector even with single plan, improved current plan button styling with proper selected appearance, and fixed date display issues.
Enhanced Recipe KPI Display: Added comprehensive nutritional KPI information to recipe details dialog, showing good fats (grams), vegetables (grams), and fruits/staches (grams) alongside existing nutritional data.
Refined Dietary Tag System: Removed "low-sodium", "sugar-free", "high-protein", and "anti-inflammatory" from user-selectable dietary tags in profile settings.
Personalized Welcome Text: Updated navigation welcome message to prioritize showing user's firstName from profile data, only falling back to username when firstName is not available.
About Page Implementation: Created comprehensive About page explaining the meal planner's philosophy as a personalized healthy lifestyle planner.
Critical Dietary Restriction Bug Fix: Added additional safety filtering to prevent any recipes tagged as "pescatarian" or containing fish/meat ingredients from being served to vegetarian users.
Fixed Recipe Instructions Issue: Enhanced recipe lookup logic to strip "(protein-enhanced)" suffix during matching, ensuring all recipes display complete detailed instructions.
Enhanced grocery list display: Updated bell peppers, carrots, and kiwi to show as "pieces" instead of grams in shopping lists.
Improved fresh herbs specification: System now defaults to "fresh parsley" and properly categorizes all herb types as "1 bunch" (bosje in Dutch).
Comprehensive Ingredient Specification System: Implemented complete system to eliminate all generic ingredient terms across recipes.
Fixed Critical Leftover Ingredients Bug: Removed the clearing logic and added proper leftover ingredient incorporation to the main meal generation path.
Fixed Shopping List Capitalization: Added proper capitalization logic to ensure all ingredient names start with capital letters.
Supermarket-Ordered Shopping Categories: Reorganized shopping list categories to follow logical supermarket visit flow.
Enhanced Ingredient Separation System: Modified ingredient specification system to create separate ingredient entries for mixed berries instead of comma-separated lists.
Advanced Shopping List Category System: Restructured shopping categories into 8 distinct sections following logical supermarket flow.
Comprehensive Lemon Standardization System: Implemented universal lemon measurement system where all lemon-related ingredients are automatically converted to "pieces of lemon" throughout recipes and shopping lists.
Detailed Dry Goods Separation System: Further separated the "Dry Goods" category into 4 specific subcategories following user's supermarket shopping preferences.
Perfect Shopping List Organization: Restructured shopping categories to follow user's exact supermarket flow.
Final Shopping List Fix: Fixed categories array generation in routes.ts to preserve proper sequence from sorted shopping list items.
UI Cleanup Implementation: Streamlined meal planner interface by removing redundant elements.
Removed export and share functionality: Eliminated all export and share buttons from meal plans and shopping lists.
Advanced Protein Range Calculator: Comprehensive protein calculation system with evidence-based approach where people under age thresholds need ~20% of total energy intake (100g for 2000 kcal).
Comprehensive Macronutrient Distribution Tracking: Added real-time tracking of macronutrient distribution in meal plans displaying daily intake percentages.
Comprehensive Admin Panel Implementation: Created full-featured admin interface accessible to admin users.
Non-Vegetarian User Priority System: Fixed meal selection bias where non-vegetarian users were getting mostly vegetarian meals - now properly prioritizes meat/fish recipes (70%) with vegetarian variety (30%) for users without dietary restrictions.
Mobile-Optimized Meal Plan Display: Redesigned meal plan interface with responsive card layout for mobile devices, featuring larger text, better touch targets, and color-coded meal types for improved phone usability.
User Recipe Management System: Implemented comprehensive custom recipe functionality allowing users to create, edit, and manage their personal recipe collections separate from the main curated database.
Unified Meal Plan Color Scheme: Simplified meal plan interface from multiple meal-type colors (orange/blue/purple) to single unified gray color scheme while preserving blue leftover indicators.
Nutrition Targets Display Restoration: Restored comprehensive nutrition targets section in profile page showing protein, carbohydrates, fats, and calories based on activity level calculations with detailed breakdown.
Recipe Source Preference System: Added user preference toggle in "My Recipes" page allowing users to choose between using only their custom recipes or mixing them with the curated database for meal plan generation.
Enhanced Meal Plan Visual System: Restored colored meal cards with green for fresh meals and blue for leftovers, added orange ingredient indicators for meals with incorporated leftover ingredients, and removed colored day headers for cleaner appearance.

# System Architecture
- **UI/UX Decisions**: Utilizes `shadcn/ui` built on `Radix UI` primitives with `Tailwind CSS` and CSS variables for theming. The UI is streamlined, removing redundant elements and focusing on core meal planning functionality.
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
    - **Smart Time Constraints**: Weekday meals (Mon-Fri) are limited to ≤30 minutes prep time; weekends have no time restrictions.
    - **Ayurvedic Integration**: Supports Ayurvedic dietary tags and seasonal adaptation.
    - **Meal Plan Persistence**: Meal plans persist across browser sessions with automatic loading and cleanup (max 3 plans).
    - **Automated Viral Recipe Updates**: System automatically adds new trending recipes.
    - **Simplified meal plan management**: Users rely on the saved meal plans system for managing multiple plans.
    - **Complete Dutch Recipe Translation System**: Comprehensive translation service for recipe names, ingredients, and cooking instructions from English to Dutch, including AI-enhanced translation.
    - **Consolidated Shopping List Workflow**: Single-flow shopping list generation with supermarket-ordered categories, detailed dry goods separation, and comprehensive lemon standardization.
    - **Comprehensive Macronutrient Distribution Tracking**: Real-time tracking of macronutrient distribution (fats, vegetables, fruits/starches) in meal plans.
    - **Advanced Protein Range Calculator**: Evidence-based protein calculation with gender-specific age thresholds and activity level considerations.
    - **Admin Panel System**: Complete administrative interface for managing nutrition calculation parameters, monitoring system statistics, and configuring all meal planning logic. Includes editable lookup tables for protein factors, PAL values, carbohydrate targets, and fat percentages with full audit trail.
    - **User Recipe Management**: Complete custom recipe system allowing users to create, store, and manage personal recipes separate from the curated database. Includes full CRUD operations, nutrition tracking, meal type categorization, and soft-delete functionality.
- **System Design Choices**:
    - **Data Flow**: User input drives meal generation, stored in PostgreSQL, displayed via React Query.
    - **Database Schema**: Comprehensive user profiles, weekly meal plans, individual meals, meal history, favorite meals, and user-created custom recipes.
    - **Unified Recipe Database**: Consolidated three separate recipe databases (base, viral, additional) into a single unified system.

# External Dependencies
- `@neondatabase/serverless` (PostgreSQL client)
- `drizzle-orm` (ORM for PostgreSQL)
- `@tanstack/react-query` (Frontend data fetching)
- `@radix-ui` (UI primitives)
- `tailwindcss` (CSS framework)