import type { ProviderHandler } from "../types";
import { registerRollback } from "../../execution-state-machine";

// Lazy-import existing Shopify operations to avoid circular deps
async function getOps() {
  return import("../../shopify-operations");
}

export const shopifyProvider: ProviderHandler = {
  supportedOperations: [
    "product.update_seo",
    "product.update_info",
    "product.update_price",
    "product.update_inventory",
    "product.sync",
    "orders.sync",
    "customers.sync",
    "sync_all",
  ],

  validate(operation: string, params: Record<string, unknown>): string | null {
    if (!this.supportedOperations.includes(operation)) {
      return `Unsupported Shopify operation: ${operation}`;
    }

    switch (operation) {
      case "product.update_seo":
        if (!params.integration_id) return "Missing integration_id";
        if (!params.shopify_product_id) return "Missing shopify_product_id";
        if (!params.product_id) return "Missing product_id";
        break;
      case "product.update_info":
      case "product.update_price":
      case "product.update_inventory":
        if (!params.integration_id) return "Missing integration_id";
        if (!params.shopify_product_id) return "Missing shopify_product_id";
        break;
      case "product.sync":
      case "orders.sync":
      case "customers.sync":
      case "sync_all":
        if (!params.integration_id) return "Missing integration_id";
        break;
    }
    return null;
  },

  async execute(operation: string, params: Record<string, unknown>) {
    const ops = await getOps();

    try {
      switch (operation) {
        case "product.update_seo": {
          const result = await ops.updateProductSEO(
            params.integration_id as string,
            params.shopify_product_id as number,
            params.product_id as string,
            params.new_values as Record<string, unknown>
          );
          return { data: result as Record<string, unknown> };
        }
        case "product.update_info": {
          const result = await ops.updateProductInfo(
            params.integration_id as string,
            params.shopify_product_id as number,
            params.product_id as string,
            params.new_values as Record<string, unknown>
          );
          return { data: result as Record<string, unknown> };
        }
        case "product.update_price": {
          const result = await ops.updateProductPrice(
            params.integration_id as string,
            params.shopify_variant_id as number,
            params.product_id as string,
            params.new_price as number
          );
          return { data: result as Record<string, unknown> };
        }
        case "product.update_inventory": {
          const result = await ops.updateProductInventory(
            params.integration_id as string,
            params.shopify_variant_id as number,
            params.product_id as string,
            params.new_quantity as number
          );
          return { data: result as Record<string, unknown> };
        }
        case "product.sync": {
          const result = await ops.syncProducts(params.integration_id as string);
          return { data: result as Record<string, unknown> };
        }
        case "orders.sync": {
          const result = await ops.syncOrders(
            params.integration_id as string,
            params.user_id as string
          );
          return { data: result as Record<string, unknown> };
        }
        case "customers.sync": {
          const result = await ops.syncCustomers(
            params.integration_id as string,
            params.user_id as string
          );
          return { data: result as Record<string, unknown> };
        }
        case "sync_all": {
          const result = await ops.syncAll(
            params.integration_id as string,
            params.user_id as string
          );
          return { data: result as Record<string, unknown> };
        }
        default:
          return { error: `Unknown operation: ${operation}` };
      }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : String(err),
        httpStatus: 500,
      };
    }
  },
};

// Register rollback for SEO updates (restore beforeState values)
registerRollback("shopify.product.update_seo", async (beforeState, params) => {
  const ops = await getOps();
  await ops.updateProductSEO(
    params.integration_id as string,
    params.shopify_product_id as number,
    params.product_id as string,
    beforeState
  );
});

registerRollback("shopify.product.update_price", async (beforeState, params) => {
  const ops = await getOps();
  await ops.updateProductPrice(
    params.integration_id as string,
    params.shopify_variant_id as number,
    params.product_id as string,
    beforeState.price as number
  );
});
