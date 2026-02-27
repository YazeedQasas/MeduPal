import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Phone, Send } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const inputBase =
  "w-full rounded-xl bg-white/5 border border-white/8 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-colors";

export function ContactFormSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Contact form submitted:", formData);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-[#000] px-6 py-32 sm:px-8"
    >
      {/* Subtle teal glow — matches landing hero/bento */}
      <div className="pointer-events-none absolute -bottom-20 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[rgba(100,170,145,0.06)] blur-[80px]" />

      <div className="relative mx-auto max-w-3xl">
        {/* Header — clean centered block: CONTACT / title / subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-normal uppercase tracking-[0.25em] text-[#A0A0A0] mb-4">
            Contact
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
            Let&apos;s build something exceptional together
          </h2>
          <p className="text-[#C8C8C8] text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Share your project details and our team will reach out within one business day. We&apos;re here to collaborate and craft meaningful experiences.
          </p>
        </motion.div>

        {/* Card — same language as bento/features: border-white/7, rounded-3xl */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-white/8 bg-white/[0.025] overflow-hidden"
        >
          <div className="relative p-8 md:p-10">
            {/* Soft gradient accent in corner */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[rgba(100,170,145,0.08)] blur-2xl pointer-events-none" />

            <motion.form
              onSubmit={handleSubmit}
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-30px" }}
              className="relative grid gap-8 md:grid-cols-[1fr,1.2fr] md:gap-12"
              aria-label="Contact form"
            >
              {/* Left: context + contact info */}
              <motion.div variants={itemVariants} className="space-y-6 text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-[rgba(100,170,145,0.8)]" />
                  Response within 24 hours
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">
                    Tell us about your needs
                  </h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    Whether you&apos;re a programme lead, educator, or student — we&apos;re here to help with OSCE design, station setup, and platform questions.
                  </p>
                </div>
                <div className="space-y-3">
                  <a
                    href="mailto:hello@medupal.com"
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 p-3 text-white/70 hover:text-white hover:border-white/12 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-white/50 shrink-0" />
                    <div className="text-sm">
                      <span className="text-white/50 block text-[10px] uppercase tracking-wider">Email</span>
                      hello@medupal.com
                    </div>
                  </a>
                  <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 p-3 text-white/70">
                    <Phone className="h-4 w-4 text-white/50 shrink-0" />
                    <div className="text-sm">
                      <span className="text-white/50 block text-[10px] uppercase tracking-wider">Phone</span>
                      +1 (555) 123-4567
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right: form */}
              <motion.div variants={itemVariants} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-[10px] text-white/35 uppercase tracking-widest block">
                      Full name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Dr. Jane Smith"
                      value={formData.name}
                      onChange={handleChange}
                      className={inputBase}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-[10px] text-white/35 uppercase tracking-widest block">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="jane@university.edu"
                      value={formData.email}
                      onChange={handleChange}
                      className={inputBase}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-[10px] text-white/35 uppercase tracking-widest block">
                    Phone <span className="text-white/25 font-normal">(optional)</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputBase}
                    autoComplete="tel"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-[10px] text-white/35 uppercase tracking-widest block">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Tell us about your programme, timeline, or how you'd like to use MeduPal…"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className={`${inputBase} resize-none min-h-[100px]`}
                    required
                  />
                </div>
                <div className="flex flex-col gap-3 pt-1">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                    style={{
                      background: "linear-gradient(135deg, rgba(100,170,145,0.35), rgba(60,130,110,0.25))",
                      border: "1px solid rgba(100,170,145,0.25)",
                      color: "rgba(200,235,220,0.95)",
                      boxShadow: "0 0 20px rgba(100,170,145,0.1)",
                    }}
                  >
                    Send message
                    <Send className="h-4 w-4 opacity-80" />
                  </button>
                  <p className="text-[10px] text-white/30 text-center">
                    By submitting you agree to our{" "}
                    <a href="#" className="text-white/50 underline underline-offset-2 hover:text-white/70">privacy policy</a>.
                  </p>
                </div>
              </motion.div>
            </motion.form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
