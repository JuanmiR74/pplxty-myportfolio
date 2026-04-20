export type AssetType = 'Fondos MyInvestor' | 'Fondos BBK' | 'Acciones';
export interface ClassificationItem { name: string; weight: number; }
export interface ThreeDimensionClassification { geography: ClassificationItem[]; sectors: ClassificationItem[]; assetClassPro: ClassificationItem[]; }
export interface Asset { id: string; name: string; ticker?: string; isin?: string; type: AssetType; shares: number; buyPrice: number; currentPrice: number; buyDate?: string; threeDim?: ThreeDimensionClassification; }
export interface IsinEntry { id: string; isin: string; name: string; geography?: ClassificationItem[]; sectors?: ClassificationItem[]; assetClassPro?: ClassificationItem[]; }
export interface RoboSubFund { id: string; isin?: string; name: string; weightPct: number; threeDim?: ThreeDimensionClassification; }
export interface RoboAdvisor { id: string; name: string; entity: string; totalValue: number; investedValue: number; lastUpdated: string; allocations?: any[]; sectorAllocations?: any[]; movements?: any[]; threeDim?: ThreeDimensionClassification; subFunds?: RoboSubFund[]; }
export interface PortfolioState { assets: Asset[]; roboAdvisors: RoboAdvisor[]; cashBalance: number; isinLibrary: IsinEntry[]; }
export interface Transaction { id: string; user_id: string; asset_id?: string | null; robo_advisor_id?: string | null; amount: number; date: string; description?: string | null; created_at?: string; updated_at?: string; }
