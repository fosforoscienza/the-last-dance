export type Player = {
  id: string;
  name: string;
  team: string;
  points: number;
  hotdog_1: boolean;
  hotdog_2: boolean;
  fries: boolean;
  donut: boolean;
};

export type TicketKey = "hotdog_1" | "hotdog_2" | "fries" | "donut";

export const TICKETS: { key: TicketKey; label: string; food: "hotdog" | "fries" | "donut" }[] = [
  { key: "hotdog_1", label: "Hot dog", food: "hotdog" },
  { key: "hotdog_2", label: "Hot dog", food: "hotdog" },
  { key: "fries", label: "Patatine", food: "fries" },
  { key: "donut", label: "Bombolone", food: "donut" },
];

export const PLAYER_COLUMNS = "id,name,team,points,hotdog_1,hotdog_2,fries,donut";
