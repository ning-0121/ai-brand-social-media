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

// Image skills
import { aiProductPhotoSkill } from "./image/ai-product-photo";
import { bannerDesignSkill } from "./image/banner-design";

// Page skills
import { shopifyDetailPageSkill } from "./page/shopify-detail-page";
import { campaignPageSkill } from "./page/campaign-page";

// OEM B2B skills
import { oemInquiryReplySkill } from "./oem/oem-inquiry-reply";
import { oemQuotationGenSkill } from "./oem/oem-quotation-gen";
import { oemCapabilityPitchSkill } from "./oem/oem-capability-pitch";
import { oemSampleStrategySkill } from "./oem/oem-sample-strategy";
import { oemFollowupMessageSkill } from "./oem/oem-followup-message";
import { oemBuyerResearchSkill } from "./oem/oem-buyer-research";

const allSkills: ContentSkill[] = [
  // Image
  aiProductPhotoSkill,
  bannerDesignSkill,
  // Page
  shopifyDetailPageSkill,
  campaignPageSkill,
  // Website (legacy, kept as "copy" category conceptually)
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
