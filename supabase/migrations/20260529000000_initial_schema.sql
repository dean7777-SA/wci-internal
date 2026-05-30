--
-- PostgreSQL database dump
--

\restrict m9yDQppiEgWS6loKRxqh0ceBB3xYdkvCFDgTZqviz1XQTcfasqdz7Q1OM3Y6lGj

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: project_stage_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_stage_enum AS ENUM (
    'conceptual',
    'design',
    'quote',
    'invoiced',
    'completed'
);


--
-- Name: project_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status_enum AS ENUM (
    'active',
    'on_hold',
    'cancelled',
    'completed'
);


--
-- Name: project_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_type_enum AS ENUM (
    'residential',
    'hospitality',
    'commercial',
    'retail'
);


--
-- Name: check_contact_rate_limit(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_contact_rate_limit(_email text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT (
    SELECT count(*)
    FROM public.contact_submissions
    WHERE email = _email
      AND created_at > now() - interval '1 hour'
  ) < 5;
$$;


--
-- Name: check_estimate_rate_limit(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_estimate_rate_limit(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT (
    SELECT count(*)
    FROM public.estimate_requests
    WHERE user_id = _user_id
      AND created_at > now() - interval '1 hour'
  ) < 5;
$$;


--
-- Name: delete_email(text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_email(queue_name text, message_id bigint) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;


--
-- Name: enqueue_email(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_email(queue_name text, payload jsonb) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;


--
-- Name: generate_project_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_project_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  year_str TEXT;
  next_num INT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO next_num
  FROM public.projects
  WHERE project_code LIKE 'WCI-' || year_str || '-%';
  NEW.project_code := 'WCI-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (user_id) DO UPDATE
    SET
      display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
      role = COALESCE(NEW.raw_user_meta_data->>'role', profiles.role);
  RETURN NEW;
END;
$$;


--
-- Name: handle_project_stage_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_project_stage_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO public.project_stage_history (project_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, OLD.current_stage::TEXT, NEW.current_stage::TEXT, auth.uid());
    NEW.stage_entered_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;


--
-- Name: is_sales_or_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_sales_or_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role IN ('sales', 'admin')
  );
$$;


--
-- Name: move_to_dlq(text, text, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;


--
-- Name: read_email_batch(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer) RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_projects_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_projects_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: contact_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_type text NOT NULL,
    name text NOT NULL,
    surname text NOT NULL,
    email text NOT NULL,
    dialing_code text DEFAULT '+27'::text,
    phone text,
    location text,
    country text,
    company text,
    project_name text,
    role text,
    message text,
    attachment_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    project_stage text,
    quantity_estimate text,
    trade_assist text,
    project_type text,
    bespoke_type text,
    assigned_to text,
    status text DEFAULT 'new'::text NOT NULL
);


--
-- Name: email_send_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_send_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id text,
    template_name text NOT NULL,
    recipient_email text NOT NULL,
    status text NOT NULL,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_send_log_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'suppressed'::text, 'failed'::text, 'bounced'::text, 'complained'::text, 'dlq'::text])))
);


--
-- Name: email_send_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_send_state (
    id integer DEFAULT 1 NOT NULL,
    retry_after_until timestamp with time zone,
    batch_size integer DEFAULT 10 NOT NULL,
    send_delay_ms integer DEFAULT 200 NOT NULL,
    auth_email_ttl_minutes integer DEFAULT 15 NOT NULL,
    transactional_email_ttl_minutes integer DEFAULT 60 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_send_state_id_check CHECK ((id = 1))
);


--
-- Name: email_unsubscribe_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_unsubscribe_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone
);


--
-- Name: estimate_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimate_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid NOT NULL,
    selected_designs jsonb DEFAULT '[]'::jsonb NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    company_name text,
    project_name text,
    project_location text,
    project_notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    wall_dimensions jsonb DEFAULT '[]'::jsonb,
    professional_role text,
    project_stage text,
    request_type text,
    assigned_to text
);


