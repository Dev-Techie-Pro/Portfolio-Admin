-- Add DeepSeek as an AI integration provider (replaces OpenAI in the dashboard UI).
alter type public.integration_provider add value if not exists 'deepseek';
