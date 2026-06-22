export enum DeviceStatus {
  Online = "Online",
  Offline = "Offline",
}

export type DeviceStatusType = keyof typeof DeviceStatus;
