import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Copy, Check } from "lucide-react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function ReferralModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferralCode = async () => {
      if (!auth.currentUser || !isOpen) return;

      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.referralCode) {
            setReferralCode(data.referralCode);
          } else {
            // Generate one if it doesn't exist
            const newCode = Math.random()
              .toString(36)
              .substring(2, 8)
              .toUpperCase();
            await updateDoc(userRef, { referralCode: newCode });
            setReferralCode(newCode);
          }
        }
      } catch (error) {
        console.error("Error fetching referral code:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralCode();
  }, [isOpen]);

  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative text-slate-600 hover:text-blue-600 hover:bg-blue-50"
          >
            <Gift className="w-5 h-5" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Gift className="w-6 h-6 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            Invite Friends
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Share your referral link with friends. When they sign up, you both
            get rewards!
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500 mb-2 font-medium">
              Your Referral Code
            </p>
            {loading ? (
              <div className="h-8 bg-slate-200 animate-pulse rounded w-32 mx-auto" />
            ) : (
              <p className="text-3xl font-black tracking-widest text-slate-900">
                {referralCode}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-500 font-medium text-left">
              Share Link
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={loading ? "Loading..." : referralLink}
                className="bg-slate-50 text-slate-600 font-mono text-sm"
              />
              <Button
                onClick={copyToClipboard}
                disabled={loading}
                className={`shrink-0 w-24 ${copied ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
