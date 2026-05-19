export type ItemIntelligenceInputItem = {
  product_name: string;
  quantity?: number;
  unit?: string;
};

export type ItemIntelligenceSuggestion = {
  product_name: string;
  product_id?: string;
  confidence: number;
  reason?: string;
};

export type ItemIntelligenceDecision =
  | 'auto_accept'
  | 'manual_review'
  | 'unresolved';

export type ItemIntelligenceMatchItemResult = {
  input_text: string;
  best_match?: ItemIntelligenceSuggestion;
  suggestions: ItemIntelligenceSuggestion[];
  confidence: number;
  decision: ItemIntelligenceDecision;
  reason?: string;
};

export type ItemIntelligenceMatchRequest = {
  tenant_id: string;
  item_id?: string;
  extracted_items: ItemIntelligenceInputItem[];
  mode?: 'manual' | 'auto';
};

export type ItemIntelligenceMatchResponse = {
  run_id: string;
  mode: 'manual' | 'auto';
  suggestion_threshold: number;
  auto_accept_threshold: number;
  items: ItemIntelligenceMatchItemResult[];
};

export type ItemIntelligenceFeedbackRequest = {
  run_id: string;
  selected_product_id?: string;
  reviewer_id?: string;
  action: 'accept' | 'reject' | 'edit';
  notes?: string;
};

export type ItemIntelligenceFeedbackResponse = {
  status: 'stored';
  run_id: string;
  action: 'accept' | 'reject' | 'edit';
  alias_update_suggested: boolean;
};
