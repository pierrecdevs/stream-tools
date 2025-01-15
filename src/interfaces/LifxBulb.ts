export interface LifxGroup {
  id: string;
  name: string;
}

export interface LifxBulbState {
  power: 'on' | 'off';
  color: string;
  brightness: number;
  duration: number;
  infrared: number;
  fast: boolean
}

export interface LifxColor {
  hue: number;
  saturation: number;
  kelvin: number;
}

export interface LifxCapabilities {
  has_chain: boolean;
  has_color: boolean;
  has_hev: boolean;
  has_ir: boolean;
  has_matrix: boolean;
  has_multizone: boolean;
  has_vairable_color_temp: boolean;
  max_kelvin: number;
  min_kelvin: number;
}

export interface LifxProduct {
  capabilities: LifxCapabilities;
  company: string;
  identifier: string;
  name: string;
  product_id: number;
  vendor_id: number;
}


export interface LifxBulb {
  brightness: number;
  color: LifxColor;
  company: string;
  connected: boolean;
  effect: string;
  id: string;
  group: LifxGroup;
  label: string;
  last_seen: Date;
  location: LifxGroup;
  name: string;
  product: LifxProduct;
  power: 'on' | 'off';
  uuid: string;
}
