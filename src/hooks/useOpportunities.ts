import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OpportunityType = "internship" | "job" | "competition" | "mock_test" | "mentorship" | "course";

interface UseOpportunitiesOptions {
  type?: OpportunityType;
  featured?: boolean;
  limit?: number;
  search?: string;
}

export const useOpportunities = (options: UseOpportunitiesOptions = {}) => {
  const { type, featured, limit = 20, search } = options;

  return useQuery({
    queryKey: ["opportunities", { type, featured, limit, search }],
    queryFn: async () => {
      let query = supabase
        .from("opportunities")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (type) {
        query = query.eq("opportunity_type", type);
      }

      if (featured) {
        query = query.eq("is_featured", true);
      }

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
};

export const useFeaturedOpportunities = () => {
  return useOpportunities({ featured: true, limit: 10 });
};

export const useOpportunitiesByType = (type: OpportunityType, limit = 20) => {
  return useOpportunities({ type, limit });
};
