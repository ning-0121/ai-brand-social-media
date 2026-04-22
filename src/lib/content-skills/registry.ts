import type { ContentSkill } from "./types";

// Website skills
import { productDetailPageSkill } from "./website/product-detail-page";
import { productSeoOptimizeSkill } from "./website/product-seo-optimize";
import { homepageDesignSkill } from "./website/homepage-design";
import { internalSiteOptimizeSkill } from "./website/internal-site-optimize";
import { promotionStrategySkill } from "./website/promotion-strategy";

// Social skills
import { socialPostPackSkill } from "./social/social-post-pack";
import { shortVideoScriptSkill } from "./social/short-video-script";
import { contentCalendarSkill } from "./social/content-calendar";
import { hashtagStrategySkill } from "./social/hashtag-strategy";
import { influencerBriefSkill } from "./social/influencer-brief";
import { ugcResponseSkill } from "./social/ugc-response";
import { liveStreamScriptSkill } from "./social/live-stream-script";
import { instagramAnalyticsSkill } from "./social/instagram-analytics";
import { contentMatrixSkill, liveStreamPlanSkill, productSelectionSkill } from "./social/matrix-operations";

// Advanced SEO & Analytics
import { technicalSeoAuditSkill } from "./website/technical-seo-audit";
import { seoRankingTrackerSkill } from "./website/seo-ranking-tracker";
import { googleAdsManagerSkill } from "./copy/google-ads-manager";
import { storeGrowthPlannerSkill } from "./copy/store-growth-planner";
import { competitorPricingSkill, profitAnalysisSkill, marketingCalendarSkill, restockPlannerSkill, influencerStrategySkill } from "./copy/market-research";

// Image skills
import { aiProductPhotoSkill } from "./image/ai-product-photo";
import { bannerDesignSkill } from "./image/banner-design";
import { socialMediaImageSkill } from "./image/social-media-image";
import { campaignPosterSkill } from "./image/campaign-poster";
import { bgRemoveSkill } from "./image/bg-remove";
import { imageEnhanceSkill } from "./image/image-enhance";
import { productVideoSkill } from "./image/product-video";

// Page skills
import { shopifyDetailPageSkill } from "./page/shopify-detail-page";
import { campaignPageSkill } from "./page/campaign-page";
import { homepageHeroSkill } from "./page/homepage-hero";
import { landingPageSkill } from "./page/landing-page";

// Copy skills
import { adCopySkill } from "./copy/ad-copy";
import { adCampaignBlueprintSkill } from "./copy/ad-campaign-blueprint";
import { emailCopySkill } from "./copy/email-copy";
import { customerReviewSkill } from "./copy/customer-review";
import { productDescriptionSkill } from "./copy/product-description";
import { pricingAnalysisSkill } from "./copy/pricing-analysis";
import { productResearchSkill } from "./copy/product-research";
import { adBudgetPlannerSkill } from "./copy/ad-budget-planner";
import { adAudienceStrategySkill } from "./copy/ad-audience-strategy";
import { campaignPlannerSkill } from "./copy/campaign-planner";
import { campaignReviewSkill } from "./copy/campaign-review";
import { inventoryForecastSkill } from "./copy/inventory-forecast";
import { d2cCustomerReplySkill } from "./copy/d2c-customer-reply";
import { competitorDeepAnalysisSkill } from "./copy/competitor-deep-analysis";
import { adPerformanceOptimizerSkill } from "./copy/ad-performance-optimizer";
import { adCreativeGeneratorSkill } from "./copy/ad-creative-generator";
import { adRoiGuardianSkill } from "./copy/ad-roi-guardian";
import { googleShoppingTitleSkill } from "./copy/google-shopping-title";
import { abandonedCartSequenceSkill } from "./copy/abandoned-cart-sequence";
import { adCreativeBriefSkill } from "./copy/ad-creative-brief";
import { productValidatorSkill } from "./copy/product-validator";
import { storeHealthAuditSkill } from "./copy/store-health-audit";
import { flashSalePlannerSkill } from "./copy/flash-sale-planner";
import { pricingStrategySkill } from "./copy/pricing-strategy";
import { programmaticSeoSkill } from "./copy/programmatic-seo";
import { topicalAuthoritySkill } from "./copy/topical-authority";
import { schemaMarkupAuditorSkill } from "./copy/schema-markup-auditor";
import { haroPitchWriterSkill } from "./copy/haro-pitch-writer";
import { reviewSequencerSkill } from "./copy/review-sequencer";
import { trustSignalAuditorSkill } from "./copy/trust-signal-auditor";
import { qualityFeedbackAnalyzerSkill } from "./copy/quality-feedback-analyzer";
import { customerServiceResponderSkill } from "./copy/customer-service-responder";
// Module 5: Campaign Planning + Partnerships
import { annualCampaignCalendarSkill } from "./copy/annual-campaign-calendar";
import { kolSourcingEngineSkill } from "./copy/kol-sourcing-engine";
import { affiliateTierDesignerSkill } from "./copy/affiliate-tier-designer";
import { brandCollabMatcherSkill } from "./copy/brand-collab-matcher";
import { marketplaceExpansionScorerSkill } from "./copy/marketplace-expansion-scorer";
import { incrementalityTesterSkill } from "./copy/incrementality-tester";

