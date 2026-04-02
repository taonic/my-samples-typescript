export declare function validatePayment(email: string, name: string, paymentId: string, amount: number): Promise<void>;
export declare function fraudCheck(email: string, paymentId: string, amount: number): Promise<void>;
export declare function executePayment(paymentId: string, amount: number): Promise<string>;
//# sourceMappingURL=activities.d.ts.map