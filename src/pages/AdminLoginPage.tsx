import React, { useState } from "react";
import { signInWithEmailAndPassword } from "../firebase";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Shield, Lock, Mail, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // Verify if the user is an admin
      let isAdmin = false;
      if (user.email === "sachinraghav9090@gmail.com") {
        isAdmin = true;
      } else {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          isAdmin = true;
        }
      }

      if (!isAdmin) {
        setError(
          "Access Denied. This account does not have administrator privileges.",
        );
        await auth.signOut();
      } else {
        navigate("/admin");
      }
    } catch (err: any) {
      console.error("Admin Login error:", err);
      if (err.code === "auth/invalid-credential") {
        setError("Invalid credentials.");
      } else {
        setError("An error occurred during login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to site
        </button>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-8 border-b border-slate-800">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                <Shield className="w-10 h-10 text-blue-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white tracking-tight">
              Admin Portal
            </CardTitle>
            <CardDescription className="text-slate-400">
              Sign in with your administrator account
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-start gap-3"
              >
                <div className="mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Admin Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/20 mt-4"
                disabled={loading}
              >
                {loading ? "Authenticating..." : "Login to Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
