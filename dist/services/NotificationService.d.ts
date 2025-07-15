import { ExtractionResult } from '../types';
export declare class NotificationService {
    private logger;
    private emailTransporter;
    constructor();
    private setupEmailTransporter;
    sendSuccessNotification(result: ExtractionResult): Promise<void>;
    sendFailureNotification(result: ExtractionResult): Promise<void>;
    sendHealthAlert(status: string, details: string): Promise<void>;
    private sendNotification;
    private sendEmail;
    private sendWebhook;
    private formatFileSize;
}
//# sourceMappingURL=NotificationService.d.ts.map