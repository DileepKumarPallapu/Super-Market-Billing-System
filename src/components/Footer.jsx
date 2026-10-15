import React from 'react';
import { usePOS } from '../context/POSContext';
import {
  Sparkles,
  ArrowUp,
  LayoutDashboard,
  Package,
  Receipt,
  Boxes,
  BarChart3,
  History,
  ExternalLink,
  Linkedin,
  Github
} from 'lucide-react';

export default function Footer() {
  const { setActiveTab } = usePOS();
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'billing', label: 'Billing Counter', icon: Receipt },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'history', label: 'Transactions', icon: History }
  ];

  return (
    <footer className="app-footer no-print" role="contentinfo">
      <div className="footer-container">
        {/* 4 Main Columns Grid */}
        <div className="footer-grid">
          {/* Column 1: Brand & About */}
          <div className="footer-col brand-col">
            <div className="footer-brand-header">
              <img src="/orbit-icon.svg" alt="ORBIT MARKET Icon" className="footer-brand-logo" />
              <div>
                <h3 className="footer-brand-title">ORBIT MARKET</h3>
                <span className="footer-brand-tagline">Intelligent Retail Studio</span>
              </div>
            </div>
            <p className="footer-brand-desc">
              High-performance retail POS and supermarket inventory studio with authoritative transaction calculations, real-time stock ledgers, and itemized customer invoicing.
            </p>
            <div className="footer-status-pill">
              <Sparkles size={13} />
              <span>Studio POS Release 2.5 · 155 Items</span>
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div className="footer-col">
            <h4>Quick Navigation</h4>
            <div className="footer-accent-line" />
            <ul className="footer-nav-list">
              {navLinks.map(link => {
                const Icon = link.icon;
                return (
                  <li key={link.id}>
                    <button
                      type="button"
                      className="footer-nav-btn"
                      onClick={() => {
                        setActiveTab(link.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      aria-label={`Navigate to ${link.label}`}
                    >
                      <Icon size={14} className="footer-nav-icon" />
                      <span>{link.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Column 3: Project Information */}
          <div className="footer-col">
            <h4>Project Information</h4>
            <div className="footer-accent-line" />
            <div className="footer-project-meta">
              <div className="meta-row">
                <span className="meta-label">Project:</span>
                <strong className="meta-val highlight">Super Market Billing System</strong>
              </div>
              <div className="meta-row">
                <span className="meta-label">Developed by:</span>
                <strong className="meta-val developer-name">Pallapu Dileep Kumar</strong>
              </div>
              <div className="meta-row">
                <span className="meta-label">Department:</span>
                <span className="meta-val">Department of Computer Science and Engineering</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Institution:</span>
                <span className="meta-val institution-name">
                  Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Academic Year:</span>
                <span className="meta-val academic-year">2026–2027</span>
              </div>
            </div>
          </div>

          {/* Column 4: Connect with Developer */}
          <div className="footer-col">
            <h4>Connect with Developer</h4>
            <div className="footer-accent-line" />
            <p className="footer-connect-desc">
              Connect on LinkedIn or inspect GitHub repositories:
            </p>
            <div className="developer-links">
              <a
                href="https://www.linkedin.com/in/dileep-kumar-pallapu-16a003253"
                target="_blank"
                rel="noopener noreferrer"
                className="developer-link-btn linkedin-btn"
                aria-label="Pallapu Dileep Kumar on LinkedIn (opens in new tab)"
              >
                <div className="link-icon-wrap">
                  <Linkedin size={18} />
                </div>
                <div className="link-text-wrap">
                  <span className="link-title">LinkedIn</span>
                  <span className="link-handle">dileep-kumar-pallapu-16a003253</span>
                </div>
                <ExternalLink size={14} className="link-external-icon" />
              </a>

              <a
                href="https://github.com/DileepKumarPallapu"
                target="_blank"
                rel="noopener noreferrer"
                className="developer-link-btn github-btn"
                aria-label="Pallapu Dileep Kumar on GitHub (opens in new tab)"
              >
                <div className="link-icon-wrap">
                  <Github size={18} />
                </div>
                <div className="link-text-wrap">
                  <span className="link-title">GitHub</span>
                  <span className="link-handle">@DileepKumarPallapu</span>
                </div>
                <ExternalLink size={14} className="link-external-icon" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright">
            © {currentYear} <strong>ORBIT MARKET — Intelligent Retail Studio</strong>. Super Market Billing System. All rights reserved.
          </div>
          <div className="footer-closing-line">
            Engineered by <strong>Pallapu Dileep Kumar</strong> · Vel Tech CSE 2026–2027
          </div>
          <button
            type="button"
            onClick={scrollToTop}
            className="footer-back-to-top"
            aria-label="Back to top of page"
          >
            <span>Back to Top</span>
            <ArrowUp size={13} />
          </button>
        </div>
      </div>
    </footer>
  );
}
