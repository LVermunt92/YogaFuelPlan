# Meal Planner Application

## Overview
This full-stack meal planning application helps users generate personalized weekly meal plans based on activity levels and dietary preferences. It integrates with Notion for meal plan synchronization and aims to provide a comprehensive, adaptable solution for healthy meal planning with a focus on user experience and nutritional optimization.

## User Preferences
Preferred communication style: Simple, everyday language.
Breakfast scheduling preference: Easy, quick breakfasts during weekdays (≤10 min prep), elaborate breakfasts like pancakes on weekends (≥15 min prep).
Translation continuity plan: Continue AI-enhanced Dutch translation process when OpenAI subscription renews next month. System caches translations to minimize future API costs. Latest additions: "hemp" → "hennep", "beans" → "bonen", "speedy" → "snelle", "protein-packed" → "eiwitrijke", "with" → "met", "green" → "groene", "baking powder" → "bakpoeder", "cinnamon" → "kaneel", "soy sauce" → "sojasaus". Fixed compound ingredient translations (amandelmelk, kokosmelk). Dutch-friendly terms preserved: "overnight oats", "smoothie", "quinoa", "tofu", "tempeh", "pasta", "pizza", "buddha bowl", "wrap" - these remain untranslated as they're commonly used in Dutch.
Enhanced unit conversion system: Comprehensive automated workflow that intelligently converts liquids (milk, oils) to milliliters and dry ingredients to grams. System automatically applies to all new viral recipes and validates conversions with detailed logging. Includes seasonal fruit specification that replaces vague "seasonal fruit" with specific Netherlands-appropriate options based on current season.
Smart seasonal fruit specification: Automatically replaces vague "seasonal fruit" entries with specific Netherlands-appropriate fruits based on current season (spring: strawberries, summer: mixed berries, autumn: apples, winter: citrus fruit) for clearer shopping lists.
Fixed meal plan variety bug: Completely resolved recipe repetition issue including duplicate "Eating out" entries. System now ensures each recipe is cooked fresh only once and appears as leftover only once, with intelligent prevention of duplicate "Eating out" meals. Meal generation now provides perfect weekly variety with proper Sunday-Saturday structure. Added 6 new quick vegetarian high-protein recipes (≤30min prep) to expand weekday variety pool and eliminate excessive "Marry Me" recipe repetitions. Variety improved from 3-4 to 5-7 unique recipes per meal type for vegetarian high-protein users.
Smart protein prioritization system: Replaced strict "high-protein" tag filtering with intelligent protein enhancement system. Instead of limiting recipes to only those tagged "high-protein", system now works with ALL recipes and automatically enhances lower-protein meals with smart additions (hemp hearts, tahini, nutritional yeast, etc.). This dramatically improves variety while maintaining excellent protein content (average 22.1g per meal). Users get 5-7 unique recipes per meal type instead of 2-3 with old filtering.
Fixed protein average calculation: Corrected meal plan protein calculation to divide by actual days with meals instead of always dividing by 7 days. System now shows realistic protein averages per day that reflect user's actual eating patterns. Previously showed artificially low averages for users who eat out frequently.
Fixed protein target display issue: Resolved confusing "average" protein label for high activity users. Interface now correctly shows "High Protein Target" with achievement percentage (e.g., "Target: 130g (50% achieved)") for high activity levels, replacing misleading "average" terminology. High activity users see clear progress toward their 130g daily protein target.
Fixed meal plan date auto-increment issue: Resolved problem where meal plans automatically jumped to future dates (2026). Replaced automatic date calculation with user-controlled "This Week" vs "Next Week" selection. System now prevents uncontrolled time progression and asks users to confirm overwriting existing plans rather than creating endless future plans. Users can generate maximum two plans (current + next week) with clear overwrite confirmation.
Fixed profile update system: Resolved critical issue where users couldn't save dietary preference changes by switching from MemStorage to DatabaseStorage implementation. Users can now successfully update their dietary tags (vegetarian, gluten-free, lactose-free, etc.) and generate meal plans with their new preferences.
Removed "high-protein" dietary tag: Eliminated "high-protein" from dietary tag options since protein targets are automatically handled based on activity level. System now focuses on true dietary restrictions (vegetarian, gluten-free) and preferences (ayurvedic, mediterranean) rather than nutritional targets. Protein optimization happens automatically through smart enhancement system regardless of tags selected.
Fixed meal plan deletion: Added missing `deleteMealPlan` method to DatabaseStorage implementation. Users can now successfully delete meal plan versions. System properly removes both the meal plan and all associated meals from the database to maintain data integrity.
Automatic meal plan cleanup system: Implemented comprehensive cleanup functionality that automatically maintains maximum 3 meal plans per user. System triggers cleanup after every meal plan generation/save operation, keeping only the 3 most recent plans and removing older ones. Successfully reduced one user's plan count from 191 to 3 plans. Prevents database bloat and improves interface usability.
Fixed critical leftover logic bug: Resolved issue where "Bleekselderij" was being forced into every meal. Leftover ingredient incorporation logic was too aggressive - now properly scoped to prevent unwanted ingredient forcing. Dutch ingredient names like "Bleekselderij" can cause inappropriate meal modifications if leftover logic is too broad.
Fixed Sunday evening meal plan structure: Resolved critical issue where Day 1 (Sunday evening) was missing from meal plans. System now correctly generates Sunday dinner as the first cooking moment, followed by complete Monday (Day 2) including breakfast and lunch from Sunday's leftovers. Meal plans properly start Sunday evening and continue through Saturday, matching intended cooking workflow.
Enhanced recipe indulgence: AI-generated recipes now include healthy but satisfying sauces or toppings made from whole foods (roasted pepper sauces, tahini dressings, herb oils, nut creams, vegetable salsas) to make meals feel more indulgent while maintaining nutritional value.
Smart AI recipe generation: Intelligent hybrid system that uses existing recipe database first for speed, only generates new AI recipes when insufficient variety exists for specific dietary combinations (less than 15 recipes), ensuring optimal performance while maintaining variety.
Instagram-inspired viral recipes: Added three viral social media recipes with healthy indulgent toppings - herb-infused chicken lasagna with avocado oil drizzle, chicken and basil pesto lasagna with cottage cheese sauce, and pasta with roasted zucchini cream and burrata topping.
Terminology standardization: Updated all references from "snap peas" to "sugar snaps" across recipes, ingredient lists, and Dutch translations for consistency and user preference.
Unified Recipe Database: Consolidated three separate recipe databases (base, viral, additional) into single unified system for better consistency, easier management, and improved variety distribution. Total database now contains 61 recipes with all viral and additional recipes seamlessly integrated. All obsolete database files deleted and system fully streamlined.
Balanced Recipe Variety Management: Completely resolved repetitive "Marry Me" recipe issue by implementing comprehensive global similarity filtering across all meal selection workflows. System now prevents any similar recipes from appearing multiple times per meal plan through enhanced variety tracking that spans breakfast, lunch, and dinner selections. Enhanced reset logic ensures global similarity filtering applies even when meal pools are reset, permanently blocking duplicate "Marry Me" recipes (both Mushroom Pasta and Chickpea Curry variants). All recipe names cleaned of viral promotional brackets - transformed "Viral Cottage Cheese Bowl (Social Media Trend)" to "Cottage Cheese Bowl" and similar clean naming. Viral recipes maintain relevance through automated updates but receive equal treatment in selection algorithms, ensuring natural variety distribution without artificial prioritization.
Improved Meal Plan Interface: Enhanced user experience by showing meal plan selector even with single plan (previously hidden causing confusion), improved current plan button styling with proper selected appearance, and fixed date display issues by cleaning old test data with incorrect future dates.
Critical Dietary Restriction Bug Fix: Discovered and resolved critical issue where fish recipes (Baked cod with Mediterranean vegetables) were appearing in vegetarian meal plans. Added additional safety filtering to prevent any recipes tagged as "pescatarian" or containing fish/meat ingredients from being served to vegetarian users. Implemented emergency cleanup that removed problematic meals from existing plans and added safeguards to prevent recurrence.
Fixed Recipe Instructions Issue: Resolved critical problem where meals with "(protein-enhanced)" suffixes were failing to match recipes in the database, causing incomplete fallback instructions like "Cook quinoa, Add beans and vegetables, Season with herbs". Enhanced recipe lookup logic to strip "(protein-enhanced)" suffix during matching, ensuring all recipes display complete detailed instructions with proper ingredients, step-by-step cooking directions, tips, and nutritional information.

