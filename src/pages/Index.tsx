import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DiscordProvider } from '@/contexts/DiscordContext';
import { HeroSection } from '@/components/HeroSection';
import { Navigation } from '@/components/Navigation';
import { DiceRoller } from '@/components/DiceRoller';
import { HabilidadesSection } from '@/components/HabilidadesSection';
import { CampaignsSection } from '@/components/CampaignsSection';
import { CampaignDetailView } from '@/components/CampaignDetailView';
import { NotesSection } from '@/components/NotesSection';
import { InventorySection } from '@/components/InventorySection';
import { CharactersSection } from '@/components/CharactersSection';
import { ThemedBackground } from '@/components/ThemedBackground';
import { RollHistory } from '@/components/RollHistory';

function AppContent() {
  const [showHero, setShowHero] = useState(true);
  const [activeSection, setActiveSection] = useState('dice');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    const hasVisited = localStorage.getItem('op-cris-visited');
    if (hasVisited) {
      setShowHero(false);
    }

    // Campaign selection works for guest (localStorage) and logged-in users (optional profile sync)
    const loadSelectedCampaign = async () => {
      const localSelected = localStorage.getItem('selected-campaign-id');
      if (localSelected) {
        setSelectedCampaignId(localSelected);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('selected_campaign_id')
        .eq('id', user.id)
        .single();

      if (profile?.selected_campaign_id) {
        setSelectedCampaignId(profile.selected_campaign_id);
        localStorage.setItem('selected-campaign-id', profile.selected_campaign_id);
      }
    };

    loadSelectedCampaign();
  }, []);

  const handleGetStarted = () => {
    localStorage.setItem('op-cris-visited', 'true');
    setShowHero(false);
  };

  if (showHero) {
    return <HeroSection onGetStarted={handleGetStarted} />;
  }

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <ThemedBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navigation activeSection={activeSection} onSectionChange={setActiveSection} />
        
        <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
          {activeSection === 'dice' && (
            <section className="animate-fade-up">
              <div className="text-center mb-8">
                <h2 className="font-display text-3xl font-bold glow-text mb-2">Rolagem de Dados</h2>
                <p className="text-muted-foreground">Escolha seus dados e que a sorte esteja ao seu lado</p>
              </div>
              <div className="max-w-md mx-auto glass-card p-6">
                <DiceRoller />
              </div>
            </section>
          )}

          {activeSection === 'inventory' && (
            <section className="animate-fade-up">
              <div className="glass-card p-6">
                <InventorySection />
              </div>
            </section>
          )}

          {activeSection === 'characters' && (
            <section className="animate-fade-up">
              <div className="glass-card p-6">
                <CharactersSection />
              </div>
            </section>
          )}

          {activeSection === 'reference' && (
            <section className="animate-fade-up">
              <div className="glass-card p-6">
                <HabilidadesSection />
              </div>
            </section>
          )}

          {activeSection === 'campaigns' && (
            <section className="animate-fade-up">
              {selectedCampaignId ? (
                <CampaignDetailView
                  campaignId={selectedCampaignId}
                  onBack={async () => {
                    setSelectedCampaignId(null);
                    localStorage.removeItem('selected-campaign-id');
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await supabase
                        .from('profiles')
                        .update({ selected_campaign_id: null })
                        .eq('id', user.id);
                    }
                  }}
                />
              ) : (
                <CampaignsSection
                  onCampaignSelected={(campaignId) => {
                    setSelectedCampaignId(campaignId);
                    setActiveSection('campaigns');
                  }}
                />
              )}
            </section>
          )}

          {activeSection === 'notes' && (
            <section className="animate-fade-up">
              <NotesSection />
            </section>
          )}
        </main>

        {/* Footer - Always at bottom */}
        <footer className="border-t border-border/50 mt-auto py-6 text-center text-sm text-muted-foreground relative z-10">
          <p>OP-CRIS • Sistema de Recursos para Ordem Paranormal e Roleplay</p>
          <p className="text-xs mt-1">Fan-made • Não oficial</p>
        </footer>
        
        {/* Roll History - Bottom Right */}
        <RollHistory />
      </div>
    </div>
  );
}

const Index = () => {
  return (
    <ThemeProvider>
      <DiscordProvider>
        <AppContent />
      </DiscordProvider>
    </ThemeProvider>
  );
};

export default Index;
