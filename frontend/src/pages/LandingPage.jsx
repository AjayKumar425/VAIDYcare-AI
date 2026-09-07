import React from 'react';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import AbhaSection from '../components/landing/AbhaSection';
import Footer from '../components/landing/Footer';

export default function LandingPage({ onOpenAuth }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-400 selection:text-slate-950">
      <Navbar onOpenAuth={onOpenAuth} />
      <HeroSection onOpenAuth={onOpenAuth} />
      <FeaturesSection />
      <AbhaSection />
      <Footer onOpenAuth={onOpenAuth} />
    </div>
  );
}