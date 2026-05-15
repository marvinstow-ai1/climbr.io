export interface DashboardProject {
  id: string;
  domain: string;
  gsc_connected: boolean;
  gsc_connected_at: string | null;
  created_at: string;
}

export interface DashboardAudit {
  id: string;
  project_id: string | null;
  url: string;
  score: number | null;
  status: string;
  created_at: string;
}

export interface DashboardRanking {
  project_id: string;
  keyword: string;
  position: number | null;
  recorded_at: string;
}

export interface KeywordMovement {
  positive: number;
  negative: number;
  neutral: number;
}
