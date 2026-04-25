import { TrustResult } from "../trust/index.js";
export interface TransactionRequest {
    phoneNumber: string;
    amount: number;
}
export interface TransactionResponse extends TrustResult {
    transactionId: string;
    approved: boolean;
}
export declare function initiateTransaction(request: TransactionRequest): Promise<TransactionResponse>;
//# sourceMappingURL=index.d.ts.map