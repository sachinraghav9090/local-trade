import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HelpCircle, Send, CheckCircle2 } from "lucide-react";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !message.trim()) return;

    setSending(true);
    try {
      await addDoc(collection(db, "support"), {
        userId: user.uid,
        userEmail: user.email,
        subject: subject.trim() || "General Support",
        message: message.trim(),
        status: "open",
        createdAt: serverTimestamp(),
      });
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setSubject("");
        setMessage("");
      }, 2000);
    } catch (error) {
      console.error("Error sending support ticket:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-[60]">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-300 flex items-center justify-center group transition-all duration-300 hover:scale-110">
              <HelpCircle className="w-7 h-7 text-white" />
              <span className="absolute right-full mr-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Need Help?
              </span>
            </Button>
          }
        />

        <DialogContent className="sm:max-w-[400px]">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-8 flex flex-col items-center text-center space-y-4"
              >
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Message Sent!
                  </h3>
                  <p className="text-slate-500 mt-1">
                    Our team will get back to you soon.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <HelpCircle className="w-6 h-6 text-blue-600" />
                    Support
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="What do you need help with?"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Describe your issue or question..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[120px] bg-slate-50 border-slate-200 resize-none"
                      required
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button
                      type="submit"
                      disabled={sending || !message.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 gap-2 h-11"
                    >
                      {sending ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
