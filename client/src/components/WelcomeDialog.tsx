import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, User, Utensils, ShoppingCart, History } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface WelcomeDialogProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export function WelcomeDialog({ open, onClose, username }: WelcomeDialogProps) {
  const { language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = language === "nl" ? [
    {
      icon: <User className="h-12 w-12 text-blue-600" />,
      title: "Welkom bij de maaltijdplanner!",
      description: `Hallo ${username}! Laten we je op weg helpen met het plannen van je maaltijden.`,
      content: [
        "Deze app helpt je bij het plannen van gezonde maaltijden op basis van jouw persoonlijke doelen en voorkeuren.",
        "Je kunt voedingsplannen genereren, boodschappenlijsten maken en je voortgang bijhouden."
      ]
    },
    {
      icon: <User className="h-12 w-12 text-green-600" />,
      title: "Stap 1: Stel je profiel in",
      description: "Vul eerst je persoonlijke gegevens en voorkeuren in.",
      content: [
        "1. Klik op 'Profiel' in de navigatiebalk",
        "2. Vul je gewicht, lengte, leeftijd en geslacht in",
        "3. Kies je activiteitenniveau en doelen",
        "4. Selecteer je voedingsvoorkeuren (lactosevrij, glutenvrij, vegetarisch, etc.)",
        "5. Stel in hoeveel dagen per week je kookt",
        "6. Sla je profiel op"
      ]
    },
    {
      icon: <Utensils className="h-12 w-12 text-orange-600" />,
      title: "Stap 2: Genereer je maaltijdplan",
      description: "Maak je eerste weekmenu aan.",
      content: [
        "1. Ga terug naar de hoofdpagina (Maaltijdplanner)",
        "2. Klik op de knop 'Genereer maaltijdplan'",
        "3. De app maakt automatisch een gepersonaliseerd weekmenu",
        "4. Je ziet je maaltijden per dag met voedingsinformatie",
        "5. Je kunt individuele maaltijden aanpassen als je wilt"
      ]
    },
    {
      icon: <ShoppingCart className="h-12 w-12 text-purple-600" />,
      title: "Stap 3: Maak je boodschappenlijst",
      description: "Krijg een complete lijst met ingrediënten.",
      content: [
        "1. Als je maaltijdplan klaar is, klik op 'Boodschappenlijst'",
        "2. De app groepeert automatisch alle ingrediënten per categorie",
        "3. Je kunt de lijst opslaan of exporteren naar Albert Heijn",
        "4. Vink items af tijdens het winkelen"
      ]
    },
    {
      icon: <History className="h-12 w-12 text-teal-600" />,
      title: "Opgeslagen maaltijdplannen",
      description: "Beheer je weekmenu's effectief.",
      content: [
        "De app bewaart automatisch je gegenereerde maaltijdplannen.",
        "Je kunt maximaal 3 maaltijdplannen tegelijk opslaan.",
        "Wanneer je een 4e plan genereert, wordt het oudste plan automatisch verwijderd.",
        "Klik op een opgeslagen plan om het te bekijken en de boodschappenlijst te zien.",
        "Je kunt oude plannen handmatig verwijderen met het X-icoon."
      ]
    }
  ] : [
    {
      icon: <User className="h-12 w-12 text-blue-600" />,
      title: "Welcome to meal planner!",
      description: `Hi ${username}! Let's get you started with planning your meals.`,
      content: [
        "This app helps you plan healthy meals based on your personal goals and preferences.",
        "You can generate meal plans, create shopping lists, and track your progress."
      ]
    },
    {
      icon: <User className="h-12 w-12 text-green-600" />,
      title: "Step 1: Set up your profile",
      description: "First, fill in your personal information and preferences.",
      content: [
        "1. Click on 'Profile' in the navigation bar",
        "2. Enter your weight, height, age, and gender",
        "3. Choose your activity level and goals",
        "4. Select your dietary preferences (lactose-free, gluten-free, vegetarian, etc.)",
        "5. Set how many days per week you cook",
        "6. Save your profile"
      ]
    },
    {
      icon: <Utensils className="h-12 w-12 text-orange-600" />,
      title: "Step 2: Generate your meal plan",
      description: "Create your first weekly menu.",
      content: [
        "1. Go back to the main page (Meal planner)",
        "2. Click the 'Generate meal plan' button",
        "3. The app will automatically create a personalized weekly menu",
        "4. You'll see your meals per day with nutrition information",
        "5. You can customize individual meals if you want"
      ]
    },
    {
      icon: <ShoppingCart className="h-12 w-12 text-purple-600" />,
      title: "Step 3: Create your shopping list",
      description: "Get a complete list of ingredients.",
      content: [
        "1. Once your meal plan is ready, click on 'Shopping list'",
        "2. The app will automatically group all ingredients by category",
        "3. You can save the list or export it to Albert Heijn",
        "4. Check off items while shopping"
      ]
    },
    {
      icon: <History className="h-12 w-12 text-teal-600" />,
      title: "Saved meal plans",
      description: "Manage your weekly menus effectively.",
      content: [
        "The app automatically saves your generated meal plans.",
        "You can keep up to 3 meal plans at once.",
        "When you generate a 4th plan, the oldest one is automatically removed.",
        "Click on a saved plan to view it and see the shopping list.",
        "You can manually delete old plans using the X icon."
      ]
    }
  ];

  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleSkip}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            {steps[currentStep].icon}
          </div>
          <DialogTitle className="text-2xl text-center">
            {steps[currentStep].title}
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            {steps[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {steps[currentStep].content.map((text, index) => (
            <div key={index} className="flex items-start gap-3">
              {text.match(/^\d+\./) ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <div className="h-5 w-5" />
              )}
              <p className="text-gray-700 dark:text-gray-300">{text}</p>
            </div>
          ))}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 py-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentStep
                  ? "bg-blue-600"
                  : index < currentStep
                  ? "bg-green-600"
                  : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between gap-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleSkip}
            data-testid="button-skip-welcome"
          >
            {language === "nl" ? "Overslaan" : "Skip"}
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                data-testid="button-previous-step"
              >
                {language === "nl" ? "Vorige" : "Previous"}
              </Button>
            )}
            <Button
              onClick={handleNext}
              data-testid={isLastStep ? "button-get-started" : "button-next-step"}
            >
              {isLastStep
                ? language === "nl"
                  ? "Aan de slag!"
                  : "Get started!"
                : language === "nl"
                ? "Volgende"
                : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