--
-- Name: installation_completion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installation_completion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    installation_id uuid NOT NULL,
    installer_notes text,
    actual_duration_mins integer,
    client_signoff_name text,
    client_signoff_date date,
    completed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: installation_installers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installation_installers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    installation_id uuid NOT NULL,
    team_member text NOT NULL
);


--
-- Name: installation_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installation_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    installation_id uuid NOT NULL,
    recipient text NOT NULL,
    trigger text NOT NULL,
    CONSTRAINT installation_notifications_trigger_check CHECK ((trigger = ANY (ARRAY['t_minus_7'::text, 't_minus_1'::text, 'day_of'::text, 'status_change'::text, 'overdue'::text])))
);


--
-- Name: installation_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installation_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    installation_id uuid NOT NULL,
    name text NOT NULL,
    sku text,
    quantity numeric,
    unit text,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: installation_signoff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installation_signoff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    installation_id uuid NOT NULL,
    signed_by text NOT NULL,
    signed_at date NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: installation_snags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installation_snags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    installation_id uuid NOT NULL,
    description text NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: installations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    project_id uuid,
    client_name text,
    site_address text,
    suburb text,
    scheduled_date date,
    scheduled_time_start time without time zone,
    scheduled_time_end time without time zone,
    date_tbc boolean DEFAULT false NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    site_inspection_required boolean DEFAULT false NOT NULL,
    site_inspection_date date,
    site_inspection_owner text,
    site_inspection_done boolean DEFAULT false NOT NULL,
    site_inspection_notes text,
    checklist_walls_prepared boolean DEFAULT false NOT NULL,
    checklist_access_confirmed boolean DEFAULT false NOT NULL,
    checklist_delivery_on_site boolean DEFAULT false NOT NULL,
    notes text,
    photo_placeholder text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner text,
    scheduled_end_date date,
    CONSTRAINT installations_priority_check CHECK ((priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))),
    CONSTRAINT installations_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'signed_off'::text])))
);


--
-- Name: moodboard_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moodboard_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    moodboard_id uuid NOT NULL,
    user_id uuid NOT NULL,
    product_id integer NOT NULL,
    variation_id integer,
    product_name text NOT NULL,
    product_slug text NOT NULL,
    product_image text,
    product_price text,
    product_category text,
    product_sku text,
    product_colour text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: moodboards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moodboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    share_token text,
    owner_id uuid,
    installer_id uuid,
    site_inspection_id uuid
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    avatar_url text,
    phone text,
    company text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    location text,
    role text,
    email text,
    whatsapp_phone text
);


--
-- Name: project_stage_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_stage_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    from_stage text NOT NULL,
    to_stage text NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    note text
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_code text NOT NULL,
    name text NOT NULL,
    client_name text NOT NULL,
    contact_person text,
    contact_role text,
    contact_email text,
    location text,
    site_address text,
    project_type public.project_type_enum NOT NULL,
    current_stage public.project_stage_enum DEFAULT 'conceptual'::public.project_stage_enum NOT NULL,
    status public.project_status_enum DEFAULT 'active'::public.project_status_enum NOT NULL,
    assigned_to text,
    estimated_value numeric,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stage_entered_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: saved_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id integer NOT NULL,
    variation_id integer,
    product_name text NOT NULL,
    product_slug text NOT NULL,
    product_image text,
    product_price text,
    product_category text,
    product_sku text,
    product_colour text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suppressed_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppressed_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    reason text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT suppressed_emails_reason_check CHECK ((reason = ANY (ARRAY['unsubscribe'::text, 'bounce'::text, 'complaint'::text])))
);


--
-- Name: contact_submissions contact_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_submissions
    ADD CONSTRAINT contact_submissions_pkey PRIMARY KEY (id);


--
-- Name: email_send_log email_send_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_send_log
    ADD CONSTRAINT email_send_log_pkey PRIMARY KEY (id);


