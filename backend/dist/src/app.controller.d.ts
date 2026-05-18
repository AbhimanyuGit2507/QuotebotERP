import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHealth(): {
        message: string;
        version: string;
        timestamp: string;
        status: string;
    };
    getDetailedHealth(): {
        database: string;
        environment: string;
        message: string;
        version: string;
        timestamp: string;
        status: string;
    };
    getDocs(): {
        message: string;
        version: string;
        baseUrl: string;
        endpoints: {
            auth: {
                login: string;
                register: string;
                validate: string;
            };
            health: {
                health: string;
                root: string;
            };
        };
    };
}
