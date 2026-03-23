"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const ease = [0.16, 1, 0.3, 1];

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

      {/* How it works + Landing video */}
      <section className="px-8 pb-[120px]">
        <div className="max-w-[860px] mx-auto flex flex-col md:flex-row gap-12 md:gap-16 items-center">
          {/* Steps — left */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease }}
            className="flex-1 flex flex-col justify-between self-stretch py-2"
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

          {/* Landing video — right, height matched to steps */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="hidden md:block self-stretch flex-shrink-0"
          >
            <div
              className="rounded-[16px] overflow-hidden h-full"
              style={{
                boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
              }}
            >
              <video
                src="/mmstudiolandingvid.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-auto object-cover block"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Demo video + CTA */}
      <section className="px-8 pb-[120px]">
        <div className="max-w-[640px] mx-auto">
          <motion.a
            href="https://youtu.be/kHkEGDdY1nc"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease }}
            className="block relative w-full rounded-[16px] overflow-hidden cursor-pointer group"
            style={{
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08)",
              backgroundColor: "#111",
            }}
          >
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <img
                src="https://img.youtube.com/vi/kHkEGDdY1nc/maxresdefault.jpg"
                alt="mmstudio demo"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors duration-200">
                <div
                  className="w-[56px] h-[56px] rounded-full flex items-center justify-center backdrop-blur-sm transition-transform duration-200 group-hover:scale-105"
                  style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M8 5.14v13.72a1 1 0 001.5.86l11.14-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" fill="#1a1a1a" />
                  </svg>
                </div>
              </div>
            </div>
          </motion.a>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-center text-[13px]"
            style={{ color: "#bbb" }}
          >
            Watch the full demo
          </motion.p>
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
