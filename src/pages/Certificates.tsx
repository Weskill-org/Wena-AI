import { motion } from "framer-motion";
import { Award, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { generateCertificateLinkedInUrl } from "@/services/linkedinService";

export default function Certificates() {
  const { user } = useAuth();

  const { data: certificates, isLoading } = useQuery({
    queryKey: ['certificates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user?.id)
        .order('issued_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-8 flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading certificates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 px-4 pt-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">My Certificates</h1>
        <p className="text-muted-foreground">
          {certificates?.length || 0} certificate{certificates?.length !== 1 ? 's' : ''} earned
        </p>
      </motion.div>

      {/* Certificates Grid */}
      {!certificates || certificates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-12 text-center"
        >
          <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No certificates yet</h3>
          <p className="text-muted-foreground">
            Complete modules to earn certificates
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert, index) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-primary rounded-3xl p-6 glow-primary"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{cert.title}</h3>
                  {cert.description && (
                    <p className="text-white/80 text-sm mb-3">{cert.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
                    <span>Issued: {format(new Date(cert.issued_date), 'MMM dd, yyyy')}</span>
                  </div>
                  
                  {cert.certificate_url && (
                    <div className="flex gap-2">
                      <a
                        href={cert.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-smooth text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </a>
                      <a
                        href={cert.certificate_url}
                        download
                        className="bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-smooth text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                      <button
                        onClick={() => {
                          const issuedDate = new Date(cert.issued_date);
                          const linkedinUrl = generateCertificateLinkedInUrl({
                            title: cert.title,
                            organizationName: "Wena AI",
                            issueYear: issuedDate.getFullYear(),
                            issueMonth: issuedDate.getMonth() + 1,
                          certId: cert.id || '',
                            certUrl: `${window.location.origin}/verify/${cert.id || ''}`
                          });
                          window.open(linkedinUrl, '_blank');
                        }}
                        className="bg-[#0077B5] hover:bg-[#0077B5]/90 text-white transition-smooth px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Add to LinkedIn
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