## System Architecture

### Authentication & Multi-User Support
- **User Authentication**: Login/registration system with secure password hashing.
- **Secure Password Reset**: Two-step email verification with 6-digit codes (15-minute expiration).
- **Multi-User Support**: Each user has unique ID and isolated data.
- **Route Protection**: Logged-out users only see login screen.

### UI/UX Decisions
- **Design System**: shadcn/ui built on Radix UI primitives.
- **Styling**: Tailwind CSS with CSS variables for theming.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack React Query for server state.
- **Backend**: Express.js with TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM, managed via Neon serverless.
- **Session Management**: Express sessions with PostgreSQL store.
- **Build Tools**: Vite for frontend, esbuild for backend.
- **Meal Generation**: Calculates protein targets based on user activity, selects meals from a pre-defined nutrition database, generates 7-day plans with variety, and creates shopping lists.
- **Universal Meal Prep Engine**: Adapts to user cooking schedules, supporting batch cooking, proper meal distribution, intelligent dietary fallbacks.
- **Recipe System**: All meals include detailed cooking instructions, tips, and nutritional information; recipes are alcohol-free.
- **Smart Time Constraints**: Weekday meals (Mon-Fri) are limited to ≤30 minutes prep time; weekends have no time restrictions.
- **Ayurvedic Integration**: Supports Ayurvedic dietary tags, including seasonal adaptation based on a 6-season calendar (adapted for European seasons).
- **Meal Plan Persistence**: Meal plans persist across browser sessions with automatic loading.
- **Automated Viral Recipe Updates**: System automatically adds new trending recipes every 2 weeks on Sundays at 3 AM.
- **Automatic Oura Ring Sync**: Daily automated synchronization of Oura Ring health data at 8:00 AM Europe/Amsterdam timezone.
- **Enhanced Multi-Plan Weekend Grocery System**: Users can maintain both current week and next week plans simultaneously.
- **Complete Dutch Recipe Translation System**: Comprehensive translation service for recipe names, ingredients, and cooking instructions from English to Dutch, including AI-enhanced translation.
- **Consolidated Shopping List Workflow**: Single-flow shopping list generation with integrated export options (copy, CSV download, Albert Heijn app deep linking).

### System Design Choices
- **Data Flow**: User input drives meal generation, stored in PostgreSQL, displayed via React Query, and can be synced to Notion.
- **Database Schema**: Comprehensive user profiles, weekly meal plans, individual meals, meal history, favorite meals, and Oura data.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connection.
- **@notionhq/client**: Notion API integration for meal plan synchronization.
- **drizzle-orm**: ORM for database interactions.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/***: Headless UI components.
- **tailwindcss**: Utility-first CSS framework.