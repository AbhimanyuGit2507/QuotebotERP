export declare class CurrencyService {
    private readonly logger;
    getRate(base: string, target: string): Promise<number>;
}
export default CurrencyService;
