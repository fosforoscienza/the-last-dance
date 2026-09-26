// Caccia al tesoro: dati condivisi tra server e browser (niente domande né risposte qui).
// Il QR n. 1 apre la domanda 1 e sblocca il simbolo 1, che sta nella casella del primo anno, e così via.
export const TREASURE_YEARS = [2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026];
export const TREASURE_TOTAL = TREASURE_YEARS.length;
// Tentativi per ogni domanda: dopo tanti errori il simbolo è perso
export const TREASURE_MAX_ATTEMPTS = 2;

// Immagini dei simboli: public/caccia-al-tesoro/simboli/1.png … 10.png
export function symbolSrc(n: number) {
  return `/caccia-al-tesoro/simboli/${n}.png`;
}

// Domanda come la vede il giocatore (senza la risposta corretta)
export type TreasureQuestion = {
  number: number;
  year: number;
  text: string;
  answers: string[];
};
