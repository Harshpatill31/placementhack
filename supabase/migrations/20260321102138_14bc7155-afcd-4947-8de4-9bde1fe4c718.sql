-- Trigger function to notify company when a student applies
CREATE OR REPLACE FUNCTION public.notify_on_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _company_user_id uuid;
  _job_title text;
  _applicant_name text;
BEGIN
  SELECT c.user_id, j.title INTO _company_user_id, _job_title
  FROM jobs j JOIN companies c ON c.id = j.company_id
  WHERE j.id = NEW.job_id;

  SELECT full_name INTO _applicant_name FROM profiles WHERE user_id = NEW.user_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      _company_user_id,
      'application',
      'New Application Received',
      COALESCE(_applicant_name, 'Someone') || ' applied for ' || COALESCE(_job_title, 'your job'),
      '/company/applicants'
    );
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'application_update',
      'Application Status Updated',
      'Your application for ' || COALESCE(_job_title, 'a job') || ' is now: ' || NEW.status,
      '/applications'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_change
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_application();

CREATE OR REPLACE FUNCTION public.notify_on_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _requester_name text;
  _addressee_name text;
BEGIN
  SELECT full_name INTO _requester_name FROM profiles WHERE user_id = NEW.requester_id;
  SELECT full_name INTO _addressee_name FROM profiles WHERE user_id = NEW.addressee_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.addressee_id,
      'connection_request',
      'New Connection Request',
      COALESCE(_requester_name, 'Someone') || ' wants to connect with you',
      '/network'
    );
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.requester_id,
      'connection_accepted',
      'Connection Accepted',
      COALESCE(_addressee_name, 'Someone') || ' accepted your connection request',
      '/network'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_connection_change
  AFTER INSERT OR UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_connection();