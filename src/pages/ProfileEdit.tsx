import { motion } from "framer-motion";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  phone_number: z.string().trim().max(20, "Phone number must be less than 20 characters").optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
});

export default function ProfileEdit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    phone_number: profile?.phone_number || "",
    date_of_birth: profile?.date_of_birth || "",
  });

  // Update form when profile loads
  useState(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone_number: profile.phone_number || "",
        date_of_birth: profile.date_of_birth || "",
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const validation = profileSchema.safeParse(data);
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone_number: data.phone_number || null,
          date_of_birth: data.date_of_birth || null,
        })
        .eq('id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      navigate('/profile');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-8 flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 px-4 pt-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-4"
      >
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-xl bg-surface/50 backdrop-blur-lg border border-border flex items-center justify-center transition-smooth hover:bg-surface"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground text-sm">Update your personal information</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Upload */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-6"
        >
          <Label className="text-sm font-semibold mb-4 block">Profile Picture</Label>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-primary flex items-center justify-center text-4xl overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  "👤"
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 flex items-center justify-center cursor-pointer transition-smooth"
              >
                <Camera className="w-5 h-5 text-primary-foreground" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Upload a new picture</p>
              <p className="text-xs text-muted-foreground">JPG, PNG or WEBP. Max 2MB.</p>
              {uploading && <p className="text-xs text-primary mt-1">Uploading...</p>}
            </div>
          </div>
        </motion.div>

        {/* Form Fields */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface/50 backdrop-blur-lg border border-border rounded-3xl p-6 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Enter your full name"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="+1 234 567 8900"
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            />
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="w-full h-12 bg-gradient-primary hover:opacity-90 text-white font-semibold rounded-2xl transition-smooth"
          >
            <Save className="w-5 h-5 mr-2" />
            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>
      </form>

      <BottomNav />
    </div>
  );
}