--
-- Name: email_send_state email_send_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_send_state
    ADD CONSTRAINT email_send_state_pkey PRIMARY KEY (id);


--
-- Name: email_unsubscribe_tokens email_unsubscribe_tokens_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_email_key UNIQUE (email);


--
-- Name: email_unsubscribe_tokens email_unsubscribe_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_unsubscribe_tokens email_unsubscribe_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_token_key UNIQUE (token);


--
-- Name: estimate_requests estimate_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_requests
    ADD CONSTRAINT estimate_requests_pkey PRIMARY KEY (id);


--
-- Name: installation_completion installation_completion_installation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_completion
    ADD CONSTRAINT installation_completion_installation_id_key UNIQUE (installation_id);


--
-- Name: installation_completion installation_completion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_completion
    ADD CONSTRAINT installation_completion_pkey PRIMARY KEY (id);


--
-- Name: installation_installers installation_installers_installation_id_team_member_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_installers
    ADD CONSTRAINT installation_installers_installation_id_team_member_key UNIQUE (installation_id, team_member);


--
-- Name: installation_installers installation_installers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_installers
    ADD CONSTRAINT installation_installers_pkey PRIMARY KEY (id);


--
-- Name: installation_notifications installation_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_notifications
    ADD CONSTRAINT installation_notifications_pkey PRIMARY KEY (id);


--
-- Name: installation_products installation_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_products
    ADD CONSTRAINT installation_products_pkey PRIMARY KEY (id);


--
-- Name: installation_signoff installation_signoff_installation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_signoff
    ADD CONSTRAINT installation_signoff_installation_id_key UNIQUE (installation_id);


--
-- Name: installation_signoff installation_signoff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_signoff
    ADD CONSTRAINT installation_signoff_pkey PRIMARY KEY (id);


--
-- Name: installation_snags installation_snags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_snags
    ADD CONSTRAINT installation_snags_pkey PRIMARY KEY (id);


--
-- Name: installations installations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installations
    ADD CONSTRAINT installations_pkey PRIMARY KEY (id);


--
-- Name: moodboard_items moodboard_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboard_items
    ADD CONSTRAINT moodboard_items_pkey PRIMARY KEY (id);


--
-- Name: moodboards moodboards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboards
    ADD CONSTRAINT moodboards_pkey PRIMARY KEY (id);


--
-- Name: moodboards moodboards_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboards
    ADD CONSTRAINT moodboards_share_token_key UNIQUE (share_token);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: project_stage_history project_stage_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_stage_history
    ADD CONSTRAINT project_stage_history_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_project_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_code_key UNIQUE (project_code);


--
-- Name: saved_items saved_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_items
    ADD CONSTRAINT saved_items_pkey PRIMARY KEY (id);


--
-- Name: suppressed_emails suppressed_emails_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppressed_emails
    ADD CONSTRAINT suppressed_emails_email_key UNIQUE (email);


--
-- Name: suppressed_emails suppressed_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppressed_emails
    ADD CONSTRAINT suppressed_emails_pkey PRIMARY KEY (id);


--
-- Name: idx_email_send_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_send_log_created ON public.email_send_log USING btree (created_at DESC);


--
-- Name: idx_email_send_log_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_send_log_message ON public.email_send_log USING btree (message_id);


--
-- Name: idx_email_send_log_message_sent_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_email_send_log_message_sent_unique ON public.email_send_log USING btree (message_id) WHERE (status = 'sent'::text);


--
-- Name: idx_email_send_log_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_send_log_recipient ON public.email_send_log USING btree (recipient_email);


--
-- Name: idx_inst_installers_inst_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inst_installers_inst_id ON public.installation_installers USING btree (installation_id);


--
-- Name: idx_inst_snags_inst_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inst_snags_inst_id ON public.installation_snags USING btree (installation_id);


--
-- Name: idx_installations_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installations_project_id ON public.installations USING btree (project_id);


--
-- Name: idx_installations_scheduled_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installations_scheduled_date ON public.installations USING btree (scheduled_date);


