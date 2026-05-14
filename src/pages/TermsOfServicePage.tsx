import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Scale,
  ShieldAlert,
  FileCheck,
  HelpCircle,
  Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

export default function TermsOfServicePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">
            Terms of Service
          </h1>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8 space-y-10">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Scale className="w-5 h-5" />
              <h2 className="text-xl font-bold">1. Agreement to Terms</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              By accessing or using LocalTrade, you agree to be bound by these
              Terms of Service. If you disagree with any part of the terms, you
              may not access the service. These terms apply to all visitors,
              users, and others who access or use the Service.
            </p>
            <p className="text-slate-600 leading-relaxed font-medium">
              Last updated: April 22, 2026
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <FileCheck className="w-5 h-5" />
              <h2 className="text-xl font-bold">2. User Conduct & Listings</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              When listing items on LocalTrade, you agree that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
              <li>You have the legal right to sell the item.</li>
              <li>
                The description and images accurately represent the item's
                condition.
              </li>
              <li>
                You will not post prohibited items (e.g., illegal substances,
                weapons, stolen property).
              </li>
              <li>
                You will not use the service for any fraudulent or deceptive
                activities.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <ShieldAlert className="w-5 h-5" />
              <h2 className="text-xl font-bold">3. Limitation of Liability</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              LocalTrade is a platform that facilitates connections between
              buyers and sellers. We do not own, sell, or inspect the items
              listed. We are not responsible for any transactions, disputes, or
              losses resulting from your use of the platform.
            </p>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 border-l-4 border-l-amber-500">
              <p className="text-sm text-amber-800 font-medium">
                Important: Always meet in public places and inspect items before
                making payments. Use the built-in chat for all communication to
                maintain a record of your conversation.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <HelpCircle className="w-5 h-5" />
              <h2 className="text-xl font-bold">4. Account Termination</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              We reserve the right to terminate or suspend your account
              immediately, without prior notice or liability, for any reason
              whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Mail className="w-5 h-5" />
              <h2 className="text-xl font-bold">5. Contact Us</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3 w-fit">
              <Mail className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-blue-900">
                tms.localtrade@gmail.com
              </span>
            </div>
          </section>
        </div>

        <div className="text-center text-slate-400 text-sm py-4 pb-12">
          &copy; 2026 LocalTrade. Compliance with International Trade Laws.
        </div>
      </motion.div>
    </div>
  );
}
