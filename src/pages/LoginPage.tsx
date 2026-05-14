import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "../firebase";
import { ConfirmationResult } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tag, ShieldCheck, Zap, Globe, Mail, Lock, Phone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import SignUpPage from "./SignUpPage";

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default function LoginPage() {
  const [showSignUp, setShowSignUp] = useState(true);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    // We must initialize the recaptcha verifier when the component mounts or switches to phone login
    if (loginMethod === "phone" && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
  }, [loginMethod]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code !== "auth/invalid-credential") {
        console.error("Login error:", err);
      }
      let message = "An error occurred during login.";

      if (err.code === "auth/invalid-credential") {
        message =
          "Invalid email or password. Please check your credentials or sign up if you don't have an account.";
      } else if (err.code === "auth/user-disabled") {
        message = "This account has been disabled.";
      } else if (err.code === "auth/operation-not-allowed") {
        message =
          "Email/Password sign-in is not enabled. Please enable it in the Firebase Console.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      }

      // Ensure phone number has country code. Assuming +91 or +1 if missing for this example, or ask user to provide it.
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`;

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
    } catch (err: any) {
      console.error("OTP send error:", err);
      setError("Failed to send OTP: " + err.message);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    
    setLoading(true);
    setError(null);
    try {
      await confirmationResult.confirm(otp);
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setError("Invalid OTP: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showSignUp) {
    return <SignUpPage onBack={() => setShowSignUp(false)} />;
  }
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Side: Branding & Features */}
        <div className="hidden md:flex flex-col space-y-8 p-8">
          <div className="flex items-center gap-3 text-blue-600">
            <Tag className="w-12 h-12" />
            <h1 className="text-4xl font-bold tracking-tighter">
              Local<span className="text-slate-900">Trade</span>
            </h1>
          </div>

          <div className="space-y-6">
            <FeatureItem
              icon={<ShieldCheck className="w-6 h-6 text-green-500" />}
              title="Secure Marketplace"
              description="Verified users and secure communication for your peace of mind."
            />
            <FeatureItem
              icon={<Zap className="w-6 h-6 text-yellow-500" />}
              title="Instant Chat"
              description="Connect with buyers and sellers instantly with our real-time chat."
            />
            <FeatureItem
              icon={<Globe className="w-6 h-6 text-blue-500" />}
              title="Local & Global"
              description="Find items in your neighborhood or across the country."
            />
          </div>
        </div>

        {/* Right Side: Login Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-slate-200 shadow-2xl relative">
            <CardHeader className="space-y-1 text-center pb-6">
              <div className="md:hidden flex justify-center mb-4">
                <Tag className="w-12 h-12 text-blue-600" />
              </div>
              <CardTitle className="text-3xl font-bold">Welcome back</CardTitle>
              <CardDescription>
                Sign up or login to start buying and selling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2"
                >
                  <div className="w-1 h-1 bg-red-600 rounded-full shrink-0" />
                  {error}
                </motion.div>
              )}

              {/* TABS */}
              {!otpSent && (
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      loginMethod === "email" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
                    }`}
                    onClick={() => { setLoginMethod("email"); setError(null); }}
                    type="button"
                  >
                    Email
                  </button>
                  <button
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      loginMethod === "phone" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
                    }`}
                    onClick={() => { setLoginMethod("phone"); setError(null); }}
                    type="button"
                  >
                    Mobile
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {loginMethod === "email" && !otpSent && (
                  <motion.form 
                    key="email-form"
                    onSubmit={handleEmailLogin} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="m@example.com"
                          className="pl-10"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <span className="text-xs text-blue-600 hover:underline cursor-pointer">
                          Forgot?
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="password"
                          type="password"
                          className="pl-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                      disabled={loading}
                    >
                      {loading ? "Logging in..." : "Login"}
                    </Button>
                  </motion.form>
                )}

                {loginMethod === "phone" && !otpSent && (
                  <motion.form 
                    key="phone-form"
                    onSubmit={handleSendOtp} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="phone">Mobile Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 234 567 8900"
                          className="pl-10"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          required
                        />
                      </div>
                      <p className="text-xs text-slate-500">Include country code if outside India (e.g. +1, +44)</p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                      disabled={loading}
                    >
                      {loading ? "Sending OTP..." : "Get OTP"}
                    </Button>
                  </motion.form>
                )}

                {loginMethod === "phone" && otpSent && (
                  <motion.form 
                    key="otp-form"
                    onSubmit={handleVerifyOtp} 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="otp">Enter OTP</Label>
                        <span 
                          onClick={() => { setOtpSent(false); setOtp(""); setError(null); }}
                          className="text-xs text-blue-600 hover:underline cursor-pointer"
                        >
                          Change Number
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="otp"
                          type="text"
                          placeholder="123456"
                          className="pl-10 tracking-widest font-mono text-center"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                          maxLength={6}
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "Verify & Login"}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
              
              <div id="recaptcha-container"></div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 border-t border-slate-100 pt-6">
              <p className="text-center text-sm text-slate-500">
                Don't have an account?{" "}
                <span
                  onClick={() => setShowSignUp(true)}
                  className="text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  Sign up
                </span>
              </p>

              <p className="text-center text-[10px] text-slate-400 px-4">
                By continuing, you agree to our{" "}
                <Link
                  to="/terms-of-service"
                  className="text-blue-600 hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy-policy"
                  className="text-blue-600 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="text-slate-500 text-sm">{description}</p>
      </div>
    </div>
  );
}

