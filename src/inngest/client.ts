import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "brandmind-ai",
  name: "BrandMind AI",
});

// Typed event registry — add new events here for autocomplete everywhere
export type AppEvents = {
  "content/product.full.requested": {
    data: {
      product_id: string;
      integration_id: string;
      ops_task_id?: string;
      skip_deploy?: boolean;
    };
  };
  "content/homepage.hero.requested": {
    data: {
      brand_name: string;
      season: string;
      ops_task_id?: string;
    };
  };
};
