
-- Schedule monthly XP reset on the 1st of every month at midnight UTC
SELECT cron.schedule(
  'reset-monthly-xp',
  '0 0 1 * *',
  $$
  SELECT
    net.http_post(
        url:='https://syqnxceobkvvwwpcfhdm.supabase.co/functions/v1/reset-monthly-xp',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cW54Y2VvYmt2dnd3cGNmaGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDIzNzMsImV4cCI6MjA3OTk3ODM3M30.LGd2GAyijMEfk7r_h6tO1HP8VEp7YRtaQidRxVjpQ5w"}'::jsonb,
        body:='{"time": "monthly-reset"}'::jsonb
    ) AS request_id;
  $$
);
