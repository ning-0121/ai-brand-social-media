-- 扩展 diagnostic_findings.category CHECK 约束，加入 'traffic'
ALTER TABLE diagnostic_findings
  DROP CONSTRAINT IF EXISTS diagnostic_findings_category_check;

ALTER TABLE diagnostic_findings
  ADD CONSTRAINT diagnostic_findings_category_check
  CHECK (category IN ('seo', 'product', 'inventory', 'sales', 'content', 'traffic'));
