-- Customer Service Enhancement
-- Run in Supabase SQL Editor

-- Extend whatsapp_conversations to be a unified conversation table
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp';
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'oem';
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS subject TEXT;
