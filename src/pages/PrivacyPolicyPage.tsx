import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Shield,
  Lock,
  Eye,
  FileText,
  Mail,
  Globe,
  Brain,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 md:p-8 space-y-10 md:space-y-12">
          {/* Header Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Shield className="w-5 h-5" />
              <h2 className="text-xl font-bold">1. Introduction</h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              LocalTrade ("we," "our," or "us") is dedicated to protecting your
              privacy and being transparent about our data practices. This
              Privacy Policy details how we handle information collected through
              our marketplace platform. This policy is designed to comply with
              global privacy standards and Google Play Store developer
              requirements.
            </p>
            <div className="bg-slate-50 px-4 py-2 rounded-lg inline-block text-xs font-semibold text-slate-500 border border-slate-100">
              Effective Date: April 22, 2026
            </div>
          </section>

          {/* Data Collection */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Eye className="w-5 h-5" />
              <h2 className="text-xl font-bold">
                2. Information We Collect & Why
              </h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              We collect information to provide, improve, and personalize our
              services. We do not sell your personal data to third parties.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm">
                  A. Data You Provide
                </h3>
                <ul className="text-[11px] text-slate-500 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Identity:</strong> Name, Email, and Phone Number for
                    account verification.
                  </li>
                  <li>
                    <strong>Listings:</strong> Photos, Titles, and Descriptions
                    used to facilitate marketplace trades.
                  </li>
                  <li>
                    <strong>Profile:</strong> Optional Address and Bio to build
                    trust between users.
                  </li>
                  <li>
                    <strong>Transfers:</strong> We DO NOT collect banking or
                    credit card details; all financial transactions are handled
                    off-platform.
                  </li>
                </ul>
              </div>
              <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm">
                  B. Data Collected Automatically
                </h3>
                <ul className="text-[11px] text-slate-500 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Location:</strong> Precise coordinates (with
                    foreground permission) to filter local items.
                  </li>
                  <li>
                    <strong>Device Identity:</strong> App instance IDs and IP
                    addresses for fraud prevention.
                  </li>
                  <li>
                    <strong>Interactions:</strong> Viewed items and search
                    queries to improve AI recommendations.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Permissions Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Shield className="w-5 h-5" />
              <h2 className="text-xl font-bold">
                3. Mobile Device Permissions
              </h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              To provide our core features, the app requires access to the
              following sensitive individual device permissions:
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <p className="font-bold text-slate-800">Camera & Microphone</p>
                <p className="text-slate-500 italic">
                  Used for taking listing photos and enabling real-time voice
                  calls between buyers and sellers.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <p className="font-bold text-slate-800">Location</p>
                <p className="text-slate-500 italic">
                  Used to display ads nearby and help you find items in your
                  local area.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <p className="font-bold text-slate-800">Storage/Photos</p>
                <p className="text-slate-500 italic">
                  Used to upload existing product images from your gallery to
                  create advertisements.
                </p>
              </div>
            </div>
          </section>

          {/* Children's Privacy */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <UserCheck className="w-5 h-5" />
              <h2 className="text-xl font-bold">4. Children's Privacy</h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              Our Services are not intended for use by children under the age of
              13. We do not knowingly collect personal information from children
              under 13. If we become aware that a child under 13 has provided us
              with personal information, we will take steps to delete such
              information from our servers immediately.
            </p>
          </section>

          {/* AI Usage */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Brain className="w-5 h-5" />
              <h2 className="text-xl font-bold">5. AI & Smart Features</h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              Our Service leverages Google Gemini (Generative AI) to provide
              enhanced features. When you use these features:
            </p>
            <ul className="list-disc list-inside space-y-2 text-xs text-slate-500 ml-4">
              <li>
                <strong>Smart Replies:</strong> Chat fragments may be processed
                to suggest helpful responses.
              </li>
              <li>
                <strong>Image Analysis:</strong> Uploaded listing photos are
                analyzed to suggest titles and categories.
              </li>
              <li>
                <strong>Listing Descriptions:</strong> Your inputs are used to
                generate professional copy.
              </li>
            </ul>
            <p className="text-[10px] text-slate-400 italic">
              *AI features are designed to assist users; we do not use your
              private communications to train global AI models.
            </p>
          </section>

          {/* Advertising & Third-Party Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Globe className="w-5 h-5" />
              <h2 className="text-xl font-bold">
                6. Advertising & Third-Party Services
              </h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              We use the following third-party processors to provide our service
              and ensure a secure, reliable marketplace:
            </p>
            <ul className="list-disc list-inside space-y-2 text-xs text-slate-500 ml-4">
              <li>
                <strong>Google Firebase:</strong> For user authentication, cloud
                database, real-time messaging, and app stability monitoring.
              </li>
              <li>
                <strong>Cloudinary:</strong> To securely store and deliver
                user-uploaded listing photos.
              </li>
              <li>
                <strong>Google AdMob:</strong> To deliver relevant
                advertisements. Google may use advertising identifiers to serve
                personalized ads.
              </li>
            </ul>
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
              <p className="text-xs text-blue-800 flex items-center gap-2 mb-2 font-semibold">
                <Shield className="w-3 h-3" /> AdMob & Data Safety Disclosure
              </p>
              <p className="text-[10px] text-blue-700 leading-relaxed">
                App ID: ca-app-pub-9637672157872386~7217254462. Google and its
                partners use cookies or unique identifiers to serve ads based on
                your visit to our app and other sites. You can opt-out of
                personalized ads in your Google Account Settings or by adjusting
                the "Limit Ad Tracking" settings on your mobile device. We do
                not share your private chat or contact information with
                advertisers.
              </p>
            </div>
          </section>

          {/* User Rights & Deletion */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Trash2 className="w-5 h-5" />
              <h2 className="text-xl font-bold">
                7. Data Retention & Deletion
              </h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              We retain your information as long as your account is active. We
              believe in your "Right to be Forgotten":
            </p>
            <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
              <UserCheck className="w-6 h-6 text-red-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-red-900 mb-1">
                  Account Deletion Tool
                </h4>
                <p className="text-[10px] text-red-700 leading-relaxed">
                  You can delete your account and all associated data (listings,
                  chats, profile) at any time from the{" "}
                  <strong>Account Settings</strong> page. This process is
                  instantaneous and irreversible.
                  <br /> <br />
                  For external data deletion requests, you may contact{" "}
                  <strong>tms.localtrade@gmail.com</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Lock className="w-5 h-5" />
              <h2 className="text-xl font-bold">8. Information Security</h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              We utilize production-grade encryption and secure Cloud
              Infrastructure (Firebase/Google Cloud/Cloudinary) to store your
              data. While we strive to use the highest industry standards, no
              method of transmission is 100% secure.
            </p>
          </section>

          {/* Data Safety Summary Table */}
          <section className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              Data Safety Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Data Collected
                </p>
                <p className="text-xs text-slate-600">
                  Location, Identity, Contacts (Chat), Photos, Device IDs.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Data Shared
                </p>
                <p className="text-xs text-slate-600">
                  Advertising IDs shared with AdMob; Photos with Cloudinary.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Encryption
                </p>
                <p className="text-xs text-slate-600">
                  Data is encrypted in transit and at rest.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Retention
                </p>
                <p className="text-xs text-slate-600">
                  Retained until account deletion.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Account Deletion
                </p>
                <p className="text-xs text-slate-600">
                  Available instantly via settings.
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-4 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2 text-blue-600">
              <Mail className="w-5 h-5" />
              <h2 className="text-xl font-bold">9. Contact & Compliance</h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              If you have questions about this policy or wish to exercise your
              data rights, please contact our Support Team:
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="bg-blue-600 p-4 rounded-xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                <Mail className="w-6 h-6 text-white" />
                <div>
                  <p className="text-[10px] text-blue-100 font-medium">Email</p>
                  <p className="text-sm font-bold text-white">
                    tms.localtrade@gmail.com
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="text-center space-y-2 pb-12">
          <p className="text-slate-400 text-xs">
            &copy; 2026 LocalTrade Marketplace. All rights reserved.
          </p>
          <div className="flex justify-center gap-6">
            <Button
              variant="link"
              className="text-[10px] text-slate-300 p-0 h-auto"
              onClick={() => navigate("/terms-of-service")}
            >
              Terms of Service
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
