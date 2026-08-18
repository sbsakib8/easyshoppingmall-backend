

export interface IHomeBanner {
  _id?: string;
  title: string;
  Description: string;
  images: string[];
  Link_URL?: string;
  active: boolean;
  sliderFor: "USER" | "DROPSHIPPING";
  createdAt?: Date;
  updatedAt?: Date;
}
