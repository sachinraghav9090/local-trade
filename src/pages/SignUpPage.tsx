import React, { useState } from "react";
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  updateProfile,
} from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
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
import { Tag, User, Mail, Lock, Phone, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

interface SignUpPageProps {
  onBack: () => void;
}

export default function SignUpPage({ onBack }: SignUpPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );
      const user = userCredential.user;

      // Update profile with name
      await updateProfile(user, {
        displayName: formData.name,
      });

      // Create user document in Firestore
      const referralCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        referralCode: referralCode,
        createdAt: serverTimestamp(),
        role: "user",
      });
    } catch (err: any) {
      if (err.code !== "auth/email-already-in-use") {
        console.error("Error signing up:", err);
      }
      let message = "Failed to sign up. Please try again.";

      if (err.code === "auth/email-already-in-use") {
        message = "This email is already registered. Please log in instead.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
      } else if (err.code === "auth/operation-not-allowed") {
        message =
          "Email/Password sign-up is not enabled. Please enable it in the Firebase Console.";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <Card className="border-slate-200 shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Tag className="w-8 h-8 text-blue-600" />
              <div className="w-10" /> {/* Spacer */}
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Create an account
            </CardTitle>
            <CardDescription className="text-center">
              Join the largest marketplace today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2"
              >
                <div className="w-1 h-1 bg-red-600 rounded-full shrink-0" />
                {error}
              </motion.div>
            )}
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="name"
                    required
                    placeholder="John Doe"
                    className="pl-10"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="john@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="mobile"
                    required
                    placeholder="+91 98765 43210"
                    className="pl-10"
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 mt-4"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t border-slate-100 pt-6">
            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <span
                onClick={onBack}
                className="text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                Log in
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
  );
}