--
-- Name: idx_installations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installations_status ON public.installations USING btree (status);


--
-- Name: idx_moodboard_items_moodboard_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moodboard_items_moodboard_id ON public.moodboard_items USING btree (moodboard_id);


--
-- Name: idx_moodboard_items_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moodboard_items_user_id ON public.moodboard_items USING btree (user_id);


--
-- Name: idx_moodboards_share_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moodboards_share_token ON public.moodboards USING btree (share_token) WHERE (share_token IS NOT NULL);


--
-- Name: idx_moodboards_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moodboards_user_id ON public.moodboards USING btree (user_id);


--
-- Name: idx_saved_items_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_saved_items_unique ON public.saved_items USING btree (user_id, product_id, COALESCE(variation_id, 0));


--
-- Name: idx_saved_items_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_items_user_id ON public.saved_items USING btree (user_id);


--
-- Name: idx_suppressed_emails_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppressed_emails_email ON public.suppressed_emails USING btree (email);


--
-- Name: idx_unsubscribe_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens USING btree (token);


--
-- Name: installations installations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER installations_updated_at BEFORE UPDATE ON public.installations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: projects trigger_generate_project_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_project_code BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.generate_project_code();


--
-- Name: projects trigger_project_stage_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_project_stage_change BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_project_stage_change();


--
-- Name: projects trigger_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_projects_updated_at();


--
-- Name: moodboards update_moodboards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_moodboards_updated_at BEFORE UPDATE ON public.moodboards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: estimate_requests estimate_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_requests
    ADD CONSTRAINT estimate_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.moodboards(id) ON DELETE CASCADE;


--
-- Name: estimate_requests estimate_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_requests
    ADD CONSTRAINT estimate_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: installation_completion installation_completion_installation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_completion
    ADD CONSTRAINT installation_completion_installation_id_fkey FOREIGN KEY (installation_id) REFERENCES public.installations(id) ON DELETE CASCADE;


--
-- Name: installation_installers installation_installers_installation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_installers
    ADD CONSTRAINT installation_installers_installation_id_fkey FOREIGN KEY (installation_id) REFERENCES public.installations(id) ON DELETE CASCADE;


--
-- Name: installation_notifications installation_notifications_installation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_notifications
    ADD CONSTRAINT installation_notifications_installation_id_fkey FOREIGN KEY (installation_id) REFERENCES public.installations(id) ON DELETE CASCADE;


--
-- Name: installation_products installation_products_installation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_products
    ADD CONSTRAINT installation_products_installation_id_fkey FOREIGN KEY (installation_id) REFERENCES public.installations(id) ON DELETE CASCADE;


--
-- Name: installation_signoff installation_signoff_installation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_signoff
    ADD CONSTRAINT installation_signoff_installation_id_fkey FOREIGN KEY (installation_id) REFERENCES public.installations(id) ON DELETE CASCADE;


--
-- Name: installation_snags installation_snags_installation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_snags
    ADD CONSTRAINT installation_snags_installation_id_fkey FOREIGN KEY (installation_id) REFERENCES public.installations(id) ON DELETE CASCADE;


--
-- Name: installations installations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installations
    ADD CONSTRAINT installations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: moodboard_items moodboard_items_moodboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboard_items
    ADD CONSTRAINT moodboard_items_moodboard_id_fkey FOREIGN KEY (moodboard_id) REFERENCES public.moodboards(id) ON DELETE CASCADE;


