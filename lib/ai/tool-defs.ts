/**
 * Tool contracts shared by the server (Claude + mock agent) and the browser
 * (which executes tools against the local store). No DB access here.
 */
import { z } from "zod";
import type { CategoryId } from "@/lib/data/types";

export const CATEGORY_IDS = [
  "cars",
  "halls",
  "furniture",
  "hosts",
  "photo",
  "decor",
  "music",
  "cakes",
  "beauty",
  "attire",
  "traditional",
  "shows",
] as const satisfies readonly CategoryId[];

export const CITY_IDS = ["bishkek", "cholpon-ata", "osh"] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export const toolInputSchemas = {
  search_vendors: z.object({
    category: z.enum(CATEGORY_IDS).optional(),
    city: z.enum(CITY_IDS).optional(),
    date: isoDate.optional(),
    guests: z.number().int().positive().max(5000).optional(),
    qty: z.number().int().positive().max(1000).optional(),
    budget_max: z.number().int().positive().optional(),
    query: z.string().max(80).optional(),
  }),
  check_availability: z.object({
    vendor_id: z.string().max(80),
    date: isoDate,
  }),
  get_vendor: z.object({
    vendor_id: z.string().max(80),
  }),
  suggest_alternatives: z.object({
    category: z.enum(CATEGORY_IDS),
    date: isoDate,
    qty: z.number().int().positive().max(1000).optional(),
    city: z.enum(CITY_IDS).optional(),
  }),
} as const;

export type ToolName = keyof typeof toolInputSchemas;
export type ToolInput<N extends ToolName> = z.infer<(typeof toolInputSchemas)[N]>;
export const TOOL_NAMES = Object.keys(toolInputSchemas) as ToolName[];

/** JSON-schema definitions sent to Claude */
export const TOOL_DEFINITIONS = [
  {
    name: "search_vendors",
    description:
      "Search the EVENTUS catalog of event vendors in Kyrgyzstan. Returns real vendors with prices in KGS (som) and, when a date is given, how many units are free on that date. Always call this before recommending any vendor; never invent vendors, prices or availability. The results are shown to the user as cards with Book buttons.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string", enum: [...CATEGORY_IDS], description: "Vendor category" },
        city: { type: "string", enum: [...CITY_IDS], description: "City id; omit if the user did not specify" },
        date: { type: "string", description: "Event date, YYYY-MM-DD" },
        guests: { type: "integer", description: "Number of guests (filters halls by capacity)" },
        qty: { type: "integer", description: "Units needed of one offer, e.g. 5 cars" },
        budget_max: { type: "integer", description: "Max total price in som for qty units" },
        query: { type: "string", description: "Optional vendor name or car model as written in the catalog, e.g. \"G-Class\", \"S-Class\", \"лимузин\". Omit for a general search." },
      },
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  {
    name: "check_availability",
    description: "Check free units per offer of one vendor on a date.",
    input_schema: {
      type: "object" as const,
      properties: {
        vendor_id: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["vendor_id", "date"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  {
    name: "get_vendor",
    description: "Get a vendor's profile, offers, prices and prepayment terms.",
    input_schema: {
      type: "object" as const,
      properties: { vendor_id: { type: "string" } },
      required: ["vendor_id"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  {
    name: "suggest_alternatives",
    description:
      "When nothing suitable is free on a date, find the nearest dates (±10 days) with availability in the same category.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string", enum: [...CATEGORY_IDS] },
        date: { type: "string", description: "YYYY-MM-DD" },
        qty: { type: "integer" },
        city: { type: "string", enum: [...CITY_IDS] },
      },
      required: ["category", "date"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
];

// ── Result shapes (what the browser returns as tool_result JSON) ──

export interface VendorHit {
  vendor_id: string;
  slug: string;
  name: string;
  category: CategoryId;
  city: string;
  rating: number;
  reviews: number;
  verified: boolean;
  cover: string;
  tagline: string;
  price_from: number;
  unit: string;
  prepay_percent: number;
  /** best offer for the date/qty, if date given */
  offer?: { offer_id: string; title: string; price: number; unit: string; free: number; total: number };
}

export interface SearchResult {
  date: string | null;
  qty: number | null;
  count: number;
  vendors: VendorHit[];
  /** when date given and nothing matched */
  alternatives?: AlternativeDate[];
}

export interface AlternativeDate {
  date: string;
  vendors: number;
}

export interface AvailabilityResult {
  vendor_id: string;
  name: string;
  date: string;
  offers: { offer_id: string; title: string; price: number; unit: string; free: number; total: number }[];
}

export interface VendorDetails extends VendorHit {
  description: string;
  offers: { offer_id: string; title: string; price: number; unit: string; total: number; capacity?: number }[];
}

export interface ToolError {
  error: string;
}
