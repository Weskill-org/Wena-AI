import { supabase } from "@/integrations/supabase/client";

export const certificateService = {
    async getCertificateByCode(code: string) {
        const { data, error } = await supabase
            .from('certificates')
            .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
            .eq('verification_code', code.toUpperCase())
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    async getCertificates() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('certificates')
            .select('*')
            .eq('user_id', user.id)
            .order('issued_date', { ascending: false });

        if (error) throw error;
        return data;
    }
};
