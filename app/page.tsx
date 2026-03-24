"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function LandingPage() {
  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
        backgroundColor: "#fafafa",
      }}
    >
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{ backgroundColor: "rgba(250, 250, 250, 0.8)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
      >
        <div className="max-w-[1120px] mx-auto px-8 h-[56px] flex items-center justify-between">
          <span
            className="text-[14px] font-semibold tracking-[-0.01em]"
            style={{ color: "#1a1a1a" }}
          >
            mmstudio
          </span>
          <Link
            href="/studio"
            className="text-[13px] font-medium transition-colors duration-200"
            style={{ color: "#999" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#1a1a1a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#999")}
          >
            Open Studio &rarr;
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-[140px] pb-[80px] px-8">
        <div className="max-w-[1120px] mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="text-[clamp(3rem,6vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.04em]"
            style={{ color: "#1a1a1a" }}
          >
            Your AI
            <br />
            <span style={{ color: "#ef4444" }}>creative</span> partner.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
            className="mt-8 text-[17px] leading-[1.65] max-w-[420px]"
            style={{ color: "#888" }}
          >
            Upload your product. Explore AI-generated creative directions.
            Iterate on a spatial canvas until you find the right concept.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            className="mt-10"
          >
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 text-[13px] font-medium px-5 py-2.5 rounded-full transition-all duration-200"
              style={{
                backgroundColor: "#1a1a1a",
                color: "#fff",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#333")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1a1a1a")}
            >
              Start creating
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Demo video */}
      <section className="px-8 pb-[80px]">
        <div className="max-w-[860px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease }}
            className="rounded-[16px] overflow-hidden"
            style={{
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08)",
            }}
          >
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src="https://www.youtube.com/embed/kHkEGDdY1nc?rel=0"
                title="mmstudio demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-8 pb-[120px]">
        <div className="max-w-[860px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease }}
            className="grid grid-cols-1 md:grid-cols-3 gap-10"
          >
            <Step
              number="01"
              title="Upload your product"
              description="Drop in photos. The AI reads color, material, shape, typography, and context from the image."
            />
            <Step
              number="02"
              title="Explore directions"
              description="Get distinct creative directions — each with a title, brief, and mood. Pick one to expand, or ask for bolder ideas."
            />
            <Step
              number="03"
              title="Iterate and branch"
              description="Refine with natural language. Branch into variations. Compare side-by-side. Every iteration lives on the canvas."
            />
          </motion.div>
        </div>
      </section>

      {/* Landing video */}
      <section className="px-8 pb-[120px]">
        <div className="max-w-[640px] mx-auto flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease }}
            className="w-[320px] rounded-[32px] overflow-hidden"
            style={{
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08)",
            }}
          >
            <video
              src="/mmstudiolandingvid.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full block"
            />
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 pb-[120px]">
        <div className="max-w-[1120px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
          >
            <h2
              className="text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em]"
              style={{ color: "#1a1a1a" }}
            >
              See what your product
              <br />
              <span style={{ color: "#ef4444" }}>could look like.</span>
            </h2>
            <div className="mt-8">
              <Link
                href="/studio"
                className="inline-flex items-center gap-2 text-[13px] font-medium px-5 py-2.5 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: "#1a1a1a",
                  color: "#fff",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#333")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1a1a1a")}
              >
                Open Studio
                <ArrowRight size={14} strokeWidth={2} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-8 py-6"
        style={{ borderTop: "1px solid #eee" }}
      >
        <div className="max-w-[1120px] mx-auto flex items-center justify-between">
          <span className="text-[12px]" style={{ color: "#bbb" }}>
            mmstudio
          </span>
          <span className="text-[11px]" style={{ color: "#ccc" }}>
            YC Hackathon 2025
          </span>
        </div>
      </footer>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <span
        className="block text-[11px] font-medium tracking-[0.08em] mb-2"
        style={{ color: "#ef4444" }}
      >
        {number}
      </span>
      <h3
        className="text-[15px] font-semibold tracking-[-0.01em] mb-1.5"
        style={{ color: "#1a1a1a" }}
      >
        {title}
      </h3>
      <p
        className="text-[14px] leading-[1.6]"
        style={{ color: "#999" }}
      >
        {description}
      </p>
    </div>
  );
}
