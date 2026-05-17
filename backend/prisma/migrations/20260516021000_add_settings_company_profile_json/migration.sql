-- Persist rich company profile data used by ERP settings UI.
ALTER TABLE "SettingsCompany"
ADD COLUMN "profile_json" JSONB;