// OEM B2B skills
import { oemInquiryReplySkill } from "./oem/oem-inquiry-reply";
import { oemQuotationGenSkill } from "./oem/oem-quotation-gen";
import { oemCapabilityPitchSkill } from "./oem/oem-capability-pitch";
import { oemSampleStrategySkill } from "./oem/oem-sample-strategy";
import { oemFollowupMessageSkill } from "./oem/oem-followup-message";
import { oemBuyerResearchSkill } from "./oem/oem-buyer-research";

const allSkills: ContentSkill[] = [
  // Image (7)
  aiProductPhotoSkill,
  bannerDesignSkill,
  socialMediaImageSkill,
  campaignPosterSkill,
  bgRemoveSkill,
  imageEnhanceSkill,
  // Page (4)
  shopifyDetailPageSkill,
  campaignPageSkill,
  homepageHeroSkill,
  landingPageSkill,
  // Copy (4 new + existing website/social reclassified below)
  adCopySkill,
  adCampaignBlueprintSkill,
  emailCopySkill,
  customerReviewSkill,
  productDescriptionSkill,
  pricingAnalysisSkill,
  productResearchSkill,
  adBudgetPlannerSkill,
  adAudienceStrategySkill,
  campaignPlannerSkill,
  campaignReviewSkill,
  inventoryForecastSkill,
  d2cCustomerReplySkill,
  competitorDeepAnalysisSkill,
  adPerformanceOptimizerSkill,
  adCreativeGeneratorSkill,
  adRoiGuardianSkill,
  googleShoppingTitleSkill,
  abandonedCartSequenceSkill,
  adCreativeBriefSkill,
  productValidatorSkill,
  storeHealthAuditSkill,
  flashSalePlannerSkill,
  pricingStrategySkill,
  programmaticSeoSkill,
  topicalAuthoritySkill,
  schemaMarkupAuditorSkill,
  haroPitchWriterSkill,
  reviewSequencerSkill,
  trustSignalAuditorSkill,
  qualityFeedbackAnalyzerSkill,
  customerServiceResponderSkill,
  // Module 5: Campaign Planning + Partnerships (6)
  annualCampaignCalendarSkill,
  kolSourcingEngineSkill,
  affiliateTierDesignerSkill,
  brandCollabMatcherSkill,
  marketplaceExpansionScorerSkill,
  incrementalityTesterSkill,
  // Website (legacy, serves as additional copy/page skills)
  productDetailPageSkill,
  productSeoOptimizeSkill,
  homepageDesignSkill,
  internalSiteOptimizeSkill,
  promotionStrategySkill,
  // Social
  socialPostPackSkill,
  shortVideoScriptSkill,
  contentCalendarSkill,
  hashtagStrategySkill,
  influencerBriefSkill,
  ugcResponseSkill,
  instagramAnalyticsSkill,
  contentMatrixSkill,
  liveStreamPlanSkill,
  productSelectionSkill,
  // Video
  liveStreamScriptSkill,
  productVideoSkill,
  // Advanced SEO & Analytics
  technicalSeoAuditSkill,
  seoRankingTrackerSkill,
  googleAdsManagerSkill,
  storeGrowthPlannerSkill,
  competitorPricingSkill,
  profitAnalysisSkill,
  marketingCalendarSkill,
  restockPlannerSkill,
  influencerStrategySkill,
  // OEM
  oemInquiryReplySkill,
  oemQuotationGenSkill,
  oemCapabilityPitchSkill,
  oemSampleStrategySkill,
  oemFollowupMessageSkill,
  oemBuyerResearchSkill,
];

const skillMap = new Map(allSkills.map((s) => [s.id, s]));

export function getAllSkills(): ContentSkill[] {
  return allSkills;
}

export function getSkillsByCategory(category: string): ContentSkill[] {
  return allSkills.filter((s) => s.category === category);
}

export function getSkill(id: string): ContentSkill | undefined {
  return skillMap.get(id);
}

export function getSkillMetadata(skill: ContentSkill) {
  return {
    id: skill.id,
    name: skill.name,
    category: skill.category,
    description: skill.description,
    icon: skill.icon,
    color: skill.color,
    inputs: skill.inputs,
    estimated_cost: skill.estimated_cost,
    estimated_time_seconds: skill.estimated_time_seconds,
    requires_image: skill.requires_image || false,
  };
}
