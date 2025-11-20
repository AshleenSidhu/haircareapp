/**
 * Staged Product Types
 * Products discovered but not yet scraped/enriched
 */

export interface StagedProduct {
  url: string;
  source_domain: string;
  discovered_by: 'google_cse' | 'manual' | 'sitemap' | 'other';
  discovered_at: any; // Firestore Timestamp
  raw_search_snippet?: string;
  title?: string;
  confidence_score: number; // 0.0 to 1.0
  status: 'pending' | 'processing' | 'completed' | 'failed';
  query_used?: string;
  error_message?: string;
  scraped_at?: any;
  product_id?: string; // Set when successfully scraped and added to products collection
}

export interface DiscoveryReport {
  summary: {
    total_queries: number;
    new_urls_enqueued: number;
    skipped: number;
    errors: number;
    domains_checked: string[];
  };
  enqueued: StagedProduct[];
  skipped_samples: Array<{
    url: string;
    reason: string;
    snippet?: string;
  }>;
  errors: Array<{
    query: string;
    error: string;
  }>;
}

