import type { ContentSkill } from "./types";

// Website skills
import { productDetailPageSkill } from "./website/product-detail-page";
import { productSeoOptimizeSkill } from "./website/product-seo-optimize";
import { homepageDesignSkill } from "./website/homepage-design";
import { campaignLandingSkill } from "./website/campaign-landing";
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

// Advanced SEO & Analytics
import { technicalSeoAuditSkill } from "./website/technical-seo-audit";
import { seoRankingTrackerSkill } from "./website/seo-ranking-tracker";
import { googleAdsManagerSkill } from "./copy/google-ads-manager";

// Image skills
import { aiProductPhotoSkill } from "./image/ai-product-photo";
import { bannerDesignSkill } from "./image/banner-design";
import { socialMediaImageSkill } from "./image/social-media-image";
import { campaignPosterSkill } from "./image/campaign-poster";

// Page skills
import { shopifyDetailPageSkill } from "./page/shopify-detail-page";
import { campaignPageSkill } from "./page/campaign-page";
import { homepageHeroSkill } from "./page/homepage-hero";
import { landingPageSkill } from "./page/landing-page";

// Copy skills
import { adCopySkill } from "./copy/ad-copy";
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

// OEM B2B skills
import { oemInquiryReplySkill } from "./oem/oem-inquiry-reply";
import { oemQuotationGenSkill } from "./oem/oem-quotation-gen";
import { oemCapabilityPitchSkill } from "./oem/oem-capability-pitch";
import { oemSampleStrategySkill } from "./oem/oem-sample-strategy";
import { oemFollowupMessageSkill } from "./oem/oem-followup-message";
import { oemBuyerResearchSkill } from "./oem/oem-buyer-research";

const allSkills: ContentSkill[] = [
  // Image (4)
  aiProductPhotoSkill,
  bannerDesignSkill,
  socialMediaImageSkill,
  campaignPosterSkill,
  // Page (4)
  shopifyDetailPageSkill,
  campaignPageSkill,
  homepageHeroSkill,
  landingPageSkill,
  // Copy (4 new + existing website/social reclassified below)
  adCopySkill,
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
  // Website (legacy, serves as additional copy/page skills)
  productDetailPageSkill,
  productSeoOptimizeSkill,
  homepageDesignSkill,
  campaignLandingSkill,
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
  // Video
  liveStreamScriptSkill,
  // Advanced SEO & Analytics
  technicalSeoAuditSkill,
  seoRankingTrackerSkill,
  googleAdsManagerSkill,
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