--
-- Name: moodboard_items moodboard_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboard_items
    ADD CONSTRAINT moodboard_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: moodboards moodboards_installer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboards
    ADD CONSTRAINT moodboards_installer_id_fkey FOREIGN KEY (installer_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: moodboards moodboards_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboards
    ADD CONSTRAINT moodboards_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: moodboards moodboards_site_inspection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboards
    ADD CONSTRAINT moodboards_site_inspection_id_fkey FOREIGN KEY (site_inspection_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: moodboards moodboards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moodboards
    ADD CONSTRAINT moodboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_stage_history project_stage_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_stage_history
    ADD CONSTRAINT project_stage_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: project_stage_history project_stage_history_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_stage_history
    ADD CONSTRAINT project_stage_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: saved_items saved_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_items
    ADD CONSTRAINT saved_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles Admins can update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING ((public.get_my_role() = 'admin'::text));


--
-- Name: profiles All authenticated can read profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: contact_submissions Anyone can submit contact forms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit contact forms" ON public.contact_submissions FOR INSERT TO authenticated, anon WITH CHECK (public.check_contact_rate_limit(email));


--
-- Name: moodboard_items Anyone can view items of shared moodboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view items of shared moodboards" ON public.moodboard_items FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.moodboards
  WHERE ((moodboards.id = moodboard_items.moodboard_id) AND (moodboards.share_token IS NOT NULL)))));


--
-- Name: moodboards Anyone can view shared moodboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view shared moodboards" ON public.moodboards FOR SELECT TO authenticated, anon USING ((share_token IS NOT NULL));


--
-- Name: email_send_log Service role can insert send log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert send log" ON public.email_send_log FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: suppressed_emails Service role can insert suppressed emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_unsubscribe_tokens Service role can insert tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_send_state Service role can manage send state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage send state" ON public.email_send_state USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_unsubscribe_tokens Service role can mark tokens as used; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens FOR UPDATE USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_send_log Service role can read send log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read send log" ON public.email_send_log FOR SELECT USING ((auth.role() = 'service_role'::text));


--
-- Name: suppressed_emails Service role can read suppressed emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails FOR SELECT USING ((auth.role() = 'service_role'::text));


--
-- Name: email_unsubscribe_tokens Service role can read tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens FOR SELECT USING ((auth.role() = 'service_role'::text));


--
-- Name: email_send_log Service role can update send log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update send log" ON public.email_send_log FOR UPDATE USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: moodboard_items Users can add moodboard items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add moodboard items" ON public.moodboard_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: moodboards Users can create moodboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create moodboards" ON public.moodboards FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: moodboard_items Users can delete their own moodboard items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own moodboard items" ON public.moodboard_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: moodboards Users can delete their own moodboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own moodboards" ON public.moodboards FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: estimate_requests Users can insert their own estimate requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own estimate requests" ON public.estimate_requests FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND public.check_estimate_rate_limit(auth.uid())));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: saved_items Users can remove saved items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove saved items" ON public.saved_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: saved_items Users can save items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can save items" ON public.saved_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: moodboard_items Users can update their own moodboard items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own moodboard items" ON public.moodboard_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: moodboards Users can update their own moodboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own moodboards" ON public.moodboards FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND (NOT (role IS DISTINCT FROM ( SELECT p.role
   FROM public.profiles p
  WHERE (p.user_id = auth.uid()))))));


--
-- Name: estimate_requests Users can view their own estimate requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own estimate requests" ON public.estimate_requests FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: moodboard_items Users can view their own moodboard items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own moodboard items" ON public.moodboard_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: moodboards Users can view their own moodboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own moodboards" ON public.moodboards FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: saved_items Users can view their own saved items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own saved items" ON public.saved_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: contact_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: email_send_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

--
-- Name: email_send_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

