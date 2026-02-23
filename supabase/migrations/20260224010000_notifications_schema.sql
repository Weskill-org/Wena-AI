-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL, -- e.g., 'challenge', 'streak', 'referral', 'badge', 'group'
    read boolean DEFAULT false NOT NULL,
    link text, -- optional link to navigate to
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger Function for Badge Earned
CREATE OR REPLACE FUNCTION public.handle_badge_earned_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_badge_name text;
BEGIN
    SELECT name INTO v_badge_name FROM public.badges WHERE id = NEW.badge_id;
    
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
        NEW.user_id,
        'New Badge Earned! 🏆',
        'Congratulations! You earned the "' || v_badge_name || '" badge.',
        'badge',
        '/profile/trophy-room'
    );
    RETURN NEW;
END;
$$;

-- Trigger for Badge Earned
CREATE TRIGGER on_badge_earned
    AFTER INSERT ON public.user_badges
    FOR EACH ROW EXECUTE FUNCTION public.handle_badge_earned_notification();

-- Trigger Function for Referral Status Change
CREATE OR REPLACE FUNCTION public.handle_referral_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'verified' THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            NEW.referrer_id,
            'Referral Bonus! 🎁',
            'Your referral has been verified! You earned ' || NEW.credits_earned || ' credits.',
            'referral',
            '/wallet'
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger for Referral Notification
CREATE TRIGGER on_referral_verified
    AFTER UPDATE ON public.referrals
    FOR EACH ROW EXECUTE FUNCTION public.handle_referral_notification();
