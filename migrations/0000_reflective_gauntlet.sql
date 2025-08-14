CREATE TABLE "meal_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"meal_name" text NOT NULL,
	"meal_type" text NOT NULL,
	"portion" text NOT NULL,
	"protein" real NOT NULL,
	"prep_time" integer NOT NULL,
	"cost_euros" real,
	"protein_per_euro" real,
	"tags" text[] DEFAULT '{}',
	"favorited_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	CONSTRAINT "meal_favorites_user_id_meal_name_unique" UNIQUE("user_id","meal_name")
);
--> statement-breakpoint
CREATE TABLE "meal_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"meal_name" text NOT NULL,
	"meal_type" text NOT NULL,
	"portion" text NOT NULL,
	"protein" real NOT NULL,
	"prep_time" integer NOT NULL,
	"cost_euros" real,
	"protein_per_euro" real,
	"consumed_at" timestamp DEFAULT now() NOT NULL,
	"from_meal_plan_id" integer
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"week_start" text NOT NULL,
	"activity_level" text NOT NULL,
	"total_protein" real NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"notion_synced" boolean DEFAULT false,
	"plan_name" text,
	"plan_type" text DEFAULT 'current',
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"meal_plan_id" integer,
	"day" integer NOT NULL,
	"meal_type" text NOT NULL,
	"food_description" text NOT NULL,
	"portion" text NOT NULL,
	"protein" real NOT NULL,
	"calories" real DEFAULT 0,
	"carbohydrates" real DEFAULT 0,
	"fats" real DEFAULT 0,
	"fiber" real DEFAULT 0,
	"sugar" real DEFAULT 0,
	"sodium" real DEFAULT 0,
	"prep_time" integer DEFAULT 30
);
--> statement-breakpoint
CREATE TABLE "oura_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"activity_score" real,
	"steps" integer,
	"calories" real,
	"active_calories" real,
	"workout_minutes" integer,
	"readiness_score" real,
	"sleep_score" real,
	"period_phase" text,
	"activity_level" text,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oura_data_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "recipe_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"recipe_name" text NOT NULL,
	"rating" integer NOT NULL,
	"feedback" text,
	"meal_type" text NOT NULL,
	"rated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_ratings_user_id_recipe_name_unique" UNIQUE("user_id","recipe_name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"weight" integer DEFAULT 60,
	"goal_weight" integer,
	"height" integer,
	"waistline" real DEFAULT 75,
	"goal_waistline" real,
	"target_date" date,
	"activity_level" text DEFAULT 'high',
	"protein_target" integer DEFAULT 130,
	"dietary_tags" text[] DEFAULT '{}',
	"household_size" integer DEFAULT 1,
	"cooking_days_per_week" integer DEFAULT 7,
	"eating_days_at_home" integer DEFAULT 7,
	"meat_fish_meals_per_week" integer DEFAULT 0,
	"language" text DEFAULT 'en',
	"leftovers" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "meal_favorites" ADD CONSTRAINT "meal_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_history" ADD CONSTRAINT "meal_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_history" ADD CONSTRAINT "meal_history_from_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("from_meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oura_data" ADD CONSTRAINT "oura_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ratings" ADD CONSTRAINT "recipe_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;