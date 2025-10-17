-- PostgreSQL trigger for user suspension notifications
-- This sends a NOTIFY event whenever a user's suspended status changes

-- Create the trigger function
CREATE OR REPLACE FUNCTION notify_user_suspension_change()
RETURNS trigger AS $$
BEGIN
  -- Only notify if suspended status actually changed
  IF OLD.suspended IS DISTINCT FROM NEW.suspended THEN
    -- Send notification with user data
    PERFORM pg_notify(
      'user_suspension_changed',
      json_build_object(
        'userId', NEW.id,
        'suspended', NEW.suspended,
        'timestamp', extract(epoch from now())
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on users table
DROP TRIGGER IF EXISTS user_suspension_trigger ON users;
CREATE TRIGGER user_suspension_trigger
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_suspension_change();