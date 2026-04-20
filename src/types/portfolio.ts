export type AssetType = 'Fondos MyInvestor' | 'Fondos BBK' | 'Acciones';
export interface WeightItem { name: string; weight: number }
export interface ThreeDimensionClassification { geography: WeightItem[]; sectors: WeightItem[]; assetClassPro: WeightItem[] }
export interface RoboMovement { id: string; category: 'aportacion' | 'retirada' | 'comision'; amount: number; commission?: number; date: string; description?: string }
export interface Asset { id: string; name: string; ticker: string; isin?: string; type: AssetType; shares: number; buyPrice: number; currentPrice: number; buyDate?: string; marketSymbol?: string; movements?: RoboMovement[]; threeDim?: ThreeDimensionClassification; }
export interface RoboSubFund { id: string; isin?: string; name: string; weightPct: number; threeDim?: ThreeDimensionClassification }
export interface RoboAdvisor { id: string; name: string; entity: string; totalValue: number; investedValue: number; lastUpdated: string; subFunds?: RoboSubFund[]; threeDim?: ThreeDimensionClassification; }
export interface IsinEntry { id: string; isin: string; name: string; assetType: AssetType; geography: WeightItem[]; sectors: WeightItem[]; assetClassPro: WeightItem[] }
export interface PortfolioState { assets: Asset[]; roboAdvisors: RoboAdvisor[]; cashBalance: number; apiKey: string; historicalData: any[]; isinLibrary: IsinEntry[] }