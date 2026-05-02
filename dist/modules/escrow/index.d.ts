export interface EscrowCreateRequest {
    senderPhone: string;
    receiverPhone: string;
    amount: number;
    ownerId: string;
}
export interface EscrowResult {
    escrowId: string;
    status: "PENDING" | "RELEASED" | "REFUNDED";
    amount: number;
    ownerId: string;
}
export declare function createEscrow(request: EscrowCreateRequest): Promise<EscrowResult>;
export declare function releaseEscrow(escrowId: string, requesterId: string): Promise<EscrowResult | null>;
//# sourceMappingURL=index.d.ts.map