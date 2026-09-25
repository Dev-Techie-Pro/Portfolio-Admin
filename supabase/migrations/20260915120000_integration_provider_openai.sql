-- Add OpenAI to the integration_provider enum (required for Settings → Integrations).
alter type public.integration_provider add value if not exists 'openai';
