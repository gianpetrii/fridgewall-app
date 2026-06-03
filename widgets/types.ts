export interface WidgetPhotoItem {
  photoUrl: string;
  photoLocalName?: string;
  posterName?: string;
  createdAt: number;
  /** Solo al guardar desde la app; el nativo lo elimina tras copiar */
  localUri?: string;
}

export interface WidgetMemberSlot {
  userId: string;
  userName?: string;
  photoUrl?: string;
  photoLocalName?: string;
  localUri?: string;
}

export interface StoredWidgetData {
  groupName?: string;
  photos?: WidgetPhotoItem[];
  carouselIndex?: number;
  memberSlots?: WidgetMemberSlot[];
  /** Campos legacy (una sola foto) */
  photoUrl?: string;
  localUri?: string;
  posterName?: string;
  createdAt?: number;
  photoLocalName?: string;
}