--
-- Name: email_unsubscribe_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: estimate_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estimate_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: installation_completion ic_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ic_delete ON public.installation_completion FOR DELETE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: installation_completion ic_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ic_insert ON public.installation_completion FOR INSERT TO authenticated WITH CHECK ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_completion ic_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ic_select ON public.installation_completion FOR SELECT TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_completion ic_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ic_update ON public.installation_completion FOR UPDATE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_installers ii_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ii_delete ON public.installation_installers FOR DELETE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: installation_installers ii_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ii_insert ON public.installation_installers FOR INSERT TO authenticated WITH CHECK ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: installation_installers ii_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ii_select ON public.installation_installers FOR SELECT TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_installers ii_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ii_update ON public.installation_installers FOR UPDATE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_notifications in_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY in_delete ON public.installation_notifications FOR DELETE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: installation_notifications in_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY in_insert ON public.installation_notifications FOR INSERT TO authenticated WITH CHECK ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_notifications in_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY in_select ON public.installation_notifications FOR SELECT TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_notifications in_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY in_update ON public.installation_notifications FOR UPDATE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installations inst_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inst_delete ON public.installations FOR DELETE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: installations inst_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inst_insert ON public.installations FOR INSERT TO authenticated WITH CHECK ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: installations inst_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inst_select ON public.installations FOR SELECT TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installations inst_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inst_update ON public.installations FOR UPDATE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_completion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installation_completion ENABLE ROW LEVEL SECURITY;

--
-- Name: installation_installers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installation_installers ENABLE ROW LEVEL SECURITY;

--
-- Name: installation_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installation_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: installation_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installation_products ENABLE ROW LEVEL SECURITY;

--
-- Name: installation_signoff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installation_signoff ENABLE ROW LEVEL SECURITY;

--
-- Name: installation_snags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installation_snags ENABLE ROW LEVEL SECURITY;

--
-- Name: installations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;

--
-- Name: installation_products ip_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ip_delete ON public.installation_products FOR DELETE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: installation_products ip_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ip_insert ON public.installation_products FOR INSERT TO authenticated WITH CHECK ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: installation_products ip_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ip_select ON public.installation_products FOR SELECT TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_products ip_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ip_update ON public.installation_products FOR UPDATE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_snags is_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY is_delete ON public.installation_snags FOR DELETE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: installation_snags is_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY is_insert ON public.installation_snags FOR INSERT TO authenticated WITH CHECK ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_snags is_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY is_select ON public.installation_snags FOR SELECT TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_snags is_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY is_update ON public.installation_snags FOR UPDATE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_signoff isg_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isg_delete ON public.installation_signoff FOR DELETE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: installation_signoff isg_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isg_insert ON public.installation_signoff FOR INSERT TO authenticated WITH CHECK ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_signoff isg_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isg_select ON public.installation_signoff FOR SELECT TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: installation_signoff isg_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isg_update ON public.installation_signoff FOR UPDATE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text, 'installer'::text])));


--
-- Name: moodboard_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moodboard_items ENABLE ROW LEVEL SECURITY;

--
-- Name: moodboards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moodboards ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_stage_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_stage_history ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: projects projects_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_delete ON public.projects FOR DELETE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: projects projects_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: projects projects_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_select ON public.projects FOR SELECT TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: projects projects_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['admin'::text, 'sales'::text])));


--
-- Name: contact_submissions sales_read_contact_submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_read_contact_submissions ON public.contact_submissions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['sales'::text, 'admin'::text]))))));


--
-- Name: estimate_requests sales_read_estimate_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_read_estimate_requests ON public.estimate_requests FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['sales'::text, 'admin'::text]))))));


--
-- Name: contact_submissions sales_update_contact_submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_update_contact_submissions ON public.contact_submissions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['sales'::text, 'admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['sales'::text, 'admin'::text]))))));


--
-- Name: estimate_requests sales_update_estimate_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sales_update_estimate_requests ON public.estimate_requests FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['sales'::text, 'admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['sales'::text, 'admin'::text]))))));


--
-- Name: saved_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

--
-- Name: project_stage_history stage_history_insert_admin_sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stage_history_insert_admin_sales ON public.project_stage_history FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'sales'::text]))))));


--
-- Name: project_stage_history stage_history_select_admin_sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stage_history_select_admin_sales ON public.project_stage_history FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'sales'::text]))))));


--
-- Name: suppressed_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict m9yDQppiEgWS6loKRxqh0ceBB3xYdkvCFDgTZqviz1XQTcfasqdz7Q1OM3Y6lGj

