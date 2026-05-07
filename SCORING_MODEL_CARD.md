# SENTRA Trust Scoring Model Card

## Model Overview
The SENTRA Trust Scoring Model is a deterministic, multi-signal risk engine designed for real-time transaction monitoring. It calculates a risk score (0-100) based on network signals, community intelligence, and transaction context.

## Scoring Logic

### 1. Weighted Signals (Baseline)
The model aggregates contributions from the following signals:

| Signal | Max Contribution | Risk Indicator |
| :--- | :--- | :--- |
| **Community Reports** | 35 pts | Number of fraud reports in the last 30 days. |
| **SIM Swap** | 25 pts | Detected SIM change within the last 72 hours. |
| **Geofence Anomaly** | 15 pts | Transaction location deviates from user profile. |
| **Transaction Velocity** | 10 pts | High frequency of transactions (>3 in 2h). |
| **Device Trust** | 8 pts | Use of untrusted or unknown hardware fingerprints. |
| **Account Age** | 7 pts | New accounts (<30 days) are high risk. |

### 2. Interaction Multipliers
Signals are not just additive; they co-occur to create non-linear risk. We apply multipliers for critical combinations:

- **Account Takeover Pattern**: `(community_reports > 0) AND (sim_swap == true)` -> **1.35x Multiplier**
- **Location Spoofing Pattern**: `(geofence_anomaly == true) AND (device_trusted == false)` -> **1.20x Multiplier**
- **Mule Activity Pattern**: `(velocity > 3) AND (account_age < 30 days)` -> **1.25x Multiplier**

### 3. Confidence Score
Calculated as: `(available_signals / total_signals) * signal_quality_factor`.
A high confidence score (0.8+) indicates that all required and optional data points (Device ID, Location) were provided and verified.

## Risk Thresholds & Decisions

| Score Range | Risk Level | Decision | Recommended Action |
| :--- | :--- | :--- | :--- |
| **0 - 30** | LOW | **APPROVE** | Proceed with transaction. |
| **31 - 65** | MEDIUM | **STEP_UP** | Request OTP or biometric verification. |
| **66 - 100** | HIGH | **BLOCK** | Immediate block and security alert. |

## Compliance & Auditability
- **Explainability**: Every response includes a detailed signal breakdown and a natural language explanation.
- **Reproducibility**: The engine is a pure function. Given the same inputs, the score is always identical.
- **Privacy**: Phone numbers are hashed using SHA-256 before logging or cross-referencing in the Nexus.
