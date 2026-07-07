// *********************
// Role of the component: Footer component
// Name of the component: Footer.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <Footer />
// Input parameters: no input parameters
// Output: Footer component
// *********************

import Link from "next/link";
import React from "react";
import {
  FaFacebook, FaInstagram, FaXTwitter, FaYoutube,
  FaPinterest, FaWhatsapp, FaPhone, FaEnvelope,
  FaLocationDot, FaClock,
} from "react-icons/fa6";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-gray-300" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>

      {/* Main grid */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* ── About Us ── */}
          <div>
            <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wide flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
              About Us
            </h3>
            <p className="text-sm leading-7 text-gray-400">
              At Kuchi Mittai, we bring the authentic taste of tradition right to your doorstep. We specialize in delivering a wide range of premium delicacies, including traditional sweets, crispy snacks, quality cooking oils, and many more.
            </p>
            <Link href="/about" className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              Read more &raquo;
            </Link>
          </div>

          {/* ── Our Policies ── */}
          <div>
            <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wide flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
              Our Policies
            </h3>
            <ul className="space-y-3">
              {[
                { name: "Cancellation & Refund", href: "/cancellation-refund" },
                { name: "Terms & Conditions",    href: "/terms-and-conditions" },
                { name: "Privacy Policy",        href: "/privacy-policy" },
                { name: "Quality Assurance",     href: "/quality-assurance" },
              ].map((item) => (
                <li key={item.name}>
                  <Link href={item.href}
                    className="text-sm text-gray-400 hover:text-white hover:pl-1 transition-all duration-200">
                    › {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Office Address ── */}
          <div>
            <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wide flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
              Office Address
            </h3>
            <div className="flex items-start gap-2.5 text-sm text-gray-400 leading-6">
              <FaLocationDot className="text-blue-400 mt-0.5 flex-shrink-0 text-base" />
              <span>
                Athanur Post, Nanakkal,<br />Tamil Nadu – 636301
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Athanur+Post+Nanakkal+Tamil+Nadu+636301"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-1.5 text-blue-400 hover:text-blue-300 transition-colors text-xs font-medium"
                >
                  View on Google Maps →
                </a>
              </span>
            </div>
          </div>

          {/* ── Contact Us ── */}
          <div>
            <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wide flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2.5">
                <FaEnvelope className="text-blue-400 mt-0.5 flex-shrink-0" />
                <a href="mailto:customercare@kuchimittai.com" className="hover:text-white transition-colors break-all">
                  customercare@kuchimittai.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <FaPhone className="text-blue-400 flex-shrink-0" />
                <a href="tel:+919943355568" className="hover:text-white transition-colors">
                  +91 99433 55568
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <FaWhatsapp className="text-green-400 flex-shrink-0" />
                <a href="https://wa.me/919943355568" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  WhatsApp Us
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <FaClock className="text-blue-400 mt-0.5 flex-shrink-0" />
                <span>10:00 AM – 6:00 PM<br /><span className="text-xs text-gray-500">Customer Care Timings</span></span>
              </li>
            </ul>
          </div>

          {/* ── Follow Us ── */}
          <div>
            <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wide flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
              Follow Us
            </h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-2.5">
                <FaInstagram className="text-pink-400 flex-shrink-0" />
                <a href="https://www.instagram.com/kuchi_mittai26/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
              </li>
              <li className="flex items-center gap-2.5">
                <FaXTwitter className="text-gray-300 flex-shrink-0" />
                <a href="https://x.com/KuchiMittai26" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
              </li>
              <li className="flex items-center gap-2.5">
                <FaYoutube className="text-red-500 flex-shrink-0" />
                <a href="https://www.youtube.com/@kuchiMittai-d6n" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube</a>
              </li>
              <li className="flex items-center gap-2.5">
                <FaPinterest className="text-red-400 flex-shrink-0" />
                <a href="https://www.pinterest.com/kuchimittai26/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Pinterest</a>
              </li>
              <li className="flex items-center gap-2.5">
                <FaFacebook className="text-blue-400 flex-shrink-0" />
                <a href="https://www.facebook.com/profile.php?id=61591524509489" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Facebook</a>
              </li>
              <li className="flex items-center gap-2.5">
                <FaWhatsapp className="text-green-400 flex-shrink-0" />
                <a href="https://wa.me/919943355568" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-gray-700">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-gray-500">
          <span>&copy; 2026 Kuchi Mittai India Pvt Ltd. All rights reserved.</span>
          <span>
            Powered by{" "}
            <a href="https://www.newvsys.com/" target="_blank" rel="noopener noreferrer"
              className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              newvsys
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

