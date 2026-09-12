export const REPORT_TYPES = ['pothole', 'litter', 'lighting', 'asb', 'other'] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportOrigin = 'fixmystreet' | 'community';

export type Report = {
  id: string;
  title: string;
  loc: string;
  area: string;
  lat: number | null;
  lng: number | null;
  type: ReportType;
  severity: 'high' | 'normal' | string;
  ts: number;
  time: string;
  url: string;
  media: string | null;
  desc: string;
  source: string;
  origin: ReportOrigin;
};

export type CommunityTip = {
  id: string;
  title: string;
  loc: string;
  area: string;
  type: ReportType | string;
  lat: number | null;
  lng: number | null;
  url: string;
  media: string;
  desc: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: number;
};

export type ReportsPayload = {
  updated: string | null;
  count: number;
  reports: Report[];
};

export type FeedSource = 'railway' | 'restore';
