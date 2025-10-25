# Meal Planning Application Design Guidelines

## Design Approach
**System**: Material Design principles with custom refinements for meal planning context
**Rationale**: Material provides excellent interaction patterns for list-based content with clear state feedback, perfect for meal selection and planning workflows

## Typography Hierarchy
- **Primary Headings**: Inter font, 600 weight, 32px (hero), 24px (section headers)
- **Secondary Headings**: Inter 600, 18px (card titles, meal names)
- **Body Text**: Inter 400, 16px (descriptions, ingredients)
- **Metadata**: Inter 500, 14px (calories, prep time, serving size)
- **Captions**: Inter 400, 13px (tags, dates)
- **Critical**: All titles use sentence case (e.g., "My meal plans" not "My Meal Plans")

## Spacing System
**Tailwind Units**: Standardize on 2, 4, 6, 8, 12, 16, 20 for consistency
- Component padding: p-6 (cards), p-8 (sections)
- Element spacing: gap-4 (tight groups), gap-6 (card grids), gap-8 (sections)
- Container margins: mx-auto max-w-7xl px-6

## Layout Architecture

**Hero Section** (h-96):
- Full-width background image showing vibrant, fresh meal spread
- Centered content with max-w-3xl
- Blurred backdrop filter for CTA buttons (backdrop-blur-md bg-white/20)
- Headline + subheadline + dual CTA layout (primary + secondary button)

**Dashboard Grid** (3-column desktop, 2-column tablet, 1-column mobile):
- Meal plan cards in grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Recipe cards in similar responsive grid
- Weekly calendar in full-width single column

**Navigation**: 
- Sticky top navbar with logo, main nav links, user profile
- Left sidebar for secondary navigation (My plans, Recipes, Shopping list, Settings)
- Mobile: Bottom navigation bar with 4-5 primary actions

## Core Components

**Meal Plan Selection Cards** (Critical Focus):
- Default state: Rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6
- Hover state: border-gray-300 shadow-md (subtle elevation)
- Selected state: border-blue-500 bg-blue-50 shadow-lg with blue-500 checkmark icon (top-right corner, w-6 h-6)
- Card content: Meal image (aspect-video rounded-lg), title, metadata row (servings, calories, time), quick action buttons
- Transition: All state changes use transition-all duration-200

**Recipe Cards**:
- Vertical card with image-first layout (aspect-[4/3])
- Image with overlay gradient for readability
- Floating difficulty badge (top-left, rounded-full px-3 py-1)
- Title, description (line-clamp-2), metadata icons row
- Footer with "Add to plan" button

**Weekly Meal Calendar**:
- 7-column grid for desktop (grid-cols-7)
- Each day cell: Date header, breakfast/lunch/dinner slots (min-h-32 each)
- Empty slots: Dashed border with "+ Add meal" centered text
- Filled slots: Mini meal card (image thumbnail, title, swap icon button)

**Shopping List**:
- Grouped by category (Produce, Proteins, Dairy, etc.)
- Checkbox items with strikethrough animation when checked
- Quantity badges (rounded-full bg-gray-100 px-2)

**Form Inputs**:
- Rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100
- Label above input (text-sm font-medium mb-2)
- Helper text below (text-sm text-gray-600)

**Buttons**:
- Primary: Rounded-lg px-6 py-3 font-medium shadow-sm
- Secondary: Same structure with border-2 and transparent bg
- Icon buttons: Rounded-full p-2 (for quick actions)
- Buttons on images: backdrop-blur-md bg-white/30 border border-white/50

**Navigation Pills/Tags**:
- Rounded-full px-4 py-2 for category filters
- Active state: bg-blue-100 text-blue-700
- Inactive: bg-gray-100 text-gray-700 hover:bg-gray-200

## Interaction Patterns

**Selection Feedback**:
- Immediate border color change
- Scale animation: scale-[0.98] on press, scale-100 on release
- Checkmark icon fades in (transition-opacity duration-200)
- Background tint for selected items

**Drag-and-Drop** (for meal planning):
- Draggable meals have cursor-grab
- Drop zones highlight with dashed border-blue-300 animation
- Ghost element follows cursor with opacity-50

**Loading States**:
- Skeleton screens with animate-pulse bg-gray-200 rounded matching content shape
- Shimmer effect for image placeholders

## Feature-Rich Sections

**Homepage**:
1. Hero with search bar overlay
2. "This week's plan" quick glance (horizontal scroll cards)
3. "Recommended for you" recipe grid (12 items)
4. "Popular meal plans" carousel
5. "Quick recipes" filtered view (under 30 min)
6. Newsletter signup with food photography background

**Meal Planner Page**:
1. Week selector with previous/next navigation
2. Nutrition summary bar (calories, macros visualization)
3. Full weekly calendar grid
4. Floating "Generate shopping list" button (bottom-right)
5. Quick filters (dietary preferences, cuisine types)

**Recipe Detail Page**:
1. Full-width hero image (h-[60vh])
2. Recipe metadata bar (time, difficulty, servings adjuster)
3. Ingredient list (2-column on desktop)
4. Step-by-step instructions with numbered cards
5. Nutrition facts panel
6. Similar recipes carousel
7. Reviews/ratings section

## Images

**Hero Section**: 
Large background image (1920x1080) showing colorful, abundant fresh meal with vegetables, proteins, and grains artfully arranged on wooden table. Natural lighting, overhead perspective. Should convey freshness, health, and variety.

**Recipe Cards**: 
Finished dish photos (800x600), styled plating, clean backgrounds. Each image should be appetizing and clearly show the dish.

**Meal Plan Thumbnails**: 
Square crops (400x400) of hero images, optimized for quick recognition in calendar and list views.

**Empty States**: 
Custom illustrations (not photos) for empty meal plans, shopping lists showing friendly character with cooking utensils.

**Section Backgrounds**: 
Subtle food texture patterns (vegetables, spices) at 10% opacity for visual interest in newsletter/footer sections.