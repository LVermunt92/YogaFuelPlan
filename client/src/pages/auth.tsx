import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
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
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return response.json();
    },
    onSuccess: (data) => {
      login(data.user);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.username}`,
      });
      // Navigate to homepage after successful login
      setTimeout(() => {
        navigate('/');
      }, 500);
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
      login(data.user);
      toast({
        title: "Account Created!",
        description: `Welcome to the meal planner, ${data.user.username}!`,
      });
      // Navigate to homepage after successful registration
      setTimeout(() => {
        navigate('/');
      }, 500);
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
        loginMutation.mutate(validatedData);
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
          <CardTitle className="text-2xl font-light tracking-wider" style={{ fontFamily: 'Times, "Times New Roman", serif' }}>
            Meal Planner
          </CardTitle>
          <CardDescription>
            {isForgotPassword 
              ? resetStep === "request"
                ? "Enter your username to receive a reset code"
                : "Enter the reset code sent to your email and your new password"
              : isLogin 
                ? "Welcome back to your personal meal planner" 
                : "Create your account to get started"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            
            {!isLogin && !isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
            )}
            
            {isForgotPassword ? (
              <>
                {resetStep === "verify" && (
                  <div className="space-y-2">
                    <Label htmlFor="resetCode">Reset Code</Label>
                    <Input
                      id="resetCode"
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="Enter 6-digit reset code"
                      maxLength={6}
                      required
                    />
                  </div>
                )}
                {resetStep === "verify" && (
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      required
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading 
                ? "Please wait..." 
                : isForgotPassword 
                  ? resetStep === "request"
                    ? "Send Reset Code"
                    : "Reset Password"
                  : isLogin 
                    ? "Log In" 
                    : "Create Account"
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
                    Didn't receive code? Try again
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
                  Back to login
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-foreground underline block"
                >
                  {isLogin ? "Don't have an account? Create one" : "Already have an account? Log in"}
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
                    Forgot your password?
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