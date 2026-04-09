import type { TemplateConfig, TemplateData } from "../image-template-renderer";

// ======= Template 1: Product Hero (1:1) =======
const productHero: TemplateConfig = {
  id: "product_hero",
  name: "商品主图",
  width: 1000,
  height: 1000,
  category: "product",
  render: (d: TemplateData) => (
    <div style={{
      width: "100%", height: "100%",
      background: d.backgroundColor || "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 60, textAlign: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif",
    }}>
      {d.productImageUrl && (
        <img src={d.productImageUrl} alt="" style={{ maxWidth: 500, maxHeight: 500, objectFit: "contain", marginBottom: 30 }} />
      )}
      <h1 style={{ fontSize: 48, fontWeight: 700, color: d.textColor || "#1a1a1a", margin: 0, lineHeight: 1.2 }}>
        {d.headline}
      </h1>
      {d.subheadline && (
        <p style={{ fontSize: 24, color: "#666", marginTop: 12 }}>{d.subheadline}</p>
      )}
      {d.badge && (
        <span style={{
          position: "absolute", top: 40, right: 40,
          background: d.accentColor || "#e53e3e", color: "#fff",
          padding: "8px 20px", borderRadius: 20, fontSize: 20, fontWeight: 600,
        }}>
          {d.badge}
        </span>
      )}
    </div>
  ),
};

// ======= Template 2: Ad Banner (16:9) =======
const adBanner: TemplateConfig = {
  id: "ad_banner",
  name: "广告横幅",
  width: 1200,
  height: 628,
  category: "ad",
  render: (d: TemplateData) => (
    <div style={{
      width: "100%", height: "100%",
      background: d.backgroundColor || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex", alignItems: "center", padding: 60,
      fontFamily: "'Helvetica Neue', Arial, sans-serif", color: d.textColor || "#fff",
    }}>
      <div style={{ flex: 1 }}>
        {d.badge && (
          <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 16px", borderRadius: 16, fontSize: 16 }}>
            {d.badge}
          </span>
        )}
        <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, margin: "16px 0 0" }}>
          {d.headline}
        </h1>
        {d.subheadline && (
          <p style={{ fontSize: 22, opacity: 0.9, marginTop: 12 }}>{d.subheadline}</p>
        )}
        {d.cta && (
          <div style={{
            display: "inline-block", marginTop: 24,
            background: d.accentColor || "#fff", color: d.backgroundColor || "#667eea",
            padding: "12px 32px", borderRadius: 8, fontSize: 18, fontWeight: 700,
          }}>
            {d.cta}
          </div>
        )}
      </div>
      {d.productImageUrl && (
        <img src={d.productImageUrl} alt="" style={{ maxWidth: 300, maxHeight: 400, objectFit: "contain" }} />
      )}
    </div>
  ),
};

