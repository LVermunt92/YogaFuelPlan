import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { Languages, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { setTokens } from "@/lib/auth-storage";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address").optional(),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const { language, setLanguage } = useLanguage();
  const t = useTranslations(language);

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; rememberMe?: boolean }) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return response.json();
    },
    onSuccess: (data) => {
      // Store JWT tokens in localStorage
      setTokens(data.accessToken, data.refreshToken);
      
      login(data.user);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.username}`,
      });
      // Force a page refresh to ensure authentication state is properly updated
      window.location.href = '/';
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; email?: string }) => {
      const response = await apiRequest('POST', '/api/auth/register', data);
      return response.json();
    },
    onSuccess: (data) => {
      // Store JWT tokens in localStorage
      setTokens(data.accessToken, data.refreshToken);
      
      login(data.user);
      toast({
        title: "Account Created!",
        description: `Welcome! Let's set up your profile.`,
      });
      // New users land on profile page to fill in their details
      window.location.href = '/profile';
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: "Username might already exist or invalid data",
        variant: "destructive",
      });
    },
  });

  const requestResetMutation = useMutation({
    mutationFn: async (data: { username: string }) => {
      const response = await apiRequest('POST', '/api/auth/request-reset', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reset Code Sent!",
        description: data.message,
      });
      setResetStep("verify");
      // In development, show the reset code
      if (data.resetCode) {
        toast({
          title: "Development Mode",
          description: `Your reset code is: ${data.resetCode}`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Request Failed",
        description: error.message || "Could not send reset code",
        variant: "destructive",
      });
    },
  });

  const verifyResetMutation = useMutation({
    mutationFn: async (data: { username: string; resetCode: string; newPassword: string }) => {
      const response = await apiRequest('POST', '/api/auth/verify-reset', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password Reset Successful!",
        description: "You can now log in with your new password.",
      });
      setIsForgotPassword(false);
      setResetStep("request");
      setIsLogin(true);
      setPassword("");
      setNewPassword("");
      setResetCode("");
    },
    onError: (error) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Invalid reset code or expired",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isForgotPassword) {
        if (resetStep === "request") {
          if (!username) {
            toast({
              title: "Validation Error",
              description: "Username is required",
              variant: "destructive",
            });
            return;
          }
          requestResetMutation.mutate({ username });
        } else {
          if (!username || !resetCode || !newPassword) {
            toast({
              title: "Validation Error",
              description: "All fields are required",
              variant: "destructive",
            });
            return;
          }
          if (newPassword.length < 6) {
            toast({
              title: "Validation Error", 
              description: "Password must be at least 6 characters",
              variant: "destructive",
            });
            return;
          }
          verifyResetMutation.mutate({ username, resetCode, newPassword });
        }
      } else if (isLogin) {
        const validatedData = loginSchema.parse({ username, password });
        loginMutation.mutate({ ...validatedData, rememberMe });
      } else {
        const validatedData = registerSchema.parse({ 
          username, 
          password, 
          email: email || undefined 
        });
        registerMutation.mutate(validatedData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending || requestResetMutation.isPending || verifyResetMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-between items-start mb-4">
            <div></div>
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <Select value={language} onValueChange={(value) => {
                setLanguage(value as 'en' | 'nl');
                localStorage.setItem('preferred_language', value);
              }}>
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="nl">NL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardTitle className="text-2xl font-light tracking-wider" style={{ fontFamily: 'Times, "Times New Roman", serif' }}>
            {t.mealPlanner || 'Meal Planner'}
          </CardTitle>
          <CardDescription>
            {isForgotPassword 
              ? resetStep === "request"
                ? (t.enterUsernameForReset || "Enter your username to receive a reset code")
                : (t.enterResetCodeAndPassword || "Enter the reset code sent to your email and your new password")
              : isLogin 
                ? (t.welcomeBackPersonal || "Welcome back to your personal meal planner")
                : (t.createAccountToStart || "Create your account to get started")
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t.username || 'Username'}</Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.enterUsername || "Enter your username"}
                autoComplete="username"
                required
              />
            </div>
            
            {!isLogin && !isForgotPassword && (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="email">{t.email || 'Email'} (optional)</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button 
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>
                          {language === 'nl' ? 'Waarom e-mail opgeven?' : 'Why provide email?'}
                        </DialogTitle>
                        <DialogDescription className="text-sm pt-2">
                          {language === 'nl' 
                            ? 'Aanbevolen voor het geval je je wachtwoord vergeet. We gebruiken dit alleen voor wachtwoordherstel.'
                            : 'Recommended in case you forget your password. We only use this for password recovery.'}
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.enterEmail || "Enter your email"}
                  autoComplete="email"
                />
              </div>
            )}
            
            {isForgotPassword ? (
              <>
                {resetStep === "verify" && (
                  <div className="space-y-2">
                    <Label htmlFor="resetCode">{t.resetCode || 'Reset Code'}</Label>
                    <Input
                      id="resetCode"
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder={t.enterResetCode || "Enter 6-digit reset code"}
                      maxLength={6}
                      required
                    />
                  </div>
                )}
                {resetStep === "verify" && (
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t.newPassword || 'New Password'}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t.enterNewPassword || "Enter your new password"}
                      required
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="password">{t.password || 'Password'}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.enterPassword || "Enter your password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                />
              </div>
            )}
            
            {/* Remember Me checkbox - only for login */}
            {isLogin && !isForgotPassword && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label htmlFor="rememberMe" className="text-sm">
                  {t.rememberMe || 'Remember me'}
                </Label>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading 
                ? (t.pleaseWait || "Please wait...") 
                : isForgotPassword 
                  ? resetStep === "request"
                    ? (t.sendResetCode || "Send Reset Code")
                    : (t.resetPassword || "Reset Password")
                  : isLogin 
                    ? (t.logIn || "Log In") 
                    : (t.createAccount || "Create Account")
              }
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-2">
            {isForgotPassword ? (
              <div className="space-y-2">
                {resetStep === "verify" && (
                  <button
                    type="button"
                    onClick={() => setResetStep("request")}
                    className="text-sm text-muted-foreground hover:text-foreground underline block"
                  >
                    {t.didntReceiveCode || "Didn't receive code? Try again"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetStep("request");
                    setIsLogin(true);
                    setNewPassword("");
                    setResetCode("");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground underline block"
                >
                  {t.backToLogin || "Back to login"}
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-foreground underline block"
                >
                  {isLogin ? (t.dontHaveAccountCreate || "Don't have an account? Create one") : (t.alreadyHaveAccountLogin || "Already have an account? Log in")}
                </button>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setResetStep("request");
                      setIsLogin(false);
                      setPassword("");
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground underline block"
                  >
                    {t.forgotPassword || "Forgot your password?"}
                  </button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}