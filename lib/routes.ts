/**
 * Every in-app URL in one place. Links, redirects and notifications use these instead of
 * string literals, so renaming or restructuring a route is a one-line change.
 */
export type VendorTab = "posts" | "details" | "services" | "reviews";
export type InvitationTab = "design" | "share" | "stats";

const q = (params: Record<string, string | number | undefined | null>) => {
  const s = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (v === undefined || v === null || v === "" ? [] : [[k, String(v)]])));
  const str = s.toString();
  return str ? `?${str}` : "";
};

export const routes = {
  home: "/",
  welcome: "/welcome",
  /** The client landing for everyone, signed in or not («/» sends signed-in users to their home) */
  landing: "/landing",
  /** Hidden admin entrance with a password */
  adminLogin: "/admin/admin",
  welcomeVendor: "/welcome?as=vendor",
  /** Marketing story for vendors (the second landing tab) */
  forVendors: "/for-vendors",
  privacy: "/privacy",
  terms: "/terms",
  /** Where Google sign-in (Supabase OAuth) returns */
  authCallback: "/auth/callback",
  onboarding: "/onboarding",
  onboardingVendor: "/onboarding/vendor",
  assistant: "/assistant",
  /** The assistant with a prefilled request */
  ask: (query: string) => `/assistant${q({ q: query })}`,

  // marketplace
  feed: "/vendors",
  /** The feed filtered and/or with a post open */
  feedWith: (params: { category?: string; post?: string }) => `/vendors${q({ post: params.post, category: params.category })}`,
  post: (postId: string) => `/vendors${q({ post: postId })}`,
  vendor: (slug: string, tab?: VendorTab) => `/vendors/${slug}${tab && tab !== "posts" ? q({ tab }) : ""}`,
  vendorOffers: (slug: string) => `/vendors/${slug}#offers`,
  book: (offerId: string, params: { date?: string | null; qty?: number } = {}) => `/book/${offerId}${q(params)}`,
  checkout: (bookingId: string) => `/checkout/${bookingId}`,

  // chats
  inbox: "/messages",
  /** `draft` pre-fills the message box (e.g. «Узнать цену» → «Сколько стоит …?») */
  chat: (conversationId: string, opts?: { draft?: string }) => `/messages/${conversationId}${q({ draft: opts?.draft })}`,

  // client cabinet
  dashboard: "/dashboard",
  events: "/dashboard/events",
  bookings: "/dashboard/bookings",
  payments: "/dashboard/payments",
  saved: "/dashboard/saved",
  profile: "/dashboard/profile",
  invitations: "/invitations",
  invitation: (id: string, tab?: InvitationTab) => `/invitations/${id}${tab && tab !== "design" ? q({ tab }) : ""}`,
  publicInvitation: (id: string) => `/i/${id}`,
  printInvitation: (id: string) => `/i/${id}${q({ print: 1 })}`,
  /** Prefix of the guest-facing invitation pages (open without an account) */
  publicInvitationPrefix: "/i/",

  // vendor cabinet
  vendorHome: "/vendor",
  vendorCalendar: "/vendor#calendar",
  vendorBookings: "/vendor/bookings",
  vendorFinance: "/vendor/finance",
  vendorProfile: "/vendor/profile",
  vendorDetails: "/vendor/details",
  vendorServices: "/vendor/services",
  vendorPosts: "/vendor/posts",
  me: "/me",
  meTab: (tab: VendorTab) => `/me${q({ tab })}`,
  create: "/create",
  createPost: "/create/post",
  createService: "/create/service",
  editService: (offerId: string) => `/create/service${q({ id: offerId })}`,

  // admin
  admin: "/admin",
  adminDisputes: "/admin/disputes",
  adminBookings: "/admin/bookings",
  adminFinance: "/admin/finance",
  adminVerification: "/admin/verification",
  adminComplaints: "/admin/complaints",
  adminVendors: "/admin/vendors",
  adminUsers: "/admin/users",
  adminPosts: "/admin/posts",
  adminReviews: "/admin/reviews",
  adminSettings: "/admin/settings",
} as const;