// ======= Template 3: Instagram Post (1:1) =======
const igPost: TemplateConfig = {
  id: "ig_post",
  name: "Instagram 帖子",
  width: 1080,
  height: 1080,
  category: "social",
  render: (d: TemplateData) => (
    <div style={{
      width: "100%", height: "100%",
      background: d.backgroundColor || "#fef3e2",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: 60, fontFamily: "'Helvetica Neue', Arial, sans-serif",
    }}>
      <div>
        {d.brandName && (
          <p style={{ fontSize: 18, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: d.accentColor || "#c05621" }}>
            {d.brandName}
          </p>
        )}
        <h1 style={{ fontSize: 56, fontWeight: 800, color: d.textColor || "#1a1a1a", lineHeight: 1.15, marginTop: 16 }}>
          {d.headline}
        </h1>
      </div>
      {d.productImageUrl && (
        <div style={{ textAlign: "center", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={d.productImageUrl} alt="" style={{ maxWidth: 500, maxHeight: 500, objectFit: "contain" }} />
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        {d.subheadline && <p style={{ fontSize: 22, color: "#666" }}>{d.subheadline}</p>}
        {d.cta && (
          <span style={{
            background: d.accentColor || "#c05621", color: "#fff",
            padding: "10px 24px", borderRadius: 24, fontSize: 18, fontWeight: 600,
          }}>
            {d.cta}
          </span>
        )}
      </div>
    </div>
  ),
};

// ======= Template 4: Story/Reel (9:16) =======
const storyVertical: TemplateConfig = {
  id: "story_vertical",
  name: "Story / Reels",
  width: 1080,
  height: 1920,
  category: "social",
  render: (d: TemplateData) => (
    <div style={{
      width: "100%", height: "100%",
      background: d.backgroundColor || "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "80px 50px", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: d.textColor || "#fff",
    }}>
      <div>
        {d.brandName && (
          <p style={{ fontSize: 20, letterSpacing: 3, textTransform: "uppercase", opacity: 0.7 }}>{d.brandName}</p>
        )}
      </div>
      {d.productImageUrl && (
        <div style={{ textAlign: "center", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={d.productImageUrl} alt="" style={{ maxWidth: 700, maxHeight: 800, objectFit: "contain" }} />
        </div>
      )}
      <div>
        <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, margin: 0 }}>{d.headline}</h1>
        {d.subheadline && <p style={{ fontSize: 28, opacity: 0.8, marginTop: 16 }}>{d.subheadline}</p>}
        {d.discount && (
          <div style={{
            display: "inline-block", marginTop: 20,
            background: d.accentColor || "#e53e3e", padding: "12px 30px",
            borderRadius: 8, fontSize: 32, fontWeight: 800,
          }}>
            {d.discount}
          </div>
        )}
        {d.cta && (
          <p style={{ fontSize: 20, marginTop: 24, opacity: 0.6 }}>{d.cta}</p>
        )}
      </div>
    </div>
  ),
};

// ======= Template 5: 小红书封面 (3:4) =======
const xhsCover: TemplateConfig = {
  id: "xhs_cover",
  name: "小红书封面",
  width: 1080,
  height: 1440,
  category: "social",
  render: (d: TemplateData) => (
    <div style={{
      width: "100%", height: "100%",
      background: d.backgroundColor || "#fff5f5",
      display: "flex", flexDirection: "column",
      padding: "50px 40px", fontFamily: "'PingFang SC', 'Noto Sans SC', sans-serif",
    }}>
      {d.productImageUrl && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={d.productImageUrl} alt="" style={{ maxWidth: 800, maxHeight: 700, objectFit: "contain", borderRadius: 16 }} />
        </div>
      )}
      <div style={{ paddingTop: 30 }}>
        {d.badge && (
          <span style={{
            display: "inline-block", background: d.accentColor || "#ff4757", color: "#fff",
            padding: "6px 16px", borderRadius: 20, fontSize: 20, fontWeight: 600, marginBottom: 12,
          }}>
            {d.badge}
          </span>
        )}
        <h1 style={{ fontSize: 48, fontWeight: 800, color: d.textColor || "#1a1a1a", lineHeight: 1.3 }}>
          {d.headline}
        </h1>
        {d.subheadline && (
          <p style={{ fontSize: 24, color: "#666", marginTop: 8 }}>{d.subheadline}</p>
        )}
      </div>
    </div>
  ),
};

// ======= Template 6: Wide Banner (3:1) =======
const wideBanner: TemplateConfig = {
  id: "wide_banner",
  name: "活动横幅",
  width: 1500,
  height: 500,
  category: "campaign",
  render: (d: TemplateData) => (
    <div style={{
      width: "100%", height: "100%",
      background: d.backgroundColor || "linear-gradient(90deg, #ff6b6b 0%, #ee5a24 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 60,
      padding: "0 80px", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: d.textColor || "#fff",
    }}>
      {d.productImageUrl && (
        <img src={d.productImageUrl} alt="" style={{ maxWidth: 280, maxHeight: 380, objectFit: "contain" }} />
      )}
      <div style={{ textAlign: "center" }}>
        {d.badge && (
          <span style={{ background: "rgba(0,0,0,0.2)", padding: "6px 20px", borderRadius: 20, fontSize: 18 }}>
            {d.badge}
          </span>
        )}
        <h1 style={{ fontSize: 56, fontWeight: 800, margin: "12px 0 0", lineHeight: 1.1 }}>{d.headline}</h1>
        {d.subheadline && <p style={{ fontSize: 24, opacity: 0.9, marginTop: 8 }}>{d.subheadline}</p>}
        {d.discount && (
          <div style={{ fontSize: 72, fontWeight: 900, marginTop: 12 }}>{d.discount}</div>
        )}
        {d.cta && (
          <div style={{
            display: "inline-block", marginTop: 16,
            background: "#fff", color: "#e53e3e",
            padding: "10px 32px", borderRadius: 8, fontSize: 20, fontWeight: 700,
          }}>
            {d.cta}
          </div>
        )}
      </div>
    </div>
  ),
};

// ======= Template 7: Promo Poster (2:3) =======
const promoPoster: TemplateConfig = {
  id: "promo_poster",
  name: "促销海报",
  width: 800,
  height: 1200,
  category: "campaign",
  render: (d: TemplateData) => (
    <div style={{
      width: "100%", height: "100%",
      background: d.backgroundColor || "#1a1a1a",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
      padding: "60px 40px", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: d.textColor || "#fff",
      textAlign: "center",
    }}>
      <div>
        {d.brandName && (
          <p style={{ fontSize: 16, letterSpacing: 4, textTransform: "uppercase", opacity: 0.5 }}>{d.brandName}</p>
        )}
        {d.badge && (
          <span style={{
            display: "inline-block", background: d.accentColor || "#e53e3e", padding: "8px 24px",
            borderRadius: 24, fontSize: 18, fontWeight: 600, marginTop: 16,
          }}>
            {d.badge}
          </span>
        )}
      </div>
      {d.productImageUrl && (
        <img src={d.productImageUrl} alt="" style={{ maxWidth: 500, maxHeight: 500, objectFit: "contain" }} />
      )}
      <div>
        <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, margin: 0 }}>{d.headline}</h1>
        {d.discount && <div style={{ fontSize: 64, fontWeight: 900, marginTop: 8, color: d.accentColor || "#e53e3e" }}>{d.discount}</div>}
        {d.subheadline && <p style={{ fontSize: 20, opacity: 0.7, marginTop: 8 }}>{d.subheadline}</p>}
        {d.cta && (
          <div style={{
            display: "inline-block", marginTop: 20,
            border: "2px solid #fff", padding: "10px 32px",
            borderRadius: 8, fontSize: 18, fontWeight: 600,
          }}>
            {d.cta}
          </div>
        )}
      </div>
    </div>
  ),
};

// ======= Export All =======
export const IMAGE_TEMPLATES: TemplateConfig[] = [
  productHero,
  adBanner,
  igPost,
  storyVertical,
  xhsCover,
  wideBanner,
  promoPoster,
];

export function getTemplate(id: string): TemplateConfig | undefined {
  return IMAGE_TEMPLATES.find((t) => t.id === id);
}
