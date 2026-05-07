import { z } from "zod";

export const EvaluateRequestSchema = z.object({
  phone_number: z.string().regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format"),
  transaction_amount: z.number().positive(),
  transaction_currency: z.string().length(3),
  sender_phone: z.string().regex(/^\+[1-9]\d{1,14}$/, "Sender phone number must be in E.164 format"),
  device_id: z.string().optional(),
  device_trusted: z.boolean().optional(),
  sender_location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    country_code: z.string().length(2)
  }).optional(),
  recipient_location_history: z.array(z.string()).optional(),
  timestamp: z.string().datetime()
});

export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;

export interface SignalDetail {
  score_contribution: number;
  detail: string;
}

export interface TrustSignals {
  community_reports: SignalDetail;
  sim_swap_risk: SignalDetail;
  device_trust: SignalDetail;
  geofence_anomaly: SignalDetail;
  transaction_velocity: SignalDetail;
  account_age: SignalDetail;
}

export interface EvaluateResponse {
  phone_number: string;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  decision: "APPROVE" | "STEP_UP" | "BLOCK";
  confidence: number;
  signals: TrustSignals;
  recommended_action: string;
  explanation: string;
  evaluated_at: string;
  processing_time_ms: number;
}
