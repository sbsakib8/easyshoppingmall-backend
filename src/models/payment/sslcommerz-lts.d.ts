declare module "sslcommerz-lts" {
  export interface SSLCommerzConfig {
    store_id: string;
    store_passwd: string;
    is_live: boolean;
  }

  export interface SSLCommerzInitResponse {
    status: string;
    failedreason?: string;
    sessionkey?: string;
    GatewayPageURL?: string;
  }

  export default class SSLCommerzPayment {
    constructor(store_id: string, store_passwd: string, is_live: boolean);
    init(data: Record<string, any>): Promise<SSLCommerzInitResponse>;
    validate(order_id: string): Promise<any>;
  }
}
