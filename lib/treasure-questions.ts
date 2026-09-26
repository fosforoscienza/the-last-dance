import "server-only";

// Domande della caccia al tesoro: la domanda 1 si apre col QR 1, la 2 col QR 2, ecc.
// Questo file resta sul server: la risposta corretta non arriva mai al telefono dei giocatori.
// "correct" è la lettera della risposta giusta: "a", "b", "c" o "d".
export type TreasureQuestionDef = {
  text: string;
  answers: [string, string, string, string];
  correct: "a" | "b" | "c" | "d";
};

export const TREASURE_QUESTIONS: TreasureQuestionDef[] = [
  { text: "Domanda 1", answers: ["Risposta 1a", "Risposta 1b", "Risposta 1c", "Risposta 1d"], correct: "c" },
  { text: "Domanda 2", answers: ["Risposta 2a", "Risposta 2b", "Risposta 2c", "Risposta 2d"], correct: "c" },
  { text: "Domanda 3", answers: ["Risposta 3a", "Risposta 3b", "Risposta 3c", "Risposta 3d"], correct: "c" },
  { text: "Domanda 4", answers: ["Risposta 4a", "Risposta 4b", "Risposta 4c", "Risposta 4d"], correct: "c" },
  { text: "Domanda 5", answers: ["Risposta 5a", "Risposta 5b", "Risposta 5c", "Risposta 5d"], correct: "c" },
  { text: "Domanda 6", answers: ["Risposta 6a", "Risposta 6b", "Risposta 6c", "Risposta 6d"], correct: "c" },
  { text: "Domanda 7", answers: ["Risposta 7a", "Risposta 7b", "Risposta 7c", "Risposta 7d"], correct: "c" },
  { text: "Domanda 8", answers: ["Risposta 8a", "Risposta 8b", "Risposta 8c", "Risposta 8d"], correct: "c" },
  { text: "Domanda 9", answers: ["Risposta 9a", "Risposta 9b", "Risposta 9c", "Risposta 9d"], correct: "c" },
  { text: "Domanda 10", answers: ["Risposta 10a", "Risposta 10b", "Risposta 10c", "Risposta 10d"], correct: "c" },
];

export const LETTERS = ["a", "b", "c", "d"] as const;
