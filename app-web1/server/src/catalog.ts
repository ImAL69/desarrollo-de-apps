export interface ServerProduct { id: number; name: string; price: number; stock: number; }
export const catalog: ServerProduct[] = [
  { id: 1, name: 'Satoru Gojo', price: 189900, stock: 8 }, { id: 2, name: 'Nezuko Kamado', price: 164900, stock: 12 },
  { id: 3, name: 'Monkey D. Luffy', price: 209900, stock: 5 }, { id: 4, name: 'Tanjiro Kamado', price: 174900, stock: 10 },
  { id: 5, name: 'Itachi Uchiha', price: 154900, stock: 4 }, { id: 6, name: 'Anya Forger', price: 119900, stock: 15 },
  { id: 7, name: 'Roronoa Zoro', price: 194900, stock: 7 }, { id: 8, name: 'Power', price: 249900, stock: 3 }
];
